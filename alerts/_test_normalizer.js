// Behavioral test: does the new normalizer handle all Firestore runQuery
// response shapes that n8n's HTTP Request node can produce?
const assert = require('assert');

// The exact normalizer we injected into the 4 Format nodes.
function normalize(_input_all_helper, all) {
  const $input = { all: () => all };
  // ---- injected normalizer (verbatim) ----
  const _raw = $input.all();
  const docs = (_raw.length === 1 && Array.isArray(_raw[0].json))
    ? _raw[0].json
    : _raw.map(function (i) { return i.json; });
  // ---------------------------------------
  return docs;
}

const sampleDocs = [
  { document: { name: 'projects/x/databases/(default)/documents/purchases/abc', fields: { alerted: { booleanValue: false }, itemName: { stringValue: 'Tea' } } } },
  { document: { name: 'projects/x/databases/(default)/documents/purchases/def', fields: { alerted: { booleanValue: false }, itemName: { stringValue: 'Coffee' } } } }
];

const splitItems = sampleDocs.map(d => ({ json: d }));   // shape A: HTTP node splits array
const wrappedItem = [{ json: sampleDocs }];              // shape B: array wrapped in one item
const emptySplit = [];
const emptyWrapped = [{ json: [] }];  // [{json: []}]

const rA = normalize(null, splitItems);
const rB = normalize(null, wrappedItem);
const rEmpty = normalize(null, emptySplit);
const rEmptyWrap = normalize(null, emptyWrapped);

assert.strictEqual(rA.length, 2, 'split shape should yield 2 docs');
assert.strictEqual(rB.length, 2, 'wrapped shape should yield 2 docs');
assert.strictEqual(rEmpty.length, 0, 'empty split should yield 0');
assert.strictEqual(rEmptyWrap.length, 0, 'empty wrapped should yield 0');
assert.ok(Array.isArray(rEmpty), 'empty result must still be array (so .filter works)');

// Names preserved
assert.deepStrictEqual(
  rA.map(d => d.document.fields.itemName.stringValue),
  ['Tea', 'Coffee']
);

console.log('ALL BEHAVIORAL CHECKS PASSED');
console.log('  split   ->', rA.length, 'docs');
console.log('  wrapped ->', rB.length, 'docs');
console.log('  empty   ->', rEmpty.length, '(array:', Array.isArray(rEmpty) + ')');
