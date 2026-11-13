// Print the skeleton and clip names from a local GLB or glTF.
import fs from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('Usage: node tools/model-info.mjs assets/models/skinned/zombie_male.glb'); process.exit(1); }
const bytes = fs.readFileSync(file); let g;
if (bytes.toString('ascii', 0, 4) === 'glTF') {
  if (bytes.readUInt32LE(4) !== 2 || bytes.toString('ascii', 16, 20) !== 'JSON') throw new Error('Expected a glTF 2.0 GLB with a JSON chunk');
  g = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
} else g = JSON.parse(bytes.toString('utf8'));
const ids = new Set((g.skins || []).flatMap(s => s.joints || []));
console.log(`Файл: ${file}\nСкинов: ${(g.skins || []).length}\nКостей: ${ids.size}`);
console.log('\nКости:'); for (const i of ids) console.log('  ' + (g.nodes?.[i]?.name || `node_${i}`));
console.log('\nАнимации:'); for (const a of g.animations || []) console.log('  ' + (a.name || '(без имени)'));
if (!g.animations?.length) console.log('  (нет встроенных клипов)');
