import type { Translation } from './en';

export const pt: Translation = {
  languages: {
    en: 'Inglês',
    es: 'Espanhol',
    fr: 'Francês',
    it: 'Italiano',
    pt: 'Português',
  },
  common: {
    tryAgain: 'Tentar de novo',
    slowLoad: 'Isto está a demorar mais do que o normal.',
  },
  uiLanguage: {
    menu: 'Idioma',
    title: 'Escolha o seu idioma',
    intro:
      'Os menus, as instruções e as mensagens vão usar este idioma. Pode mudá-lo quando quiser em Idioma no menu.',
    confirm: 'Continuar',
    saveFailed:
      'Não foi possível guardar o idioma na sua conta. Continua definido neste dispositivo.',
  },
  login: {
    welcome: 'Bem-vindo ao Polyglot Wordle!',
    signIn: 'Entrar com o Google',
  },
  setup: {
    titles: {
      newGame: 'Novo jogo',
      settings: 'Configuração do jogo',
      challenge: 'Desafiar um amigo',
    },
    intro: 'Escolha três idiomas e depois uma dificuldade para cada tabuleiro.',
    introChallenge:
      'Escolha três idiomas e uma dificuldade para cada um. Vocês dois recebem os mesmos tabuleiros.',
    selectedCount: '{{count}} de {{total}} selecionados',
    skipPicker: 'Usar sempre esta configuração',
    skipPickerHint: 'Novo jogo começa logo. Mude em Configuração do jogo no menu.',
    submit: {
      newGame: 'Começar',
      settings: 'Guardar',
      challenge: 'Enviar desafio e jogar',
    },
    difficulties: {
      basic: 'Básico',
      intermediate: 'Intermédio',
      advanced: 'Avançado',
    },
    difficultyLabel: 'Dificuldade de {{language}}',
    saveFailed: 'Não foi possível guardar a configuração. Tente de novo.',
    savePrefsFailed: 'Não foi possível guardar as suas preferências de jogo.',
    startFailed: 'Não foi possível começar o jogo. Tente de novo.',
  },
  game: {
    invalidLink: 'Este link de jogo não é válido.',
    loadFailed: 'Não foi possível carregar o jogo. Verifique a sua ligação.',
    wordListsFailed: 'Não foi possível carregar as listas de palavras. Verifique a sua ligação.',
    loadingBoards: 'A carregar tabuleiros...',
    rematchReady: 'Desforra pronta',
    rematchCopied: 'Link da desforra copiado. Envie-o a {{name}}.',
    rematchCopiedFriend: 'Link da desforra copiado. Envie-o ao seu amigo.',
    rematchCopyFailed: 'Não foi possível copiar o link da desforra. Tente partilhá-lo manualmente.',
    clearGuess: 'Apagar tentativa',
    jumble: 'Baralhar letras',
    jumbleShuffle: 'Baralhar as letras',
    jumbleLeave: 'Sair de Baralhar letras',
    jumbleIntro: 'Baralhar letras reorganiza as letras que já conhece.',
    jumbleHowItWorks: 'Como funciona',
    dismissHint: 'Fechar dica',
    slot: 'Casa {{n}}: {{letter}}',
    slotEmpty: 'Casa {{n}}: vazia',
    slotLocked: 'Casa {{n}}: {{letter}}, {{lock}}',
    locks: {
      pinned: 'fixada',
      suggested: 'sugerida',
    },
    definitionNotFound: 'Definição não encontrada.',
    flagWord: 'Marcar palavra para revisão com IA',
    unflagWord: 'Remover marcação',
    missingWord: {
      title: '{{word}} é uma palavra real?',
      prompt: 'Marcar como em falta em:',
      flagged: '{{word}} marcada',
      thanks: 'Marcada como em falta em {{language}}. Obrigado!',
    },
    challenge: {
      mode: 'MODO DESAFIO',
      points: '{{score}} PTS',
      canYouBeat: 'Consegue vencer <name>{{name}}</name> ({{turns}}/{{max}} jogadas)?',
      notFinished: '<name>{{name}}</name> desafiou-o. Ainda não terminou.',
      aFriend: 'Um amigo',
      viewProfile: 'Ver o perfil de {{name}}',
      dismiss: 'Fechar aviso de desafio',
    },
    popups: {
      crack: 'Primeira palavra resolvida!',
      hatTrick: 'Hat-trick!',
      allSolved: 'Todas resolvidas!',
      solved: 'Resolvida!',
      unsolved: '{{flag}} {{language}} por resolver',
    },
  },
  help: {
    title: 'Como jogar Polyglot Wordle',
    topics: {
      play: 'Jogar',
      scoring: 'Pontos',
      setup: 'Opções',
      jumble: 'Baralhar',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Três palavras, três idiomas',
      threeText:
        'Resolva ao mesmo tempo uma palavra de 5 letras em cada um dos seus três idiomas. Cada tentativa é jogada nos três tabuleiros.',
      colorsTitle: 'Pistas em cores',
      colorsText:
        'Como no Wordle clássico, cada tabuleiro colore a sua tentativa de acordo com a sua própria palavra. <green>Verde</green> é a letra certa no sítio certo, <yellow>amarelo</yellow> está na palavra mas noutro sítio, e <gray>cinzento</gray> não está na palavra.',
      whichTitle: 'Qual tabuleiro é qual?',
      whichText:
        'Os tabuleiros estão baralhados e as bandeiras mostram que idiomas cada um pode ser. Uma linha verde por baixo de uma tentativa significa que é uma palavra real no idioma desse tabuleiro. PLATE é inglês e francês, por isso o tabuleiro sem linha tem de ser o espanhol; CRANE só é inglês, o que resolve os outros dois.',
      winTitle: 'Ganhar',
      winText: 'Resolva as três palavras em até {{max}} tentativas.',
    },
    scoring: {
      pointsTitle: 'Pontos em todos os tabuleiros',
      pointsText:
        'Cada nova casa verde vale {{green}} × o multiplicador da jogada. Verdes novos nos três tabuleiros numa só tentativa são um Hat-trick (+{{hatTrick}}).',
      pointsTextYellow:
        'Cada nova casa verde vale {{green}} × o multiplicador da jogada, e um amarelo que revela uma letra que o tabuleiro não conhecia vale {{yellow}} ×. Verdes novos nos três tabuleiros numa só tentativa são um Hat-trick (+{{hatTrick}}).',
      earlyTitle: 'As primeiras tentativas valem mais',
      earlyText:
        'O multiplicador começa em ×{{start}} na tentativa 1 e desce um em cada tentativa.',
      solvingTitle: 'Resolver palavras',
      solvingText:
        'Resolver uma palavra vale {{solved}} × o multiplicador, e a tentativa que resolve a sua primeira palavra soma um bónus de Primeira palavra ({{crack}} ×).',
      allTitle: 'Resolver as três',
      allText: 'Terminar o jogo soma {{bonus}} × o multiplicador da tentativa com que termina.',
      unsolvedTitle: 'Palavras por resolver custam pontos',
      unsolvedText:
        'Se ficar sem tentativas, cada palavra que não resolveu tira {{penalty}} pontos.',
      score: 'Pontos {{score}}',
    },
    setup: {
      pickTitle: 'Escolha os seus três idiomas',
      pickText: 'Novo jogo abre este seletor. Toque em três idiomas; cada um tem o seu tabuleiro.',
      difficultyTitle: 'Uma dificuldade para cada tabuleiro',
      difficultyText:
        'A dificuldade define quão rara pode ser a resposta desse tabuleiro. Qualquer palavra real do idioma continua a valer como tentativa.',
      everyTimeTitle: 'Usar sempre esta configuração',
      everyTimeText:
        'Ative e Novo jogo começa logo com estes idiomas e dificuldades. Mude-os quando quiser em Configuração do jogo no menu.',
      examples: {
        basic: 'Palavras do dia a dia',
        intermediate: 'Palavras menos comuns',
        advanced: 'Qualquer palavra do dicionário',
      },
    },
    jumble: {
      stuckTitle: 'Encravado? Experimente Baralhar letras',
      stuckText:
        'Toque em 🔀 ao lado da linha da tentativa (ou carregue em Espaço). Cada toque em 🔀 mostra uma nova combinação das letras que já conhece. Nunca revela nada de novo.',
      followsTitle: 'Segue um tabuleiro',
      followsText:
        'Baralhar letras destaca um tabuleiro alvo: aquele em que está, ou o da esquerda em ecrãs largos. Toque noutro tabuleiro para mudar. Os verdes ficam no lugar, os amarelos entram sempre numa posição nova e as letras cinzentas nunca são usadas.',
      pinsTitle: 'As suas letras, as suas fixações',
      pinsText:
        'As letras que escreve ficam no baralhar mas mudam de sítio. Toque numa letra duas vezes para a fixar e outra vez para a soltar. As letras esbatidas são sugestões aleatórias; escreva por cima para usar a sua.',
      gapTitle: 'Só falta uma casa',
      gapText:
        'Quando só resta uma casa livre, cada toque experimenta a letra seguinte na ordem do teclado (Q, W, E, …), saltando as letras já excluídas.',
      leaveTitle: 'Jogar ou sair',
      leaveText:
        'Gosta? Carregue em Enter para jogar como sempre e o Baralhar letras fecha. Não é uma palavra? Abana como sempre. Carregue em ✕ ou Esc para sair sem jogar.',
    },
    faq: {
      dotsTitle: 'O que são os pontos no teclado?',
      dotsText:
        'Cada tecla tem três pontos, um por tabuleiro da esquerda para a direita. O verde e o amarelo funcionam como nas casas, o vermelho significa que a letra não está na palavra desse tabuleiro, e um ponto apagado significa que ainda não a experimentou lá.',
      flagsTitle: 'Posso mudar as bandeiras?',
      flagsText:
        'Sim. Abra Bandeiras / emojis personalizados no menu e escolha um emoji para cada idioma. A sua escolha é usada em todo o lado: tabuleiros, configuração, resultados e medalhas.',
      accentsTitle: 'Preciso de escrever os acentos?',
      accentsText:
        'Não. Os acentos são ignorados ao verificar as tentativas, por isso UNITE corresponde a UNITÉ e ARBOL a ÁRBOL.',
      rejectedTitle: 'A minha palavra não foi aceite',
      rejectedText:
        'Carregue em Enter três vezes e pode marcá-la como em falta num dicionário. Se voltar a escrever uma palavra que já jogou, pode marcá-la para os idiomas que não a têm.',
      challengesTitle: 'Como funcionam os desafios?',
      challengesText:
        'Desafie amigos num jogo que acabou de terminar, ou comecem um novo juntos. Todos jogam exatamente os mesmos tabuleiros, e vê cada resultado assim que terminam.',
      difficultyTitle: 'A dificuldade muda a minha pontuação?',
      difficultyText:
        'Não. Os pontos são iguais em todas as dificuldades; os tabuleiros mais difíceis só têm respostas mais raras.',
      languageTitle: 'Posso jogar noutro idioma?',
      languageText:
        'Os tabuleiros estão sempre nos idiomas que escolhe para o jogo. Os menus e as instruções seguem o idioma da interface: mude-o em Idioma no menu.',
    },
  },
};
