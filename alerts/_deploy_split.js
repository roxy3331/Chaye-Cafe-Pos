// Deploy: REALTIME overwrites PRODUCTION id; REMINDERS creates new workflow; WEEKLY stays.
const fs = require('fs');
const N8N = 'http://129.153.11.98:5678';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTg4ODg3ZS0wMTRlLTQ4ZTktYmMyNS0yYjI5YjdlY2YxMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTY0ZDk1OWYtZTVkMC00NTU2LTg4NzQtMjlhMjAzNWM4YjMxIiwiaWF0IjoxNzgxMjY0Nzk1fQ.H6cf6SLa4PPpGkI4NaBpWl-KcIUdFYo-vUmpZR23Hpc';

async function put(file, id, label) {
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings });
  const r = await fetch(`${N8N}/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' }, body });
  const txt = await r.text();
  console.log(`[${label}] PUT ${r.status}`);
  if (r.status >= 400) { console.log(`[${label}] ERR:`, txt.slice(0, 400)); return null; }
  await fetch(`${N8N}/api/v1/workflows/${id}/activate`, { method: 'POST', headers: { 'X-N8N-API-KEY': KEY } });
  console.log(`[${label}] activated`);
  return id;
}
async function create(file, label) {
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings });
  const r = await fetch(`${N8N}/api/v1/workflows`, { method: 'POST', headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' }, body });
  const txt = await r.text();
  console.log(`[${label}] POST ${r.status}`);
  if (r.status >= 400) { console.log(`[${label}] ERR:`, txt.slice(0, 400)); return null; }
  const j = JSON.parse(txt);
  await fetch(`${N8N}/api/v1/workflows/${j.id}/activate`, { method: 'POST', headers: { 'X-N8N-API-KEY': KEY } });
  console.log(`[${label}] activated id=${j.id}`);
  return j.id;
}

(async () => {
  const rt = await put('./n8n-workflow-REALTIME.json', 'g4Sgllbd2sfSeElt', 'REALTIME');
  const rm = await create('./n8n-workflow-REMINDERS.json', 'REMINDERS');
  console.log('\nIDs:');
  console.log('  REALTIME:', rt);
  console.log('  REMINDERS:', rm);
  console.log('  WEEKLY (unchanged): A3g1CASy48EaMHEc');
})();
