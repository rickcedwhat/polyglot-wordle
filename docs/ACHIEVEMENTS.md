# Achievements

Everything marked **Live** is built; the rest are ideas. Names, icons, descriptions, and thresholds live in `src/achievements/config.ts`.

There are two kinds of achievement:

- **Tracks** grow with long-term play and have levels (for example A1 to C2). They are about learning and commitment.
- **Feats** are single moments inside a game. They should be rare enough to feel special. Some can be earned more than once, with the count shown on the profile.

Each feat also says when it can happen, because a solved board makes some feats much easier:

- **All open:** only counts while no board is solved yet.
- **Any time:** counts no matter how many boards are already solved (usually because it's about one board, or because solved boards make it harder, not easier).
- **Whole game:** judged on the finished game, so it doesn't apply.

"Seen" figures come from the 88 completed alpha games (69 wins). One player played 82 of them, so treat them as rough.

## Where they show up

Storybook: **Badges** and **Profile / Achievements**.

| Place                  | Feats                                                                                                                   | Tracks                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **During the game**    | A notification the moment it happens (for example "Out of Nowhere: solved the Spanish board with only 1 letter known"). | No. Level-ups can wait for the end of the game.                             |
| **Post-game summary**  | An "Earned this game" list with each feat and its detail.                                                               | Any level reached with this game (for example "Spanish certification: B1"). |
| **Game history cards** | A row of small medals on the card; hover or tap for the name.                                                           | A small hexagon for any level reached in that game.                         |
| **Profile**            | A badge case: every feat, times earned, and how to get the locked ones.                                                 | Current level and progress to the next.                                     |

Badge art: feats are round medals colored by category (Solving teal, Multi-language violet, Just for fun pink), gray with a lock until earned. Tracks are hexagons showing the current level, colored bronze, silver, or gold as you climb.

Names, icons, and descriptions must be easy to change later:

- Every feat and track is defined in **one config file** (`src/achievements/config.ts`): a permanent `id` plus its display name, icon, description, category, and levels.
- Code refers to feats and tracks **only by `id`**. Renaming "Out of Nowhere" or "B1", or swapping an icon, is a one-line edit in the config.
- Icons go through the same config entry (a Tabler icon or an emoji/flag string), so switching to custom artwork later only changes that file.

Nothing is saved. Feats are recalculated from each game's guesses, and levels at the time of a game come from the `firstSeen` dates on your vocabulary words, which covers Underdog and level-ups too. So past games earn feats retroactively, and changing a rule in `FEAT_RULES` (for example, 12 letters to 13) applies to every game, old ones included.

---

## Tracks

### Language

| Name                         | How to get it                                                        | Levels                                                  | Status   |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| **{Language} Certification** | Guess distinct valid words in that language. One track per language. | A1 25, A2 75, B1 150, B2 300, C1 600, C2 1200 words     | **Live** |
| **Polyglot**                 | Reach A1 certification in several languages.                         | Bilingual 2, Trilingual 3, Polyglot 5                   | **Live** |
| **Reader**                   | Open definitions of distinct words.                                  | Curious 10, Bookworm 50, Scholar 200, Lexicographer 500 | **Live** |
| **{Language} Solver**        | Solve boards in that language (answers, not just guesses).           | 10, 50, 150, 400 solves                                 | Idea     |
| **Globetrotter**             | Open at least 5 definitions in every supported language.             | One level                                               | **Live** |

### Play

| Name           | How to get it                                                      | Levels                      | Status   |
| -------------- | ------------------------------------------------------------------ | --------------------------- | -------- |
| **Regular**    | Finish games.                                                      | 10, 50, 100, 250, 500 games | **Live** |
| **On Fire**    | Win games in a row (uses the existing max streak stat).            | 3, 7, 14, 30 wins in a row  | **Live** |
| **World Tour** | Finish a game that includes each supported language at least once. | One level (all 5 languages) | Idea     |
| **Hard Mode**  | Win a game with every board on Advanced difficulty.                | 1, 10, 25 wins              | Idea     |

### Social

| Name        | How to get it                                                                                          | Levels               | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------------------- | -------- |
| **Squad**   | Add friends.                                                                                           | 1, 5, 10 friends     | **Live** |
| **Duelist** | Win head-to-head challenges. Shown on your own profile only (challenges are private to their players). | 1, 10, 25, 50 wins   | **Live** |
| **Rivalry** | Finish challenges against the same person.                                                             | 5, 10, 25 challenges | Idea     |

---

## Feats

**Live:** Out of Nowhere, Hail Mary, Jackpot, Minimalist, Speedrun, Underdog, Two Birds, Lost in Translation, Je ne sais quoi, the language-specific feats (per-language first try, Chapeau !, Piñata), Dolce far niente, Scrambled, So Close, Bravery. The rest are ideas.

Rates for the feats added in #75 come from replaying 124 saved games (98 wins) with today's word lists.

### Solving

| Name               | How to get it                                                                                                                                                                                                                | Boards     | Seen                                                                                                 | Notes                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Out of Nowhere** | Solve a board when at most 1 of its letters had been colored (green or yellow) before that guess. Doesn't count on guess 1.                                                                                                  | Any time   | 2 of 88 games (Spanish ECHAN with only C known; French FLEUR with only L known)                      | Favorite so far. It's judged on the board being solved, and every earlier guess also revealed letters on it, so solved boards elsewhere don't make it easier.                      |
| **Hail Mary**      | Like Out of Nowhere, but with 0 letters colored before the solving guess.                                                                                                                                                    | Any time   | Never                                                                                                | The harder version of Out of Nowhere. Could be one badge with two levels.                                                                                                          |
| **Jackpot**        | Reveal 8+ new colored tiles in one guess, across the open boards. A tile counts if it's a green in a new spot or a yellow showing a letter (or extra copy) the board hadn't revealed yet. That's the same rule scoring uses. | Any time   | 8+: 1 of 88 games. 7+: 18 games. 6+: 53 games. Best ever: 9.                                         | Solved boards make it harder (one open board can show at most 5), so no need to restrict it. Could have levels: 7 (Big Reveal), 8 (Jackpot), 10 (never seen).                      |
| **Minimalist**     | Win using 12 or fewer different letters across all your guesses (counting up to the guess that solves the last board).                                                                                                       | Whole game | 12 or fewer: 2 of 69 wins. 13 or fewer: 8. 14 or fewer: 18. 15 or fewer: 29. The fewest ever was 12. | Replaces Clean Game. Could have levels: 13, 12, 11 (never seen). Fast wins naturally use fewer letters, so it overlaps a little with Speedrun; both 12-letter wins took 6 guesses. |
| **Speedrun**       | Solve every board within 5 guesses.                                                                                                                                                                                          | Whole game | 5 of 69 wins                                                                                         | Could add a harder 4-guess level (never seen). The minimum possible is one guess per board.                                                                                        |
| **Buzzer Beater**  | Win with your final guess (guess 8).                                                                                                                                                                                         | Whole game | 30 of 69 wins                                                                                        | Common; fun but not special. Probably cut.                                                                                                                                         |
| **Domino**         | Solve all boards on back-to-back guesses (for example 6, 7, 8).                                                                                                                                                              | Whole game | 35 of 88 games                                                                                       | Too common as is. Could require starting by guess 4.                                                                                                                               |

### Multi-language

These are the ones only Polyglot Wordle can have.

| Name                    | How to get it                                                                                                                                                                                                                                                                      | Boards                                         | Seen                                                                                                                                                                          | Notes                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Underdog**            | Solve the board in your weakest language before every other board. Your weakest language is the one in the game where you have the lowest certification. Only counts if your strongest language in the game is at least B1 and 2+ levels above the weakest, so it means something. | All open (it has to be the first solve)        | Can't measure exactly (we don't know past certification levels). For the main player, their least-played languages (Italian or Portuguese) were solved first in 3 of 7 games. | Could be counted (1, 5, 20) since it may not be that rare.                                                                          |
| **Two Birds**           | Solve two boards with one guess. Only possible when two boards share an answer.                                                                                                                                                                                                    | Any time (both boards are open by definition)  | Never. From the word lists, about 1 in 4,000 English/Spanish/French games has a shared answer (more likely with Spanish/Portuguese or Italian/Portuguese).                    | More of a lucky find than a skill, but a great one.                                                                                 |
| **Cognate**             | Play a guess that is a valid word in every board's language at once.                                                                                                                                                                                                               | Any time (it's about the word, not the boards) | 31 of 88 games                                                                                                                                                                | Common. Could count distinct cognates found (1, 10, 25).                                                                            |
| **Lost in Translation** | Solve a board while its language is still unconfirmed, even after the solving guess. Happens when the answer is also a word in another of the game's languages (BURRO in English and Spanish, BALSA in Portuguese and Spanish).                                                    | Any time                                       | 16 of 343 solved boards, in 12 of 124 games                                                                                                                                   | Counting boards unknown only _before_ the solve would be 27% of games, too common. Almost always Spanish with Portuguese or French. |
| **Je ne sais quoi**     | "I don't know what." Win with at least one board's language never confirmed.                                                                                                                                                                                                       | Whole game                                     | 4 of 98 wins                                                                                                                                                                  | Every one also earns Lost in Translation, so it's the harder tier.                                                                  |

