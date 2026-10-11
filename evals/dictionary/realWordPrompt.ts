import { getLanguageName } from './lexicalValidity';

export interface ChoicePrompt {
  prompt: string;
  choices: { yes: string; no: string };
}

/**
 * "Is this a real word?" asked in the word's own language. Asked in English, Jev
 * judges words that look English (duper, vexer) as English words.
 */
export function realWordPrompt(lang: string, display: string): ChoicePrompt {
  const w = display;
  switch (lang) {
    case 'es':
      return {
        prompt: `¿Es "${w}" una palabra real del español que usan los hablantes nativos?`,
        choices: {
          yes: 'Sí. Todo esto cuenta como sí: cualquier forma estándar de una palabra real (conjugaciones, plurales, formas femeninas); palabras vulgares, de argot, raras o anticuadas; préstamos que los hispanohablantes usan habitualmente (como "pizza" o "tofu"); palabras que se escriben como una palabra inglesa pero que también existen en español; nombres que también tienen un significado común.',
          no: 'No: solo un nombre propio, una palabra extranjera que los hispanohablantes no usan, una abreviatura, una errata o algo que no es una palabra.',
        },
      };
    case 'fr':
      return {
        prompt: `Est-ce que "${w}" est un vrai mot français employé par les locuteurs natifs ?`,
        choices: {
          yes: 'Oui. Tout ceci compte comme oui : toute forme standard d\'un vrai mot (conjugaisons, pluriels, formes féminines) ; les mots vulgaires, argotiques, rares ou vieillis ; les emprunts courants chez les francophones (comme "pizza" ou "tofu") ; les mots qui s\'écrivent comme un mot anglais mais existent aussi en français ; les noms qui ont aussi un sens ordinaire.',
          no: "Non : seulement un nom propre, un mot étranger que les francophones n'utilisent pas, une abréviation, une faute de frappe, ou pas un mot du tout.",
        },
      };
    case 'it':
      return {
        prompt: `"${w}" è una vera parola italiana usata dai madrelingua?`,
        choices: {
          yes: 'Sì. Tutto questo conta come sì: qualsiasi forma standard di una parola reale (coniugazioni, plurali, forme femminili); parole volgari, gergali, rare o antiquate; prestiti usati comunemente dagli italiani (come "tofu" o "weekend"); parole scritte come una parola inglese che esistono anche in italiano; nomi che hanno anche un significato comune.',
          no: "No: solo un nome proprio, una parola straniera che gli italiani non usano, un'abbreviazione, un refuso, o non è affatto una parola.",
        },
      };
    case 'pt':
      return {
        prompt: `"${w}" é uma palavra real do português usada por falantes nativos?`,
        choices: {
          yes: 'Sim. Tudo isto conta como sim: qualquer forma padrão de uma palavra real (conjugações, plurais, formas femininas); palavras vulgares, de gíria, raras ou antiquadas; empréstimos que os falantes de português usam com frequência (como "pizza" ou "tofu"); palavras escritas como uma palavra inglesa que também existem em português; nomes que também têm um significado comum.',
          no: 'Não: apenas um nome próprio, uma palavra estrangeira que os falantes de português não usam, uma abreviatura, um erro de digitação, ou nem sequer é uma palavra.',
        },
      };
    default: {
      const name = getLanguageName(lang);
      return {
        prompt: `Is "${w}" a real ${name} word that native speakers use?`,
        choices: {
          yes: `Yes. All of these count as yes: any standard form of a real word (conjugations, plurals, feminine forms); vulgar, slang, rare or old-fashioned words; loanwords ${name} speakers commonly use (like "pizza" or "tofu"); words spelled like a word in another language that also exist in ${name}; names that also have an ordinary meaning.`,
          no: `No: only a proper name, a foreign word ${name} speakers do not use, an abbreviation, a typo, or not a word at all.`,
        },
      };
    }
  }
}
