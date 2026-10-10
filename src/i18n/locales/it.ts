import type { Translation } from './en';

export const it: Translation = {
  languages: {
    en: 'Inglese',
    es: 'Spagnolo',
    fr: 'Francese',
    it: 'Italiano',
    pt: 'Portoghese',
  },
  common: {
    tryAgain: 'Riprova',
    slowLoad: 'Ci sta mettendo più del solito.',
  },
  uiLanguage: {
    menu: 'Lingua',
    title: 'Scegli la tua lingua',
    intro:
      'Menu, istruzioni e messaggi useranno questa lingua. Puoi cambiarla quando vuoi da Lingua nel menu.',
    confirm: 'Continua',
    saveFailed:
      'Impossibile salvare la lingua nel tuo account. Resta impostata su questo dispositivo.',
  },
  login: {
    welcome: 'Benvenuto su Polyglot Wordle!',
    signIn: 'Accedi con Google',
  },
  setup: {
    titles: {
      newGame: 'Nuova partita',
      settings: 'Impostazioni partita',
      challenge: 'Sfida un amico',
    },
    intro: 'Scegli tre lingue, poi una difficoltà per ogni griglia.',
    introChallenge:
      'Scegli tre lingue e una difficoltà per ciascuna. Avrete entrambi le stesse griglie.',
    selectedCount: '{{count}} di {{total}} selezionate',
    skipPicker: 'Usa sempre queste impostazioni',
    skipPickerHint: 'Nuova partita inizia subito. Cambiale da Impostazioni partita nel menu.',
    submit: {
      newGame: 'Inizia',
      settings: 'Salva',
      challenge: 'Invia la sfida e gioca',
    },
    difficulties: {
      basic: 'Base',
      intermediate: 'Intermedio',
      advanced: 'Avanzato',
    },
    difficultyLabel: 'Difficoltà {{language}}',
    saveFailed: 'Impossibile salvare le impostazioni. Riprova.',
    savePrefsFailed: 'Impossibile salvare le tue preferenze di partita.',
    startFailed: 'Impossibile iniziare la partita. Riprova.',
  },
  game: {
    invalidLink: 'Questo link della partita non è valido.',
    loadFailed: 'Impossibile caricare la partita. Controlla la connessione.',
    wordListsFailed: 'Impossibile caricare le liste di parole. Controlla la connessione.',
    loadingBoards: 'Caricamento griglie...',
    rematchReady: 'Rivincita pronta',
    rematchCopied: 'Link della rivincita copiato. Mandalo a {{name}}.',
    rematchCopiedFriend: 'Link della rivincita copiato. Mandalo al tuo amico.',
    rematchCopyFailed: 'Impossibile copiare il link della rivincita. Prova a condividerlo a mano.',
    clearGuess: 'Cancella tentativo',
    jumble: 'Mescola lettere',
    jumbleShuffle: 'Mescola le lettere',
    jumbleLeave: 'Esci da Mescola lettere',
    jumbleIntro: 'Mescola lettere riordina le lettere che conosci già.',
    jumbleHowItWorks: 'Come funziona',
    dismissHint: 'Chiudi suggerimento',
    slot: 'Casella {{n}}: {{letter}}',
    slotEmpty: 'Casella {{n}}: vuota',
    slotLocked: 'Casella {{n}}: {{letter}}, {{lock}}',
    locks: {
      pinned: 'fissata',
      suggested: 'suggerita',
    },
    definitionNotFound: 'Definizione non trovata.',
    flagWord: 'Segnala la parola per una revisione con IA',
    unflagWord: 'Rimuovi segnalazione',
    missingWord: {
      title: '{{word}} è una parola vera?',
      prompt: 'Segnalala come mancante in:',
      flagged: '{{word}} segnalata',
      thanks: 'Segnalata come mancante in {{language}}. Grazie!',
    },
    challenge: {
      mode: 'MODALITÀ SFIDA',
      points: '{{score}} PTI',
      canYouBeat: 'Riesci a battere <name>{{name}}</name> ({{turns}}/{{max}} turni)?',
      notFinished: '<name>{{name}}</name> ti ha sfidato. Non ha ancora finito.',
      aFriend: 'Un amico',
      viewProfile: 'Vedi il profilo di {{name}}',
      dismiss: 'Chiudi il banner della sfida',
    },
    popups: {
      crack: 'Prima parola risolta!',
      hatTrick: 'Tripletta!',
      allSolved: 'Tutte risolte!',
      solved: 'Risolta!',
      unsolved: '{{flag}} {{language}} non risolta',
    },
  },
  help: {
    title: 'Come si gioca a Polyglot Wordle',
    topics: {
      play: 'Gioco',
      scoring: 'Punti',
      setup: 'Opzioni',
      jumble: 'Mescola',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Tre parole, tre lingue',
      threeText:
        'Risolvi contemporaneamente una parola di 5 lettere in ciascuna delle tue tre lingue. Ogni tentativo vale per tutte e tre le griglie.',
      colorsTitle: 'Indizi a colori',
      colorsText:
        'Come nel Wordle classico, ogni griglia colora il tuo tentativo in base alla sua parola. <green>Verde</green> è la lettera giusta al posto giusto, <yellow>giallo</yellow> è nella parola ma in un altro posto, e <gray>grigio</gray> non è nella parola.',
      whichTitle: 'Quale griglia è quale?',
      whichText:
        'Le griglie sono mescolate e le bandiere mostrano quali lingue potrebbe essere ciascuna. Una linea verde sotto un tentativo indica che è una parola vera nella lingua di quella griglia. PLATE è inglese e francese, quindi la griglia senza linea deve essere lo spagnolo; CRANE è solo inglese, e questo risolve le altre due.',
      winTitle: 'Vincere',
      winText: 'Risolvi tutte e tre le parole entro {{max}} tentativi.',
    },
    scoring: {
      pointsTitle: 'Punti su ogni griglia',
      pointsText:
        'Ogni nuova casella verde vale {{green}} × il moltiplicatore del turno. Nuovi verdi su tutte e tre le griglie con un solo tentativo sono una Tripletta (+{{hatTrick}}).',
      pointsTextYellow:
        'Ogni nuova casella verde vale {{green}} × il moltiplicatore del turno, e un giallo che rivela una lettera che la griglia non conosceva vale {{yellow}} ×. Nuovi verdi su tutte e tre le griglie con un solo tentativo sono una Tripletta (+{{hatTrick}}).',
      earlyTitle: 'I primi tentativi valgono di più',
      earlyText:
        'Il moltiplicatore parte da ×{{start}} al primo tentativo e scende di uno a ogni tentativo.',
      solvingTitle: 'Risolvere le parole',
      solvingText:
        'Risolvere una parola vale {{solved}} × il moltiplicatore, e il tentativo che risolve la tua prima parola aggiunge un bonus Prima parola ({{crack}} ×).',
      allTitle: 'Risolverle tutte e tre',
      allText:
        'Finire la partita aggiunge {{bonus}} × il moltiplicatore del tentativo con cui finisci.',
      unsolvedTitle: 'Le parole non risolte costano',
      unsolvedText: 'Se finisci i tentativi, ogni parola non risolta toglie {{penalty}} punti.',
      score: 'Punti {{score}}',
    },
    setup: {
      pickTitle: 'Scegli le tue tre lingue',
      pickText: 'Nuova partita apre questa scelta. Tocca tre lingue; ognuna ha la sua griglia.',
      difficultyTitle: 'Una difficoltà per ogni griglia',
      difficultyText:
        'La difficoltà stabilisce quanto può essere rara la risposta di quella griglia. Qualsiasi parola vera della lingua vale comunque come tentativo.',
      everyTimeTitle: 'Usa sempre queste impostazioni',
      everyTimeText:
        'Attivalo e Nuova partita inizia subito con queste lingue e difficoltà. Cambiale quando vuoi da Impostazioni partita nel menu.',
      examples: {
        basic: 'Parole di tutti i giorni',
        intermediate: 'Parole meno comuni',
        advanced: 'Qualsiasi parola del dizionario',
      },
    },
    jumble: {
      stuckTitle: 'Bloccato? Prova Mescola lettere',
      stuckText:
        'Tocca 🔀 accanto alla riga del tentativo (o premi Spazio). Ogni pressione di 🔀 mostra una nuova disposizione delle lettere che conosci già. Non rivela mai niente di nuovo.',
      followsTitle: 'Segue una griglia',
      followsText:
        'Mescola lettere evidenzia una griglia obiettivo: quella su cui sei, o quella a sinistra sugli schermi larghi. Tocca un’altra griglia per cambiare. I suoi verdi restano al loro posto, i suoi gialli sono sempre inclusi in un posto nuovo e le sue lettere grigie non vengono mai usate.',
      pinsTitle: 'Le tue lettere, i tuoi fermi',
      pinsText:
        'Le lettere che scrivi restano nel mescolamento ma cambiano posto. Tocca una lettera due volte per fissarla e un’altra volta per sbloccarla. Le lettere sbiadite sono suggerimenti casuali; scrivici sopra per usare la tua.',
      gapTitle: 'Un solo spazio libero',
      gapText:
        'Quando resta una sola casella libera, ogni pressione prova la lettera successiva nell’ordine della tastiera (Q, W, E, …), saltando le lettere già escluse.',
      leaveTitle: 'Gioca o esci',
      leaveText:
        'Ti piace? Premi Invio per giocarla come sempre e Mescola lettere si chiude. Non è una parola? Trema come al solito. Premi ✕ o Esc per uscire senza giocare.',
    },
    faq: {
      dotsTitle: 'Cosa sono i puntini sulla tastiera?',
      dotsText:
        'Ogni tasto ha tre puntini, uno per griglia da sinistra a destra. Verde e giallo funzionano come le caselle, rosso vuol dire che la lettera non è nella parola di quella griglia, e un puntino spento vuol dire che non l’hai ancora provata lì.',
      flagsTitle: 'Posso cambiare le bandiere?',
      flagsText:
        'Sì. Apri Bandiere / emoji personalizzate nel menu e scegli un emoji per ogni lingua. La tua scelta viene usata ovunque: griglie, impostazioni, risultati e badge.',
      accentsTitle: 'Devo scrivere gli accenti?',
      accentsText:
        'No. Gli accenti vengono ignorati nel controllo dei tentativi, quindi UNITE corrisponde a UNITÉ e ARBOL ad ÁRBOL.',
      rejectedTitle: 'La mia parola non è stata accettata',
      rejectedText:
        'Premi Invio tre volte e potrai segnalarla come mancante da un dizionario. Se riscrivi una parola già giocata, puoi segnalarla per le lingue che non ce l’hanno.',
      challengesTitle: 'Come funzionano le sfide?',
      challengesText:
        'Sfida gli amici su una partita appena finita, o iniziatene una nuova insieme. Tutti giocano esattamente le stesse griglie e vedi ogni risultato appena finiscono.',
      difficultyTitle: 'La difficoltà cambia il mio punteggio?',
      difficultyText:
        'No. I punti sono gli stessi a ogni difficoltà; le griglie più difficili hanno solo risposte più rare.',
      languageTitle: 'Posso giocare in un’altra lingua?',
      languageText:
        'Le griglie sono sempre nelle lingue che scegli per la partita. Menu e istruzioni seguono la lingua dell’interfaccia: cambiala da Lingua nel menu.',
    },
  },
};
