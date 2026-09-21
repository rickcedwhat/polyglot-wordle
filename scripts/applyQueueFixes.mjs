import fs from 'fs';

const enPath = 'public/en.json';
const esPath = 'public/es.json';
const frPath = 'public/fr.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

// 1. Purges
const enPurges = ['vamos'];
const esPurges = ['dolan', 'hadar', 'drogo'];
const frPurges = ['relax', 'spots', 'squaw', 'round', 'carne'];

for (const w of enPurges) {
  if (en[w]) {
    delete en[w];
    console.log(`[EN] Purged ${w}`);
  }
}

for (const w of esPurges) {
  if (es[w]) {
    delete es[w];
    console.log(`[ES] Purged ${w}`);
  }
}

for (const w of frPurges) {
  if (fr[w]) {
    delete fr[w];
    console.log(`[FR] Purged ${w}`);
  }
}

// 2. English Updates
const enUpdates = {
  hyoid: {
    pos: 'noun',
    def: 'A U-shaped bone situated at the base of the tongue in the neck, supporting the tongue muscles.',
  },
  panty: {
    pos: 'noun',
    def: 'A short, lightweight undergarment covering the lower torso, worn especially by women or girls.',
  },
  yikes: {
    pos: 'interjection',
    def: 'Used to express sudden shock, alarm, surprise, or mild fear.',
  },
};

for (const [w, updates] of Object.entries(enUpdates)) {
  if (en[w]) {
    Object.assign(en[w], updates, { reviewed: true });
    console.log(`[EN] Updated ${w}`);
  }
}

// 3. Spanish Updates
const esUpdates = {
  adore: {
    pos: 'verb',
    def: 'Adores, worships, or loves deeply (first or third-person singular present subjunctive of adorar).',
  },
  cause: {
    pos: 'verb',
    def: 'Causes, brings about, or produces an effect (first or third-person singular present subjunctive of causar).',
  },
  dudes: {
    pos: 'verb',
    d: 0.65,
    def: 'Conjugated form of the Spanish verb dudar (to doubt): no dudes (second-person singular present subjunctive).',
  },
  duela: {
    pos: 'verb',
    def: 'Hurts, causes physical pain, or grieves (third-person singular present subjunctive of the Spanish verb doler).',
  },
  fumes: {
    pos: 'verb',
    def: 'Smoke tobacco, inhale fumes, or emit vapors (informal second-person singular present subjunctive of fumar).',
  },
  pulse: {
    pos: 'verb',
    def: 'Presses, pushes a button, or plucks a string (first or third-person singular present subjunctive of pulsar).',
  },
  seque: {
    pos: 'verb',
    def: 'Dries, wipes dry, or dehydrates something (first or third-person singular present subjunctive of secar).',
  },
  cerdo: {
    pos: 'noun',
    def: 'A domesticated pig or swine; also colloquially a dirty, greedy, or uncouth person.',
  },
  ayuno: {
    pos: 'noun',
    def: 'The act or period of abstaining from food and drink; a fast.',
  },
  cuido: {
    pos: 'verb',
    def: 'I take care of, look after, or tend to someone or something (first-person singular present of cuidar).',
  },
  choco: {
    pos: 'verb',
    def: 'I crash, collide, or bump into something (first-person singular present of chocar).',
  },
  colin: {
    d: 0.65,
    pos: 'noun',
    def: 'A New World quail or bobwhite; also a slender crunchy breadstick served with tapas.',
  },
  creed: {
    pos: 'verb',
    d: 0.82,
    def: 'Conjugated form of the Spanish verb creer (to believe): vosotros creed (second-person plural imperative).',
  },
  ellas: {
    pos: 'pron',
    def: 'They; third-person feminine plural subject pronoun referring to women, girls, or feminine nouns.',
  },
  ellos: {
    pos: 'pron',
    def: 'They; third-person masculine plural subject pronoun referring to men, mixed groups, or masculine nouns.',
  },
  ovulo: {
    display: 'óvulo',
    pos: 'noun',
    d: 0.82,
    def: 'A female reproductive egg cell or ovum in animals, or the unfertilized seed structure in plants.',
  },
  pasma: {
    pos: 'verb',
    d: 0.85,
    def: 'Astonishes, stuns, or freezes with amazement (third-person singular present of pasmar).',
  },
  poses: {
    pos: 'verb',
    def: 'Perch, alight, or pose for a portrait (second-person singular present subjunctive of the Spanish verb posar).',
  },
};

for (const [w, updates] of Object.entries(esUpdates)) {
  if (es[w]) {
    Object.assign(es[w], updates, { reviewed: true });
    console.log(`[ES] Updated ${w}`);
  }
}

