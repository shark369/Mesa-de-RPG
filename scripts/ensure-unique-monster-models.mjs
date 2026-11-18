// Garante que TODO monstro do Bestiário tenha um modelo 3D com assinatura visual única.
// Uso: node --experimental-strip-types scripts/ensure-unique-monster-models.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saltsFile = path.join(root, 'client/src/data/monsterVariantSalts.ts');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'server/data/pocketdm-catalog.json'), 'utf8'));
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(path.join(root, 'server/data/bestiary-cache.json'), 'utf8'));
} catch {}

// Une catálogo PocketDM + criaturas do PDF
const entries = new Map();
for (const c of catalog) entries.set(c.slug, { slug: c.slug, name: c.namePt || c.name, nameEn: c.nameEn, type: c.type });
for (const [slug, c] of Object.entries(cache)) {
  if (!entries.has(slug)) entries.set(slug, { slug, name: c.name, nameEn: c.nameEn, type: c.type });
}

function writeSalts(salts) {
  const body = Object.entries(salts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${v}`)
    .join(',\n');
  fs.writeFileSync(
    saltsFile,
    `// Gerado automaticamente por scripts/ensure-unique-monster-models.mjs\n// Sais de desempate: garantem que cada monstro do Bestiário tenha uma assinatura visual 3D única.\nexport const MONSTER_VARIANT_SALTS: Record<string, number> = {\n${body}${body ? '\n' : ''}};\n`
  );
}

const salts = {};
writeSalts(salts);

let iteration = 0;
let firstRunDupes = null;
const archetypeCounts = {};
while (true) {
  iteration++;
  // Importa com cache-buster para reler os sais atualizados
  const mod = await import(pathToFileURL(path.join(root, 'client/src/utils/monsterModelSpec.ts')).href + `?v=${iteration}`);
  // O módulo de sais também precisa ser recarregado: aplicamos diretamente no objeto exportado
  const saltMod = await import(pathToFileURL(saltsFile).href);
  Object.keys(saltMod.MONSTER_VARIANT_SALTS).forEach((k) => delete saltMod.MONSTER_VARIANT_SALTS[k]);
  Object.assign(saltMod.MONSTER_VARIANT_SALTS, salts);

  const bySig = new Map();
  for (const e of entries.values()) {
    const spec = mod.buildMonsterModelSpec({ ...e, tokenType: 'monster' });
    // Assinatura forte: dentro do mesmo arquétipo, a combinação de acessórios + padrão de pele precisa ser exclusiva
    const sig = `${spec.archetype}|${spec.variant.pattern}|${spec.variant.extras.join('+')}`;
    if (iteration === 1) archetypeCounts[spec.archetype] = (archetypeCounts[spec.archetype] || 0) + 1;
    if (!bySig.has(sig)) bySig.set(sig, []);
    bySig.get(sig).push(e.slug);
  }
  const dupes = [...bySig.values()].filter((g) => g.length > 1);
  if (firstRunDupes === null) firstRunDupes = dupes.reduce((n, g) => n + g.length - 1, 0);
  if (dupes.length === 0) {
    console.log(`Monstros analisados: ${entries.size}`);
    console.log(`Assinaturas visuais únicas: ${bySig.size}`);
    console.log(`Colisões antes do desempate: ${firstRunDupes}`);
    console.log(`Monstros que receberam sal de desempate: ${Object.keys(salts).length}`);
    console.log(`Iterações: ${iteration}`);
    console.log('Arquétipos:', JSON.stringify(archetypeCounts));
    break;
  }
  // Mantém o primeiro de cada grupo, re-sorteia os demais
  for (const group of dupes) {
    for (const slug of group.slice(1)) salts[slug] = (salts[slug] || 0) + 1;
  }
  if (iteration > 60) {
    console.error('Não convergiu; colisões restantes:', dupes.length);
    process.exit(1);
  }
}
writeSalts(salts);
