// smoke.ts — verifica conectividade sem precisar do Claude
import { catalog } from '../src/catalog.js';
import { callEvolution } from '../src/client.js';

const action = catalog.find(a => a.id === 'instance.fetchInstances');
if (!action) {
  console.error('SMOKE FAIL: Action instance.fetchInstances não encontrada no catálogo');
  process.exit(1);
}
const result = await callEvolution(action, {});

if (result.isError) {
  console.error('SMOKE FAIL:', result.content[0].text);
  process.exit(1);
}

console.log('SMOKE OK — instâncias:', result.content[0].text);
