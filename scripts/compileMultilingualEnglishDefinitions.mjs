import fs from 'fs';
import { normalizeWord, BANNED_WORDS, loadFrequencies } from './dictUtils.mjs';

const esFreq = loadFrequencies('scripts/es_50k.txt');
const frFreq = loadFrequencies('scripts/fr_50k.txt');

function getDifficulty(rank, maxRank = 15000) {
  if (!rank) return 0.85;
  const clamped = Math.min(rank, maxRank);
  const normalized = clamped / maxRank;
  return Math.min(0.95, Math.max(0.05, Math.round(Math.pow(normalized, 0.7) * 100) / 100));
}

// Build Spanish with English definitions
function buildSpanish() {
  const rawExisting = JSON.parse(fs.readFileSync('public/es.json', 'utf8'));
  const dictionary = {};

  const candidateEntries = new Map();
  for (const [w, info] of esFreq) {
    const norm = normalizeWord(w);
    if (norm.length === 5 && /^[a-z]+$/.test(norm) && !BANNED_WORDS.has(norm)) {
      if (!candidateEntries.has(norm)) {
        candidateEntries.set(norm, { display: w, rank: info.rank });
      }
    }
    if (candidateEntries.size >= 2600) break;
  }

  for (const [k] of Object.entries(rawExisting)) {
    const norm = normalizeWord(k);
    if (norm.length === 5 && /^[a-z]+$/.test(norm) && !BANNED_WORDS.has(norm)) {
      const freq = esFreq.get(norm) || esFreq.get(k);
      if (freq && freq.rank <= 25000 && !candidateEntries.has(norm)) {
        candidateEntries.set(norm, { display: k, rank: freq.rank });
      }
    }
  }

  // Curated Spanish-to-English glosses for common roots
  const SPANISH_EN_GLOSSES = {
    fuego: { pos: 'noun', def: 'The combustion or burning that emits light, heat, and flame; fire.' },
    noche: { pos: 'noun', def: 'The period of darkness between sunset and sunrise; night.' },
    playa: { pos: 'noun', def: 'A sandy or pebbly shore by the ocean, sea, or lake; beach.' },
    queso: { pos: 'noun', def: 'A solid food made from the pressed curds of milk; cheese.' },
    verde: { pos: 'adj', def: 'Having the color of fresh grass or emeralds; green.' },
    dulce: { pos: 'adj/noun', def: 'Having a pleasant sugary taste, or a sweet confection; sweet or candy.' },
    libro: { pos: 'noun', def: 'A written or printed work consisting of bound pages; book.' },
    mundo: { pos: 'noun', def: 'The earth and all people and things upon it; world.' },
    perro: { pos: 'noun', def: 'A domesticated carnivorous mammal of the canine family; dog.' },
    arbol: { pos: 'noun', def: 'A woody perennial plant with a trunk and branches; tree.' },
    padre: { pos: 'noun', def: 'A male parent of a human or animal; father.' },
    madre: { pos: 'noun', def: 'A female parent of a human or animal; mother.' },
    campo: { pos: 'noun', def: 'An area of open country used for agriculture or grazing; field or countryside.' },
    barco: { pos: 'noun', def: 'A vessel designed for navigating on water; ship or boat.' },
    calle: { pos: 'noun', def: 'A public road in a city or town with houses or buildings; street.' },
    tarde: { pos: 'noun/adv', def: 'The period between midday and night, or occurring after expected time; afternoon or late.' },
    manos: { pos: 'noun', def: 'The end parts of human arms beyond the wrist; hands.' },
    bueno: { pos: 'adj', def: 'Having desirable or positive qualities; good or fine.' },
    chico: { pos: 'noun/adj', def: 'A young person or boy, or relatively small in size; boy or kid.' },
    abaco: { pos: 'noun', def: 'A manual counting frame with beads sliding on rods; abacus.' },
    selva: { pos: 'noun', def: 'A dense tropical forest with rich biodiversity; jungle or rainforest.' },
    torre: { pos: 'noun', def: 'A tall narrow structure standing alone or on a castle; tower.' },
    llave: { pos: 'noun', def: 'A metal instrument used to operate a lock or valve; key or wrench.' },
    nieve: { pos: 'noun', def: 'Frozen white precipitation falling as light ice flakes; snow.' },
    zorro: { pos: 'noun', def: 'A wild carnivorous canine animal with a bushy tail; fox.' },
    fresa: { pos: 'noun', def: 'A sweet red juicy berry with seeds on surface; strawberry.' },
    trono: { pos: 'noun', def: 'A ceremonial seat used by a monarch or sovereign; throne.' },
    ritmo: { pos: 'noun', def: 'A strong, regular repeated pattern of movement or sound; rhythm.' },
    cielo: { pos: 'noun', def: 'The expanse of air over the earth where clouds appear; sky or heaven.' },
    clima: { pos: 'noun', def: 'The weather conditions prevailing in an area over a long period; climate.' },
    plata: { pos: 'noun', def: 'A precious shiny white metallic element used in jewelry and coins; silver.' },
    viento: { pos: 'noun', def: 'A natural perceptible movement of the air blowing across land; wind.' },
    suelo: { pos: 'noun', def: 'The upper layer of earth in which plants grow, or a floor surface; ground or floor.' },
    bruja: { pos: 'noun', def: 'A woman believed to possess magical or supernatural powers; witch.' },
    pluma: { pos: 'noun', def: 'A light horny structure that covers a bird body; feather or pen.' },
    hacha: { pos: 'noun', def: 'A tool with a heavy steel blade used for chopping wood; axe.' },
    cisne: { pos: 'noun', def: 'A large aquatic bird with long neck and pure white feathers; swan.' },
    cofre: { pos: 'noun', def: 'A sturdy box used for storing valuables securely; chest or safe.' },
    yegua: { pos: 'noun', def: 'An adult female horse kept for breeding or riding; mare.' },
    timon: { pos: 'noun', def: 'A flat piece hinged at a vessel stern for steering; rudder or helm.' },
    grifo: { pos: 'noun', def: 'A device for controlling the flow of liquid from a pipe; faucet or tap.' },
    perla: { pos: 'noun', def: 'A hard lustrous spherical mass formed in an oyster; pearl.' }
  };

  for (const [norm, { display, rank }] of candidateEntries) {
    const diff = getDifficulty(rank);
    let pos = 'noun';
    if (norm.endsWith('ar') || norm.endsWith('er') || norm.endsWith('ir')) pos = 'verb';
    else if (norm.endsWith('al') || norm.endsWith('os') || norm.endsWith('ivo')) pos = 'adj';

    const gloss = SPANISH_EN_GLOSSES[norm];
    const finalPos = gloss?.pos || pos;
    const finalDef = gloss?.def || `Spanish five letter vocabulary term denoting '${display}' in everyday communication.`;

    dictionary[norm] = {
      display,
      d: diff,
      pos: finalPos,
      def: finalDef
    };
  }

  return dictionary;
}

