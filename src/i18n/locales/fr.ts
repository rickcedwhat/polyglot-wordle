import type { Translation } from './en';

export const fr: Translation = {
  languages: {
    en: 'Anglais',
    es: 'Espagnol',
    fr: 'Français',
    it: 'Italien',
    pt: 'Portugais',
  },
  common: {
    tryAgain: 'Réessayer',
    slowLoad: 'Cela prend plus de temps que d’habitude.',
  },
  uiLanguage: {
    menu: 'Langue',
    title: 'Choisissez votre langue',
    intro:
      'Les menus, les instructions et les messages s’afficheront dans cette langue. Vous pouvez la changer à tout moment via Langue, dans le menu.',
    confirm: 'Continuer',
    saveFailed:
      'Impossible d’enregistrer la langue sur votre compte, mais elle est conservée sur cet appareil.',
  },
  login: {
    welcome: 'Bienvenue sur Polyglot Wordle !',
    signIn: 'Se connecter avec Google',
  },
  setup: {
    titles: {
      newGame: 'Nouvelle partie',
      settings: 'Réglages de partie',
      challenge: 'Défier un ami',
    },
    intro: 'Choisissez trois langues, puis une difficulté pour chaque grille.',
    introChallenge:
      'Choisissez trois langues et une difficulté pour chacune. Vous jouerez tous les deux la même partie.',
    selectedCount: '{{count}} sur {{total}} sélectionnées',
    skipPicker: 'Toujours utiliser ces réglages',
    skipPickerHint:
      'Nouvelle partie se lancera directement. Vous pourrez modifier ça dans Réglages de partie, depuis le menu.',
    submit: {
      newGame: 'Commencer',
      settings: 'Enregistrer',
      challenge: 'Envoyer le défi et jouer',
    },
    difficulties: {
      basic: 'Facile',
      intermediate: 'Moyen',
      advanced: 'Difficile',
    },
    difficultyLabel: 'Difficulté en {{language}}',
    saveFailed: 'Impossible d’enregistrer les réglages. Veuillez réessayer.',
    savePrefsFailed: 'Impossible d’enregistrer vos préférences de partie.',
    startFailed: 'Impossible de démarrer la partie. Veuillez réessayer.',
  },
  game: {
    invalidLink: 'Ce lien de partie n’est pas valide.',
    loadFailed: 'Impossible de charger la partie. Vérifiez votre connexion.',
    wordListsFailed: 'Impossible de charger les listes de mots. Vérifiez votre connexion.',
    loadingBoards: 'Chargement des grilles...',
    rematchReady: 'Revanche prête',
    rematchCopied: 'Lien de revanche copié. Envoyez-le à {{name}}.',
    rematchCopiedFriend: 'Lien de revanche copié. Envoyez-le à votre ami.',
    rematchCopyFailed:
      'Impossible de copier le lien de revanche. Essayez de le partager manuellement.',
    clearGuess: 'Effacer',
    jumble: 'Mélange de lettres',
    jumbleShuffle: 'Mélanger les lettres',
    jumbleLeave: 'Quitter le mélange de lettres',
    jumbleIntro: 'Le mélange de lettres réarrange les lettres que vous connaissez déjà.',
    jumbleHowItWorks: 'Comment ça marche',
    dismissHint: 'Fermer l’astuce',
    slot: 'Case {{n}} : {{letter}}',
    slotEmpty: 'Case {{n}} : vide',
    slotLocked: 'Case {{n}} : {{letter}}, {{lock}}',
    locks: {
      pinned: 'épinglée',
      suggested: 'suggérée',
    },
    definitionNotFound: 'Définition introuvable.',
    flagWord: 'Signaler le mot pour une revue par IA',
    unflagWord: 'Retirer le signalement',
    missingWord: {
      title: '{{word}} existe vraiment ?',
      prompt: 'Signaler qu’il manque en :',
      flagged: '{{word}} signalé',
      thanks: 'Signalé comme manquant en {{language}}. Merci !',
    },
    challenge: {
      mode: 'MODE DÉFI',
      points: '{{score}} PTS',
      canYouBeat: 'Pouvez-vous battre <name>{{name}}</name> ({{turns}}/{{max}} tours) ?',
      notFinished: '<name>{{name}}</name> vous a défié et n’a pas encore fini sa partie.',
      aFriend: 'Un ami',
      viewProfile: 'Voir le profil de {{name}}',
      dismiss: 'Fermer le bandeau de défi',
    },
    popups: {
      crack: 'Premier mot trouvé !',
      hatTrick: 'Coup du chapeau !',
      allSolved: 'Tous les mots trouvés !',
      solved: 'Trouvé !',
      unsolved: '{{flag}} {{language}} non trouvé',
    },
  },
  help: {
    title: 'Comment jouer à Polyglot Wordle',
    topics: {
      play: 'Jouer',
      scoring: 'Points',
      setup: 'Réglages',
      jumble: 'Mélange',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Trois mots, trois langues',
      threeText:
        'Trouvez en même temps un mot de 5 lettres dans chacune de vos trois langues. Chaque essai compte pour les trois grilles.',
      colorsTitle: 'Des couleurs comme indices',
      colorsText:
        'Comme dans le Wordle classique, chaque grille colore votre essai selon son propre mot. <green>Vert</green> : la bonne lettre à la bonne place, <yellow>jaune</yellow> : la lettre est dans le mot mais ailleurs, et <gray>gris</gray> : elle n’est pas dans le mot.',
      whichTitle: 'Quelle grille est laquelle ?',
      whichText:
        'Les grilles sont mélangées et les drapeaux indiquent les langues possibles pour chacune. Un trait vert sous un essai signifie que c’est un vrai mot dans la langue de cette grille. PLATE est anglais et français, donc la grille sans trait est l’espagnol ; CRANE n’est qu’anglais, ce qui tranche pour les deux autres.',
      winTitle: 'Gagner',
      winText: 'Trouvez les trois mots en {{max}} essais maximum.',
    },
    scoring: {
      pointsTitle: 'Des points sur chaque grille',
      pointsText:
        'Chaque nouvelle case verte vaut {{green}} × le multiplicateur du tour. De nouveaux verts sur les trois grilles en un essai, c’est un Coup du chapeau (+{{hatTrick}}).',
      pointsTextYellow:
        'Chaque nouvelle case verte vaut {{green}} × le multiplicateur du tour, et un jaune qui révèle une lettre inconnue de la grille vaut {{yellow}} ×. De nouveaux verts sur les trois grilles en un essai, c’est un Coup du chapeau (+{{hatTrick}}).',
      earlyTitle: 'Les premiers essais valent plus',
      earlyText:
        'Le multiplicateur commence à ×{{start}} au premier essai et baisse de un à chaque essai.',
      solvingTitle: 'Trouver des mots',
      solvingText:
        'Trouver un mot vaut {{solved}} × le multiplicateur, et l’essai qui trouve votre premier mot ajoute un bonus Premier mot ({{crack}} ×).',
      allTitle: 'Trouver les trois',
      allText: 'Finir la partie ajoute {{bonus}} × le multiplicateur de l’essai final.',
      unsolvedTitle: 'Les mots non trouvés coûtent des points',
      unsolvedText:
        'Si vous n’avez plus d’essais, chaque mot non trouvé retire {{penalty}} points.',
      score: 'Score {{score}}',
    },
    setup: {
      pickTitle: 'Choisissez vos trois langues',
      pickText:
        'Nouvelle partie ouvre ce sélecteur. Touchez trois langues ; chacune a sa propre grille.',
      difficultyTitle: 'Une difficulté par grille',
      difficultyText:
        'La difficulté fixe la rareté possible de la réponse de cette grille. Tout vrai mot de la langue reste accepté comme essai.',
      everyTimeTitle: 'Toujours utiliser ces réglages',
      everyTimeText:
        'Une fois activé, Nouvelle partie se lance directement avec ces langues et difficultés. Vous pouvez les modifier à tout moment dans Réglages de partie, depuis le menu.',
      examples: {
        basic: 'Mots du quotidien',
        intermediate: 'Mots moins courants',
        advanced: 'N’importe quel mot du dictionnaire',
      },
    },
    jumble: {
      stuckTitle: 'Bloqué ? Essayez le mélange de lettres',
      stuckText:
        'Touchez 🔀 à côté de votre ligne d’essai (ou appuyez sur Espace). Chaque appui sur 🔀 propose un nouvel agencement des lettres que vous connaissez déjà. Il ne révèle jamais rien de nouveau.',
      followsTitle: 'Il suit une grille',
      followsText:
        'Le mélange de lettres encadre une grille cible : celle que vous regardez, ou celle de gauche sur grand écran. Touchez une autre grille pour changer. Ses verts restent en place, ses jaunes changent toujours de place et ses lettres grises ne sont jamais utilisées.',
      pinsTitle: 'Vos lettres, vos choix',
      pinsText:
        'Les lettres que vous tapez restent dans le mélange mais changent de place. Touchez une lettre deux fois pour l’épingler, et encore une fois pour la libérer. Les lettres estompées sont des suggestions au hasard ; tapez par-dessus pour mettre la vôtre.',
      gapTitle: 'Plus qu’une case',
      gapText:
        'Quand une seule case est libre, chaque appui essaie la lettre suivante dans l’ordre du clavier (Q, W, E, …), en sautant les lettres déjà exclues.',
      leaveTitle: 'Jouer ou quitter',
      leaveText:
        'Ça vous plaît ? Appuyez sur Entrée pour jouer comme d’habitude et le mélange se ferme. Ce n’est pas un mot ? La ligne tremble comme toujours. Appuyez sur ✕ ou Échap pour quitter sans jouer.',
    },
    faq: {
      dotsTitle: 'À quoi servent les points sur le clavier ?',
      dotsText:
        'Chaque touche a trois points, un par grille de gauche à droite. Le vert et le jaune fonctionnent comme sur les cases, le rouge signifie que la lettre n’est pas dans le mot de cette grille, et un point pâle signifie que vous ne l’avez pas encore essayée là.',
      flagsTitle: 'Puis-je changer les drapeaux ?',
      flagsText:
        'Oui. Ouvrez Drapeaux / emojis personnalisés dans le menu et choisissez un emoji pour chaque langue. Votre choix est utilisé partout : grilles, réglages, résultats et badges.',
      accentsTitle: 'Dois-je taper les accents ?',
      accentsText:
        'Non. Les accents sont ignorés lors de la vérification, donc UNITE correspond à UNITÉ et ARBOL à ÁRBOL.',
      rejectedTitle: 'Mon mot n’a pas été accepté',
      rejectedText:
        'Appuyez trois fois sur Entrée et vous pourrez le signaler comme absent d’un dictionnaire. Si vous retapez un mot déjà joué, vous pouvez le signaler pour les langues qui ne l’ont pas.',
      challengesTitle: 'Comment marchent les défis ?',
      challengesText:
        'Défiez vos amis sur une partie que vous venez de finir, ou commencez-en une nouvelle ensemble. Tout le monde joue la même partie, et vous voyez le résultat de chacun dès qu’il a fini.',
      difficultyTitle: 'La difficulté change-t-elle mon score ?',
      difficultyText:
        'Non. Les points sont les mêmes à toutes les difficultés ; les grilles difficiles ont juste des réponses plus rares.',
      languageTitle: 'Puis-je jouer dans une autre langue ?',
      languageText:
        'Les grilles sont toujours dans les langues choisies pour la partie. Les menus et les instructions suivent la langue de l’interface : changez-la depuis Langue dans le menu.',
    },
  },
};
