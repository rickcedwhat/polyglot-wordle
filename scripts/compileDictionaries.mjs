import fs from 'fs';
import { buildEnglish, buildSpanish, buildFrench } from './dictGenerators.mjs';

console.log('Compiling dictionaries...');

const en = buildEnglish();
const es = buildSpanish();
const fr = buildFrench();

fs.writeFileSync('public/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('public/es.json', JSON.stringify(es, null, 2));
fs.writeFileSync('public/fr.json', JSON.stringify(fr, null, 2));

console.log(`Generated:
- en.json: ${Object.keys(en).length} entries
- es.json: ${Object.keys(es).length} entries
- fr.json: ${Object.keys(fr).length} entries`);
