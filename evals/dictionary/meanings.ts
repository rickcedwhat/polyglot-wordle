import { getLanguageName } from './lexicalValidity';
import { Language } from './types';

export const POS_VALUES = ['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num'] as const;
export type Pos = (typeof POS_VALUES)[number];

export interface Meaning {
  pos: Pos;
  def: string;
}

export interface MeaningsResult {
  word: string;
  display: string;
  /** Most common meaning first. Empty when Gemini found no real meaning. */
  meanings: Meaning[];
}

export interface MeaningsInput {
  word: string;
  display?: string;
  pos?: string;
  def?: string;
}

export const MAX_MEANINGS = 3;

export function buildMeaningsPrompt(lang: Language, words: MeaningsInput[]) {
  const langName = getLanguageName(lang);
  return `You are a lexicographer for a multilingual Wordle game that teaches players what ${langName} words mean.
For each 5-letter ${langName} word below, list its distinct meanings in modern ${langName}, in English.

Rules:
1. List 1 to ${MAX_MEANINGS} meanings, ordered by how often native speakers use them today. The first meaning must be the one most people think of first.
2. Only list meanings that are genuinely different (different sense or different part of speech). Do not split one meaning into near-synonyms. Skip archaic or very rare meanings.
3. Include vulgar, slang, sexual or offensive meanings when they are a real, common use of the word. Define them plainly and factually, like a good dictionary does. Never skip or soften a meaning because it is rude, and never invent one.
4. If the spelling is both a conjugated verb and a noun/adjective (e.g. English "barns", Spanish "frena"), list each reading as its own meaning, in order of how common it is.
5. For a conjugated verb or inflected meaning, give the English meaning first and cite the lemma in parentheses at the end, e.g. "Slows down or applies the brakes (present tense of frenar)."
6. If the word is spelled like an English word but is a real ${langName} word, define the ${langName} meaning, never the English one.
7. Each definition: 8 to 25 words, plain English, no circular formulas like "Plural of X" or "Pertaining to X". Do not start with "In ${langName}".
8. pos must be one of: ${POS_VALUES.join(', ')}.
9. display: the word with its standard accents, lowercase.
10. If the word has no real ${langName} meaning (a name, a foreign word, gibberish), return an empty meanings list. Do not invent one.
11. Return exactly one result for every input key.

Words:
${JSON.stringify(
  words.map((w) => ({ key: w.word, display: w.display || w.word, currentDef: w.def || null })),
  null,
  2
)}
`;
}

const RESPONSE_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      display: { type: 'string' },
      meanings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pos: { type: 'string', enum: [...POS_VALUES] },
            def: { type: 'string' },
          },
          required: ['pos', 'def'],
        },
      },
    },
    required: ['key', 'display', 'meanings'],
  },
};

const SAFETY_OFF = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map((category) => ({ category, threshold: 'BLOCK_NONE' }));

export function parseMeaningsResponse(words: MeaningsInput[], raw: unknown): MeaningsResult[] {
  if (!Array.isArray(raw)) {
    throw new Error('Gemini meanings response must be an array');
  }
  const byKey = new Map<string, { display?: unknown; meanings?: unknown }>();
  for (const item of raw) {
    if (item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string') {
      byKey.set((item as { key: string }).key, item as { display?: unknown; meanings?: unknown });
    }
  }
  return words.map((w) => {
    const item = byKey.get(w.word);
    if (!item) {
      throw new Error(`Gemini skipped "${w.word}"`);
    }
    const meanings = (Array.isArray(item.meanings) ? item.meanings : [])
      .filter(
        (m): m is Meaning =>
          Boolean(m) &&
          POS_VALUES.includes((m as Meaning).pos) &&
          typeof (m as Meaning).def === 'string' &&
          (m as Meaning).def.trim().length > 0
      )
      .slice(0, MAX_MEANINGS)
      .map((m) => ({ pos: m.pos, def: m.def.trim() }));
    const display =
      typeof item.display === 'string' && item.display.trim() ? item.display.trim() : w.display;
    return { word: w.word, display: display || w.word, meanings };
  });
}

export async function generateMeanings(
  lang: Language,
  words: MeaningsInput[],
  apiKey: string,
  model = 'gemini-2.5-flash'
): Promise<MeaningsResult[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: buildMeaningsPrompt(lang, words) }] }],
    safetySettings: SAFETY_OFF,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90000),
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, Math.min(120000, 10000 * 2 ** (attempt - 1))));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(
          `Gemini returned no text (${data.candidates?.[0]?.finishReason ?? 'unknown'})`
        );
      }
      return parseMeaningsResponse(words, JSON.parse(text));
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
