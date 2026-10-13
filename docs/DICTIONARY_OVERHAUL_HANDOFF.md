# Dictionary overhaul: handoff

Where the dictionary overhaul stands, how we work on it, and what is left. Written 2026-10-13.

## Goal

Rebuild every word list (`public/{en,es,fr,it,pt}.json`) so each word gets:

- up to 3 English meanings, ordered by how well known they are ([#78](https://github.com/rickcedwhat/polyglot-wordle/issues/78)),
- a fate: **answer** (can be a puzzle solution), **guess only** (accepted as a guess, never a solution), or **removed**,
- for answers, a difficulty tier (easy, intermediate, advanced) instead of the numeric `d` players can see today ([#76](https://github.com/rickcedwhat/polyglot-wordle/issues/76)).

The alpha history purge ([#23](https://github.com/rickcedwhat/polyglot-wordle/issues/23)) comes after this, so the new data format needs no backward compatibility.

## Ground rules

- All work lives on the long-lived branch `feat/dictionary-overhaul`. It merges to `master` only when the whole overhaul is done. No interim PRs to `master` for this work.
- Commit and push to the branch when the user approves. Stage explicit paths.
- Jev's buckets (what a word _is_) stay separate from `POLICY` (what the game _does_ with it). Change one without touching the other.
- Keep manual review minimal: the human is a tie-breaker, not a reviewer of every word.
- One English meanings list per word, shared by every question.
- `evals/artifacts/` is gitignored (about 100 MB). It holds all review results and only exists on this machine. `tmp/` is local scratch, also untracked, and holds backups from earlier runs.

## How a word is decided

Code: `evals/dictionary/wordReview.ts` (questions, gates, `POLICY`), `settle.ts` (Gemini tie-breaker), `overrides.ts` + `overrides.json` (human answers).

1. **Meanings** (Gemini 2.5 Flash, `meanings.ts`): 1–3 English meanings per word, each with its own part of speech and accented spelling.
2. **Jev review** (TypeSafe `systemOne`, multiple choice with probabilities): word-level questions (real word, pronouns attached, grammatical form, which meaning is main, spelling) and per-meaning questions (accuracy, format, offensive, form makes sense, form in everyday use, obscure, CEFR level).
3. **Gates**, in order: real word → single word → meanings → offensive (main meaning only) → form → spelling → familiarity. `POLICY` maps buckets to fates:
   - not a word, pronouns attached, no meanings, slur, nonsense form → removed
   - crude, literary or regional form, obscure → guess only
4. **Sure or unsure**: Jev is sure when its pick has at least 60% (65% for obscure). Removals ("not a word", "nonsense form") need 80%. A word is a **maybe** only when an unsure answer could change its fate.
5. **Familiarity** asks "Would at least 1 in 4 adult native speakers know this meaning?" (known or obscure). If the main meaning looks obscure, it is judged on the best-known other meaning that Jev is at least 60% sure is real (accurate plus inflected form). Offensiveness is always judged on the main meaning.
6. **Gemini tie-breaker** (`settle.ts`): for each maybe, Gemini answers the same unsure question without seeing Jev's pick, with extra guidance on questions where it drifts (offensive, form, real word). At most two rounds. An invalid Gemini answer is skipped and the word stays a maybe.
7. **Human tie-breaker**: answers in `overrides.json` win over Jev and Gemini. Two shapes: `{answers: {question: choice}}` re-runs the rules with that answer, `{fate, difficulty?, reason}` sets the outcome outright.

## Running a batch

```bash
# Seeded sample: --sample=N always includes the previous, smaller samples, and finished words are skipped
for l in en es fr it pt; do npm run eval:dict:review -- --lang=$l --sample=2100; done
```

That runs meanings, Jev review, missing-meaning check and the tie-breaker. Other useful forms:

```bash
npm run eval:dict:review -- --lang=pt --step=settle          # tie-breaker only
npm run eval:dict:review -- --lang=it --words=cazzo,porno     # specific words
npm run eval:dict:review -- --lang=pt --step=obscure          # ask the obscure question where missing
```

`--fresh` wipes that step's whole artifact. To re-ask only some words, delete their entries from `evals/artifacts/settle_{lang}.json` (back it up into `tmp/` first) and re-run `--step=settle` without `--fresh`. Words added by hand with `--words` (crude test words) are not in the sample, so re-run them with `--words`.

A 500-per-language batch takes about 15 minutes, mostly Gemini writing meanings.

## Human review page

`npm run eval:dict:trees` serves `evals/artifacts/word-trees.html` on port 5199 and rebuilds the page on start. On the local dev dashboard it is the `polyglot-word-trees` service; restart it after any artifact or override change. Review mode: `http://localhost:5199/word-trees.html?lang=en&mode=review`.

The review list shows only:

- offensive questions where Gemini overruled Jev,
- questions Gemini never answered,
- words stuck at the meanings gate (Jev doubts the meaning list, which Gemini does not tie-break). These get Answer / Guess only / Remove buttons.

Familiarity and form calls follow Gemini without asking. Answers save to `evals/dictionary/overrides.json` via the page server, and Undo removes them.

## Status

The batch at `--sample=1600` is done (1,600 per language, about 7,900 words, 52% of the total):

| Language   |      Reviewed | Answer (easy / intermediate / advanced) | Guess only | Removed | Undecided |
| :--------- | ------------: | :-------------------------------------- | ---------: | ------: | --------: |
| English    | 1,621 / 3,313 | 312 / 891 / 270                         |        143 |       5 |         0 |
| Spanish    | 1,612 / 2,549 | 551 / 903 / 87                          |         68 |       3 |         0 |
| French     | 1,609 / 2,260 | 374 / 982 / 144                         |        105 |       3 |         1 |
| Italian    | 1,616 / 2,416 | 451 / 885 / 119                         |        110 |      51 |         0 |
| Portuguese | 1,609 / 2,728 | 510 / 911 / 87                          |         93 |       7 |         1 |

Still open in the review list: Spanish _enana_ (offensive) and French _brass_ (fate card; defined as "arms", which is French _bras_, so probably an English leak to remove).

Italian removes far more words than the others (51). Worth a look before the full list ships.

## What we learned about the models

- **Jev at 50–60% is close to a coin flip**, especially on offensiveness and familiarity. It leans toward "obscure" for well-known words (Italian _ascia_ "axe", English _filly_). The thresholds send these to Gemini.
- **Gemini matched the human on every familiarity and form call** across the last batches, which is why those no longer reach the review list.
- **Gemini is weakest on offensiveness**, in both directions. It was too strict on mild insults (_tolos_, _arpia_), on words whose definition text says "vulgar" (_gross_), and on slang undertones (_ficco_). It was too lenient when the sexual meaning dominates in practice (Portuguese _gozou_). Keep offensive calls in human review.
- **Question wording matters more than thresholds.** Two fixes made the biggest difference:
  - The familiarity question "would at least 1 in 4 natives know it" replaced a three-way rarity scale.
  - The form question now says to judge the inflection only, so a rare noun's dictionary form is everyday (_nadir_ had been marked "literary").
- **Gemini sometimes invents meanings**, often English slang bleeding into another language (Italian _ponce_ as "pimp", Spanish _conto_ as a vulgar word). Jev's accuracy check catches some but not all. A made-up meaning can't yet be deleted on its own; only the word's fate can be overridden.
- Jev's per-meaning answers still come from the old form-question wording. Re-asking that one question (like the `obscure` step) would reduce form tie-breaks. It's optional.

## What is left

1. **Finish the review**: about 3 more batches at 500 per language (`--sample=2100`, `2600`, then the full list); English needs about 4. Answer the review list after each, commit `overrides.json`.
2. **Loose ends**:
   - A way to drop a single made-up meaning (like _conto_'s) instead of overriding the whole word.
   - Look into Italian's high removal count.
3. **Data format and app** (#76, #78): write the reviewed results into `public/{lang}.json` with a meanings list, fate and tier per word. Update the game to:
   - pick answers by fate and tier,
   - accept guess-only words,
   - show meanings in the post-game modal, Vocabulary tab and definition popover,
   - hide `d`.
4. **Translations** of the English meanings for players using the app in another language (confirm the scope with the user first).
5. **Final PR** from `feat/dictionary-overhaul` to `master`, then the alpha purge (#23).

`docs/DICTIONARY_PIPELINE.md` describes the older bootstrap pipeline (single definition, numeric `d`); it will need updating once the new format ships.