// Build French with English definitions
function buildFrench() {
  const rawExisting = JSON.parse(fs.readFileSync('public/fr.json', 'utf8'));
  const dictionary = {};

  const candidateEntries = new Map();
  for (const [w, info] of frFreq) {
    const norm = normalizeWord(w);
    if (norm.length === 5 && /^[a-z]+$/.test(norm) && !BANNED_WORDS.has(norm)) {
      if (!candidateEntries.has(norm)) {
        candidateEntries.set(norm, { display: w, rank: info.rank });
      }
    }
    if (candidateEntries.size >= 2600) break;
  }

  for (const [k] of Object.entries(rawExisting)) {
    const norm = normalizeWord(k);
    if (norm.length === 5 && /^[a-z]+$/.test(norm) && !BANNED_WORDS.has(norm)) {
      const freq = frFreq.get(norm) || frFreq.get(k);
      if (freq && freq.rank <= 25000 && !candidateEntries.has(norm)) {
        candidateEntries.set(norm, { display: k, rank: freq.rank });
      }
    }
  }

  // Curated French-to-English glosses for common roots
  const FRENCH_EN_GLOSSES = {
    monde: { pos: 'noun', def: 'The earth, universe, or collection of human beings; world.' },
    temps: { pos: 'noun', def: 'The indefinite continued progress of existence and events; time or weather.' },
    place: { pos: 'noun', def: 'A public square or particular portion of space; place or square.' },
    porte: { pos: 'noun', def: 'A movable barrier used to open and close an entrance; door or gate.' },
    arbre: { pos: 'noun', def: 'A perennial woody plant with a single trunk and branches; tree.' },
    plage: { pos: 'noun', def: 'A shore of a body of water covered by sand or pebbles; beach.' },
    fleur: { pos: 'noun', def: 'The seed-bearing part of a plant, often brightly colored; flower.' },
    pomme: { pos: 'noun', def: 'A round fruit with firm white flesh and red, yellow, or green skin; apple.' },
    solei: { pos: 'noun', def: 'The star at the center of the solar system; sun.' },
    soleil: { pos: 'noun', def: 'The star at the center of the solar system; sun.' },
    livre: { pos: 'noun', def: 'A written or printed work bound with a cover; book.' },
    chien: { pos: 'noun', def: 'A domesticated carnivorous mammal of the canine family; dog.' },
    grand: { pos: 'adj', def: 'Of notable size, extent, or importance; big, tall, or great.' },
    jeune: { pos: 'adj/noun', def: 'In an early stage of life, growth, or development; young.' },
    coeur: { pos: 'noun', def: 'The muscular organ that pumps blood through the body; heart.' },
    pluie: { pos: 'noun', def: 'Moisture condensed from the atmosphere falling in drops; rain.' },
    danse: { pos: 'noun', def: 'A series of rhythmic steps and movements set to music; dance.' },
    boite: { pos: 'noun', def: 'A rigid container, typically rectangular with a lid; box.' },
    table: { pos: 'noun', def: 'A piece of furniture with a flat horizontal top and legs; table.' },
    route: { pos: 'noun', def: 'A way or course taken in getting from a starting point to destination; road.' },
    glace: { pos: 'noun', def: 'Water frozen solid by cold temperatures, or chilled dessert; ice or ice cream.' },
    foret: { pos: 'noun', def: 'A large area covered chiefly with trees and undergrowth; forest.' },
    perle: { pos: 'noun', def: 'A hard lustrous spherical mass formed in an oyster shell; pearl.' },
    chute: { pos: 'noun', def: 'An act of falling down under the force of gravity; fall or drop.' },
    vague: { pos: 'noun/adj', def: 'A ridge or swell moving on the surface of water; wave.' },
    plume: { pos: 'noun', def: 'A light horny structure that covers a bird body; feather or plume.' },
    fable: { pos: 'noun', def: 'A short story with animals conveying a moral lesson; fable.' },
    nuage: { pos: 'noun', def: 'A visible mass of condensed water vapor floating in the sky; cloud.' },
    poeme: { pos: 'noun', def: 'A piece of writing that partakes of the nature of poetry; poem.' },
    fleve: { pos: 'noun', def: 'A large natural stream of water flowing to the sea; river.' },
    barbe: { pos: 'noun', def: 'The growth of hair on the chin and lower cheeks of a man face; beard.' },
    soupe: { pos: 'noun', def: 'A liquid dish, typically made by boiling meat or vegetables; soup.' },
    sabre: { pos: 'noun', def: 'A heavy cavalry sword with a curved blade and single cutting edge; saber.' },
    bague: { pos: 'noun', def: 'A small circular band of precious metal worn on a finger; ring.' },
    corde: { pos: 'noun', def: 'A length of strong thick cord made by twisting strands; rope.' },
    givre: { pos: 'noun', def: 'A deposit of white ice crystals formed on cold surfaces; frost.' },
    cable: { pos: 'noun', def: 'A thick rope of wire or fiber used for construction; cable.' },
    fumee: { pos: 'noun', def: 'A visible suspension of carbon or particles emitted by combustion; smoke.' },
    tapis: { pos: 'noun', def: 'A floor covering made from thick woven fabric; rug or carpet.' },
    bruit: { pos: 'noun', def: 'A sound, especially one that is loud, unpleasant, or disturbing; noise.' },
    cygne: { pos: 'noun', def: 'A large aquatic bird with long neck and white plumage; swan.' },
    bijou: { pos: 'noun', def: 'An ornamental piece of precious metal or gemstone; jewel.' },
    phare: { pos: 'noun', def: 'A tower with a powerful beacon light to guide mariners at night; lighthouse.' },
    grotte: { pos: 'noun', def: 'A natural underground cavity in rock or earth; cave or grotto.' },
    ruban: { pos: 'noun', def: 'A narrow strip of fabric used for tying or decorating; ribbon.' },
    liane: { pos: 'noun', def: 'A woody climbing plant that hangs from trees in tropical forests; liana or vine.' },
    voile: { pos: 'noun', def: 'A piece of fabric spread to catch the wind on a vessel; sail or veil.' },
    biche: { pos: 'noun', def: 'A female deer, renowned for natural grace and agility; doe or hind.' },
    ruche: { pos: 'noun', def: 'A structure in which bees live and produce honey; beehive.' },
    pelle: { pos: 'noun', def: 'A tool with a broad blade used for lifting loose material; shovel.' },
    forge: { pos: 'noun', def: 'A workshop with a furnace where metal is heated and hammered; forge.' },
    brise: { pos: 'noun', def: 'A gentle and pleasant wind blowing on the coast; breeze.' },
    digue: { pos: 'noun', def: 'A long wall or embankment built to prevent coastal flooding; dike or seawall.' }
  };

  for (const [norm, { display, rank }] of candidateEntries) {
    const diff = getDifficulty(rank);
    let pos = 'noun';
    if (norm.endsWith('er') || norm.endsWith('ir') || norm.endsWith('re')) pos = 'verb';
    else if (norm.endsWith('al') || norm.endsWith('el') || norm.endsWith('if')) pos = 'adj';

    const gloss = FRENCH_EN_GLOSSES[norm];
    const finalPos = gloss?.pos || pos;
    const finalDef = gloss?.def || `French five letter vocabulary term denoting '${display}' in everyday conversation.`;

    dictionary[norm] = {
      display,
      d: diff,
      pos: finalPos,
      def: finalDef
    };
  }

  return dictionary;
}

console.log('Compiling ES and FR English definitions...');
const es = buildSpanish();
const fr = buildFrench();

fs.writeFileSync('public/es.json', JSON.stringify(es, null, 2));
fs.writeFileSync('public/fr.json', JSON.stringify(fr, null, 2));

console.log('Saved es.json with', Object.keys(es).length, 'entries');
console.log('Saved fr.json with', Object.keys(fr).length, 'entries');
