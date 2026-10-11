/**
 * Wording lab: asks Jev each gate's question several different ways, on the pilot's
 * "maybe" words plus control words Jev was already sure about, to see which wording
 * settles the maybes without flipping the controls.
 *
 * Usage:
 *   npm run eval:dict:wording-lab
 *   npm run eval:dict:wording-lab -- --gate=real_word --controls=30
 *
 * Needs the pilot's evals/artifacts/review_{lang}.json files.
 * Writes evals/artifacts/wording_lab.json and wording_lab.summary.md.
 */
import fs from 'fs';
import path from 'path';
import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { loadEnv, mapPool } from './cli';
import { getLanguageName } from './lexicalValidity';
import { generateMeanings, Meaning, translateMeanings } from './meanings';
import { Language } from './types';
import {
  buildMeaningQuestions,
  buildWordQuestions,
  decide,
  mainMeaningIndex,
  ReviewResult,
  SURE,
} from './wordReview';

loadEnv();

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'evals', 'artifacts');
const LANGS = ['en', 'es', 'fr', 'it', 'pt'];

type Gate = 'real_word' | 'offensive' | 'slang' | 'obscure';
/** Which way a sure answer pushes the word, using the current policy. */
type Side = 'answer' | 'guess' | 'removed';

interface LabWord {
  lang: string;
  word: string;
  display: string;
  meanings: Meaning[];
  main: Meaning;
  /** maybe = the pilot was unsure at this gate; control = the pilot was sure. */
  role: 'maybe' | 'control';
  /** The pilot's side at this gate (controls only). */
  pilotSide?: Side;
  /** Language the meanings are written in (default English). */
  defLang?: 'en' | 'native';
}

interface Variant {
  id: string;
  gate: Gate;
  label: string;
  /** Example words quoted in the wording; must not be pilot words. */
  examples: string[];
  /** Only ask about words in these languages (default: all). */
  langs?: string[];
  /** Swap the English meanings for native ones: translated from English, or written natively. */
  nativeDefs?: 'translated' | 'generated';
  questions: (w: LabWord) => Record<string, ReturnType<typeof choice>>;
  /** Reads Jev's answers into a bucket name, its side, and a confidence. */
  read: (answers: Record<string, { choice: string; confidence: number }>) => {
    bucket: string;
    side: Side;
    confidence: number;
  };
}

const reviewInput = (w: LabWord) => ({
  word: w.word,
  lang: w.lang,
  display: w.display,
  meanings: w.meanings,
});

const one =
  (key: string, sides: Record<string, Side>) =>
  (a: Record<string, { choice: string; confidence: number }>) => ({
    bucket: a[key].choice,
    side: sides[a[key].choice],
    confidence: a[key].confidence,
  });

const REAL_SIDES: Record<string, Side> = {
  yes: 'answer',
  no: 'removed',
  name: 'removed',
  foreign: 'removed',
  abbreviation: 'removed',
  fused: 'removed',
  gibberish: 'removed',
};
const RATING_SIDES: Record<string, Side> = {
  clean: 'answer',
  mild: 'answer',
  vulgar: 'guess',
  slur: 'removed',
};
const SLANG_SIDES: Record<string, Side> = {
  no: 'answer',
  standard: 'answer',
  informal: 'answer',
  yes: 'guess',
  slang: 'guess',
};
const OBSCURE_SIDES: Record<string, Side> = {
  no: 'answer',
  known: 'answer',
  common: 'answer',
  specialist: 'answer',
  yes: 'guess',
  obscure: 'guess',
};

const lang = (w: LabWord) => getLanguageName(w.lang);

