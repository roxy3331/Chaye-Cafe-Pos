// Deploy both workflows via n8n PUT API
const fs = require('fs');

const N8N = 'http://129.153.11.98:5678';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTg4ODg3ZS0wMTRlLTQ4ZTktYmMyNS0yYjI5YjdlY2YxMjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOTY0ZDk1OWYtZTVkMC00NTU2LTg4NzQtMjlhMjAzNWM4YjMxIiwiaWF0IjoxNzgxMjY0Nzk1fQ.H6cf6SLa4PPpGkI4NaBpWl-KcIUdFYo-vUmpZR23Hpc';

async function deploy(file, id, label) {
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
  // PUT body: name, nodes, connections, settings
  const body = JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
  });
  const res = await fetch(`${N8N}/api/v1/workflows/${id}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' },
    body,
  });
  const txt = await res.text();
  console.log(`[${label}] HTTP ${res.status}`);
  if (res.status >= 400) {
    console.log(`[${label}] ERROR:`, txt.slice(0, 800));
    return false;
  }
  // Activate it (ensure schedule trigger is live)
  const actRes = await fetch(`${N8N}/api/v1/workflows/${id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': KEY },
  });
  console.log(`[${label}] activate HTTP ${actRes.status}`);
  return true;
}

(async () => {
  const p = await deploy('./n8n-workflow-PRODUCTION.json', 'g4Sgllbd2sfSeElt', 'PRODUCTION');
  const w = await deploy('./n8n-workflow-WEEKLY.json', 'A3g1CASy48EaMHEc', 'WEEKLY');
  console.log('\nDONE.', p && w ? 'Both deployed + activated.' : 'PARTIAL FAIL.');
})();
