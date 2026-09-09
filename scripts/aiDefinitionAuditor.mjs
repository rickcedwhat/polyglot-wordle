import fs from 'fs';

const BOILERPLATE_PATTERNS = [
  { id: 'perform_action', regex: /to perform (?:this|the) action/i, reason: 'Robotic verb filler (; to perform this action)' },
  { id: 'entity_object', regex: /The (?:entity|object|concept) representing/i, reason: 'Robotic noun filler (The entity, object, or concept...)' },
  { id: 'quality_state', regex: /The (?:quality|state|condition) of (?:the |a )?[a-z]+;\s*/i, reason: 'Generic abstraction filler' },
  { id: 'describing_someone_nested', regex: /Characterized by being Characterized by being/i, reason: 'Double nested filler' },
  { id: 'plural_instance', regex: /multiple instances of [a-z]+;/i, reason: 'Mechanical plural filler (multiple instances of...)' },
  { id: 'circular_grammar', regex: /Plural form or third-person singular present of [a-z]+;/i, reason: 'Mechanical inflection template' },
  { id: 'bogus_vaco', regex: /feminine plural of (?:vaco|roco|roso|bolo|teto|lato|curo)\b/i, reason: 'Bogus stem heuristic (feminine plural of vaco/roco/etc.)' },
];

function auditDictionaries() {
  const flagged = {
    en: [],
    es: [],
    fr: []
  };

  const stats = {
    en: { total: 0, flagged: 0 },
    es: { total: 0, flagged: 0 },
    fr: { total: 0, flagged: 0 }
  };

  for (const lang of ['en', 'es', 'fr']) {
    const filePath = `public/${lang}.json`;
    if (!fs.existsSync(filePath)) continue;
    const dict = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    stats[lang].total = Object.keys(dict).length;

    for (const [word, entry] of Object.entries(dict)) {
      const def = entry.def || '';
      const issues = [];

      // Check boilerplate patterns
      for (const bp of BOILERPLATE_PATTERNS) {
        if (bp.regex.test(def)) {
          issues.push(bp.reason);
        }
      }

      // Check trailing/leading weird punctuation
      if (/;\s*$/.test(def) || /^;\s*/.test(def)) {
        issues.push('Malformed semicolon formatting');
      }

      // Check excessive semicolon chaining
      if ((def.match(/;/g) || []).length > 2) {
        issues.push('Excessive semicolon chaining');
      }

      // Check very short or cryptic definitions
      const words = def.split(/\s+/).filter(Boolean);
      if (words.length < 4) {
        issues.push('Too short (< 4 words)');
      }

      if (issues.length > 0) {
        flagged[lang].push({
          word,
          display: entry.display,
          pos: entry.pos,
          d: entry.d,
          currentDef: def,
          issues
        });
      }
    }
    stats[lang].flagged = flagged[lang].length;
  }

  // Write flagged definitions JSON
  fs.writeFileSync('scripts/audit_flagged_definitions.json', JSON.stringify({ stats, flagged }, null, 2));

  // Generate markdown artifact for user review
  let md = '# 🔍 AI Dictionary Quality & Boilerplate Audit Report\n\n';
  md += 'This report audits all dictionary entries across English, Spanish, and French for robotic boilerplate, misleading definitions, grammatical placeholders, or semantic anomalies.\n\n';

  md += '## 📊 Summary Statistics\n\n';
  md += '| Language | Total Words | Flagged Definitions | Clean Definitions | Flagged % |\n';
  md += '| :--- | :--- | :--- | :--- | :--- |\n';
  for (const lang of ['en', 'es', 'fr']) {
    const s = stats[lang];
    const pct = ((s.flagged / s.total) * 100).toFixed(1);
    const clean = s.total - s.flagged;
    md += `| **${lang.toUpperCase()}** | ${s.total.toLocaleString()} | ${s.flagged.toLocaleString()} | ${clean.toLocaleString()} | ${pct}% |\n`;
  }
  md += '\n---\n\n';

  for (const lang of ['en', 'es', 'fr']) {
    const list = flagged[lang];
    md += `## 🌐 ${lang.toUpperCase()} Quality Status\n\n`;

    if (list.length === 0) {
      md += `✅ **100% Clean (${stats[lang].total.toLocaleString()} words)!** No boilerplate, misleading definitions, or robotic artifacts detected.\n\n`;
      continue;
    }

    // Group by primary issue
    const groups = {};
    for (const item of list) {
      const primaryIssue = item.issues[0];
      if (!groups[primaryIssue]) groups[primaryIssue] = [];
      groups[primaryIssue].push(item);
    }

    for (const [issue, items] of Object.entries(groups)) {
      md += `### ${issue} (${items.length} words)\n\n`;
      md += '| Word | POS | Current Definition | Issues |\n';
      md += '| :--- | :--- | :--- | :--- |\n';
      for (const item of items) {
        const cleanDef = item.currentDef.replace(/\|/g, '\\|');
        md += `| **${item.display}** | \`${item.pos}\` | ${cleanDef} | ${item.issues.join('; ')} |\n`;
      }
      md += '\n';
    }
  }

  const artifactPath = 'C:/Users/ccata/.gemini/antigravity/brain/7c01a3f2-7aa5-4174-8235-9800451968d3/flagged_definitions_review.md';
  fs.writeFileSync(artifactPath, md);

  return { stats, flagged };
}

const res = auditDictionaries();
console.log('Audit complete:', res.stats);
