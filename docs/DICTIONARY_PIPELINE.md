# Multilingual Dictionary Pipeline & Playbook

This document defines the complete end-to-end architecture, lessons learned, cost model, and execution playbook for bootstrapping, enriching, evaluating, and maintaining 5-letter dictionaries across any language in Polyglot Wordle.

---

## 1. Core Architecture

Our dictionary engine uses a **two-tier AI architecture**:

```
[OpenSubtitles FrequencyWords 50k]
          │  seed (HermitDave / captions)
          ▼
[Raw 5-Letter Wordlist]  data/{lang}_words.txt
          │  ingest
          ▼
[Stub Dictionary JSON]  public/{lang}.json
          │  filter (Jev lexical validity, prune conf ≥ 0.7)
          ▼
[Clean Seed Dictionary]  (names / English leaks / junk removed)
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Gemini 2.5 Flash Structured Lexicography       │
│ - Generates concise English educational definitions    │
│ - Standardizes Parts of Speech (noun, verb, adj, etc.) │
│ - Cites inflected verb/plural lemmas in parentheses    │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: TypeSafe Jev System One Evaluation            │
│ - 3 Multiple-choice decisions per word:               │
│     1. Definition Accuracy (Base form vs Inflection)   │
│     2. Editorial Formatting Hygiene                   │
│     3. Calibrated Difficulty Tier (4-tier rubric)      │
│ - Rate: ~35 words/sec (zero LLM token generation)      │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: Automated Remediation & Calibration Loop      │
│ - Auto-calibrates difficulty 'd' to Jev consensus      │
│ - Targeted Gemini re-enrichment for flagged definitions│
│ - Fast re-evaluation via review queue (`--queue`)       │
└────────────────────────────────────────────────────────┘
          │
          ▼
[Clean 100% Passing Dictionary JSON] -> `public/{lang}.json`
```