### Language-specific

Only earnable on one language's board, so the profile hides them for languages the player has never played.

| Name                                                                                            | How to get it                                                                                                                     | Boards   | Seen                      | Notes                                                                 |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | --------------------------------------------------------------------- |
| **Hole in One** / **A la primera** / **Du premier coup** / **Al primo colpo** / **De primeira** | Solve that language's board with your first guess. Replaces First Try.                                                            | Guess 1  | Never in 124 games        | The rarest feats. The medal shows the player's flag for the language. |
| **Chapeau !**                                                                                   | Solve a French board whose answer has a circumflex (â ê î ô û). _Chapeau_ means "hats off" and is also the circumflex's nickname. | Any time | 5 of 96 French boards     | 2.5% of Basic answers, about 5.5% at Intermediate/Advanced.           |
| **Piñata**                                                                                      | Solve a Spanish board whose answer has an ñ.                                                                                      | Any time | 1–2 of 115 Spanish boards | About 1.5% of answers at every difficulty.                            |

### Just for fun

| Name                           | How to get it                                                                                                                                                                               | Boards                          | Seen                                                                                                 | Notes                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Dolce far niente** (was Dud) | Play a guess that reveals nothing new on any board: every letter has already been tried in that spot with the same result, or is already ruled out. Guesses that solve a board don't count. | All open                        | 1 of 88 games: SLATE after SLIME and GRATE (answers PESOS / SLUMP / PLUIE), with no board solved yet | With a board solved there's less to learn, so a dud gets easier.                                    |
| **Whiff**                      | Play a guess with no colored letters on any board.                                                                                                                                          | All open                        | Never                                                                                                | A funny "bad luck" badge. With only one board left it would be common, so it needs all boards open. |
| **Scrambled**                  | Get 5 yellows on one board (right letters, all in the wrong places).                                                                                                                        | Any time (it's about one board) | Never                                                                                                |                                                                                                     |
| **So Close**                   | Lose a game with 4 greens on an unsolved board.                                                                                                                                             | Whole game                      | 9 of 19 losses                                                                                       | Consolation badge. Common among losses; could raise the bar later.                                  |
| **Bravery**                    | Play 3 different letters from Q, W, X, Y, Z across your guesses in one game.                                                                                                                | Any time                        | 1 of 124 games (14 used two)                                                                         | Y does most of the work: it's in 38 games, Q in only 7. Could swap Y for J or K if it gets easy.    |

---

## Decided against

| Name                                                                               | Why                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hat Trick** (a new green on every board in one guess)                            | Not interesting. It already scores points in-game.                                                                                                                                                                           |
| **Double Hat Trick** (2+ new greens on every board in one guess)                   | Same as Hat Trick.                                                                                                                                                                                                           |
| **Bridge** (a guess that isn't a word in a board's language lands 3+ greens there) | Boring.                                                                                                                                                                                                                      |
| **Explorer** (guess several never-before-guessed words in one game)                | New words are normal play. Even for the main player after 300 distinct words, all 8 guesses were new in about 1 in 9 games, and 7 of 8 was the most common result. Long-term vocabulary is already covered by Certification. |
| **Clean Game** (win without replaying a letter that's gray on every open board)    | 65 of 69 wins qualify, so it's just "win a game". The strict version (gray on any open board) was never achieved. Replaced by Minimalist.                                                                                    |

## Needs other work first

| Name                                                                             | Blocked on                            |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| **Deduced Solve** (solve when only one candidate answer was left)                | Word-candidate filtering from #43.    |
| **Native Speaker / Tourist** (solve in a language you do or don't list as known) | A "languages I know" profile setting. |
