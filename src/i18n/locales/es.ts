import type { Translation } from './en';

export const es: Translation = {
  languages: {
    en: 'Inglés',
    es: 'Español',
    fr: 'Francés',
    it: 'Italiano',
    pt: 'Portugués',
  },
  common: {
    tryAgain: 'Reintentar',
    slowLoad: 'Está tardando más de lo normal.',
  },
  uiLanguage: {
    menu: 'Idioma',
    title: 'Elige tu idioma',
    intro:
      'Los menús, las instrucciones y los mensajes aparecerán en este idioma. Puedes cambiarlo cuando quieras en Idioma, en el menú.',
    confirm: 'Continuar',
    saveFailed: 'No se pudo guardar el idioma en tu cuenta, pero se mantiene en este dispositivo.',
  },
  login: {
    welcome: '¡Bienvenido a Polyglot Wordle!',
    signIn: 'Iniciar sesión con Google',
  },
  setup: {
    titles: {
      newGame: 'Nueva partida',
      settings: 'Configuración de partida',
      challenge: 'Desafiar a un amigo',
    },
    intro: 'Elige tres idiomas y luego una dificultad para cada tablero.',
    introChallenge:
      'Elige tres idiomas y una dificultad para cada uno. Los dos jugarán la misma partida.',
    selectedCount: '{{count}} de {{total}} seleccionados',
    skipPicker: 'Usar siempre esta configuración',
    skipPickerHint:
      'Nueva partida empezará de inmediato. Puedes cambiarlo en Configuración de partida, en el menú.',
    submit: {
      newGame: 'Empezar partida',
      settings: 'Guardar',
      challenge: 'Enviar desafío y jugar',
    },
    difficulties: {
      basic: 'Básico',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    },
    difficultyLabel: 'Dificultad de {{language}}',
    saveFailed: 'No se pudo guardar la configuración. Inténtalo de nuevo.',
    savePrefsFailed: 'No se pudieron guardar tus preferencias de partida.',
    startFailed: 'No se pudo empezar la partida. Inténtalo de nuevo.',
  },
  game: {
    invalidLink: 'Este enlace de partida no es válido.',
    loadFailed: 'No se pudo cargar la partida. Revisa tu conexión.',
    wordListsFailed: 'No se pudieron cargar las listas de palabras. Revisa tu conexión.',
    loadingBoards: 'Cargando tableros...',
    rematchReady: 'Revancha lista',
    rematchCopied: 'Enlace de revancha copiado. Envíaselo a {{name}}.',
    rematchCopiedFriend: 'Enlace de revancha copiado. Envíaselo a tu amigo.',
    rematchCopyFailed: 'No se pudo copiar el enlace de revancha. Intenta compartirlo a mano.',
    clearGuess: 'Borrar intento',
    jumble: 'Mezcla de letras',
    jumbleShuffle: 'Mezclar letras',
    jumbleLeave: 'Salir de la mezcla de letras',
    jumbleIntro: 'La mezcla de letras reordena las letras que ya conoces.',
    jumbleHowItWorks: 'Cómo funciona',
    dismissHint: 'Cerrar aviso',
    slot: 'Casilla {{n}}: {{letter}}',
    slotEmpty: 'Casilla {{n}}: vacía',
    slotLocked: 'Casilla {{n}}: {{letter}}, {{lock}}',
    locks: {
      pinned: 'fijada',
      suggested: 'sugerida',
    },
    definitionNotFound: 'Definición no encontrada.',
    flagWord: 'Marcar palabra para revisión con IA',
    unflagWord: 'Quitar marca',
    missingWord: {
      title: '¿{{word}} existe de verdad?',
      prompt: 'Avisar que falta en:',
      flagged: '{{word}} marcada',
      thanks: 'Anotamos que falta en {{language}}. ¡Gracias!',
    },
    challenge: {
      mode: 'MODO DESAFÍO',
      points: '{{score}} PTS',
      canYouBeat: '¿Puedes superar a <name>{{name}}</name> ({{turns}}/{{max}} turnos)?',
      notFinished: '<name>{{name}}</name> te desafió y todavía no termina su partida.',
      aFriend: 'Un amigo',
      viewProfile: 'Ver el perfil de {{name}}',
      dismiss: 'Cerrar aviso de desafío',
    },
    popups: {
      crack: '¡Primera palabra resuelta!',
      hatTrick: '¡Triplete!',
      allSolved: '¡Todas resueltas!',
      solved: '¡Resuelta!',
      unsolved: '{{flag}} {{language}} sin resolver',
    },
  },
  help: {
    title: 'Cómo jugar a Polyglot Wordle',
    topics: {
      play: 'Jugar',
      scoring: 'Puntos',
      setup: 'Ajustes',
      jumble: 'Mezcla',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Tres palabras, tres idiomas',
      threeText:
        'Resuelve a la vez una palabra de 5 letras en cada uno de tus tres idiomas. Cada intento se juega en los tres tableros.',
      colorsTitle: 'Pistas de colores',
      colorsText:
        'Como en el Wordle clásico, cada tablero colorea tu intento según su propia palabra. <green>Verde</green> es la letra correcta en el lugar correcto, <yellow>amarillo</yellow> está en la palabra pero en otro lugar, y <gray>gris</gray> no está en la palabra.',
      whichTitle: '¿Qué tablero es cuál?',
      whichText:
        'Los tableros están mezclados y las banderas muestran en qué idioma podría estar cada uno. Una línea verde bajo un intento significa que es una palabra real en el idioma de ese tablero. PLATE es inglés y francés, así que el tablero sin línea debe ser el español; CRANE solo es inglés, lo que resuelve los otros dos.',
      winTitle: 'Cómo ganar',
      winText: 'Resuelve las tres palabras en {{max}} intentos o menos.',
    },
    scoring: {
      pointsTitle: 'Puntos en cada tablero',
      pointsText:
        'Cada casilla verde nueva vale {{green}} × el multiplicador del turno. Conseguir verdes nuevos en los tres tableros con un intento es un Triplete (+{{hatTrick}}).',
      pointsTextYellow:
        'Cada casilla verde nueva vale {{green}} × el multiplicador del turno, y un amarillo que revela una letra que el tablero no conocía vale {{yellow}} ×. Conseguir verdes nuevos en los tres tableros con un intento es un Triplete (+{{hatTrick}}).',
      earlyTitle: 'Los primeros intentos valen más',
      earlyText:
        'El multiplicador empieza en ×{{start}} en el intento 1 y baja uno en cada intento.',
      solvingTitle: 'Resolver palabras',
      solvingText:
        'Resolver una palabra vale {{solved}} × el multiplicador, y el intento que resuelve tu primera palabra suma un bonus de Primera resuelta ({{crack}} ×).',
      allTitle: 'Resolver las tres',
      allText:
        'Terminar la partida suma {{bonus}} × el multiplicador del intento con el que terminas.',
      unsolvedTitle: 'Las palabras sin resolver restan',
      unsolvedText:
        'Si te quedas sin intentos, cada palabra que no resolviste resta {{penalty}} puntos.',
      score: 'Puntos {{score}}',
    },
    setup: {
      pickTitle: 'Elige tus tres idiomas',
      pickText:
        'Nueva partida abre este selector. Toca tres idiomas; cada uno tiene su propio tablero.',
      difficultyTitle: 'Una dificultad para cada tablero',
      difficultyText:
        'La dificultad define lo rara que puede ser la respuesta de ese tablero. Cualquier palabra real del idioma sigue valiendo como intento.',
      everyTimeTitle: 'Usar siempre esta configuración',
      everyTimeText:
        'Si lo activas, Nueva partida empieza de inmediato con estos idiomas y dificultades. Puedes cambiarlos cuando quieras en Configuración de partida, en el menú.',
      examples: {
        basic: 'Palabras cotidianas',
        intermediate: 'Palabras menos comunes',
        advanced: 'Cualquier palabra del diccionario',
      },
    },
    jumble: {
      stuckTitle: '¿Atascado? Prueba la mezcla de letras',
      stuckText:
        'Toca 🔀 junto a tu fila de intento (o presiona Espacio). Cada vez que presionas 🔀 ves una nueva combinación de letras que ya conoces. Nunca revela nada nuevo.',
      followsTitle: 'Sigue a un tablero',
      followsText:
        'La mezcla de letras resalta un tablero objetivo: el que tienes enfocado, o el de la izquierda en pantallas anchas. Toca otro tablero para cambiar. Sus verdes se quedan en su sitio, sus amarillos siempre cambian de posición y sus letras grises nunca se usan.',
      pinsTitle: 'Tus letras, a tu manera',
      pinsText:
        'Las letras que escribes se quedan en la mezcla pero cambian de sitio. Toca una letra dos veces para fijarla y otra vez para soltarla. Las letras atenuadas son sugerencias al azar; escribe encima para usar la tuya.',
      gapTitle: 'Queda un hueco',
      gapText:
        'Cuando solo queda una casilla libre, cada vez que presionas se prueba la siguiente letra en el orden del teclado (Q, W, E, …), saltándose las letras ya descartadas.',
      leaveTitle: 'Adivinar o salir',
      leaveText:
        '¿Te convence? Presiona Enter para jugarla como siempre y la mezcla se cierra. ¿No es una palabra? La fila tiembla, como siempre. Presiona ✕ o Esc para salir sin jugar.',
    },
    faq: {
      dotsTitle: '¿Qué son los puntos del teclado?',
      dotsText:
        'Cada tecla tiene tres puntos, uno por tablero de izquierda a derecha. El verde y el amarillo funcionan como en las casillas, el rojo significa que la letra no está en la palabra de ese tablero, y un punto apagado significa que aún no la has probado ahí.',
      flagsTitle: '¿Puedo cambiar las banderas?',
      flagsText:
        'Sí. Abre Banderas / emojis personalizados en el menú y elige cualquier emoji para cada idioma. Tu elección se usa en todas partes: tableros, configuración, resultados e insignias.',
      accentsTitle: '¿Tengo que escribir las tildes?',
      accentsText:
        'No. Las tildes se ignoran al comprobar los intentos, así que UNITE coincide con UNITÉ y ARBOL con ÁRBOL.',
      rejectedTitle: 'No me aceptó una palabra',
      rejectedText:
        'Presiona Enter tres veces y podrás avisar que falta en un diccionario. Si vuelves a escribir una palabra que ya jugaste, puedes marcarla para los idiomas que no la tienen.',
      challengesTitle: '¿Cómo funcionan los desafíos?',
      challengesText:
        'Desafía a tus amigos con una partida que acabas de terminar o empiecen una nueva juntos. Todos juegan la misma partida y ves el resultado de cada uno en cuanto termina.',
      difficultyTitle: '¿La dificultad cambia mi puntuación?',
      difficultyText:
        'No. Los puntos son iguales en todas las dificultades; los tableros difíciles solo tienen respuestas más raras.',
      languageTitle: '¿Puedo jugar en otro idioma?',
      languageText:
        'Los tableros siempre están en los idiomas que eliges para la partida. Los menús y las instrucciones siguen el idioma de la interfaz: cámbialo desde Idioma en el menú.',
    },
  },
};
