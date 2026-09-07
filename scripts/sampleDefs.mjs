import fs from 'fs';

const en = JSON.parse(fs.readFileSync('public/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('public/es.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('public/fr.json', 'utf8'));

function sampleDict(name, dict, count = 5) {
  console.log(`\n================== ${name} Sample (${count} words) ==================`);
  const keys = Object.keys(dict);
  for (let i = 0; i < count; i++) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const entry = dict[randomKey];
    console.log(`• ${entry.display} (${entry.pos}) [diff: ${entry.d}]`);
    console.log(`  - ${entry.def}\n`);
  }
}

sampleDict('🇬🇧 English', en, 5);
sampleDict('🇪🇸 Spanish', es, 5);
sampleDict('🇫🇷 French', fr, 5);
