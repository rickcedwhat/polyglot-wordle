export const en = {
  languages: {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    pt: 'Portuguese',
  },
  common: {
    tryAgain: 'Try again',
    slowLoad: 'This is taking longer than usual.',
  },
  uiLanguage: {
    menu: 'Language',
    title: 'Choose your language',
    intro:
      'Menus, instructions and messages will use this language. You can change it anytime from Language in the menu.',
    confirm: 'Continue',
    saveFailed: 'Could not save your language to your account. It is still set on this device.',
  },
  login: {
    welcome: 'Welcome to Polyglot Wordle!',
    signIn: 'Sign in with Google',
  },
  setup: {
    titles: {
      newGame: 'New game',
      settings: 'Game setup',
      challenge: 'Challenge a friend',
    },
    intro: 'Pick three languages, then a difficulty for each board.',
    introChallenge: 'Pick three languages and a difficulty for each. You both get the same boards.',
    selectedCount: '{{count}} of {{total}} selected',
    skipPicker: 'Use this setup every time',
    skipPickerHint: 'New Game starts right away. Change it from Game setup in the menu.',
    submit: {
      newGame: 'Start game',
      settings: 'Save',
      challenge: 'Send challenge & play',
    },
    difficulties: {
      basic: 'Basic',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },
    difficultyLabel: '{{language}} difficulty',
    saveFailed: 'Could not save your game setup. Please try again.',
    savePrefsFailed: 'Could not save your game setup preferences.',
    startFailed: 'Could not start your game. Please try again.',
  },
  game: {
    invalidLink: "This game link isn't valid.",
    loadFailed: "Couldn't load this game. Check your connection.",
    wordListsFailed: "Couldn't load the word lists. Check your connection.",
    loadingBoards: 'Loading boards...',
    rematchReady: 'Rematch ready',
    rematchCopied: 'Rematch link copied. Send it to {{name}}.',
    rematchCopiedFriend: 'Rematch link copied. Send it to your friend.',
    rematchCopyFailed: 'Could not copy the rematch link. Please try sharing it manually.',
    clearGuess: 'Clear guess',
    jumble: 'Letter Jumble',
    jumbleShuffle: 'Jumble letters',
    jumbleLeave: 'Leave Letter Jumble',
    jumbleIntro: 'Letter Jumble rearranges letters you already know.',
    jumbleHowItWorks: 'How it works',
    dismissHint: 'Dismiss hint',
    slot: 'Slot {{n}}: {{letter}}',
    slotEmpty: 'Slot {{n}}: empty',
    slotLocked: 'Slot {{n}}: {{letter}}, {{lock}}',
    locks: {
      pinned: 'pinned',
      suggested: 'suggested',
    },
    definitionNotFound: 'Definition not found.',
    flagWord: 'Flag word for AI discussion',
    unflagWord: 'Unflag word',
    missingWord: {
      title: 'Is {{word}} a real word?',
      prompt: 'Flag it as missing from:',
      flagged: 'Flagged {{word}}',
      thanks: 'Marked as missing from {{language}}. Thanks!',
    },
    challenge: {
      mode: 'CHALLENGE MODE',
      points: '{{score}} PTS',
      canYouBeat: 'Can you beat <name>{{name}}</name> ({{turns}}/{{max}} turns)?',
      notFinished: '<name>{{name}}</name> challenged you. They haven’t finished yet.',
      aFriend: 'A friend',
      viewProfile: "View {{name}}'s profile",
      dismiss: 'Dismiss challenge banner',
    },
    popups: {
      crack: 'First word cracked!',
      hatTrick: 'Hat trick!',
      allSolved: 'All words solved!',
      solved: 'Solved!',
      unsolved: '{{flag}} {{language}} unsolved',
    },
  },
  help: {
    title: 'How to Play Polyglot Wordle',
    topics: {
      play: 'How to play',
      scoring: 'Scoring',
      setup: 'Game setup',
      jumble: 'Jumble',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Three words, three languages',
      threeText:
        'Solve a 5-letter word in each of your three languages at once. Every guess is played on all three boards.',
      colorsTitle: 'Color clues for letters',
      colorsText:
        "Like classic Wordle, each board colors your guess against its own word. <green>Green</green> is the right letter in the right spot, <yellow>yellow</yellow> is in the word but somewhere else, and <gray>gray</gray> isn't in the word.",
      whichTitle: 'Which board is which?',
      whichText:
        "Boards are shuffled, and the flags show which languages each one could be. A green line under a guess means it's a real word in that board's language. PLATE is English and French, so the board without a line must be Spanish; CRANE is only English, which settles the other two.",
      winTitle: 'Winning',
      winText: 'Solve all three words within {{max}} guesses.',
    },
    scoring: {
      pointsTitle: 'Points on every board',
      pointsText:
        'Each new green tile is worth {{green}} × the turn multiplier. New greens on all three boards in one guess is a Hat trick (+{{hatTrick}}).',
      pointsTextYellow:
        "Each new green tile is worth {{green}} × the turn multiplier, and a yellow that reveals a letter the board didn't know is worth {{yellow}} ×. New greens on all three boards in one guess is a Hat trick (+{{hatTrick}}).",
      earlyTitle: 'Earlier guesses are worth more',
      earlyText: 'The multiplier starts at ×{{start}} on guess 1 and drops by one each guess.',
      solvingTitle: 'Solving words',
      solvingText:
        'Solving a word is worth {{solved}} × the multiplier, and the guess that solves your first word adds a First crack bonus ({{crack}} ×).',
      allTitle: 'Solving all three',
      allText: 'Finishing the game adds {{bonus}} × the multiplier of the guess you finish on.',
      unsolvedTitle: 'Unsolved words cost you',
      unsolvedText:
        "If you run out of guesses, each word you didn't solve takes {{penalty}} points off.",
      score: 'Score {{score}}',
    },
    setup: {
      pickTitle: 'Pick your three languages',
      pickText: 'New Game opens this picker. Tap three languages; each one gets its own board.',
      difficultyTitle: 'A difficulty for each board',
      difficultyText:
        "Difficulty sets how rare that board's answer can be. Any real word in the language still counts as a guess.",
      everyTimeTitle: 'Use this setup every time',
      everyTimeText:
        'Turn it on and New Game starts right away with these languages and difficulties. Change them anytime from Game setup in the menu.',
      examples: {
        basic: 'Everyday words',
        intermediate: 'Less common words',
        advanced: 'Any word in the dictionary',
      },
    },
    jumble: {
      stuckTitle: 'Stuck? Try Letter Jumble',
      stuckText:
        'Tap 🔀 beside your guess row (or press Space). Each press of 🔀 shows a new arrangement of letters you already know about. It never reveals anything new.',
      followsTitle: 'It follows one board',
      followsText:
        "Letter Jumble outlines a target board: the board you're focused on, or the left one on wide screens. Tap another board to switch. Its greens stay in place, its yellows are always included in a new spot, and its gray letters are never used.",
      pinsTitle: 'Your letters, your pins',
      pinsText:
        'Letters you type stay in the jumble but move around. Tap a letter twice to pin it in place, and again to unpin it. Faded letters are random suggestions; type over one to use your own.',
      gapTitle: 'One gap left',
      gapText:
        'When only one slot is open, each press tries the next letter in keyboard order (Q, W, E, …), skipping letters already ruled out.',
      leaveTitle: 'Guess or leave',
      leaveText:
        'Like it? Press Enter to guess as usual and Letter Jumble closes. Not a word? It shakes like always. Press ✕ or Esc to leave without guessing.',
    },
    faq: {
      dotsTitle: 'What are the dots on the keyboard?',
      dotsText:
        "Each key has three dots, one per board from left to right. Green and yellow work like the tiles, red means the letter isn't in that board's word, and a dim dot means you haven't tried it there yet.",
      flagsTitle: 'Can I change the flags?',
      flagsText:
        'Yes. Open Custom Flags / Emojis in the menu and pick any emoji for each language. Your choice is used everywhere: boards, game setup, results and badges.',
      accentsTitle: 'Do I need to type accents?',
      accentsText:
        'No. Accents are ignored when checking guesses, so UNITE matches UNITÉ and ARBOL matches ÁRBOL.',
      rejectedTitle: "My word wasn't accepted",
      rejectedText:
        "Press Enter three times on it and you can flag it as missing from a dictionary. If you re-enter a word you already played, you can flag it for the languages that don't have it.",
      challengesTitle: 'How do challenges work?',
      challengesText:
        'Challenge friends on a game you just finished, or start a new one together. Everyone plays the exact same boards, and you see each result as they finish.',
      difficultyTitle: 'Does difficulty change my score?',
      difficultyText:
        'No. Scoring is the same at every difficulty; harder boards just have rarer answers.',
      languageTitle: 'Can I play in another language?',
      languageText:
        'The boards are always in the languages you pick for the game. The menus and instructions follow the interface language: change it from Language in the menu.',
    },
  },
};

type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/** Every language must translate every key. */
export type Translation = Strings<typeof en>;