### Stage 0 detail: Seed wordlist
EN/ES/FR historically came from **HermitDave [FrequencyWords](https://github.com/hermitdave/FrequencyWords)** (OpenSubtitles caption corpus, `word count` per line). The `seed` step downloads `{lang}_50k.txt`, keeps subtitle frequency order, and filters to Wordle-eligible tokens:
- display length 5 (Unicode characters, accents OK)
- ASCII key length 5 after diacritic stripping (`então` → `entao`)
- deduped by key; light banlist applied

Output: `data/{lang}_words.txt` (corpus cache: `data/{lang}_50k.txt`).

### Stage 0.5 detail: Jev lexical filter (before enrich)
Caption frequency lists leak English, character names, abbreviations, and gibberish. After ingest, `--step=filter` runs a **definition-free** Jev System One screen:

| Verdict | Action |
| :--- | :--- |
| `valid` | Keep |
| `proper_noun` / `foreign_leak` / `non_word` / `multiword_or_clitic` / `abbreviation` / `offensive` | Prune if confidence ≥ **0.7** (default) |

Artifacts land in `evals/artifacts/validity_{lang}.*`. Full pipeline (`--step=all`) runs filter automatically; bypass with `--skip-filter`.

---

## 2. Key Lessons Learned (Hard-Won Rules)

### A. The Homograph & False Friend Trap
- **Problem**: When a foreign word shares the exact spelling of an English word (`venue`, `about`, `types`, `cents`, `moral`, `pulse`, `dudes`), zero-shot LLM evaluators frequently assume the word is English and flag valid target-language meanings as `wrong_meaning` or `fabricated`.
- **Solution**: Explicitly ground the definition in the target language and cite its lemma/idiom:
  - *Bad*: `"The extreme end or butt joint of a structural beam."` &rarr; Jev expects English "about".
  - *Good*: `"In French carpentry and engineering, the end cut or butt end of a piece of timber (un about de poutre)."` &rarr; **Passes cleanly**.

### B. Inflection & Subjunctive Definition Grammar
- **Problem**: Definitions starting with *"That I, he, or she [verb]..."* or dangling fragments (e.g., *"Been required..."*) trigger `malformed_syntax` or `vague_circular`.
- **Solution**:
  1. Always start with the active English meaning.
  2. Put the exact grammatical citation in parentheses at the very end.
  3. Citing the specific subject pronoun helps Jev recognize valid inflections (`tu liras`, `no dudes`, `je romps`):
  - *Bad*: `"That you (informal singular) doubt or question something."`
  - *Good*: `"Conjugated form of the Spanish verb dudar (to doubt): no dudes (second-person singular present subjunctive)."` &rarr; **`inflected_form`, `clean_dictionary`**.

### C. Anti-thrash (no endless Gemini↔Jev loops)
- Each flagged word gets at most **`--max-rewrite-attempts` (default 2)** Gemini rewrites.
- After the second failed rewrite→Jev cycle, the word is **removed from the active review queue** and appended to `evals/artifacts/manual_review_{lang}.json` for human inspection.
- Vertical `--step=wave` always stops after one enrich→eval→remediate cycle; re-run for the next batch.
- Prefer `--step=wave --wave-size=40` (or 80) over shell `while` loops that re-call remediate until the queue is empty.

### D. Difficulty Rubric & Score Distribution
- **Rubric**:
  - `elementary` ($d \le 0.50$): Daily conversational vocabulary known by all speakers (*agua*, *pomme*, *casa*).
  - `intermediate` ($0.50 < d \le 0.80$): Familiar everyday words, common verbs, adjectives (*frenar*, *blair*).
  - `advanced` ($0.80 < d \le 0.90$): Sophisticated, domain-specific, anatomical, or educated words (*aorta*, *fémur*, *sonar*, *about*).
  - `obscure` ($d > 0.90$): Reserved **strictly** for truly archaic, obsolete, or specialized jargon (*xylem*, *chyme*, *bosco*).
- **Target Distribution**:
  - Elementary: **~30%–35%**
  - Intermediate: **~40%–50%**
  - Advanced: **~10%–15%**
  - Obscure: **~7%–12%** (previously inflated at >27% before calibration).

### E. Strict POS Normalization
- Enforce the standard POS schema: `noun`, `verb`, `adj`, `adv`, `pron`, `intj`, `num`.
- Avoid abbreviations that evaluators might confuse (e.g., ensure `pron` is used for pronouns instead of mislabeling as `noun`).

### F. Guard Against Unnecessary Language Prefixes
- **Rule**: Do **NOT** prepend *"In French..."*, *"In Spanish..."*, or *"In Portuguese..."* to definitions unnecessarily.
- **Exceptions**: Only include language context if it is **genuinely part of the definition** (e.g., culturally specific idioms, local street argot, or parenthetical homograph disambiguation like `(un about de poutre)`). The vast majority of definitions should define the word directly in English.

---

## 3. Cost & Performance Model (per 2,500-word Dictionary)

| Component | Model / Engine | Volume | Tokens / Calls | Estimated Cost (USD) | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Enrichment** | Gemini 2.5 Flash | 2,500 words (40/batch) | ~600k input / ~250k output | **~$0.12 - $0.20** | ~60-90s |
| **Evaluation** | TypeSafe Jev System One | 2,500 entries (3 Qs each) | 2,500 calls (@ 35 words/sec) | **~$1.25 - $2.00** | ~70s |
| **Remediation** | Gemini + Jev Loop | ~50–100 flagged entries | ~25k tokens / 100 Jev calls | **~$0.05** | ~10-15s |
| **Total Pipeline** | **Gemini + Jev** | **2,500 words** | **End-to-End Run** | **< $2.50 USD** | **~3 - 5 min** |

---

## 4. Step-by-Step Blueprint: Adding Portuguese (`pt`)

### Step 1: Seed the starting wordlist (captions / frequency)
Generate `data/pt_words.txt` from the OpenSubtitles FrequencyWords list (same source EN/ES/FR used):

```bash
# Full eligible list (~5k words for Portuguese)
npm run bootstrap:dict -- --lang=pt --name=Portuguese --step=seed

# Or a cheap pilot slice first
npm run bootstrap:dict -- --lang=pt --name=Portuguese --limit=200 --step=seed
```

Brazilian Portuguese corpus (if preferred): `--freq-lang=pt_br` when that list exists upstream. Re-download with `--refresh-source`.

### Step 2: Run the bootstrap pipeline
```bash
npm run bootstrap:dict -- \
  --lang=pt \
  --name=Portuguese \
  --step=all
```

`--step=all` auto-runs `seed` when `--words` is omitted. Or run modularly:

```bash
# 0. Seed from FrequencyWords (skip if you already have data/pt_words.txt)
npm run bootstrap:dict -- --lang=pt --name=Portuguese --step=seed

# 1. Ingest raw word list
npm run bootstrap:dict -- --lang=pt --name=Portuguese --words=data/pt_words.txt --step=ingest

# 2. Jev lexical filter — prune names / English leaks / junk (conf ≥ 0.7)
npm run bootstrap:dict -- --lang=pt --step=filter

# 3. Enrich definitions and POS with Gemini 2.5 Flash
npm run bootstrap:dict -- --lang=pt --step=enrich

# 4. Evaluate definitions with TypeSafe Jev System One
npm run bootstrap:dict -- --lang=pt --step=eval

# 5. Auto-remediate flagged entries and calibrate difficulty (batched waves)
npm run bootstrap:dict -- --lang=pt --step=remediate --rewrite-limit=80
# Re-run the same command until the queue is clean. Each wave:
#   - calibrates difficulty for the whole queue (free)
#   - rewrites up to 80 bad defs with Gemini
#   - re-evals with Jev and prints a scorecard
#   - writes evals/artifacts/remediate_progress_pt.json

# 6. Run strict validation tests
npm run bootstrap:dict -- --lang=pt --step=test
```

`--step=all` runs seed (if needed) → ingest → **filter** → enrich → eval → remediate → test. Bypass the Jev seed screen with `--skip-filter`. Standalone: `npm run eval:dict:validity -- --lang pt --prune`.

Remediate defaults to `--rewrite-limit=80` so Gemini quota isn’t burned in one shot; use `--rewrite-limit=0` only when you intentionally want unlimited rewrites.

Ingestion validates and normalizes candidate structure only. The separate `npm run audit:words` Gemini auditor remains available for existing dictionaries; the bootstrap `filter` step is the preferred pre-enrich gate for new languages.

### Step 3: Integrate with Test Suite
Update `src/utils/dictionary.test.ts` to include the new dictionary:
```ts
import ptDict from '../../public/pt.json';

const dictionaries = [
  { lang: 'en', data: enDict },
  { lang: 'es', data: esDict },
  { lang: 'fr', data: frDict },
  { lang: 'pt', data: ptDict },
];
```
Run tests:
```bash
npm run test:dict
npm test
```

### Step 4: Add UI Language Option
Add `'pt'` to `src/types.ts` / language dropdown selectors in the UI.

---

## 5. Script Directory Reference

- `scripts/bootstrapDictionary.mjs`: Unified master pipeline (`seed` → ingest → **filter** → enrich → eval → remediate → test).
- `evals/dictionary/runValidity.ts` / `lexicalValidity.ts`: Jev lexical seed screen + prune (`npm run eval:dict:validity`).
- `data/{lang}_50k.txt`: Cached HermitDave FrequencyWords corpus (gitignored).
- `data/{lang}_words.txt`: Filtered 5-letter seed list produced by `--step=seed` (and re-written by `--step=filter`).
- `scripts/enrichDefinitions.mjs`: Standalone Gemini batch definition generator.
- `evals/dictionary/runEval.ts`: TypeSafe Jev definition-QA harness with `--queue` support.
- `evals/dictionary/scorers.ts`: Jev prompt definitions and difficulty rubrics.
- `src/utils/dictionary.test.ts`: Vitest test suite enforcing 100% dictionary integrity.
