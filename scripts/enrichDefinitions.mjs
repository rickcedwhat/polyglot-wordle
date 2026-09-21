import fs from 'fs';
import path from 'path';

// Parse command-line flags
const args = process.argv.slice(2);
const options = {
  lang: 'all',
  batchSize: 40,
  limit: Infinity,
  filter: 'review-queue', // default to review-queue to fix audit queue entries
  dryRun: false,
  words: null,
  model: 'gemini-2.5-flash',
  queuePath: null,
};

for (const arg of args) {
  if (arg.startsWith('--lang=')) options.lang = arg.split('=')[1].toLowerCase();
  else if (arg.startsWith('--batch-size=')) options.batchSize = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--filter=')) options.filter = arg.split('=')[1].toLowerCase();
  else if (arg === '--dry-run') options.dryRun = true;
  else if (arg.startsWith('--model=')) options.model = arg.split('=')[1];
  else if (arg.startsWith('--queue=')) options.queuePath = arg.split('=')[1];
  else if (arg.startsWith('--words=')) {
    options.words = arg
      .split('=')[1]
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
  }
}

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=').replace(/^["']|["']$/g, '');
        if (key && val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('\n❌ GEMINI_API_KEY is not set.');
  console.error('Please add GEMINI_API_KEY="your_api_key_here" to your .env.local file or pass it in the environment.\n');
  process.exit(1);
}

const LANG_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Detect low-quality definitions
function isLowQuality(def) {
  if (!def || typeof def !== 'string') return true;
  const d = def.toLowerCase().trim();
  if (d.length < 20) return true;
  if (
    d.includes('a term denoting') ||
    d.includes('plural of') ||
    /\bonly used in\b/.test(d) ||
    d.includes('post-1990') ||
    d.includes('recognized word used') ||
    d.includes('state, object, or action') ||
    d.startsWith('past participle') ||
    d.startsWith('present participle') ||
    d.startsWith('third-person') ||
    d.startsWith('first-person') ||
    d.startsWith('second-person') ||
    d.endsWith('present indicative.') ||
    d.endsWith('present subjunctive.')
  ) {
    return true;
  }
  return false;
}

// Helper to chunk array
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Call Gemini API with structured output and retries
async function enrichBatchWithGemini(lang, wordEntries, model, retries = 3) {
  const langName = LANG_NAMES[lang];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are an expert lexicographer for a language-learning word puzzle game.
Your task is to provide accurate, concise, modern definitions (in English) and grammatical part-of-speech (POS) tags for 5-letter ${langName} words.

Target Language: ${langName} (${lang.toUpperCase()})
Instructions:
1. All definitions MUST be written in English so English-speaking players can learn what the ${langName} word means.
2. Length: 10 to 25 words per definition. Concise, clear, educational, and natural.
3. Quality Rules:
   - NEVER use lazy or circular formulas like "A term denoting X", "Plural of X", "Pertaining to X", or "Only used in...".
   - If a word is an inflected form (conjugated verb or plural noun), explain what the word actually MEANS in English first, and place the grammatical inflection in parentheses at the very end.
     Format strictly as: "[Clear, concise English definition of what the word means] (inflection note, e.g. present tense of frenar)."
     Example for Spanish "frena": "Slows down, stops, or applies the brakes to a vehicle or motion (present tense of frenar)."
     Example for Spanish "place": "Pleases, gratifies, or satisfies someone (present tense of placer)."
     Example for French "admet": "Accepts, acknowledges, or allows someone or something in (present tense of admettre)."
     Example for English "begun": "Started, initiated, or set into motion (past participle of begin)."
     Example for English "whirs": "Produces a continuous low buzzing or humming sound (third-person singular present of whir)."
     NEVER return a definition that is ONLY a grammatical label like "third-person singular present indicative." without explaining what the word means!
   - For words with archaic or obsolete meanings, prioritize the primary MODERN everyday meaning (e.g. for English "abode", define "A place of residence or home", NOT "act of waiting").
   - For French/Spanish loanwords (e.g. "short" in Spanish), define how it is commonly used in that language ("Casual above-the-knee pants worn for sports or warm weather.").
4. POS: Must be strictly one of: "noun", "verb", "adj", "adv".
5. display: Provide the standard diacritics/accents for the word if applicable (e.g., "abcès" for "abces", "árbol" for "arbol"), or lowercase unaccented if none.

Input Words:
${JSON.stringify(
  wordEntries.map((w) => ({
    key: w.key,
    display: w.display || w.key,
    currentDef: w.def,
    currentPos: w.pos,
  })),
  null,
  2
)}
`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            display: { type: 'string' },
            pos: { type: 'string', enum: ['noun', 'verb', 'adj', 'adv'] },
            def: { type: 'string' },
          },
          required: ['key', 'display', 'pos', 'def'],
        },
      },
    },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(75000),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 429 && attempt < retries) {
          const waitTime = attempt * 3000;
          console.warn(`⚠️ Rate limited (429). Retrying in ${waitTime / 1000}s...`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`Gemini API error (${res.status} ${res.statusText}): ${errText}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API returned an empty response');
      }

      return JSON.parse(text);
    } catch (err) {
      if (attempt < retries) {
        console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}. Retrying in 2s...`);
        await sleep(2000);
      } else {
        throw err;
      }
    }
  }
}

// Main runner
async function processLanguage(lang) {
  const filePath = path.join(process.cwd(), 'public', `${lang}.json`);
  const backupPath = path.join(process.cwd(), 'public', `${lang}.json.bak`);

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const dict = JSON.parse(raw);

  // Backup file if not already backed up
  if (!options.dryRun && !fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, raw, 'utf8');
    console.log(`📦 Created backup at ${backupPath}`);
  }

  // Filter words to process
  let candidates = Object.entries(dict).map(([key, item]) => ({
    key,
    display: item.display || key,
    pos: item.pos,
    d: item.d,
    def: item.def,
    reviewed: item.reviewed,
  }));

  if (options.words && options.words.length > 0) {
    const wordSet = new Set(options.words);
    candidates = candidates.filter((c) => wordSet.has(c.key));
  } else if (options.filter === 'review-queue') {
    const queueFile = options.queuePath || path.join(process.cwd(), 'evals/artifacts/review_queue.json');
    if (fs.existsSync(queueFile)) {
      const qData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      const flaggedSet = new Set(
        (qData.queue || [])
          .filter(
            (item) =>
              item.lang === lang &&
              ((item.definitionVerdict !== 'accurate' &&
                item.definitionVerdict !== 'inflected_form') ||
                item.formatVerdict !== 'clean_dictionary')
          )
          .map((item) => item.word)
      );
      candidates = candidates.filter((c) => flaggedSet.has(c.key));
    } else {
      console.warn(`⚠️ Queue file not found at ${queueFile}, falling back to low-quality filter.`);
      candidates = candidates.filter((c) => isLowQuality(c.def));
    }
  } else if (options.filter === 'low-quality') {
    candidates = candidates.filter((c) => isLowQuality(c.def));
  }

  if (options.limit < candidates.length) {
    candidates = candidates.slice(0, options.limit);
  }

  console.log(
    `\n🔍 [${LANG_NAMES[lang].toUpperCase()}]: Found ${candidates.length} candidates to enrich (filter: ${options.filter}, batchSize: ${options.batchSize})`
  );

  if (candidates.length === 0) return;

  const batches = chunkArray(candidates, options.batchSize);

  for (let bIndex = 0; bIndex < batches.length; bIndex++) {
    const batch = batches[bIndex];
    const progress = `[${bIndex + 1}/${batches.length}]`;
    console.log(`\n⏳ ${progress} Sending batch of ${batch.length} ${lang.toUpperCase()} words to Gemini...`);

    try {
      const enrichedList = await enrichBatchWithGemini(lang, batch, options.model);

      let updatedCount = 0;
      for (const item of enrichedList) {
        const normKey = item.key
          ? item.key
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/ñ/g, 'n')
              .replace(/ç/g, 'c')
              .toLowerCase()
          : '';
        const orig = dict[normKey] || dict[item.key] || {};

        if (!options.dryRun && normKey && /^[a-z]{5}$/.test(normKey)) {
          dict[normKey] = {
            ...orig,
            display: item.display || orig.display || normKey,
            pos: item.pos,
            def: item.def,
            reviewed: true,
          };
          updatedCount++;
        }
      }

      // Sample first 2 words in batch for log readability
      if (enrichedList.length > 0) {
        const s1 = enrichedList[0];
        console.log(`   Sample: "${s1.display || s1.key}" (${s1.pos}) -> "${s1.def.slice(0, 60)}..."`);
        if (enrichedList.length > 1) {
          const s2 = enrichedList[1];
          console.log(`   Sample: "${s2.display || s2.key}" (${s2.pos}) -> "${s2.def.slice(0, 60)}..."`);
        }
      }

      if (!options.dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + '\n', 'utf8');
        console.log(`✅ ${progress} Checkpoint saved (${updatedCount} words updated in ${lang}.json)`);
      }

      // Small throttle between batches
      if (bIndex < batches.length - 1) {
        await sleep(1500);
      }
    } catch (err) {
      console.error(`❌ Batch ${bIndex + 1} failed:`, err.message);
      console.error('Proceeding to next batch. Checkpoint saved up to last successful batch.');
      await sleep(3000);
      continue;
    }
  }
}

async function main() {
  console.log(`🚀 Polyglot Wordle Dictionary Enrichment (Model: ${options.model})`);
  if (options.dryRun) console.log('⚠️  DRY RUN MODE ENABLED — No files will be modified.');

  const targetLangs = options.lang === 'all' ? ['en', 'es', 'fr'] : [options.lang];

  for (const lang of targetLangs) {
    await processLanguage(lang);
  }

  console.log('\n🎉 Enrichment complete across all selected languages!');
}

main().catch(console.error);