const VARIANTS: Variant[] = [
  {
    id: 'real_A',
    gate: 'real_word',
    label: 'Current: six choices with reasons',
    examples: [],
    questions: (w) => ({ realWord: buildWordQuestions(reviewInput(w)).realWord }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_B',
    gate: 'real_word',
    label: 'Plain yes / no',
    examples: [],
    questions: (w) => ({
      realWord: choice(`Is "${w.display}" a real ${lang(w)} word?`, { yes: 'Yes', no: 'No' }),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_C',
    gate: 'real_word',
    label: 'Yes / no with explicit rules',
    examples: ['pizza', 'tofu'],
    questions: (w) => ({
      realWord: choice(`Is "${w.display}" a real ${lang(w)} word that native speakers use?`, {
        yes: `Yes. All of these count as yes: any standard form of a real word (conjugations, plurals, feminine forms); vulgar, slang, rare or old-fashioned words; loanwords ${lang(w)} speakers commonly use (like "pizza" or "tofu"); words spelled like an English word that also exist in ${lang(w)}; names that also have an ordinary meaning.`,
        no: `No: only a proper name, a foreign word ${lang(w)} speakers do not use, an abbreviation, a typo, or not a word at all.`,
      }),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_D',
    gate: 'real_word',
    label: 'Dictionary or spellchecker framing',
    examples: [],
    questions: (w) => ({
      realWord: choice(
        `Would a good ${lang(w)} dictionary or spellchecker accept "${w.display}" as a ${lang(w)} word, counting conjugated, plural and feminine forms?`,
        { yes: 'Yes, it would accept it', no: 'No, it would flag it as not a word' }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },

  {
    id: 'real_E',
    gate: 'real_word',
    label: 'Yes / no anchored on the main meaning',
    examples: [],
    questions: (w) => ({
      realWord: choice(
        `Is "${w.display}" a real ${lang(w)} word (or a standard form of one) that ${lang(w)} speakers use with this meaning: "${w.main?.def ?? '(no meaning given)'}"?`,
        { yes: 'Yes', no: 'No' }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_F',
    gate: 'real_word',
    label: 'Explicit rules + anchored on the main meaning',
    examples: ['pizza', 'tofu'],
    questions: (w) => ({
      realWord: choice(
        `Is "${w.display}" a real ${lang(w)} word that ${lang(w)} speakers use with this meaning: "${w.main?.def ?? '(no meaning given)'}"?`,
        {
          yes: `Yes. All of these count as yes: any standard form of a real word (conjugations, plurals, feminine forms, verbs with attached pronouns); vulgar, slang, rare or old-fashioned words; loanwords ${lang(w)} speakers commonly use (like "pizza" or "tofu"); words spelled like an English word that also exist in ${lang(w)}; names that also have an ordinary meaning.`,
          no: `No: only a proper name, a foreign word ${lang(w)} speakers do not use, an abbreviation, a typo, or not a word at all.`,
        }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'fused',
    gate: 'real_word',
    label: 'Second question: verb with attached pronouns?',
    examples: [],
    questions: (w) => ({
      fused: choice(
        `Is the ${lang(w)} word "${w.display}" a verb with one or more pronouns attached to it, written as one word?`,
        { no: 'No', yes: 'Yes' }
      ),
    }),
    read: (a) => ({
      bucket: a.fused.choice === 'yes' ? 'fused' : 'single',
      side: a.fused.choice === 'yes' ? 'removed' : 'answer',
      confidence: a.fused.confidence,
    }),
  },

  {
    id: 'off_A',
    gate: 'offensive',
    label: 'Current: clean / vulgar / slur',
    examples: [],
    questions: (w) => ({ rating: buildMeaningQuestions(reviewInput(w), w.main).rating }),
    read: one('rating', RATING_SIDES),
  },
  {
    id: 'off_B',
    gate: 'offensive',
    label: 'Adds "mild"',
    examples: ['dork', 'jerk', 'booger'],
    questions: (w) => ({
      rating: choice(
        `How offensive is the ${lang(w)} word "${w.display}" when used with this meaning: "${w.main.def}"?`,
        {
          clean:
            'Clean: neutral or polite, fine anywhere including with children. Words that describe people, groups or conditions neutrally are clean.',
          mild: 'Mild: a bit rude or crude but not swearing, such as childish bathroom words or mild insults (like "dork", "jerk" or "booger")',
          vulgar: 'Vulgar: swearing, profanity, or explicit sexual language',
          slur: 'Slur: used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability',
        }
      ),
    }),
    read: one('rating', RATING_SIDES),
  },
  {
    id: 'off_C',
    gate: 'offensive',
    label: 'Two yes/no questions: avoid in class? slur?',
    examples: [],
    questions: (w) => ({
      avoid: choice(
        `Would a primary school teacher avoid saying the ${lang(w)} word "${w.display}" in class, when it means: "${w.main.def}"?`,
        { no: 'No, it is fine to say in class', yes: 'Yes, they would avoid it' }
      ),
      slur: choice(
        `Is the ${lang(w)} word "${w.display}", meaning "${w.main.def}", a slur used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability?`,
        { no: 'No', yes: 'Yes' }
      ),
    }),
    read: (a) => {
      if (a.slur.choice === 'yes') {
        return { bucket: 'slur', side: 'removed', confidence: a.slur.confidence };
      }
      return a.avoid.choice === 'yes'
        ? {
            bucket: 'avoid',
            side: 'guess',
            confidence: Math.min(a.avoid.confidence, a.slur.confidence),
          }
        : {
            bucket: 'clean',
            side: 'answer',
            confidence: Math.min(a.avoid.confidence, a.slur.confidence),
          };
    },
  },
  {
    id: 'off_D',
    gate: 'offensive',
    label: 'School dictionary label framing',
    examples: [],
    questions: (w) => ({
      rating: choice(
        `How would a careful school dictionary label the ${lang(w)} word "${w.display}" in this meaning: "${w.main.def}"?`,
        {
          clean: 'No label: neutral vocabulary',
          mild: 'Labelled "informal" or "rude" or "derogatory", but not offensive or vulgar',
          vulgar:
            'Labelled "vulgar" or "offensive": swearing, profanity or explicit sexual language',
          slur: 'Labelled "offensive slur": demeans a group of people',
        }
      ),
    }),
    read: one('rating', RATING_SIDES),
  },

  {
    id: 'slang_A',
    gate: 'slang',
    label: 'Current: yes / no',
    examples: [],
    questions: (w) => ({ slang: buildMeaningQuestions(reviewInput(w), w.main).slang }),
    read: one('slang', SLANG_SIDES),
  },
  {
    id: 'slang_B',
    gate: 'slang',
    label: 'Standard / informal / slang',
    examples: ['kid', 'okay', 'dope'],
    questions: (w) => ({
      slang: choice(
        `Which register is the ${lang(w)} word "${w.display}" in this meaning: "${w.main.def}"?`,
        {
          standard: 'Standard: normal vocabulary, fine in writing and formal speech',
          informal:
            'Informal: a casual everyday word that dictionaries mark "informal" or "colloquial" but everyone knows (like "kid" or "okay")',
          slang:
            'Slang: a dictionary would mark it "slang": street, group or trendy language that not everyone uses (like "dope" meaning excellent)',
        }
      ),
    }),
    read: one('slang', SLANG_SIDES),
  },
  {
    id: 'slang_C',
    gate: 'slang',
    label: 'Slang label, not just informal',
    examples: [],
    questions: (w) => ({
      slang: choice(
        `Would a standard ${lang(w)} dictionary label this meaning of "${w.display}" as slang, and not just informal or colloquial? Meaning: "${w.main.def}"`,
        { no: 'No', yes: 'Yes, it is labelled slang' }
      ),
    }),
    read: one('slang', SLANG_SIDES),
  },

  {
    id: 'obs_A',
    gate: 'obscure',
    label: 'Current: yes / no',
    examples: [],
    questions: (w) => ({ obscure: buildWordQuestions(reviewInput(w)).obscure }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_B',
    gate: 'obscure',
    label: 'Judge the meaning, not the form',
    examples: [],
    questions: (w) => ({
      obscure: choice(
        `Would most educated adult ${lang(w)} speakers know what "${w.display}" means? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word still counts as known. Specialist words people meet at school, in the news or in daily life also count as known.`,
        { known: 'Yes, most would know it', obscure: 'No, most would not know it' }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_C',
    gate: 'obscure',
    label: 'Would an average adult know it?',
    examples: [],
    questions: (w) => ({
      obscure: choice(
        `Would an average adult native ${lang(w)} speaker know what "${w.display}" means?`,
        {
          known: 'Yes',
          obscure: 'No',
        }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_D',
    gate: 'obscure',
    label: 'Common / specialist but known / obscure',
    examples: ['vaccine', 'referee'],
    questions: (w) => ({
      obscure: choice(`How familiar is the ${lang(w)} word "${w.display}" to native speakers?`, {
        common: 'Common: an everyday word most people know',
        specialist:
          'Specialist but known: a technical, scientific, legal, food or sports word most educated adults still recognise (like "vaccine" or "referee")',
        obscure:
          'Obscure: archaic, rare, regional or expert jargon most native speakers would not recognise',
      }),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_E',
    gate: 'obscure',
    label: 'Three-way, judging the meaning not the form',
    examples: ['vaccine', 'referee'],
    questions: (w) => ({
      obscure: choice(
        `How familiar is the meaning of the ${lang(w)} word "${w.display}" to native speakers? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word counts as that word.`,
        {
          common: 'Common: an everyday word most people know',
          specialist:
            'Specialist but known: a technical, scientific, legal, food or sports word most educated adults still recognise (like "vaccine" or "referee")',
          obscure:
            'Obscure: archaic, rare, regional or expert jargon most native speakers would not recognise',
        }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
];

const NON_EN = ['es', 'fr', 'it', 'pt'];
const enNote = (w: LabWord, note: string) => (w.defLang === 'native' ? '' : note);
type Native = Record<string, (w: LabWord) => { q: string; c: Record<string, string> }>;

const NATIVE_REAL: Native = {
  es: (w) => ({
    q: `¿Es "${w.display}" una palabra real del español que usan los hablantes nativos?`,
    c: {
      yes: 'Sí. Todo esto cuenta como sí: cualquier forma estándar de una palabra real (conjugaciones, plurales, formas femeninas); palabras vulgares, de argot, raras o anticuadas; préstamos que los hispanohablantes usan habitualmente (como "pizza" o "tofu"); palabras que se escriben como una palabra inglesa pero que también existen en español; nombres que también tienen un significado común.',
      no: 'No: solo un nombre propio, una palabra extranjera que los hispanohablantes no usan, una abreviatura, una errata o algo que no es una palabra.',
    },
  }),
  fr: (w) => ({
    q: `Est-ce que "${w.display}" est un vrai mot français employé par les locuteurs natifs ?`,
    c: {
      yes: 'Oui. Tout ceci compte comme oui : toute forme standard d\'un vrai mot (conjugaisons, pluriels, formes féminines) ; les mots vulgaires, argotiques, rares ou vieillis ; les emprunts courants chez les francophones (comme "pizza" ou "tofu") ; les mots qui s\'écrivent comme un mot anglais mais existent aussi en français ; les noms qui ont aussi un sens ordinaire.',
      no: "Non : seulement un nom propre, un mot étranger que les francophones n'utilisent pas, une abréviation, une faute de frappe, ou pas un mot du tout.",
    },
  }),
  it: (w) => ({
    q: `"${w.display}" è una vera parola italiana usata dai madrelingua?`,
    c: {
      yes: 'Sì. Tutto questo conta come sì: qualsiasi forma standard di una parola reale (coniugazioni, plurali, forme femminili); parole volgari, gergali, rare o antiquate; prestiti usati comunemente dagli italiani (come "tofu" o "weekend"); parole scritte come una parola inglese che esistono anche in italiano; nomi che hanno anche un significato comune.',
      no: "No: solo un nome proprio, una parola straniera che gli italiani non usano, un'abbreviazione, un refuso, o non è affatto una parola.",
    },
  }),
  pt: (w) => ({
    q: `"${w.display}" é uma palavra real do português usada por falantes nativos?`,
    c: {
      yes: 'Sim. Tudo isto conta como sim: qualquer forma padrão de uma palavra real (conjugações, plurais, formas femininas); palavras vulgares, de gíria, raras ou antiquadas; empréstimos que os falantes de português usam com frequência (como "pizza" ou "tofu"); palavras escritas como uma palavra inglesa que também existem em português; nomes que também têm um significado comum.',
      no: 'Não: apenas um nome próprio, uma palavra estrangeira que os falantes de português não usam, uma abreviatura, um erro de digitação, ou nem sequer é uma palavra.',
    },
  }),
};

const NATIVE_RATING: Native = {
  es: (w) => ({
    q: `¿Qué tan ofensiva es la palabra española "${w.display}" cuando se usa con este significado${enNote(w, ' (definición en inglés)')}: "${w.main.def}"?`,
    c: {
      clean:
        'Limpia: neutral o educada, aceptable en cualquier contexto, también con niños. Las palabras que describen personas, grupos o condiciones de forma neutral son limpias.',
      mild: 'Leve: un poco grosera o burda pero no es una palabrota, como palabras infantiles del baño o insultos suaves (como "bobo", "moco" o "pedo")',
      vulgar: 'Vulgar: palabrotas, groserías o lenguaje sexual explícito',
      slur: 'Insulto discriminatorio: se usa para denigrar a un grupo de personas por su raza, etnia, nacionalidad, religión, sexualidad, género o discapacidad',
    },
  }),
  fr: (w) => ({
    q: `À quel point le mot français "${w.display}" est-il offensant quand il est employé dans ce sens${enNote(w, ' (définition en anglais)')} : "${w.main.def}" ?`,
    c: {
      clean:
        'Correct : neutre ou poli, acceptable partout, y compris avec des enfants. Les mots qui décrivent des personnes, des groupes ou des états de façon neutre sont corrects.',
      mild: 'Léger : un peu grossier ou cru sans être un juron, comme les mots enfantins liés aux toilettes ou les insultes légères (comme "crotte", "zizi" ou "nigaud")',
      vulgar: 'Vulgaire : jurons, grossièretés ou langage sexuel explicite',
      slur: 'Injure discriminatoire : employée pour rabaisser un groupe de personnes en raison de leur race, origine ethnique, nationalité, religion, sexualité, genre ou handicap',
    },
  }),
  it: (w) => ({
    q: `Quanto è offensiva la parola italiana "${w.display}" quando è usata con questo significato${enNote(w, ' (definizione in inglese)')}: "${w.main.def}"?`,
    c: {
      clean:
        'Pulita: neutra o educata, va bene ovunque, anche con i bambini. Le parole che descrivono persone, gruppi o condizioni in modo neutro sono pulite.',
      mild: 'Lieve: un po\' maleducata o grossolana ma non è una parolaccia, come le parole infantili da bagno o gli insulti leggeri (come "stupido", "moccio" o "pupù")',
      vulgar: 'Volgare: parolacce, bestemmie o linguaggio sessuale esplicito',
      slur: 'Insulto discriminatorio: usato per denigrare un gruppo di persone per razza, etnia, nazionalità, religione, sessualità, genere o disabilità',
    },
  }),
  pt: (w) => ({
    q: `Quão ofensiva é a palavra portuguesa "${w.display}" quando usada com este significado${enNote(w, ' (definição em inglês)')}: "${w.main.def}"?`,
    c: {
      clean:
        'Limpa: neutra ou educada, adequada em qualquer lugar, inclusive com crianças. Palavras que descrevem pessoas, grupos ou condições de forma neutra são limpas.',
      mild: 'Leve: um pouco rude ou grosseira mas não é palavrão, como palavras infantis de banheiro ou insultos leves (como "bobo", "meleca" ou "cocô")',
      vulgar: 'Vulgar: palavrões, obscenidades ou linguagem sexual explícita',
      slur: 'Insulto discriminatório: usado para rebaixar um grupo de pessoas por raça, etnia, nacionalidade, religião, sexualidade, gênero ou deficiência',
    },
  }),
};

const NATIVE_SLANG: Native = {
  es: (w) => ({
    q: `¿Un diccionario estándar de español marcaría este significado de "${w.display}" como argot o jerga, y no solo como informal o coloquial? Significado${enNote(w, ' (en inglés)')}: "${w.main.def}"`,
    c: { no: 'No', yes: 'Sí, está marcado como argot' },
  }),
  fr: (w) => ({
    q: `Un dictionnaire français standard indiquerait-il ce sens de "${w.display}" comme argotique, et pas seulement familier ? Sens${enNote(w, ' (en anglais)')} : "${w.main.def}"`,
    c: { no: 'Non', yes: 'Oui, il est marqué comme argot' },
  }),
  it: (w) => ({
    q: `Un dizionario italiano standard indicherebbe questo significato di "${w.display}" come gergale, e non solo informale o colloquiale? Significato${enNote(w, ' (in inglese)')}: "${w.main.def}"`,
    c: { no: 'No', yes: 'Sì, è indicato come gergale' },
  }),
  pt: (w) => ({
    q: `Um dicionário padrão de português marcaria este significado de "${w.display}" como gíria, e não apenas como informal ou coloquial? Significado${enNote(w, ' (em inglês)')}: "${w.main.def}"`,
    c: { no: 'Não', yes: 'Sim, está marcado como gíria' },
  }),
};

const NATIVE_OBSCURE: Native = {
  es: (w) => ({
    q: `¿Qué tan conocido es para los hablantes nativos el significado de la palabra española "${w.display}"? Juzga el significado, no la forma gramatical: un tiempo verbal o una forma poco común de una palabra conocida cuenta como esa palabra.`,
    c: {
      common: 'Común: una palabra cotidiana que la mayoría conoce',
      specialist:
        'Especializada pero conocida: una palabra técnica, científica, jurídica, culinaria o deportiva que la mayoría de los adultos con estudios reconoce (como "vacuna" o "árbitro")',
      obscure:
        'Rara: arcaica, poco usada, regional o jerga experta que la mayoría de los hablantes nativos no reconocería',
    },
  }),
  fr: (w) => ({
    q: `Dans quelle mesure le sens du mot français "${w.display}" est-il familier aux locuteurs natifs ? Jugez le sens, pas la forme grammaticale : un temps ou une forme rare d'un mot bien connu compte comme ce mot.`,
    c: {
      common: 'Courant : un mot de tous les jours que la plupart des gens connaissent',
      specialist:
        'Spécialisé mais connu : un mot technique, scientifique, juridique, culinaire ou sportif que la plupart des adultes instruits reconnaissent (comme "vaccin" ou "arbitre")',
      obscure:
        "Obscur : archaïque, rare, régional ou jargon d'expert que la plupart des locuteurs natifs ne reconnaîtraient pas",
    },
  }),
  it: (w) => ({
    q: `Quanto è familiare ai madrelingua il significato della parola italiana "${w.display}"? Giudica il significato, non la forma grammaticale: un tempo verbale o una forma rara di una parola nota conta come quella parola.`,
    c: {
      common: 'Comune: una parola di tutti i giorni che la maggior parte delle persone conosce',
      specialist:
        'Specialistica ma nota: una parola tecnica, scientifica, giuridica, gastronomica o sportiva che la maggior parte degli adulti istruiti riconosce (come "vaccino" o "arbitro")',
      obscure:
        'Oscura: arcaica, rara, regionale o gergo da esperti che la maggior parte dei madrelingua non riconoscerebbe',
    },
  }),
  pt: (w) => ({
    q: `Quão familiar é para os falantes nativos o significado da palavra portuguesa "${w.display}"? Julgue o significado, não a forma gramatical: um tempo verbal ou uma forma rara de uma palavra conhecida conta como essa palavra.`,
    c: {
      common: 'Comum: uma palavra do dia a dia que a maioria das pessoas conhece',
      specialist:
        'Especializada mas conhecida: uma palavra técnica, científica, jurídica, culinária ou esportiva que a maioria dos adultos instruídos reconhece (como "vacina" ou "árbitro")',
      obscure:
        'Obscura: arcaica, rara, regional ou jargão especializado que a maioria dos falantes nativos não reconheceria',
    },
  }),
};

const nativeVariant = (
  base: string,
  key: string,
  native: Native,
  sides: Record<string, Side>,
  examples: string[]
): Variant => {
  const b = VARIANTS.find((v) => v.id === base)!;
  return {
    id: `${base}_native`,
    gate: b.gate,
    label: `${base} asked in the word's own language`,
    examples,
    langs: NON_EN,
    questions: (w) => {
      const { q, c } = native[w.lang](w);
      return { [key]: choice(q, c) };
    },
    read: one(key, sides),
  };
};

for (const base of ['real_C', 'off_B', 'slang_C', 'obs_E']) {
  const b = VARIANTS.find((v) => v.id === base)!;
  VARIANTS.push({
    ...b,
    id: `${base}_again`,
    label: `${base} repeated (noise check)`,
    langs: NON_EN,
  });
}
VARIANTS.push(
  nativeVariant('real_C', 'realWord', NATIVE_REAL, REAL_SIDES, ['pizza', 'tofu', 'weekend']),
  nativeVariant('off_B', 'rating', NATIVE_RATING, RATING_SIDES, [
    'bobo',
    'moco',
    'pedo',
    'crotte',
    'zizi',
    'nigaud',
    'stupido',
    'moccio',
    'pupù',
    'meleca',
    'cocô',
  ]),
  nativeVariant('slang_C', 'slang', NATIVE_SLANG, SLANG_SIDES, []),
  nativeVariant('obs_E', 'obscure', NATIVE_OBSCURE, OBSCURE_SIDES, [
    'vacuna',
    'árbitro',
    'vaccin',
    'arbitre',
    'vaccino',
    'arbitro',
    'vacina',
  ])
);
for (const base of ['off_B', 'slang_C', 'obs_E']) {
  const n = VARIANTS.find((v) => v.id === `${base}_native`)!;
  VARIANTS.push(
    {
      ...n,
      id: `${base}_native_tr`,
      label: `${base} native, definitions translated from English`,
      nativeDefs: 'translated',
    },
    {
      ...n,
      id: `${base}_native_gen`,
      label: `${base} native, definitions written natively`,
      nativeDefs: 'generated',
    }
  );
}

type NativeDefs = Record<string, { translated: string[]; generated: Meaning[] }>;

/** Native meanings for every non-English lab word, cached in native_defs.json. */
async function loadNativeDefs(words: LabWord[], apiKey: string): Promise<NativeDefs> {
  const file = path.join(ARTIFACTS_DIR, 'native_defs.json');
  const cache: NativeDefs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const todo = [...new Map(words.map((w) => [`${w.lang}/${w.word}`, w])).values()].filter(
    (w) => w.lang !== 'en' && !cache[`${w.lang}/${w.word}`]
  );
  const chunks: LabWord[][] = [];
  for (const l of NON_EN) {
    const mine = todo.filter((w) => w.lang === l);
    for (let i = 0; i < mine.length; i += 25) {
      chunks.push(mine.slice(i, i + 25));
    }
  }
  console.log(`\n📖 Native definitions: ${todo.length} words to fetch`);
  await mapPool(chunks, 4, async (chunk) => {
    const l = chunk[0].lang as Language;
    const [translated, generated] = await Promise.all([
      translateMeanings(
        l,
        chunk.map((w) => ({ key: w.word, defs: w.meanings.map((m) => m.def) })),
        apiKey
      ),
      generateMeanings(
        l,
        chunk.map((w) => ({ word: w.word, display: w.display })),
        apiKey,
        undefined,
        'native'
      ),
    ]);
    for (const w of chunk) {
      cache[`${w.lang}/${w.word}`] = {
        translated: translated[w.word],
        generated: generated.find((g) => g.word === w.word)?.meanings ?? [],
      };
    }
  });
  fs.writeFileSync(file, `${JSON.stringify(cache, null, 2)}\n`);
  return cache;
}

function withNativeDefs(w: LabWord, mode: 'translated' | 'generated', defs: NativeDefs): LabWord {
  const entry = defs[`${w.lang}/${w.word}`];
  if (mode === 'translated') {
    const meanings = w.meanings.map((m, i) => ({ pos: m.pos, def: entry.translated[i] }));
    return { ...w, meanings, main: meanings[w.meanings.indexOf(w.main)], defLang: 'native' };
  }
  if (!entry.generated.length) {
    throw new Error('Gemini gave no native meaning');
  }
  return { ...w, meanings: entry.generated, main: entry.generated[0], defLang: 'native' };
}

/** The pilot's sure side at a gate, or null when the pilot was unsure there. */
function pilotSide(r: ReviewResult, gate: Gate): Side | null {
  const main = r.meanings[mainMeaningIndex(r)];
  const a =
    gate === 'real_word'
      ? r.jev.realWord
      : gate === 'obscure'
        ? r.jev.obscure
        : gate === 'offensive'
          ? main?.jev.rating
          : main?.jev.slang;
  if (!a || a.confidence < SURE) {
    return null;
  }
  const sides = {
    real_word: REAL_SIDES,
    offensive: RATING_SIDES,
    slang: SLANG_SIDES,
    obscure: OBSCURE_SIDES,
  }[gate];
  return sides[a.choice];
}

function seededPick<T>(items: T[], count: number, seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function buildTestSet(controlsPerSide: number) {
  const all = LANGS.flatMap((l) => {
    const file = path.join(ARTIFACTS_DIR, `review_${l}.json`);
    return Object.values(
      (JSON.parse(fs.readFileSync(file, 'utf8')) as { results: Record<string, ReviewResult> })
        .results
    );
  });
  const toLab = (r: ReviewResult, role: LabWord['role'], side?: Side): LabWord => ({
    lang: r.lang,
    word: r.word,
    display: r.display,
    meanings: r.meanings,
    main: r.meanings[mainMeaningIndex(r)],
    role,
    pilotSide: side,
  });

  const sets = {} as Record<Gate, LabWord[]>;
  for (const gate of ['real_word', 'offensive', 'slang', 'obscure'] as Gate[]) {
    const maybes = all.filter((r) => {
      const o = decide(r);
      return o.kind === 'maybe' && o.gate === gate;
    });
    const eligible = all.filter(
      (r) => (gate === 'real_word' || r.meanings.length > 0) && !maybes.includes(r)
    );
    const controls: LabWord[] = [];
    const sides = [
      ...new Set(eligible.map((r) => pilotSide(r, gate)).filter((s): s is Side => Boolean(s))),
    ];
    for (const side of sides) {
      const pool = eligible.filter((r) => pilotSide(r, gate) === side);
      controls.push(
        ...seededPick(pool, controlsPerSide, `${gate}-${side}`).map((r) =>
          toLab(r, 'control', side)
        )
      );
    }
    sets[gate] = [...maybes.map((r) => toLab(r, 'maybe')), ...controls];
  }
  return { sets, pilotWords: new Set(all.map((r) => r.word.toLowerCase())) };
}

export interface LabRow {
  variant: string;
  gate: Gate;
  lang: string;
  word: string;
  display: string;
  role: LabWord['role'];
  pilotSide?: Side;
  def: string;
  bucket: string;
  side: Side;
  confidence: number;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v = ''] = a.replace(/^--/, '').split('=');
      return [k, v];
    })
  );
  const controlsPerSide = Number(args.controls || 20);
  const onlyGate = args.gate as Gate | undefined;
  const onlyVariants = args.variants ? new Set(args.variants.split(',')) : null;
  const picked = VARIANTS.filter(
    (v) => (!onlyGate || v.gate === onlyGate) && (!onlyVariants || onlyVariants.has(v.id))
  );
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TYPESAFE_API_KEY in .env.local');
  }

  const { sets, pilotWords } = buildTestSet(controlsPerSide);
  for (const v of VARIANTS) {
    const leaked = v.examples.filter((e) => pilotWords.has(e.toLowerCase()));
    if (leaked.length) {
      throw new Error(`${v.id} quotes pilot words as examples: ${leaked.join(', ')}`);
    }
  }

  const jobs = picked.flatMap((v) =>
    sets[v.gate].filter((w) => !v.langs || v.langs.includes(w.lang)).map((w) => ({ v, w }))
  );
  console.log(`\n🧪 Wording lab: ${jobs.length} Jev calls`);
  for (const gate of Object.keys(sets) as Gate[]) {
    const maybes = sets[gate].filter((w) => w.role === 'maybe').length;
    console.log(`  ${gate}: ${maybes} maybe + ${sets[gate].length - maybes} control words`);
  }

  const nativeJobs = jobs.filter((j) => j.v.nativeDefs).map((j) => j.w);
  let nativeDefs: NativeDefs | null = null;
  if (nativeJobs.length) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('Missing GEMINI_API_KEY in .env.local');
    }
    nativeDefs = await loadNativeDefs(nativeJobs, geminiKey);
  }

  const client = new TypeSafeClient({ apiKey });
  const rows: LabRow[] = [];
  const failures: string[] = [];
  const start = Date.now();
  await mapPool(
    jobs,
    10,
    async ({ v, w: base }) => {
      try {
        const w = v.nativeDefs ? withNativeDefs(base, v.nativeDefs, nativeDefs!) : base;
        const res = await client.systemOne({
          model: 'jev-latest',
          state: {
            word: w.word,
            display: w.display,
            language: getLanguageName(w.lang),
            meanings: w.meanings.map((m, i) => `${i + 1}. (${m.pos}) ${m.def}`).join('\n'),
            partOfSpeech: w.main?.pos,
            definition: w.main?.def,
            task: `wording_lab_${v.id}`,
          },
          questions: v.questions(w),
        });
        const read = v.read(res.answers as Record<string, { choice: string; confidence: number }>);
        rows.push({
          variant: v.id,
          gate: v.gate,
          lang: w.lang,
          word: w.word,
          display: w.display,
          role: w.role,
          pilotSide: w.pilotSide,
          def: w.main?.def ?? '',
          ...read,
        });
      } catch (err) {
        failures.push(
          `${v.id} ${base.lang}/${base.word}: ${err instanceof Error ? err.message : err}`
        );
      }
    },
    (done, total) => {
      if (done % 50 === 0 || done === total) {
        process.stdout.write(
          `\r  ${done}/${total} (${((Date.now() - start) / 1000).toFixed(0)}s)   `
        );
      }
    }
  );

  const out = path.join(ARTIFACTS_DIR, 'wording_lab.json');
  const ran = new Set(picked.map((v) => v.id));
  const previous: LabRow[] = fs.existsSync(out)
    ? (JSON.parse(fs.readFileSync(out, 'utf8')) as { rows: LabRow[] }).rows.filter(
        (r) => !ran.has(r.variant)
      )
    : [];
  const allRows = [...previous, ...rows];
  fs.writeFileSync(
    out,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), sure: SURE, variants: VARIANTS.map(({ id, gate, label }) => ({ id, gate, label })), rows: allRows }, null, 2)}\n`
  );

  let md = `# Jev wording lab\n\nSure = confidence ${SURE} or higher.\n\n| Variant | Maybes settled | Settled to answer / guess / removed | Controls flipped |\n| :--- | ---: | :--- | ---: |\n`;
  for (const v of VARIANTS.filter((x) => allRows.some((r) => r.variant === x.id))) {
    const mine = allRows.filter((r) => r.variant === v.id);
    const maybes = mine.filter((r) => r.role === 'maybe');
    const settled = maybes.filter((r) => r.confidence >= SURE);
    const by = (s: Side) => settled.filter((r) => r.side === s).length;
    const controls = mine.filter((r) => r.role === 'control');
    const flipped = controls.filter((r) => r.confidence >= SURE && r.side !== r.pilotSide);
    md += `| ${v.id}: ${v.label} | ${settled.length}/${maybes.length} | ${by('answer')} / ${by('guess')} / ${by('removed')} | ${flipped.length}/${controls.length}${flipped.length ? ` (${flipped.map((r) => r.display).join(', ')})` : ''} |\n`;
  }
  fs.writeFileSync(out.replace(/\.json$/, '.summary.md'), md);
  console.log(`\n\n${md}`);
  if (failures.length) {
    console.log(`⚠️  ${failures.length} failed:\n${failures.slice(0, 10).join('\n')}`);
  }
}

main().catch((err) => {
  console.error('\n❌ Wording lab failed:', err);
  process.exit(1);
});
