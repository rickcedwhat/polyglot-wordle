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
    slowLoad: 'Está demorando mais do que o normal.',
  },
  uiLanguage: {
    menu: 'Idioma',
    title: 'Escolha seu idioma',
    intro:
      'Menus, instruções e mensagens vão aparecer neste idioma. Dá para trocar quando quiser em Idioma, no menu.',
    confirm: 'Continuar',
    saveFailed:
      'Não deu para salvar o idioma na sua conta, mas ele continua valendo neste dispositivo.',
  },
  login: {
    welcome: 'Bem-vindo ao Polyglot Wordle!',
    signIn: 'Entrar com o Google',
  },
  setup: {
    titles: {
      newGame: 'Novo jogo',
      settings: 'Configurações do jogo',
      challenge: 'Desafiar um amigo',
    },
    intro: 'Escolha três idiomas e depois uma dificuldade para cada tabuleiro.',
    introChallenge:
      'Escolha três idiomas e uma dificuldade para cada um. Vocês dois vão jogar o mesmo jogo.',
    selectedCount: '{{count}} de {{total}} selecionados',
    skipPicker: 'Usar sempre esta configuração',
    skipPickerHint: 'O Novo jogo começa direto. Dá para mudar em Configurações do jogo, no menu.',
    submit: {
      newGame: 'Começar',
      settings: 'Salvar',
      challenge: 'Enviar desafio e jogar',
    },
    difficulties: {
      basic: 'Básico',
      intermediate: 'Intermediário',
      advanced: 'Avançado',
    },
    difficultyLabel: 'Dificuldade de {{language}}',
    saveFailed: 'Não foi possível salvar a configuração. Tente de novo.',
    savePrefsFailed: 'Não foi possível salvar suas preferências de jogo.',
    startFailed: 'Não foi possível começar o jogo. Tente de novo.',
  },
  game: {
    invalidLink: 'Este link de jogo não é válido.',
    loadFailed: 'Não foi possível carregar o jogo. Verifique sua conexão.',
    wordListsFailed: 'Não foi possível carregar as listas de palavras. Verifique sua conexão.',
    loadingBoards: 'Carregando tabuleiros...',
    rematchReady: 'Revanche pronta',
    rematchCopied: 'Link da revanche copiado. É só mandar para {{name}}.',
    rematchCopiedFriend: 'Link da revanche copiado. É só mandar para seu amigo.',
    rematchCopyFailed:
      'Não foi possível copiar o link da revanche. Tente compartilhar manualmente.',
    clearGuess: 'Apagar tentativa',
    jumble: 'Embaralhar letras',
    jumbleShuffle: 'Embaralhar as letras',
    jumbleLeave: 'Sair de Embaralhar letras',
    jumbleIntro: 'Embaralhar letras reorganiza as letras que você já conhece.',
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
      title: '{{word}} existe mesmo?',
      prompt: 'Marcar como faltando em:',
      flagged: '{{word}} marcada',
      thanks: 'Marcada como faltando em {{language}}. Obrigado!',
    },
    challenge: {
      mode: 'MODO DESAFIO',
      points: '{{score}} PTS',
      canYouBeat: 'Você consegue vencer <name>{{name}}</name> ({{turns}}/{{max}} jogadas)?',
      notFinished: '<name>{{name}}</name> te desafiou e ainda não terminou o jogo.',
      aFriend: 'Um amigo',
      viewProfile: 'Ver o perfil de {{name}}',
      dismiss: 'Fechar aviso de desafio',
    },
    popups: {
      crack: 'Primeira palavra resolvida!',
      hatTrick: 'Hat-trick!',
      allSolved: 'Todas resolvidas!',
      solved: 'Resolvida!',
      unsolved: '{{flag}} {{language}} não resolvida',
    },
  },
  help: {
    title: 'Como jogar Polyglot Wordle',
    topics: {
      play: 'Jogar',
      scoring: 'Pontos',
      setup: 'Opções',
      jumble: 'Embaralhar',
      faq: 'FAQ',
    },
    play: {
      threeTitle: 'Três palavras, três idiomas',
      threeText:
        'Resolva ao mesmo tempo uma palavra de 5 letras em cada um dos seus três idiomas. Cada tentativa vale para os três tabuleiros.',
      colorsTitle: 'Dicas por cores',
      colorsText:
        'Como no Wordle clássico, cada tabuleiro colore sua tentativa de acordo com a própria palavra. <green>Verde</green> é a letra certa no lugar certo, <yellow>amarelo</yellow> está na palavra mas em outro lugar, e <gray>cinza</gray> não está na palavra.',
      whichTitle: 'Qual tabuleiro é qual?',
      whichText:
        'Os tabuleiros estão embaralhados, e as bandeiras mostram quais idiomas cada um pode ser. Uma linha verde embaixo de uma tentativa significa que ela é uma palavra de verdade no idioma desse tabuleiro. PLATE é inglês e francês, então o tabuleiro sem linha tem que ser o espanhol; CRANE só é inglês, o que resolve os outros dois.',
      winTitle: 'Ganhar',
      winText: 'Resolva as três palavras em até {{max}} tentativas.',
    },
    scoring: {
      pointsTitle: 'Pontos em todos os tabuleiros',
      pointsText:
        'Cada nova casa verde vale {{green}} × o multiplicador da jogada. Verdes novos nos três tabuleiros em uma só tentativa são um Hat-trick (+{{hatTrick}}).',
      pointsTextYellow:
        'Cada nova casa verde vale {{green}} × o multiplicador da jogada, e um amarelo que revela uma letra que o tabuleiro não conhecia vale {{yellow}} ×. Verdes novos nos três tabuleiros em uma só tentativa são um Hat-trick (+{{hatTrick}}).',
      earlyTitle: 'As primeiras tentativas valem mais',
      earlyText: 'O multiplicador começa em ×{{start}} na tentativa 1 e cai um a cada tentativa.',
      solvingTitle: 'Resolver palavras',
      solvingText:
        'Resolver uma palavra vale {{solved}} × o multiplicador, e a tentativa que resolve sua primeira palavra soma um bônus de Primeira palavra ({{crack}} ×).',
      allTitle: 'Resolver as três',
      allText: 'Terminar o jogo soma {{bonus}} × o multiplicador da tentativa final.',
      unsolvedTitle: 'Palavras não resolvidas custam pontos',
      unsolvedText:
        'Se suas tentativas acabarem, cada palavra que você não resolveu tira {{penalty}} pontos.',
      score: 'Pontos {{score}}',
    },
    setup: {
      pickTitle: 'Escolha seus três idiomas',
      pickText:
        'Novo jogo abre este seletor. Toque em três idiomas; cada um tem seu próprio tabuleiro.',
      difficultyTitle: 'Uma dificuldade para cada tabuleiro',
      difficultyText:
        'A dificuldade define quão rara pode ser a resposta desse tabuleiro. Qualquer palavra de verdade do idioma continua valendo como tentativa.',
      everyTimeTitle: 'Usar sempre esta configuração',
      everyTimeText:
        'Com isso ativado, o Novo jogo já começa com estes idiomas e dificuldades. Dá para mudar quando quiser em Configurações do jogo, no menu.',
      examples: {
        basic: 'Palavras do dia a dia',
        intermediate: 'Palavras menos comuns',
        advanced: 'Qualquer palavra do dicionário',
      },
    },
    jumble: {
      stuckTitle: 'Travou? Experimente Embaralhar letras',
      stuckText:
        'Toque em 🔀 ao lado da linha da tentativa (ou aperte Espaço). Cada toque em 🔀 mostra uma nova combinação das letras que você já conhece. Nunca revela nada novo.',
      followsTitle: 'Segue um tabuleiro',
      followsText:
        'Embaralhar letras destaca um tabuleiro alvo: aquele em que você está, ou o da esquerda em telas largas. Toque em outro tabuleiro para trocar. Os verdes ficam no lugar, os amarelos sempre vão para uma posição nova e as letras cinza nunca são usadas.',
      pinsTitle: 'Suas letras, do seu jeito',
      pinsText:
        'As letras que você digita ficam no embaralhamento, mas mudam de lugar. Toque duas vezes em uma letra para fixá-la e mais uma vez para soltá-la. As letras apagadas são sugestões aleatórias; digite por cima para usar a sua.',
      gapTitle: 'Só falta uma casa',
      gapText:
        'Quando só sobra uma casa livre, cada toque testa a próxima letra na ordem do teclado (Q, W, E, …), pulando as letras já descartadas.',
      leaveTitle: 'Jogar ou sair',
      leaveText:
        'Gostou? Aperte Enter para jogar normalmente e o Embaralhar letras fecha. Não é uma palavra? A linha treme, como sempre. Aperte ✕ ou Esc para sair sem jogar.',
    },
    faq: {
      dotsTitle: 'O que são os pontinhos no teclado?',
      dotsText:
        'Cada tecla tem três pontinhos, um por tabuleiro da esquerda para a direita. Verde e amarelo funcionam como nas casas, vermelho significa que a letra não está na palavra desse tabuleiro, e um pontinho apagado significa que você ainda não testou a letra ali.',
      flagsTitle: 'Posso mudar as bandeiras?',
      flagsText:
        'Sim. Abra Bandeiras / emojis personalizados no menu e escolha um emoji para cada idioma. Sua escolha vale em todo lugar: tabuleiros, configuração, resultados e medalhas.',
      accentsTitle: 'Preciso digitar os acentos?',
      accentsText:
        'Não. Os acentos são ignorados na hora de verificar as tentativas, então UNITE corresponde a UNITÉ e ARBOL a ÁRBOL.',
      rejectedTitle: 'Minha palavra não foi aceita',
      rejectedText:
        'Aperte Enter três vezes e você pode marcá-la como faltando em um dicionário. Se digitar de novo uma palavra que já jogou, pode marcá-la para os idiomas que não a têm.',
      challengesTitle: 'Como funcionam os desafios?',
      challengesText:
        'Desafie amigos em um jogo que você acabou de terminar, ou comecem um novo juntos. Todo mundo joga o mesmo jogo, e você vê o resultado de cada um assim que ele termina.',
      difficultyTitle: 'A dificuldade muda minha pontuação?',
      difficultyText:
        'Não. Os pontos são iguais em todas as dificuldades; os tabuleiros mais difíceis só têm respostas mais raras.',
      languageTitle: 'Posso jogar em outro idioma?',
      languageText:
        'Os tabuleiros estão sempre nos idiomas que você escolhe para o jogo. Os menus e as instruções seguem o idioma da interface: mude em Idioma no menu.',
    },
  },
};
