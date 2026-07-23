// Single reducer/hook that owns all funnel state. In-memory only, no storage.

import { useMemo, useReducer } from "react";
import type { Contact, FootprintSource, QuizAnswers } from "../../lib/types";
import type { PitchKey } from "../../lib/pricing";

export type StepId =
  | "quiz-reason"
  | "quiz-age"
  | "quiz-material"
  | "quiz-insurance"
  | "quiz-timeline"
  | "address"
  | "confirm"
  | "measuring"
  | "assist"
  | "lead"
  | "pitch"
  | "quote";

/**
 * Progress index per step. Percent = index / PROGRESS_TOTAL (contract:
 * completed steps / 11). Assist sits between measuring and lead; the measured
 * path simply skips its slot.
 */
export const PROGRESS_INDEX: Record<StepId, number> = {
  "quiz-reason": 0,
  "quiz-age": 1,
  "quiz-material": 2,
  "quiz-insurance": 3,
  "quiz-timeline": 4,
  address: 5,
  confirm: 6,
  measuring: 7,
  assist: 8,
  lead: 9,
  pitch: 10,
  quote: 11,
};

export const PROGRESS_TOTAL = 11;

export interface AddressState {
  entered: string;
  matched: string;
  lat: number;
  lng: number;
}

export interface FootprintState {
  sqft: number;
  source: FootprintSource;
  /** Outer ring of the measured building, [lat, lng] pairs (measured path only). */
  polygon?: [number, number][];
  assist?: { heatedSqft: number; stories: number };
}

export interface FunnelState {
  step: StepId;
  /** Direction of the last navigation, used by the step transition. */
  direction: 1 | -1;
  quiz: Partial<QuizAnswers>;
  address: AddressState | null;
  footprint: FootprintState | null;
  contact: Contact | null;
  pitch: PitchKey | null;
}

const INITIAL_STATE: FunnelState = {
  step: "quiz-reason",
  direction: 1,
  quiz: {},
  address: null,
  footprint: null,
  contact: null,
  pitch: null,
};

const QUIZ_NEXT: Record<keyof QuizAnswers, StepId> = {
  reason: "quiz-age",
  roofAge: "quiz-material",
  material: "quiz-insurance",
  insurance: "quiz-timeline",
  timeline: "address",
};

/** Which step each quiz field belongs to, for the reducer's step guards. */
const QUIZ_STEP_OF: Record<keyof QuizAnswers, StepId> = {
  reason: "quiz-reason",
  roofAge: "quiz-age",
  material: "quiz-material",
  insurance: "quiz-insurance",
  timeline: "quiz-timeline",
};

type FunnelAction =
  | { type: "quiz"; field: keyof QuizAnswers; value: string }
  | { type: "address_found"; address: AddressState }
  | { type: "reenter_address" }
  | { type: "confirm_yes" }
  | { type: "measured"; sqft: number; polygon?: [number, number][] }
  | { type: "measure_failed" }
  | { type: "assist"; footprint: FootprintState }
  | { type: "contact"; contact: Contact }
  | { type: "pitch"; pitch: PitchKey }
  | { type: "back" };

/**
 * Where the back chevron leads from each step. Null = no back (first step).
 * Quote maps to pitch (never back into lead; the lead is already captured).
 */
export function backTargetOf(state: FunnelState): StepId | null {
  switch (state.step) {
    case "quiz-reason":
      return null;
    case "quiz-age":
      return "quiz-reason";
    case "quiz-material":
      return "quiz-age";
    case "quiz-insurance":
      return "quiz-material";
    case "quiz-timeline":
      return "quiz-insurance";
    case "address":
      return "quiz-timeline";
    case "confirm":
      return "address";
    case "measuring":
      return "confirm";
    case "assist":
      return "confirm";
    case "lead":
      return state.footprint?.source === "estimated" ? "assist" : "confirm";
    case "pitch":
      return "lead";
    case "quote":
      return "pitch";
  }
}

/**
 * Every forward action is guarded on the step it belongs to. Late async
 * results and stale auto-advance timers (a back press racing a pending
 * setTimeout, a slow geocode resolving after navigation) must never yank the
 * user to a step they did not ask for.
 */
function reducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case "quiz":
      if (state.step !== QUIZ_STEP_OF[action.field]) return state;
      return {
        ...state,
        quiz: { ...state.quiz, [action.field]: action.value },
        step: QUIZ_NEXT[action.field],
        direction: 1,
      };
    case "address_found":
      if (state.step !== "address") return state;
      return { ...state, address: action.address, step: "confirm", direction: 1 };
    case "reenter_address":
      if (state.step !== "confirm") return state;
      return { ...state, step: "address", direction: -1 };
    case "confirm_yes":
      if (state.step !== "confirm") return state;
      return { ...state, step: "measuring", direction: 1 };
    case "measured":
      if (state.step !== "measuring") return state;
      return {
        ...state,
        footprint: { sqft: action.sqft, source: "measured", polygon: action.polygon },
        step: "lead",
        direction: 1,
      };
    case "measure_failed":
      if (state.step !== "measuring") return state;
      return { ...state, step: "assist", direction: 1 };
    case "assist":
      if (state.step !== "assist") return state;
      return { ...state, footprint: action.footprint, step: "lead", direction: 1 };
    case "contact":
      if (state.step !== "lead") return state;
      return { ...state, contact: action.contact, step: "pitch", direction: 1 };
    case "pitch":
      if (state.step !== "pitch") return state;
      return { ...state, pitch: action.pitch, step: "quote", direction: 1 };
    case "back": {
      const target = backTargetOf(state);
      if (!target) return state;
      return { ...state, step: target, direction: -1 };
    }
    default:
      return state;
  }
}

export interface FunnelActions {
  answerQuiz: (field: keyof QuizAnswers, value: string) => void;
  addressFound: (address: AddressState) => void;
  reenterAddress: () => void;
  confirmYes: () => void;
  measured: (sqft: number, polygon?: [number, number][]) => void;
  measureFailed: () => void;
  assistSubmit: (footprint: FootprintState) => void;
  contactSubmit: (contact: Contact) => void;
  pitchSelect: (pitch: PitchKey) => void;
  goBack: () => void;
}

export function useFunnel(): { state: FunnelState; actions: FunnelActions } {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const actions = useMemo<FunnelActions>(
    () => ({
      answerQuiz: (field, value) => dispatch({ type: "quiz", field, value }),
      addressFound: (address) => dispatch({ type: "address_found", address }),
      reenterAddress: () => dispatch({ type: "reenter_address" }),
      confirmYes: () => dispatch({ type: "confirm_yes" }),
      measured: (sqft, polygon) => dispatch({ type: "measured", sqft, polygon }),
      measureFailed: () => dispatch({ type: "measure_failed" }),
      assistSubmit: (footprint) => dispatch({ type: "assist", footprint }),
      contactSubmit: (contact) => dispatch({ type: "contact", contact }),
      pitchSelect: (pitch) => dispatch({ type: "pitch", pitch }),
      goBack: () => dispatch({ type: "back" }),
    }),
    [],
  );

  return { state, actions };
}
