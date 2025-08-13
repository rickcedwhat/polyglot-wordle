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

[ ] User log in
[ ] Challenge friends
[x] Make fit on my screen
[x] Fix dictionary
[x] Miniboard showing guesses after solving
[x] Add how to play
[ ] Improve dictionaries

✅ Section 1: Setup & Data Organization
[ ] Install New Libraries:

Run npm install firebase @tanstack/react-query to add the necessary packages to your project.

[ ] Configure Firebase Credentials:

Create the .env.local file in your project's root directory.

Add your Firebase project keys to it, prefixed with VITE\_.

[ ] Reorganize Dictionary Files:

In the public folder, create subdirectories for en, es, and fr.

Move and split your word lists into basic.json, intermediate.json, and advanced.json inside each language folder.

[ ] Set Up Firestore Database:

In the Firebase Console, create a new Cloud Firestore database.

Start in Test Mode for now (we can add security rules later). This will allow your app to read and write data during development.

✅ Section 2: Core Logic & Data Fetching
[ ] Implement Authentication Context:

Create the src/context/AuthContext.tsx file.

Implement the AuthProvider using signInWithPopup and the useAuth hook to manage user state globally.

[ ] Integrate TanStack Query:

In src/App.tsx, import QueryClient and QueryClientProvider from @tanstack/react-query.

Wrap your AuthProvider with the QueryClientProvider to make it available to the entire app.

[ ] Update wordUtils.ts with New Difficulty Logic:

This is a key step. Modify the getWordsFromUuid function to handle cumulative difficulty.

For each language:

Determine the difficulty (basic, intermediate, or advanced) from its character in the uuid.

Fetch all word lists at or below that difficulty. (e.g., if 'advanced' is selected, fetch basic.json, intermediate.json, and advanced.json).

Combine the fetched arrays into a single, large word pool.

Use the index from the uuid to pick a word from this combined pool.

✅ Section 3: Connecting the UI
[ ] Build the Authentication Flow:

Create the src/pages/Login.page.tsx.

Create the src/components/ProtectedRoute/ProtectedRoute.tsx.

Update src/Router.tsx to protect the game routes and add the /login route.

Update the Sidebar to include the Logout button.

[ ] Implement Live Game State in Game.page.tsx:

Use TanStack Query's useQuery hook to check Firestore for a game record matching the userId and gameId from the URL.

Implement the conditional rendering logic:

If a record exists and isLiveGame is true -> Restore the game from guessHistory.

If a record exists and isLiveGame is false -> Show the read-only results.

If no record exists -> Show a new game.

Implement TanStack Query's useMutation hooks to:

Create a game document in Firestore on the player's first guess (isLiveGame: true).

Update the guessHistory array after each subsequent guess.

Finalize the game document when it ends (isLiveGame: false, set score, etc.).
