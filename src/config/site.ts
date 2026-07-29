// THE one config file. Rebranding for a real client means editing this file,
// swapping the images in public/img/, and setting LEAD_WEBHOOK_URL in .env.
// Everything else derives from here.

export type AerialProvider = "esri" | "google";

export const SITE = {
  businessName: "Apex Roofing Co.",
  legalName: "Apex Roofing Co. LLC",
  tagline: "Storm-ready roofing for metro Atlanta",
  phone: "(404) 555-0187",
  phoneHref: "tel:+14045550187",
  email: "hello@apexroofingco.com",
  // GHL booking calendar. Placeholder until the real client's calendar is wired.
  calendarUrl: "https://api.leadconnectorhq.com/widget/booking/REPLACE_ME",
  serviceAreaShort: "Atlanta ITP and Marietta",
  serviceAreaCounties: ["Fulton", "Cobb", "Clayton", "DeKalb"],
  // Rough center of the service area. Biases address autocomplete so nearby
  // matches rank first; does not exclude addresses outside the area.
  serviceAreaCenter: { lat: 33.789, lng: -84.388 },
  licenseLine: "Licensed and insured in Georgia. License #GA-000000 (placeholder).",

  brand: {
    // Primary brand color. Flows into Tailwind as bg-brand / text-brand etc.
    primary: "#C2410C",
    primaryDark: "#93330A",
  },

  pricing: {
    // Dollars per roofing square (1 square = 100 sqft). $320 => $3.20/sqft.
    pricePerSquare: 320,
    wasteFactor: 1.12,
    // Displayed range = tier price x (1 +/- rangeSpread)
    rangeSpread: 0.15,
    pitchMultipliers: {
      low: 1.06,
      standard: 1.15,
      steep: 1.3,
    },
    tierMultipliers: {
      standard: 1.0,
      premium: 1.35,
    },
  },

  aerial: {
    // "esri" is keyless. Switch to "google" + set googleMapsKey to use
    // Google Static Maps instead; only getAerialImageUrl() changes behavior.
    provider: "esri" as AerialProvider,
    googleMapsKey: "",
    imageSize: 800,
    // Side length in meters of the square satellite crop (about zoom 19).
    boxMeters: 150,
  },

  footprint: {
    // Accept OSM-measured footprints only inside this window (sqft).
    minSqft: 400,
    maxSqft: 20000,
  },
} as const;
