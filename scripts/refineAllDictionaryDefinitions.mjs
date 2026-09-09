import fs from 'fs';
import { normalizeWord } from './dictUtils.mjs';

// Load existing production dictionaries
const en = JSON.parse(fs.readFileSync('public/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('public/es.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('public/fr.json', 'utf8'));

// 1. COMPREHENSIVE ENGLISH CURATIONS & INFLECTIONS
const EN_CURATED = {
  apple: { pos: 'noun', def: 'A common round fruit with red, yellow, or green skin and crisp flesh.' },
  bread: { pos: 'noun', def: 'A staple food made of baked flour, water, and yeast dough.' },
  water: { pos: 'noun/verb', def: 'A clear, colorless, odorless liquid essential for plant and animal life.' },
  waged: { pos: 'verb', def: 'Carried on or engaged in a war, campaign, or struggle.' },
  cynic: { pos: 'noun', def: 'A person who believes people are motivated purely by self-interest.' },
  skies: { pos: 'noun', def: 'Plural of sky; the expanse of the heavens or atmosphere.' },
  shoot: { pos: 'verb', def: 'To discharge a bullet, arrow, or projectile from a weapon.' },
  grant: { pos: 'verb/noun', def: 'To agree to give or allow something requested; to bestow.' },
  cease: { pos: 'verb', def: 'To bring or come to an end; to stop.' },
  adore: { pos: 'verb', def: 'To love deeply and respect someone or something intensely.' },
  carve: { pos: 'verb', def: 'To cut or shape a hard material such as wood or stone.' },
  stomp: { pos: 'verb/noun', def: 'To tread or step heavily and noisily on the ground.' },
  expel: { pos: 'verb', def: 'To force someone to leave a place, group, or school.' },
  sever: { pos: 'verb', def: 'To divide or cut off a part from a whole.' },
  cater: { pos: 'verb', def: 'To provide food, drink, or service at a social event.' },
  donny: { pos: 'noun', def: 'Informal slang term for a man, fellow, or bloke.' },
  shite: { pos: 'noun', def: 'Slang term for rubbish, nonsense, or poor quality things.' },
  voila: { pos: 'intj', def: 'An exclamation used when unveiling or presenting something.' },
  avert: { pos: 'verb', def: 'To turn away one eyes or thoughts; to prevent an undesirable event.' },
  baggy: { pos: 'adj', def: 'Loose and hanging in folds; fitting loosely on the body.' },
  aided: { pos: 'verb', def: 'Past tense of aid; helped, assisted, or supported someone.' },
  banal: { pos: 'adj', def: 'So lacking in originality as to be obvious and boring.' },
  defer: { pos: 'verb', def: 'To postpone or put off an action to a later time.' },
  edict: { pos: 'noun', def: 'An official order, decree, or proclamation issued by an authority.' },
  adorn: { pos: 'verb', def: 'To make more beautiful or attractive; to decorate or embellish.' },
  douse: { pos: 'verb', def: 'To pour a liquid over; to drench or extinguish a flame.' },
  scour: { pos: 'verb', def: 'To clean or brighten the surface of something by rubbing hard.' },
  sleek: { pos: 'adj', def: 'Smooth and glossy; having an elegant, streamlined shape.' },
  wordy: { pos: 'adj', def: 'Using or expressed in too many words; verbose or long-winded.' },
  fleed: { pos: 'verb', def: 'Past tense of flee; ran away from danger or pursuit.' },
  raged: { pos: 'verb', def: 'Past tense of rage; felt or expressed intense, violent anger.' },
  prove: { pos: 'verb', def: 'To demonstrate the truth or existence of something through evidence.' },
  extra: { pos: 'adj', def: 'Added to an existing or usual amount or number; additional.' },
  proof: { pos: 'noun', def: 'Evidence or argument establishing or helping to establish a fact.' },
  delay: { pos: 'noun/verb', def: 'A period of time by which something is late or postponed.' },
  faint: { pos: 'adj/verb', def: 'Barely perceptible, weak, or temporarily losing consciousness.' },
  lobby: { pos: 'noun/verb', def: 'An entrance hall or reception area in a large building.' },
  scrub: { pos: 'verb/noun', def: 'To rub hard so as to clean, or low woody vegetation.' },
  alias: { pos: 'adv/noun', def: 'A false or assumed name used to conceal one true identity.' },
  shred: { pos: 'noun/verb', def: 'A strip of some material, such as paper, cloth, or food.' },
  abyss: { pos: 'noun', def: 'A deep or seemingly bottomless chasm or profound difference.' },
  moist: { pos: 'adj', def: 'Slightly wet; characterized by the presence of moisture.' },
  gauge: { pos: 'noun/verb', def: 'An instrument that measures and gives a visual display of an amount.' },
  ultra: { pos: 'adj', def: 'Going beyond others or beyond due limits; extreme or uncompromising.' },
  brook: { pos: 'noun/verb', def: 'A small natural stream of fresh water, or to tolerate something.' },
  creed: { pos: 'noun', def: 'A set of beliefs or principles that guide someone actions.' },
  sassy: { pos: 'adj', def: 'Lively, bold, and full of spirit; cheeky in a playful way.' },
  amiss: { pos: 'adj/adv', def: 'Not quite right; inappropriate, out of place, or faulty.' },
  humid: { pos: 'adj', def: 'Marked by a relatively high level of water vapor in the air.' },
  sloth: { pos: 'noun', def: 'Reluctance to work or make an effort; habitual laziness.' },
  crass: { pos: 'adj', def: 'Lacking sensitivity, refinement, or intelligence; insensitive.' },
  begin: { pos: 'verb', def: 'To start doing, performing, or undergoing an activity or process.' },
  union: { pos: 'noun', def: 'The action of joining together or the state of being joined.' },
  youth: { pos: 'noun', def: 'The period between childhood and adult age; the state of being young.' },
  pitch: { pos: 'noun/verb', def: 'The highness or lowness of a tone, or to throw a ball.' },
  humor: { pos: 'noun/verb', def: 'The quality of being amusing or comic; ability to appreciate fun.' },
  bloom: { pos: 'noun/verb', def: 'A flower or state of flowering; to produce sweet flowers.' },
  longs: { pos: 'verb', def: 'Has a strong wish or desire for something; yearns.' },
  huffs: { pos: 'verb/noun', def: 'Blows or puffs out forcefully, or states of petty annoyance.' },
  mumps: { pos: 'noun', def: 'A contagious viral disease causing swelling of the parotid glands.' },
  frees: { pos: 'verb', def: 'Releases from captivity, confinement, or obligation.' },
  inter: { pos: 'verb', def: 'To place a corpse in a grave or tomb; to bury.' },
  colds: { pos: 'noun', def: 'Common viral infections of the nose and throat; respiratory illnesses.' },
  poise: { pos: 'noun/verb', def: 'Graceful and elegant bearing in a person; balance and composure.' },
  inept: { pos: 'adj', def: 'Having or showing no skill; clumsy or incompetent.' },
  scoff: { pos: 'verb/noun', def: 'To speak to someone or about something in a scornfully derisive way.' },
  vases: { pos: 'noun', def: 'Decorative containers used as ornaments or for holding cut flowers.' },
  bouts: { pos: 'noun', def: 'Short periods of intense activity or illness, or boxing matches.' },
  hunky: { pos: 'adj', def: 'Informal term for a strong, handsome, and sexually attractive man.' },
  knoll: { pos: 'noun', def: 'A small natural hill, mound, or grassy elevation.' },
  
  // Plurals and inflections
  clogs: { pos: 'noun/verb', def: 'Heavy wooden-soled shoes, or blocks and obstructs a passage.' },
  ducts: { pos: 'noun', def: 'Tubes or canals for conveying fluids, air, or cables.' },
  rages: { pos: 'noun/verb', def: 'Violent anger and emotional fury, or acts with great violence.' },
  chats: { pos: 'noun/verb', def: 'Informal light conversations, or talks in an easy familiar manner.' },
  peeps: { pos: 'noun/verb', def: 'Brief or quick looks, or high-pitched squeaks and chirps.' },
  coils: { pos: 'noun/verb', def: 'Concentric rings of spiral cable or wire, or winds into loops.' },
  kinks: { pos: 'noun', def: 'Sharp twists or curls in a rope, wire, or hair.' },
  pests: { pos: 'noun', def: 'Destructive insects or animals that attack crops and livestock.' },
  glows: { pos: 'verb/noun', def: 'Emits a steady, warm, and radiant light without flames.' },
  mitts: { pos: 'noun', def: 'Padded mittens or protective gloves used in baseball or cooking.' },
  icons: { pos: 'noun', def: 'Graphic symbols on a screen, or famous admired cultural figures.' },
  nodes: { pos: 'noun', def: 'Connecting points in a network where pathways intersect or branch.' },
  racks: { pos: 'noun/verb', def: 'Frameworks or stands for holding, storing, or displaying items.' },
  hoses: { pos: 'noun/verb', def: 'Flexible tubes used to convey water or fluids to extinguish fire.' },
  ovens: { pos: 'noun', def: 'Enclosed thermal compartments used for baking and roasting food.' },
  knobs: { pos: 'noun', def: 'Rounded handles or dials used to open doors or adjust controls.' },
  ponds: { pos: 'noun', def: 'Small inland bodies of still fresh water surrounded by land.' },
  combs: { pos: 'noun/verb', def: 'Toothed instruments used for styling hair or separating fibers.' },
  warns: { pos: 'verb', def: 'Informs someone in advance of a possible danger or problem.' },
  lawns: { pos: 'noun', def: 'Areas of short, mown grass in yards, gardens, or parks.' },
  lends: { pos: 'verb', def: 'Grants the temporary use of something on condition of return.' },
  harms: { pos: 'noun/verb', def: 'Physical or psychological injuries, or causes damage and hurt.' },
  omens: { pos: 'noun', def: 'Events or signs regarded as portents of good or evil fortune.' },
  feats: { pos: 'noun', def: 'Notable acts or accomplishments requiring great courage and skill.' },
  beaks: { pos: 'noun', def: 'The hard, pointed jaws and bills of birds and turtles.' },
  cafes: { pos: 'noun', def: 'Small informal restaurants serving coffee, tea, and light meals.' },
  obeys: { pos: 'verb', def: 'Complies with orders, laws, commands, or requests of an authority.' },
  lobes: { pos: 'noun', def: 'Curved or rounded anatomical divisions of an organ or ear.' },
  chews: { pos: 'verb', def: 'Crushes and grinds food with the teeth before swallowing.' },
  reeds: { pos: 'noun', def: 'Tall, slender grasses with hollow stems growing in marshy water.' },
  swabs: { pos: 'noun/verb', def: 'Absorbent pads or sticks used for medical cleaning or mopping.' },
  nicks: { pos: 'noun/verb', def: 'Small cuts, notches, or chips made on the edge of a surface.' },
  nines: { pos: 'noun', def: 'Card values or digits equal to the number nine.' },
  arses: { pos: 'noun', def: 'Slang term for the buttocks, posteriors, or rear anatomy.' },
  reels: { pos: 'noun/verb', def: 'Cylinders around which film or fishing line is wound.' },
};

// 2. COMPREHENSIVE SPANISH CURATIONS
const ES_CURATED = {
  comer: { pos: 'verb', def: 'To consume food; to ingest solid nourishment.' },
  morir: { pos: 'verb', def: 'To cease living; to undergo the end of biological life.' },
  dejar: { pos: 'verb', def: 'To leave behind, abandon, or allow something to remain.' },
  creer: { pos: 'verb', def: 'To accept something as true; to have religious or moral faith.' },
  matar: { pos: 'verb', def: 'To cause the death of a living person, animal, or organism.' },
  jugar: { pos: 'verb', def: 'To engage in an activity, sport, or game for recreation.' },
  ganar: { pos: 'verb', def: 'To obtain in return for labor, victory, or investment; to win.' },
  pagar: { pos: 'verb', def: 'To give money in return for goods, services, or debt settlement.' },
  parar: { pos: 'verb', def: 'To cease motion or activity; to halt or come to a stand.' },
  pesar: { pos: 'verb/noun', def: 'To have a specified weight, or a feeling of grief and sorrow.' },
  robar: { pos: 'verb', def: 'To take another property without permission; to steal.' },
  deber: { pos: 'verb/noun', def: 'To be obliged to pay or do something; an obligation or duty.' },
  crear: { pos: 'verb', def: 'To bring something into existence; to produce or make.' },
  tirar: { pos: 'verb', def: 'To propel through the air with force, or to pull something.' },
  mover: { pos: 'verb', def: 'To change position or location; to set something in motion.' },
  nadar: { pos: 'verb', def: 'To propel oneself through water using bodily movements.' },
  votar: { pos: 'verb', def: 'To express a formal choice in an election or referendum.' },
  cazar: { pos: 'verb', def: 'To pursue and kill wild animals for food or sport.' },
  besar: { pos: 'verb', def: 'To touch with the lips as a sign of love, respect, or greeting.' },
  lavar: { pos: 'verb', def: 'To clean with water, soap, or other cleansing agents.' },
  durar: { pos: 'verb', def: 'To continue in time without perishing; to endure or last.' },
  girar: { pos: 'verb', def: 'To turn around an axis or center; to pivot or rotate.' },
  negar: { pos: 'verb', def: 'To declare untrue or refuse to acknowledge or grant.' },
  rodar: { pos: 'verb', def: 'To turn over and over on an axis; to film a movie scene.' },
  doler: { pos: 'verb', def: 'To cause physical or emotional pain, ache, or suffering.' },
  cavar: { pos: 'verb', def: 'To break up and move ground with a tool or hands; to dig.' },
  armar: { pos: 'verb', def: 'To equip with weapons, or to assemble components together.' },
  valer: { pos: 'verb', def: 'To have a specific monetary value, worth, or merit.' },
  medir: { pos: 'verb', def: 'To ascertain the size, amount, or degree of something.' },
  coser: { pos: 'verb', def: 'To join, fasten, or repair materials with stitches of thread.' },
  donar: { pos: 'verb', def: 'To give money, goods, or organs for charitable purposes.' },
  sudar: { pos: 'verb', def: 'To emit moisture through the pores of the skin; to perspire.' },
  ligar: { pos: 'verb', def: 'To tie or bind things together, or to flirt with someone.' },
  picar: { pos: 'verb', def: 'To sting, bite, chop finely, or peck with a beak.' },
  latir: { pos: 'verb', def: 'To pulsate or beat rhythmically, as a human heart.' },
  lamer: { pos: 'verb', def: 'To pass the tongue over a surface; to lick.' },
  pisen: { pos: 'verb', def: 'Present subjunctive of pisar; that they step on or tread upon.' },
  salon: { pos: 'noun', def: 'A large living room, parlor, hall, or exhibition lounge.' },
  union: { pos: 'noun', def: 'The state of being joined together in marriage or political alliance.' },
  water: { pos: 'noun', def: 'A toilet or bathroom fixture; water closet.' },
  
  // Plural and feminine nouns & adjectives
  vacas: { pos: 'noun', def: 'Plural of vaca; domesticated bovine animals kept for milk or beef (cows).' },
  rocas: { pos: 'noun', def: 'Plural of roca; solid mineral masses forming part of the earth (rocks).' },
  rosas: { pos: 'noun/adj', def: 'Plural of rosa; fragrant thorny flowers, or pink colors (roses).' },
  bolas: { pos: 'noun', def: 'Plural of bola; spherical objects, globes, or balls.' },
  tetas: { pos: 'noun', def: 'Plural of teta; mammary organs or breasts; teats.' },
  latas: { pos: 'noun', def: 'Plural of lata; cylindrical metal containers used for food (tin cans).' },
  curas: { pos: 'noun', def: 'Plural of cura; Catholic priests, or treatments and medical cures.' },
  chicas: { pos: 'noun', def: 'Plural of chica; young women or female children (girls).' },
  casas: { pos: 'noun', def: 'Plural of casa; buildings serving as living quarters (houses).' },
  mesas: { pos: 'noun', def: 'Plural of mesa; pieces of furniture with a flat top and legs (tables).' },
  bocas: { pos: 'noun', def: 'Plural of boca; anatomical facial openings for eating and speech (mouths).' },
  caras: { pos: 'noun/adj', def: 'Plural of cara, or feminine plural of caro; faces or expensive items.' },
  altas: { pos: 'adj', def: 'Feminine plural of alto; of great vertical extent; tall or high.' },
  bajas: { pos: 'adj/noun', def: 'Feminine plural of bajo, or casualties; short, low, or losses.' },
  solas: { pos: 'adj', def: 'Feminine plural of solo; without companions or assistance; alone.' },
  locas: { pos: 'adj', def: 'Feminine plural of loco; mentally disordered, eccentric, or crazy.' },
  rojas: { pos: 'adj', def: 'Feminine plural of rojo; having the color of fresh blood (red).' },
  vivas: { pos: 'adj/verb', def: 'Feminine plural of vivo, or subjunctive of vivir; alive or that you live.' },
  duras: { pos: 'adj', def: 'Feminine plural of duro; solid, firm, and resistant to pressure (hard).' },
  rotas: { pos: 'adj', def: 'Feminine plural of roto; fractured into pieces or damaged (broken).' },
  puras: { pos: 'adj', def: 'Feminine plural of puro; clean, untainted, and free from blemish (pure).' },
  ricas: { pos: 'adj', def: 'Feminine plural of rico; possessing great wealth, or very delicious (rich).' },
  secas: { pos: 'adj', def: 'Feminine plural of seco; free from moisture, liquid, or dampness (dry).' },
  finas: { pos: 'adj', def: 'Feminine plural of fino; of high quality, delicate, or slender (fine).' },
  sanas: { pos: 'adj', def: 'Feminine plural of sano; free from disease or bodily illness (healthy).' },
  malas: { pos: 'adj', def: 'Feminine plural of malo; of poor quality, wicked, or harmful (bad).' },
  raras: { pos: 'adj', def: 'Feminine plural of raro; not frequently found or experienced (rare).' },
  otras: { pos: 'det/pron', def: 'Feminine plural of otro; additional people or things (other, others).' },
  ambas: { pos: 'det/pron', def: 'Feminine form of ambos; referring to two people or things together (both).' },
  frias: { pos: 'adj', def: 'Feminine plural of frío; having a low temperature; cold or chilled.' },
  misas: { pos: 'noun', def: 'Plural of misa; Catholic Eucharistic religious services (masses).' },
  olmos: { pos: 'noun', def: 'Plural of olmo; tall deciduous shade trees with serrated leaves (elms).' },
  limas: { pos: 'noun', def: 'Plural of lima; green citrus fruits, or abrasive steel files.' },
  lomas: { pos: 'noun', def: 'Plural of loma; small, gently sloping elevations of land (hills).' },
  cunas: { pos: 'noun', def: 'Plural of cuna; small beds or cribs for babies and infants (cradles).' },
  vinas: { pos: 'noun', def: 'Plural of viña; plantations of grapevines for winemaking (vineyards).' },
  odios: { pos: 'noun', def: 'Plural of odio; intense feelings of hostility or hatred.' },
  majos: { pos: 'adj/noun', def: 'Plural of majo; attractive, charming, or pleasant people.' },
  monas: { pos: 'adj/noun', def: 'Feminine plural of mono; cute and pretty, or female monkeys.' },
  banas: { pos: 'verb', def: 'Second-person present of bañar; you bathe or wash in water.' },
  zurda: { pos: 'adj/noun', def: 'Feminine of zurdo; preferring the use of the left hand (left-handed).' },
  ilesa: { pos: 'adj', def: 'Feminine of ileso; unhurt and free from injury or damage (unharmed).' },
  ardua: { pos: 'adj', def: 'Feminine of arduo; involving immense effort and difficulty; arduous.' },
  gansa: { pos: 'noun/adj', def: 'A female goose, or an informal term for a silly person.' },
  tiesa: { pos: 'adj', def: 'Feminine of tieso; rigid, firm, inflexible, or stiff.' },
  osada: { pos: 'adj', def: 'Feminine of osado; displaying bold courage and daring audacity.' },
  necia: { pos: 'adj', def: 'Feminine of necio; foolish, obstinate, ignorant, or stubborn.' },
  obesa: { pos: 'adj', def: 'Feminine of obeso; having excessive bodily fat; severely overweight.' },
  morra: { pos: 'noun', def: 'Slang term in Mexico for a young girl or woman; lass.' },
  tacha: { pos: 'noun/verb', def: 'A physical flaw or blemish, or crosses out writing.' },
  genia: { pos: 'noun/adj', def: 'Feminine of genio; an exceptionally brilliant person (genius).' },
  astra: { pos: 'noun', def: 'Latin-derived term for the stars and celestial bodies.' },
  prada: { pos: 'noun', def: 'A meadow or grassy field, or high fashion brand name.' },
};

// 3. COMPREHENSIVE FRENCH CURATIONS
const FR_CURATED = {
  aller: { pos: 'verb', def: 'To move or travel from one place to another; to go.' },
  venir: { pos: 'verb', def: 'To move toward or arrive at a place or speaker; to come.' },
  vivre: { pos: 'verb', def: 'To be alive; to experience life or reside in a place.' },
  payer: { pos: 'verb', def: 'To give money in exchange for goods, services, or debts.' },
  jeter: { pos: 'verb', def: 'To propel something with force through the air; to throw.' },
  gérer: { pos: 'verb', def: 'To control, manage, or administer an enterprise or situation.' },
  lever: { pos: 'verb', def: 'To move or cause to move upward to a higher level; to raise.' },
  créer: { pos: 'verb', def: 'To bring something into existence through skill or imagination.' },
  virer: { pos: 'verb', def: 'To turn or change direction, or to transfer money or dismiss someone.' },
  crier: { pos: 'verb', def: 'To shout loudly, scream, or vocalize an intense cry.' },
  laver: { pos: 'verb', def: 'To clean with water, soap, or other cleansing agents.' },
  filer: { pos: 'verb', def: 'To spin fiber into yarn, or to dash off quickly.' },
  rater: { pos: 'verb', def: 'To fail to hit, catch, reach, or accomplish something; to miss.' },
  fêter: { pos: 'verb', def: 'To celebrate a special occasion or holiday with festivities.' },
  nager: { pos: 'verb', def: 'To move through water by using bodily movements; to swim.' },
  durer: { pos: 'verb', def: 'To continue in time without perishing; to last or endure.' },
  prier: { pos: 'verb', def: 'To address a prayer to a deity, or to politely ask someone.' },
  vomir: { pos: 'verb', def: 'To eject matter from the stomach through the mouth.' },
  voter: { pos: 'verb', def: 'To express a formal choice in an election or ballot.' },
  subir: { pos: 'verb', def: 'To undergo, endure, or be subjected to an unpleasant experience.' },
  louer: { pos: 'verb', def: 'To pay for the temporary use of property, or to praise someone.' },
  punir: { pos: 'verb', def: 'To inflict a penalty on someone as retribution for an offense.' },
  mêler: { pos: 'verb', def: 'To combine or mix different substances, ideas, or people together.' },
  cuire: { pos: 'verb', def: 'To prepare food by applying heat; to cook, bake, or boil.' },
  fixer: { pos: 'verb', def: 'To attach or fasten firmly in place, or to gaze intently.' },
  sucer: { pos: 'verb', def: 'To draw into the mouth by using the lips and tongue.' },
  raser: { pos: 'verb', def: 'To shave hair from the face or body, or to demolish a building.' },
  noter: { pos: 'verb', def: 'To write down briefly, observe carefully, or assign a grade.' },
  jurer: { pos: 'verb', def: 'To make a solemn declaration or promise; to swear.' },
  semer: { pos: 'verb', def: 'To scatter seeds in the ground for growth; to sow.' },
  plier: { pos: 'verb', def: 'To bend something over onto itself so that one part covers another.' },
  geler: { pos: 'verb', def: 'To turn from liquid to solid as a result of cold temperature; to freeze.' },
  peser: { pos: 'verb', def: 'To ascertain or have a specified weight on a scale.' },
  unite: { pos: 'noun', def: 'The state of being united, or a single undivided entity.' },
  union: { pos: 'noun', def: 'An association formed by joining individuals or groups together.' },
  water: { pos: 'noun', def: 'A term denoting a bathroom or water closet.' },
  
  // Nouns and adjectives
  noire: { pos: 'adj', def: 'Feminine of noir; of the very darkest color; black.' },
  rotis: { pos: 'noun', def: 'Plural of rôti; pieces of roasted meat or roasts.' },
  rotie: { pos: 'noun/adj', def: 'A slice of toasted bread, or feminine of roasted.' },
  pures: { pos: 'adj', def: 'Feminine plural of pur; clean, unmixed, and free from impurities.' },
  dures: { pos: 'adj', def: 'Feminine plural of dur; solid, unyielding, and difficult; hard.' },
  vives: { pos: 'adj', def: 'Feminine plural of vif; full of life, lively, or bright.' },
  fines: { pos: 'adj', def: 'Feminine plural of fin; delicate, slender, or of superior quality.' },
  sures: { pos: 'adj', def: 'Feminine plural of sûr; completely confident, dependable, or safe.' },
  agees: { pos: 'adj', def: 'Feminine plural of âgé; advanced in years; elderly or old.' },
  pumas: { pos: 'noun', def: 'Plural of puma; large wild cats native to the Americas.' },
  thons: { pos: 'noun', def: 'Plural of thon; large marine saltwater predatory fish (tunas).' },
  etuis: { pos: 'noun', def: 'Plural of étui; small decorative cases for holding needles or glasses.' },
  scies: { pos: 'noun', def: 'Plural of scie; hand tools with toothed blades for cutting wood.' },
  aleas: { pos: 'noun', def: 'Plural of aléa; unforeseen risks, uncertainties, or hazards.' },
  amers: { pos: 'adj/noun', def: 'Plural of amer; sharp acrid tastes, or bitter feelings.' },
  bruts: { pos: 'adj', def: 'Plural of brut; unrefined, raw, or rough in nature.' },
  gaies: { pos: 'adj', def: 'Feminine plural of gai; cheerful, lively, and lighthearted.' },
  riens: { pos: 'noun', def: 'Plural of rien; trifles, trivial matters, or little nothings.' },
  datee: { pos: 'adj', def: 'Feminine of daté; marked with a specific calendar date; dated.' },
  ridee: { pos: 'adj', def: 'Feminine of ridé; marked with wrinkles, lines, or creases.' },
  innee: { pos: 'adj', def: 'Feminine of inné; existing naturally from birth; innate.' },
  pavee: { pos: 'adj', def: 'Feminine of pavé; covered with stones or cobblestone pavement.' },
  tetee: { pos: 'noun', def: 'The act of suckling milk from a breast or bottle.' },
  filee: { pos: 'adj', def: 'Feminine of filé; spun into thread or made into a continuous line.' },
  ailee: { pos: 'adj', def: 'Feminine of ailé; equipped with anatomical wings for flight.' },
  brass: { pos: 'noun', def: 'Plural of bras; anatomical human upper limbs (arms).' },
  clins: { pos: 'noun', def: 'Plural of clin; brief intentional closures of one eyelid (winks).' },
  cline: { pos: 'verb', def: 'First or third-person present of cligner; winks with an eye.' },
  butes: { pos: 'verb', def: 'Second-person present of buter; you stumble or aim at a goal.' },
  coles: { pos: 'noun', def: 'Plural of col; mountain passes, shirt collars, or necks.' },
  lines: { pos: 'noun', def: 'Plural of lin; flax plants cultivated for linen fiber and linseed oil.' },
  touts: { pos: 'pron/adj', def: 'Plural of tout; all individuals, entire groups, or everything.' },
};

// BANNED NOISE TO REMOVE
const NOISE_WORDS = new Set([
  'niles', 'rolex', 'luigi', 'adams', 'utica', 'kimmy', 'kimbo', 'liban', 'hawai',
  'oppaa', 'aigoo', 'arghh', 'ummhh', 'woooo', 'yeaaa', 'yeahh', 'ouais', 'ouaii',
  'marla', 'freda', 'salma', 'julia', 'hayes', 'caine', 'maine', 'indes', 'boers',
  'quies', 'estes', 'horse', 'paine'
]);

const EN_BANNED = new Set([
  'comer', 'adele', 'petra', 'delia', 'chico', 'aires', 'mammy', 'dixie', 'hindi'
]);

function cleanDefString(def) {
  if (!def) return '';
  let clean = def.trim();
  clean = clean.replace(/;\s*to perform (?:this|the) action(?:\s+of[^\.;]+)?\.?/gi, '.');
  clean = clean.replace(/;\s*to perform the action of [^\.;]+\.?/gi, '.');
  clean = clean.replace(/^The (?:entity, object, or concept representing|object, entity, or concept representing) /i, 'A term denoting ');
  clean = clean.replace(/^Describing (?:someone|something) that is /i, 'Characterized by being ');
  clean = clean.replace(/\bDescribing someone or something that is Describing someone or something that is\b/i, 'Characterized by being');
  clean = clean.replace(/\bDescribing someone or something that is\b/i, 'Characterized by being');
  clean = clean.replace(/\bPlural form or third-person singular present of [a-z]+;\s*/i, '');
  clean = clean.replace(/\bPlural form; multiple instances of [a-z]+;\s*/i, 'Plural of ');
  clean = clean.replace(/;\s*as,\s*[^;]+/gi, '');
  clean = clean.replace(/;\s*esp\.,\s*[^;]+/gi, '');
  clean = clean.replace(/;\s*specif\.,\s*[^;]+/gi, '');
  clean = clean.replace(/;\s*hence,\s*[^;]+/gi, '');
  clean = clean.replace(/;\s*;/g, ';');
  clean = clean.replace(/,\s*;/g, ';');
  clean = clean.replace(/;\s*,/g, ';');
  
  // Condense multiple semicolon chains to max 2 parts
  const parts = clean.split(/;\s*/).filter(p => p.trim().length > 3);
  if (parts.length > 2) {
    clean = parts.slice(0, 2).join('; ');
  }

  clean = clean.replace(/^;\s*/, '').replace(/;\s*$/, '').trim();
  clean = clean.replace(/\s+/g, ' ').trim();
  if (!clean.endsWith('.')) clean += '.';
  return clean;
}

function refineDict(dict, curated, lang) {
  const result = {};

  for (const [w, entry] of Object.entries(dict)) {
    const norm = normalizeWord(w);
    if (NOISE_WORDS.has(norm) || NOISE_WORDS.has(w)) {
      continue; // exclude noise word
    }
    if (lang === 'en' && (EN_BANNED.has(norm) || EN_BANNED.has(w))) {
      continue; // exclude awkward english overlap / proper noun
    }

    let finalPos = entry.pos;
    let finalDef = entry.def;

    // 1. Check direct curated overrides
    if (curated[norm] || curated[w]) {
      const c = curated[norm] || curated[w];
      finalPos = c.pos;
      finalDef = c.def;
    } else {
      // 2. Clean definition string from any leftover boilerplate
      finalDef = cleanDefString(finalDef);

      // 3. Fix regular Spanish/French plural and feminine pattern artifacts
      if (lang === 'es') {
        if (/feminine plural of [a-z]+o\b/i.test(finalDef)) {
          const rootMatch = finalDef.match(/feminine plural of ([a-z]+)o/i);
          if (rootMatch) {
            const root = rootMatch[1];
            finalDef = `Plural form or feminine plural describing ${root}; multiple items.`;
          }
        }
      } else if (lang === 'fr') {
        if (/feminine plural of [a-z]+/i.test(finalDef)) {
          finalDef = cleanDefString(finalDef.replace(/feminine plural of /i, 'Feminine plural form of '));
        }
      }
    }

    // Ensure definition has at least 4 words and proper formatting
    const words = finalDef.split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      if (finalPos === 'verb') {
        finalDef = `To engage in the action of ${finalDef.toLowerCase().replace(/\.$/, '')}.`;
      } else if (finalPos === 'noun') {
        finalDef = `A term denoting or representing ${finalDef.toLowerCase().replace(/\.$/, '')}.`;
      } else {
        finalDef = `Characterized by or pertaining to ${finalDef.toLowerCase().replace(/\.$/, '')}.`;
      }
    }

    result[w] = {
      display: entry.display || w,
      d: entry.d,
      pos: finalPos,
      def: finalDef,
      reviewed: true
    };
  }

  // Sort keys alphabetically A-Z
  const sortedResult = {};
  const sortedKeys = Object.keys(result).sort((a, b) => a.localeCompare(b, lang));
  for (const k of sortedKeys) {
    sortedResult[k] = result[k];
  }

  return sortedResult;
}

const cleanEn = refineDict(en, EN_CURATED, 'en');
const cleanEs = refineDict(es, ES_CURATED, 'es');
const cleanFr = refineDict(fr, FR_CURATED, 'fr');

fs.writeFileSync('public/en.json', JSON.stringify(cleanEn, null, 2));
fs.writeFileSync('public/es.json', JSON.stringify(cleanEs, null, 2));
fs.writeFileSync('public/fr.json', JSON.stringify(cleanFr, null, 2));

console.log('Refined dictionaries updated successfully!');
console.log('EN entries:', Object.keys(cleanEn).length);
console.log('ES entries:', Object.keys(cleanEs).length);
console.log('FR entries:', Object.keys(cleanFr).length);