// 4. French Updates
const frUpdates = {
  about: {
    pos: 'noun',
    d: 0.80,
    def: 'In French carpentry and joinery, the end cut or butt end of a piece of timber (un about de poutre).',
  },
  banco: {
    pos: 'intj',
    def: 'An exclamation or call used in card games and colloquially to accept a challenge or wager; agreed!',
  },
  blair: {
    pos: 'noun',
    d: 0.65,
    def: "In French argot and slang, a person's nose or schnoz; also used in the idiom ne pas pouvoir blairer (to dislike).",
  },
  bosco: {
    pos: 'noun',
    def: 'In French maritime slang, a boatswain or petty officer (un bosco ou maître d’équipage).',
  },
  cents: {
    pos: 'noun',
    def: 'In French, multiple hundreds (plural of cent, taking an s when multiplied, as in deux cents).',
  },
  coche: {
    pos: 'noun',
    def: 'A notch, nick, or tick mark made on an object or checklist; also an old-fashioned passenger river boat or coach.',
  },
  conde: {
    display: 'condé',
    pos: 'noun',
    def: 'In French street slang and police argot, a police officer, detective, or cop (condé).',
  },
  elles: {
    pos: 'pron',
    def: 'They; third-person feminine plural subject pronoun referring to women, female animals, or feminine nouns.',
  },
  fallu: {
    pos: 'verb',
    def: 'Required or necessary as an obligation or need (past participle of the French impersonal verb falloir).',
  },
  ferre: {
    pos: 'verb',
    def: 'Shoes a horse, fits with iron fittings, or hooks a biting fish (first or third-person present of ferrer).',
  },
  fiait: {
    pos: 'verb',
    def: 'Trusted, relied on, or placed faith in someone (third-person singular imperfect of the French reflexive verb se fier).',
  },
  flirt: {
    pos: 'noun',
    def: 'A lighthearted romantic dalliance, courtship, or playful relationship without serious commitment.',
  },
  irons: {
    pos: 'verb',
    def: 'Shall go or will go to a place (first-person plural future indicative of the French verb aller).',
  },
  iront: {
    pos: 'verb',
    def: 'Will go or shall go to a destination (third-person plural future indicative of the French verb aller).',
  },
  liras: {
    pos: 'verb',
    d: 0.65,
    def: 'Conjugated form of the French verb lire (to read): tu liras (second-person singular future indicative).',
  },
  miens: {
    pos: 'pron',
    def: 'Mine; the ones belonging to me or my family (masculine plural possessive pronoun, les miens).',
  },
  mince: {
    pos: 'adj',
    def: 'Slender, slim, or slight in build; having a thin diameter or small thickness.',
  },
  moral: {
    pos: 'noun',
    def: "In French, a person's mental state, spirits, psychological fortitude, or morale (le moral).",
  },
  muter: {
    pos: 'verb',
    def: 'In French, to transfer an employee or civil servant to a new post or location; also to undergo genetic mutation.',
  },
  pales: {
    pos: 'noun',
    def: 'In French, the rotating blades, vanes, or paddles of a propeller, fan, or turbine (plural of pale).',
  },
  parts: {
    pos: 'noun',
    def: 'Portions, shares, or slices of a divided whole distributed among people (plural of the French noun part).',
  },
  pater: {
    pos: 'noun',
    def: "The Lord's Prayer (Pater noster in Latin); also colloquially a father or head of the family.",
  },
  phone: {
    pos: 'noun',
    d: 0.95,
    def: 'In French phonetics and linguistics, an individual speech sound or phone (un phone).',
  },
  piper: {
    pos: 'verb',
    d: 0.82,
    def: 'To rig or tamper with dice or cards to cheat; also to utter a sound, as in the French idiom ne pas piper mot.',
  },
  raina: {
    pos: 'verb',
    def: 'Cut a groove, channel, or flute into wood or metal (third-person singular past historic of the French verb rainer).',
  },
  rates: {
    pos: 'noun',
    def: 'In French anatomy, the spleens; internal abdominal organs filtering blood (plural of the French noun rate).',
  },
  rogue: {
    pos: 'noun',
    def: 'In French fishing, salted fish eggs or roe used as bait for sardines (la rogue).',
  },
  romps: {
    pos: 'verb',
    d: 0.65,
    def: 'Breaks, snaps, or ends (first or second person singular present indicative of the French verb rompre: je romps, tu romps).',
  },
  sorts: {
    pos: 'noun',
    def: 'In French, destinies, fates, fortunes, or magical spells cast upon someone (plural of the French noun sort).',
  },
  taffe: {
    pos: 'noun',
    def: 'In French colloquial slang, a puff or drag taken from a cigarette; also fear or anxiety in older argot.',
  },
  torts: {
    pos: 'noun',
    def: 'In French, wrongs, faults, injustices, or harms committed against someone (plural of the French noun tort).',
  },
  types: {
    pos: 'noun',
    def: 'In French, guys, blokes, or fellows; also categories, models, or kinds of things (plural of the French noun type).',
  },
  venue: {
    pos: 'noun',
    def: "In French, an arrival or the action of coming to a place (noun from the verb venir: la venue d'un ami).",
  },
  youpi: {
    pos: 'intj',
    def: 'An exclamation expressing joy, enthusiasm, or triumph, equivalent to yippee or hooray.',
  },
};

for (const [w, updates] of Object.entries(frUpdates)) {
  if (fr[w]) {
    Object.assign(fr[w], updates, { reviewed: true });
    console.log(`[FR] Updated ${w}`);
  }
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + '\n');
fs.writeFileSync(frPath, JSON.stringify(fr, null, 2) + '\n');

console.log('Done applying updates!');
