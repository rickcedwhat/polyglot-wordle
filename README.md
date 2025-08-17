# Mantine Vite template

## Features

This template comes with the following features:

- [PostCSS](https://postcss.org/) with [mantine-postcss-preset](https://mantine.dev/styles/postcss-preset)
- [TypeScript](https://www.typescriptlang.org/)
- [Storybook](https://storybook.js.org/)
- [Vitest](https://vitest.dev/) setup with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- ESLint setup with [eslint-config-mantine](https://github.com/mantinedev/eslint-config-mantine)

## npm scripts

## Build and dev scripts

- `dev` – start development server
- `build` – build production version of the app
- `preview` – locally preview production build

### Testing scripts

- `typecheck` – checks TypeScript types
- `lint` – runs ESLint
- `prettier:check` – checks files with Prettier
- `vitest` – runs vitest tests
- `vitest:watch` – starts vitest watch
- `test` – runs `vitest`, `prettier:check`, `lint` and `typecheck` scripts

### Other scripts

- `storybook` – starts storybook dev server
- `storybook:build` – build production storybook bundle to `storybook-static`
- `prettier:write` – formats all files with Prettier

## Build

npm run build

firebase deploy

## RoadMap

[x] User log in
[x] Make fit on my screen
[x] Fix dictionary
[x] Miniboard showing guesses after solving
[x] Add how to play
[x] Improve dictionaries
[x] Click on any word for a definition
[x] Red border on letters if triple red (warning the user before using the letter in the guess)
[x] Remove empty from status and make it's own prop
[x] Don't allow a user to resubmit a guess
[x] Invalid word animation
[x] History Page
[x] SidebarContent
[x] When creating a new game - first check if the user has an empty one in their history - use that one instead and reset the startedAt field
[ ] Challenge friends
[ ] Pagination
[ ] Button to suggest a word
[ ] Achievements
[ ] Scoring animations
[ ] Allow player to buy a letter - 200 points and will randomly pick an unknown letter and show it on the board for the rest of the game

## Official Scoring Rules

A player's total score is the sum of all points earned from bonuses, minus any penalties.

## Green Letter "Discovery" Bonus

You earn points the very first time a letter is correctly placed (turns green) in any of the 15 possible slots across the three boards. This bonus is only awarded once per tile.

Formula: 5 x (11 - Guesses Taken)

Example: Finding a green letter on your 2nd guess earns 5 x (11 - 2) = 45 points.

## Yellow Letter "Combo" Bonus

You earn escalating points for each correct but misplaced letter (yellow) within a single guess.

Formula: 5 for the 1st yellow, 10 for the 2nd, 15 for the 3rd, etc., in the same guess.

Example: A guess with 3 yellow letters earns 5 + 10 + 15 = 30 points for that turn.

## Word Solved Bonus

You earn a large bonus for solving a word, with more points awarded for solving it in fewer guesses. This bonus is awarded for each of the three words you solve.

Formula: 20 x (11 - Guesses Taken)

Example: Solving a word in 4 guesses earns 20 x (10 - 4) = 120 points.

## Unsolved Word Penalty

If you run out of all 10 guesses, you lose points for each word you failed to solve.

Formula: -250 points per unsolved word.

Example: Finishing the game with one unsolved word deducts 250 points from your final score.

## Finish Game Bonus

You earn a bonus for solving all three words.

Formula: 25 x (11 - Guesses Taken)

Example: Finishing the game in 7 guesses earns 25 x (11 - 7) = 100 points.
