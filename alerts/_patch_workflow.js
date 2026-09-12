// Surgically patches the 4 Format Code nodes in the live n8n workflow.
// Only the input-handling line is changed; everything else stays byte-identical
// so JSON escaping is preserved perfectly.
const fs = require('fs');

const SRC = 'C:\\Users\\MY PC\\Downloads\\Cafe POS Alerts - Telegram (4).json';
const OUT = 'C:\\Users\\MY PC\\Desktop\\chaye-cafe-pos\\alerts\\Cafe-POS-Alerts-FIXED.json';

const wf = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// OLD: grabs only the first document object (not the array) -> Array.isArray() is
//      always false -> node returns [] -> no Telegram message ever fires.
const OLD = 'const docs = $input.all()[0].json;';

// NEW: normalize BOTH possible HTTP-node response shapes (split into items OR
//      wrapped as a single array item) into a flat array of doc objects.
const NEW = 'const _raw = $input.all();\n' +
            'const docs = (_raw.length === 1 && Array.isArray(_raw[0].json)) ' +
            '? _raw[0].json : _raw.map(function (i) { return i.json; });';

let count = 0;
for (const n of wf.nodes) {
  if (n.type === 'n8n-nodes-base.code' && n.parameters &&
      typeof n.parameters.jsCode === 'string' && n.parameters.jsCode.includes(OLD)) {
    n.parameters.jsCode = n.parameters.jsCode.replace(OLD, NEW);
    count++;
    console.log('patched:', n.name);
  }
}

if (count === 0) {
  console.error('ERROR: no Format nodes matched the expected line. Aborting (no file written).');
  process.exit(1);
}

wf.name = 'Cafe POS Alerts - Telegram (FIXED)';
fs.writeFileSync(OUT, JSON.stringify(wf, null, 2));
console.log('total patched:', count);
console.log('written:', OUT);
