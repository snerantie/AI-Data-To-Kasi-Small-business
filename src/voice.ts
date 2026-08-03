import type { Lang } from "./i18n";

// Minimal typing for Web Speech API to avoid needing DOM lib updates.
type SpeechRecognitionResult = { transcript: string };
type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResult>>;
};
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const LANG_TAGS: Record<Lang, string> = {
  en: "en-ZA",
  zu: "zu-ZA",
  st: "st-ZA",
};

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createRecognizer(lang: Lang): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = LANG_TAGS[lang];
  r.interimResults = false;
  r.continuous = false;
  return r;
}

// ---- Parse a spoken utterance into { item, qty, price } ----
// Handles English + Zulu + Sesotho digit words + common item words.

const NUMBER_WORDS: Record<string, number> = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  // Zulu (approximate spoken forms)
  kunye: 1, kubili: 2, kuthathu: 3, okukodwa: 1, ezimbili: 2, ezintathu: 3,
  ezine: 4, ezinhlanu: 5, isishiyagalombili: 8, ishumi: 10,
  amashumi: 10, amakhulu: 100, r18: 18,
  // Sesotho
  motso: 1, pedi: 2, tharo: 3, nne: 4, hlano: 5, tshelela: 6, supa: 7,
  robeli: 8, robong: 9, leshome: 10, lekgolo: 100,
};

const ITEM_WORDS: { canonical: string; matches: RegExp }[] = [
  { canonical: "Bread", matches: /\b(bread|isinkwa|izinkwa|bohobe)\b/i },
  { canonical: "Airtime", matches: /\b(airtime|amaairtime|liairtime|ama-airtime|li-airtime)\b/i },
  { canonical: "Cold drink", matches: /\b(cold\s?drink|coke|fanta|iphuzo|senoelo|drink)\b/i },
  { canonical: "Chips", matches: /\b(chips|amachipsi|lichipisi|slap)\b/i },
  { canonical: "Sweets", matches: /\b(sweets|amaswidi|lipompong|candy)\b/i },
  { canonical: "Maize meal", matches: /\b(maize|impuphu|phofo|mielie|meal)\b/i },
  { canonical: "Milk", matches: /\b(milk|ubisi|lebese)\b/i },
  { canonical: "Sugar", matches: /\b(sugar|ushukela|tsoekere)\b/i },
  { canonical: "Eggs", matches: /\b(egg|eggs|amaqanda|mahe)\b/i },
];

function wordsToNumbers(text: string): string {
  const parts = text.split(/\s+/);
  return parts
    .map((w) => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/gi, "");
      return NUMBER_WORDS[clean] !== undefined ? String(NUMBER_WORDS[clean]) : w;
    })
    .join(" ");
}

export type ParsedSale = {
  item: string;
  qty: number;
  price: number; // per unit; if only total is given, treated as unit price
  confidence: "high" | "medium" | "low";
};

export function parseSale(raw: string): ParsedSale | null {
  if (!raw || !raw.trim()) return null;
  const normalized = wordsToNumbers(raw);

  // Find item
  let item = "Item";
  for (const w of ITEM_WORDS) {
    if (w.matches.test(raw)) {
      item = w.canonical;
      break;
    }
  }

  // Find all numbers in the utterance
  const nums = Array.from(normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)).map((m) =>
    parseFloat(m[1]),
  );

  if (nums.length === 0) return null;

  let qty = 1;
  let price = nums[0];

  if (nums.length >= 2) {
    // Heuristic: smaller number is qty, larger is price (per unit or total).
    const [a, b] = nums;
    if (a <= 20 && b > a) {
      qty = a;
      price = b;
    } else if (b <= 20 && a > b) {
      qty = b;
      price = a;
    } else {
      qty = 1;
      price = Math.max(a, b);
    }
  }

  // If the phrase says "at" or "each" or "ngo" or "ka" — price is per unit.
  // Otherwise if there's only one number and no qty word, treat as total.
  const perUnitHint = /\b(at|each|per|ngo|nge|ka|kaofela|e nngwe)\b/i.test(raw);
  if (!perUnitHint && nums.length === 1) {
    // Treat single number as unit price with qty 1.
    price = nums[0];
    qty = 1;
  }

  const confidence: ParsedSale["confidence"] =
    item !== "Item" && nums.length >= 1 ? "high" : "medium";

  return { item, qty, price, confidence };
}
