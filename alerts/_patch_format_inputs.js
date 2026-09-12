// Patches Format code nodes in PRODUCTION workflow to handle n8n item-array input.
// OLD: const docs = $input.all()[0].json;   <- wrong: only grabs first item
// NEW: const docs = $input.all().map(i => i.json);  <- correct: flatten all items
// Run: node _patch_format_inputs.js
const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('./n8n-workflow-PRODUCTION.json', 'utf8'));

const OLD = 'const docs = $input.all()[0].json;';
const NEW = 'const _raw = $input.all();\nconst docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ? _raw[0].json : _raw.map(i => i.json);';

let count = 0;
for (const n of wf.nodes) {
  if (n.type === 'n8n-nodes-base.code' && n.parameters && n.parameters.jsCode && n.parameters.jsCode.includes(OLD)) {
    n.parameters.jsCode = n.parameters.jsCode.replace(OLD, NEW);
    count++;
    console.log('patched:', n.name);
  }
}

if (count === 0) {
  console.error('ERROR: no Format nodes matched the OLD pattern. Aborting.');
  process.exit(1);
}

fs.writeFileSync('./n8n-workflow-PRODUCTION.json', JSON.stringify(wf, null, 2));
console.log('total patched:', count);
