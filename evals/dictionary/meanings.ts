import { getLanguageName } from './lexicalValidity';
import { Language } from './types';

export const POS_VALUES = ['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num'] as const;
export type Pos = (typeof POS_VALUES)[number];

export interface Meaning {
  pos: Pos;
  def: string;
  /** The word with this meaning's accents (Spanish "sabía" = knew, "sabia" = wise). */
  spelling?: string;
}

export interface MeaningsResult {
  word: string;
  /** The first meaning's spelling. */
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
export const MEANINGS_TASK = 'meanings_v5';

/** Language the definitions are written in: English, or the word's own language. */
export type DefLanguage = 'en' | 'native';

export function buildMeaningsPrompt(
  lang: Language,
  words: MeaningsInput[],
  defLanguage: DefLanguage = 'en'
) {
  const langName = getLanguageName(lang);
  const defName = defLanguage === 'native' ? langName : 'English';
  return `You are a lexicographer for a multilingual Wordle game that teaches players what ${langName} words mean.
For each 5-letter ${langName} word below, list its distinct meanings in modern ${langName}, written in ${defName}.

Rules:
1. List 1 to ${MAX_MEANINGS} meanings, ordered by how often native speakers use them today, across all major regions where the language is spoken (e.g. both US and UK English). The first meaning must be the one most people think of first, even when it is vulgar or slang.
2. Only list meanings that are genuinely different (different sense or different part of speech). Do not split one meaning into near-synonyms. Skip archaic or very rare meanings, unless the word has no other meaning: then list them and start the definition with "Archaic:" or "Rare:".
3. Include vulgar, slang, sexual or offensive meanings when they are a real, common use of the word. Define them plainly and factually, like a good dictionary does. Never skip or soften a meaning because it is rude, and never invent one. Equally, do not make a word sound harsher than it is: only call a meaning "derogatory", "offensive" or "insulting" when that is how it is mainly used today. An unflattering or old-fashioned word for a person (e.g. "an old woman, often thought of as ugly") is not automatically derogatory.
4. If the spelling is both a conjugated verb and a noun/adjective (e.g. English "barns", Spanish "frena"), list each reading as its own meaning, in order of how common it is.
5. For a conjugated verb or inflected meaning, give the meaning first and cite the lemma in parentheses at the end, e.g. "Slows down or applies the brakes (present tense of frenar)."
6. If the word is spelled like an English word but is a real ${langName} word, define the ${langName} meaning, never the English one.
7. Each definition: 8 to 25 words, plain ${defName}, no circular formulas like "Plural of X" or "Pertaining to X". Do not start with "In ${langName}".
8. pos must be one of: ${POS_VALUES.join(', ')}.
9. spelling: for each meaning, the word with that meaning's standard accents, lowercase. The key is written without accents, so it can stand for several ${langName} words that differ only by accents, and each one gets its own spelling (e.g. Spanish "sabia": "sabía" = knew, "sabia" = wise; French "finit": "finit" = finishes, "finît" = would finish). Most words have the same spelling for every meaning.
10. Return an empty meanings list only if the word has no real ${langName} meaning at all (only a name, a foreign word ${langName} speakers do not use, gibberish). Archaic, rare, regional, slang and borrowed words that ${langName} speakers do use still get meanings. Do not invent one.
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
      meanings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            spelling: { type: 'string' },
            pos: { type: 'string', enum: [...POS_VALUES] },
            def: { type: 'string' },
          },
          required: ['spelling', 'pos', 'def'],
        },
      },
    },
    required: ['key', 'meanings'],
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
  const byKey = new Map<string, { meanings?: unknown }>();
  for (const item of raw) {
    if (item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string') {
      byKey.set((item as { key: string }).key, item as { meanings?: unknown });
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
      .map((m) => ({ pos: m.pos, def: m.def.trim(), spelling: spellingFor(w, m.spelling) }));
    return { word: w.word, display: meanings[0]?.spelling ?? w.display ?? w.word, meanings };
  });
}

const stripAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Gemini's spelling when it is the key with accents, otherwise the word's current display. */
function spellingFor(w: MeaningsInput, spelling: unknown): string {
  const s = typeof spelling === 'string' ? spelling.trim().toLowerCase() : '';
  return s && stripAccents(s) === w.word ? s : (w.display ?? w.word);
}

export async function generateMeanings(
  lang: Language,
  words: MeaningsInput[],
  apiKey: string,
  model = 'gemini-2.5-flash',
  defLanguage: DefLanguage = 'en'
): Promise<MeaningsResult[]> {
  return callGemini(
    buildMeaningsPrompt(lang, words, defLanguage),
    RESPONSE_SCHEMA,
    apiKey,
    model,
    (raw) => parseMeaningsResponse(words, raw)
  );
}

export interface TranslateInput {
  key: string;
  defs: string[];
}

/** Translates English definitions into the word's own language, keeping their order. */
export async function translateMeanings(
  lang: Language,
  items: TranslateInput[],
  apiKey: string,
  model = 'gemini-2.5-flash'
): Promise<Record<string, string[]>> {
  const langName = getLanguageName(lang);
  const prompt = `Translate each English dictionary definition below into natural ${langName}, as a ${langName} dictionary would word it. Keep the meaning exact: do not soften vulgar or offensive meanings, and do not add or drop details. Keep the same number of definitions, in the same order. Return one result for every key.

${JSON.stringify(items, null, 2)}
`;
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: { key: { type: 'string' }, defs: { type: 'array', items: { type: 'string' } } },
      required: ['key', 'defs'],
    },
  };
  return callGemini(prompt, schema, apiKey, model, (raw) => {
    const rows = raw as TranslateInput[];
    const out: Record<string, string[]> = {};
    for (const item of items) {
      const found = rows.find((r) => r.key === item.key);
      if (!found || found.defs.length !== item.defs.length) {
        throw new Error(`Translation mismatch for "${item.key}"`);
      }
      out[item.key] = found.defs;
    }
    return out;
  });
}

export async function callGemini<T>(
  prompt: string,
  schema: object,
  apiKey: string,
  model: string,
  parse: (raw: unknown) => T
): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    safetySettings: SAFETY_OFF,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: schema,
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
      return parse(JSON.parse(text));
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
