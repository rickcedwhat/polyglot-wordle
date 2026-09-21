# Multilingual Dictionary Pipeline & Playbook

This document defines the complete end-to-end architecture, lessons learned, cost model, and execution playbook for bootstrapping, enriching, evaluating, and maintaining 5-letter dictionaries across any language in Polyglot Wordle.

---

## 1. Core Architecture

Our dictionary engine uses a **two-tier AI architecture**:

```
[Raw 5-Letter Wordlist]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Ingestion & Normalization                      │
│ - 5-letter ASCII key normalization (e.g. "ovulo")      │
│ - Diacritic display preservation (e.g. "óvulo")        │
│ - Loanword & profanity filtering                       │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Gemini 2.5 Flash Structured Lexicography       │
│ - Generates concise English educational definitions    │
│ - Standardizes Parts of Speech (noun, verb, adj, etc.) │
│ - Cites inflected verb/plural lemmas in parentheses    │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: TypeSafe Jev System One Evaluation            │
│ - 3 Multiple-choice decisions per word:               │
│     1. Definition Accuracy (Base form vs Inflection)   │
│     2. Editorial Formatting Hygiene                   │
│     3. Calibrated Difficulty Tier (4-tier rubric)      │
│ - Rate: ~35 words/sec (zero LLM token generation)      │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ Stage 4: Automated Remediation & Calibration Loop      │
│ - Auto-calibrates difficulty 'd' to Jev consensus      │
│ - Targeted Gemini re-enrichment for flagged definitions│
│ - Fast re-evaluation via review queue (`--queue`)       │
└────────────────────────────────────────────────────────┘
          │
          ▼
[Clean 100% Passing Dictionary JSON] -> `public/{lang}.json`
```

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

### C. Difficulty Rubric & Score Distribution
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

### D. Strict POS Normalization
- Enforce the standard POS schema: `noun`, `verb`, `adj`, `adv`, `pron`, `intj`, `num`.
- Avoid abbreviations that evaluators might confuse (e.g., ensure `pron` is used for pronouns instead of mislabeling as `noun`).

### E. Guard Against Unnecessary Language Prefixes
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

### Step 1: Prepare Raw Word List
Create a raw text file `data/pt_words.txt` containing valid 5-letter Portuguese words (one per line).

### Step 2: Run the All-in-One Bootstrap Pipeline
Run the master script to ingest, enrich with Gemini, evaluate with Jev, calibrate difficulty, and remediate in a single command:

```bash
node scripts/bootstrapDictionary.mjs \
  --lang=pt \
  --name=Portuguese \
  --words=data/pt_words.txt \
  --step=all
```

Or run modularly step-by-step:
```bash
# 1. Ingest raw word list
node scripts/bootstrapDictionary.mjs --lang=pt --name=Portuguese --words=data/pt_words.txt --step=ingest

# 2. Enrich definitions and POS with Gemini 2.5 Flash
node scripts/bootstrapDictionary.mjs --lang=pt --step=enrich

# 3. Evaluate with TypeSafe Jev System One
node scripts/bootstrapDictionary.mjs --lang=pt --step=eval

# 4. Auto-remediate flagged entries and calibrate difficulty
node scripts/bootstrapDictionary.mjs --lang=pt --step=remediate

# 5. Run strict validation tests
node scripts/bootstrapDictionary.mjs --lang=pt --step=test
```

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

- `scripts/bootstrapDictionary.mjs`: Unified master pipeline for adding or auditing any language.
- `scripts/enrichDefinitions.mjs`: Standalone Gemini batch definition generator.
- `evals/dictionary/runEval.ts`: TypeSafe Jev evaluation harness with `--queue` support.
- `evals/dictionary/scorers.ts`: Jev prompt definitions and difficulty rubrics.
- `src/utils/dictionary.test.ts`: Vitest test suite enforcing 100% dictionary integrity.
