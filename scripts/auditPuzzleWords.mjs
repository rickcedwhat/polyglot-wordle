import fs from 'fs';
import path from 'path';

// Parse command-line flags
const args = process.argv.slice(2);
const options = {
  lang: 'all',
  batchSize: 100,
  concurrency: 3,
  limit: Infinity,
  prune: false,
  dryRun: false,
  words: null,
  model: 'gemini-2.5-flash',
};

for (const arg of args) {
  if (arg.startsWith('--lang=')) options.lang = arg.split('=')[1].toLowerCase();
  else if (arg.startsWith('--batch-size=')) options.batchSize = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--concurrency=')) options.concurrency = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
  else if (arg === '--prune') options.prune = true;
  else if (arg === '--dry-run') options.dryRun = true;
  else if (arg.startsWith('--model=')) options.model = arg.split('=')[1];
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

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Call Gemini API to filter invalid words from a batch
async function auditWordsBatch(lang, entries, model, retries = 3) {
  const langName = LANG_NAMES[lang];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are an expert lexicographer and word-puzzle curator auditing 5-letter word candidates for a Wordle-style puzzle game in ${langName} (${lang.toUpperCase()}).

Each item has:
- "key": 5-letter ASCII key used on the puzzle grid (unaccented).
- "word": Standard spelling with proper diacritics/accents/ñ (e.g. key: "arana", word: "araña"; key: "abces", word: "abcès").
Evaluate the word based on its standard spelling in "word". Do NOT flag a word for missing accents/ñ if its "word" property has the correct accent or letter!

From the list below, identify ONLY words that are UNFAIR or INVALID for a Wordle puzzle.
DO NOT include words that are valid, standard common words. Only return entries that should be REJECTED.

A word should be REJECTED if:
1. "proper_noun": It is a personal given name (e.g. Abdul, Corey, Ethel, Vicky, Irene), surname (e.g. Patel, Riggs, Yates), brand/trademark, or specific geographic place/city (e.g. Troie, Lydia, Alger, Alpes), UNLESS it also has an established common noun/verb meaning in lowercase (e.g. "china" for porcelain, "crane" for bird/machine, "diana" for bullseye, "mavis" for song thrush are VALID common words; do not reject them).
2. "multiword": It is a multi-word compound or contraction, such as a Spanish verb with attached enclitic pronouns (e.g., "verlo", "verse", "hazlo", "darse").
3. "abbreviation": It is an abbreviation, acronym, or initialism rather than a standard full word (e.g., "govt", "dept", "mgmt", "abdos", "appli").
4. "non_word_or_gibberish": It is not a real, recognized word in ${langName} (e.g., OCR typo, nonsense letter string, obsolete typo fragment).
5. "offensive": It is an explicit racial, ethnic, or sexual slur inappropriate for a general-audience game.

DO NOT REJECT:
- Standard everyday nouns, verbs, adjectives, adverbs.
- Standard regular inflections: plurals (e.g. "cats", "birds"), standard verb conjugations (e.g. "meets", "ran", "habla", "mange", "prend") are 100% VALID.
- Widely recognized loanwords or casual colloquial terms.
- Words with diacritics (like "araña", "añada", "abcès", "abîme") are 100% VALID common words.

Words to audit (${entries.length}):
${JSON.stringify(entries)}
`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            category: {
              type: 'string',
              enum: ['proper_noun', 'multiword', 'abbreviation', 'non_word_or_gibberish', 'offensive'],
            },
            reason: { type: 'string' },
          },
          required: ['key', 'category', 'reason'],
        },
      },
    },
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          console.warn(`⏳ Rate limited (429). Backing off for ${attempt * 4}s...`);
          await sleep(attempt * 4000);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return [];
      }

      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === retries) throw err;
      await sleep(1500);
    }
  }
  return [];
}

async function runConcurrentAudit(lang, chunks, concurrency, model) {
  const allInvalid = [];
  let completed = 0;

  async function worker(chunkIndex) {
    const chunk = chunks[chunkIndex];
    const keySet = new Set(chunk.map((item) => item.key.toLowerCase()));
    try {
      const invalidInChunk = await auditWordsBatch(lang, chunk, model);
      for (const item of invalidInChunk) {
        const k = item.key.toLowerCase();
        if (keySet.has(k)) {
          allInvalid.push({
            key: k,
            category: item.category,
            reason: item.reason,
          });
        }
      }
    } catch (err) {
      console.error(`\n❌ Error processing batch ${chunkIndex + 1}: ${err.message}`);
    } finally {
      completed++;
      process.stdout.write(
        `\r  [${lang.toUpperCase()}] Progress: ${completed}/${chunks.length} batches (${allInvalid.length} invalid flagged)`
      );
    }
  }

  // Queue-based worker pool
  let nextIndex = 0;
  async function next() {
    while (nextIndex < chunks.length) {
      const idx = nextIndex++;
      await worker(idx);
      await sleep(300); // small polite pacing between worker calls
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => next());
  await Promise.all(workers);
  process.stdout.write('\n');

  return allInvalid;
}

async function auditLanguage(lang) {
  const filePath = path.resolve(process.cwd(), `public/${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Dictionary file public/${lang}.json not found!`);
    return;
  }

  const dictionary = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let candidateKeys = Object.keys(dictionary);

  if (options.words && options.words.length > 0) {
    candidateKeys = candidateKeys.filter((k) => options.words.includes(k));
  }

  if (options.limit && options.limit < candidateKeys.length) {
    candidateKeys = candidateKeys.slice(0, options.limit);
  }

  console.log(`\n🔍 Auditing [${lang.toUpperCase()}]: ${candidateKeys.length} words (batches of ${options.batchSize}, concurrency ${options.concurrency})...`);

  const entriesToAudit = candidateKeys.map((key) => ({
    key,
    word: dictionary[key]?.display || key,
  }));

  const chunks = chunkArray(entriesToAudit, options.batchSize);
  const invalidEntries = await runConcurrentAudit(lang, chunks, options.concurrency, options.model);

  // De-duplicate by key
  const uniqueInvalidMap = new Map();
  for (const item of invalidEntries) {
    uniqueInvalidMap.set(item.key, item);
  }
  const uniqueInvalid = Array.from(uniqueInvalidMap.values());

  // Save audit report
  const reportPath = path.resolve(process.cwd(), `audit_report_${lang}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(uniqueInvalid, null, 2) + '\n');
  console.log(`📄 Saved audit report to: ${reportPath}`);

  // Summary by category
  const categories = {};
  for (const item of uniqueInvalid) {
    categories[item.category] = (categories[item.category] || 0) + 1;
  }
  console.log(`📊 Invalid words breakdown for ${lang.toUpperCase()} (${uniqueInvalid.length} total):`);
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`  - ${cat}: ${count}`);
  }

  // Prune if requested
  if (options.prune && !options.dryRun && uniqueInvalid.length > 0) {
    console.log(`✂️ Pruning ${uniqueInvalid.length} invalid words from public/${lang}.json...`);
    for (const item of uniqueInvalid) {
      delete dictionary[item.key];
    }
    fs.writeFileSync(filePath, JSON.stringify(dictionary, null, 2) + '\n');
    console.log(`✅ Successfully pruned! Remaining words: ${Object.keys(dictionary).length}`);
  }

  return { total: candidateKeys.length, invalid: uniqueInvalid.length, uniqueInvalid };
}

async function main() {
  const languages = options.lang === 'all' ? ['en', 'es', 'fr'] : [options.lang];
  console.log(`🚀 Starting Word Puzzle Audit Pipeline (Prune: ${options.prune}, DryRun: ${options.dryRun})`);

  for (const lang of languages) {
    await auditLanguage(lang);
  }

  console.log('\n✨ All audits completed!');
}

main().catch((err) => {
  console.error('\n💥 Fatal pipeline error:', err);
  process.exit(1);
});
