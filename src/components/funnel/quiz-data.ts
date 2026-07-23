// Quiz question + option data for the five quiz screens. Pure data, no JSX.
// Option labels are stored verbatim into QuizAnswers (contract section 6).

import type { QuizAnswers } from "../../lib/types";

export type QuizField = keyof QuizAnswers;

export type QuizStepId =
  | "quiz-reason"
  | "quiz-age"
  | "quiz-material"
  | "quiz-insurance"
  | "quiz-timeline";

export type GlyphName =
  | "storm"
  | "clock"
  | "droplet"
  | "tag"
  | "sparkles"
  | "leaf"
  | "hourglass"
  | "help"
  | "shingles"
  | "metal"
  | "tile"
  | "fileCheck"
  | "scale"
  | "wallet"
  | "bolt"
  | "calendarCheck"
  | "calendar"
  | "search";

export interface GlyphSpec {
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
}

/** Simple 24x24 stroke glyphs, rendered by QuizStep with currentColor. */
export const GLYPHS: Record<GlyphName, GlyphSpec> = {
  storm: {
    paths: [
      "M7.5 14.5a4 4 0 0 1 .53-7.96A5 5 0 0 1 17.7 8.2a3.3 3.3 0 0 1-.9 6.3",
      "M12.5 12.5 10.5 16h3l-2 3.5",
    ],
  },
  clock: {
    circles: [{ cx: 12, cy: 12, r: 8.2 }],
    paths: ["M12 7.8V12l2.7 2.2"],
  },
  droplet: {
    paths: [
      "M12 3.6c3.1 3.8 5.4 6.7 5.4 9.5a5.4 5.4 0 0 1-10.8 0c0-2.8 2.3-5.7 5.4-9.5Z",
    ],
  },
  tag: {
    paths: ["M4 4.8h5.6L20 15.2l-5.6 5.6L4 10.4Z"],
    circles: [{ cx: 8.7, cy: 8.7, r: 1.2 }],
  },
  sparkles: {
    paths: [
      "M11 4.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z",
      "M17.8 15.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z",
    ],
  },
  leaf: {
    paths: [
      "M6.5 17.5C6.5 10.5 12 5.5 18.9 5.3c.2 7-4.8 12.7-12.4 12.2Z",
      "M6.5 17.5c2.2-4.6 5.6-8 9.5-10",
    ],
  },
  hourglass: {
    paths: [
      "M7.5 4.5h9",
      "M7.5 19.5h9",
      "M8.5 4.5v2.4L12 11l3.5-4.1V4.5",
      "M8.5 19.5v-2.4L12 13l3.5 4.1v2.4",
    ],
  },
  help: {
    circles: [{ cx: 12, cy: 12, r: 8.6 }],
    paths: ["M9.6 9.7a2.5 2.5 0 0 1 4.9.6c0 1.6-2.5 2-2.5 3.6", "M12 17.2h.01"],
  },
  shingles: {
    paths: [
      "M4 5.5h16v13H4Z",
      "M4 12h16",
      "M9.3 5.5V12",
      "M14.7 5.5V12",
      "M6.7 12v6.5",
      "M12 12v6.5",
      "M17.3 12v6.5",
    ],
  },
  metal: {
    paths: [
      "M3.5 16.5l4.25-3 4.25 3 4.25-3 4.25 3",
      "M3.5 10.5l4.25-3 4.25 3 4.25-3 4.25 3",
    ],
  },
  tile: {
    paths: [
      "M4 10.2a4 4 0 0 1 8 0",
      "M12 10.2a4 4 0 0 1 8 0",
      "M4 16.2a4 4 0 0 1 8 0",
      "M12 16.2a4 4 0 0 1 8 0",
    ],
  },
  fileCheck: {
    paths: [
      "M7 3.5h6.8L18 7.7v12.8H7Z",
      "M13.5 3.8V8h4.2",
      "M9.8 14.2l1.9 1.9 3.3-3.3",
    ],
  },
  scale: {
    paths: [
      "M12 4.5V19",
      "M8.5 19.5h7",
      "M5.5 7.5h13",
      "M5.5 7.5 3.4 12a2.7 2.7 0 0 0 4.2 0Z",
      "M18.5 7.5 16.4 12a2.7 2.7 0 0 0 4.2 0Z",
    ],
  },
  wallet: {
    paths: [
      "M4.5 7.5h13.5a1.8 1.8 0 0 1 1.8 1.8v8.2a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8Z",
      "M4.5 7.5V6.3a1.8 1.8 0 0 1 1.8-1.8h9.9",
      "M15.8 13.4h.01",
    ],
  },
  bolt: {
    paths: ["M13.2 3.5 5.5 13.2h4.8l-1.3 7.3 7.7-9.7h-4.8Z"],
  },
  calendarCheck: {
    paths: [
      "M4.5 6.5h15v13h-15Z",
      "M4.5 10.5h15",
      "M8.5 4.5v3.4",
      "M15.5 4.5v3.4",
      "M9.3 14.6l1.9 1.9 3.4-3.4",
    ],
  },
  calendar: {
    paths: [
      "M4.5 6.5h15v13h-15Z",
      "M4.5 10.5h15",
      "M8.5 4.5v3.4",
      "M15.5 4.5v3.4",
      "M8 14.5h.01",
      "M12 14.5h.01",
      "M16 14.5h.01",
    ],
  },
  search: {
    circles: [{ cx: 11, cy: 11, r: 5.8 }],
    paths: ["M15.3 15.3 20 20"],
  },
};

export interface QuizOption {
  label: string;
  glyph: GlyphName;
}

export interface QuizQuestion {
  field: QuizField;
  stepId: QuizStepId;
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    field: "reason",
    stepId: "quiz-reason",
    question: "What's the main reason you're looking at a new roof?",
    options: [
      { label: "Storm or hail damage", glyph: "storm" },
      { label: "Roof is old or worn out", glyph: "clock" },
      { label: "Active leaks", glyph: "droplet" },
      { label: "Preparing to sell", glyph: "tag" },
      { label: "Upgrade or curb appeal", glyph: "sparkles" },
    ],
  },
  {
    field: "roofAge",
    stepId: "quiz-age",
    question: "How old is your current roof?",
    options: [
      { label: "Under 10 years", glyph: "leaf" },
      { label: "10 to 20 years", glyph: "clock" },
      { label: "20 to 30 years", glyph: "hourglass" },
      { label: "30+ years or not sure", glyph: "help" },
    ],
  },
  {
    field: "material",
    stepId: "quiz-material",
    question: "What material is your current roof?",
    options: [
      { label: "Asphalt shingles", glyph: "shingles" },
      { label: "Metal", glyph: "metal" },
      { label: "Tile or slate", glyph: "tile" },
      { label: "Other or not sure", glyph: "help" },
    ],
  },
  {
    field: "insurance",
    stepId: "quiz-insurance",
    question: "Are you filing an insurance claim?",
    options: [
      { label: "Yes, already filed", glyph: "fileCheck" },
      { label: "Considering it", glyph: "scale" },
      { label: "No, paying out of pocket", glyph: "wallet" },
    ],
  },
  {
    field: "timeline",
    stepId: "quiz-timeline",
    question: "What's your timeline?",
    options: [
      { label: "ASAP, it's urgent", glyph: "bolt" },
      { label: "1 to 3 months", glyph: "calendarCheck" },
      { label: "3 to 6 months", glyph: "calendar" },
      { label: "Just researching", glyph: "search" },
    ],
  },
];
