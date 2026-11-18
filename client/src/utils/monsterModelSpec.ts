// =============================================================================
// Especificação de Modelos 3D dos Monstros (Aetheria VTT)
// -----------------------------------------------------------------------------
// Cada criatura do bestiário recebe um modelo 3D próprio e determinístico:
//  - O "arquétipo" (dragão, aranha, humanoide, gosma, elemental...) vem do nome/tipo.
//  - Cores, chifres, asas, cauda, espinhos, armas e proporções vêm de palavras-chave
//    e de uma semente única derivada do slug — assim dois monstros nunca ficam iguais.
// =============================================================================

import { MONSTER_VARIANT_SALTS } from '../data/monsterVariantSalts.ts';

export type Archetype =
  | 'humanoid'
  | 'giant'
  | 'skeleton'
  | 'zombie'
  | 'ghost'
  | 'quadruped'
  | 'theropod'
  | 'bird'
  | 'bat'
  | 'insect'
  | 'spider'
  | 'scorpion'
  | 'centipede'
  | 'crab'
  | 'frog'
  | 'serpent'
  | 'worm'
  | 'naga'
  | 'fish'
  | 'cephalopod'
  | 'dragon'
  | 'wyvern'
  | 'turtle'
  | 'hydra'
  | 'ooze'
  | 'cube'
  | 'elemental'
  | 'golem'
  | 'armor'
  | 'sword'
  | 'rug'
  | 'tree'
  | 'fungus'
  | 'mound'
  | 'eyeTyrant'
  | 'blob'
  | 'centaur'
  | 'swarm'
  | 'mimic'
  | 'wisp';

export type ElementKind =
  | 'fire'
  | 'water'
  | 'air'
  | 'earth'
  | 'ice'
  | 'magma'
  | 'steam'
  | 'dust'
  | 'lightning'
  | 'shadow';

export interface MonsterModelFeatures {
  wings?: 'bat' | 'feather' | 'insect';
  horns?: 'small' | 'big' | 'curved' | 'antlers' | 'single' | 'bull';
  tail?: boolean;
  spikes?: boolean;
  tusks?: boolean;
  mane?: boolean;
  trunk?: boolean;
  beak?: boolean;
  heads?: number;
  arms?: number;
  weapon?: 'sword' | 'axe' | 'staff' | 'club' | 'spear' | 'bow' | 'dagger' | 'trident';
  shield?: boolean;
  helmet?: boolean;
  hood?: boolean;
  robe?: boolean;
  crown?: boolean;
  halo?: boolean;
  cape?: boolean;
  snout?: 'canine' | 'lizard' | 'boar' | 'bull' | 'feline' | 'horse' | 'ape';
  earsPointy?: boolean;
  earsRound?: boolean;
  longNeck?: boolean;
  eyes?: number;
  tentacles?: number;
  shell?: boolean;
  fins?: boolean;
  snakeHair?: boolean;
  goatLegs?: boolean;
  beard?: boolean;
  fangs?: boolean;
  stinger?: boolean;
  pincers?: boolean;
  wraps?: boolean;
  floating?: boolean;
  element?: ElementKind;
  swarmOf?: 'bat' | 'rat' | 'insect' | 'snake' | 'fish' | 'bird' | 'claw' | 'spider';
  legs?: number;
  frills?: boolean;
  shortLegs?: boolean;
  longLegs?: boolean;
  bulky?: boolean;
  exposedRibs?: boolean;
  wounds?: boolean;
  vines?: boolean;
  acidGlow?: boolean;
  stitched?: boolean;
  chains?: boolean;
  headless?: boolean;
  pauldrons?: boolean;
  ragged?: boolean;
  hunchTilt?: number;
}

export type VariantExtra =
  | 'crest'
  | 'backFins'
  | 'shoulderSpikes'
  | 'armorPlate'
  | 'glowRunes'
  | 'extraEyes'
  | 'mandibles'
  | 'whiskers'
  | 'antennae'
  | 'chinSpikes'
  | 'scars'
  | 'moss'
  | 'crystals'
  | 'belt'
  | 'aura'
  | 'backSpines'
  | 'earrings'
  | 'warpaint'
  | 'bones'
  | 'skullTrophy'
  | 'floatingOrbs'
  | 'tattered'
  | 'barnacles'
  | 'plume';

export interface MonsterVariant {
  pattern: 'none' | 'stripes' | 'spots' | 'bands' | 'plates';
  bodyShape: 0 | 1 | 2 | 3;
  headShape: 0 | 1 | 2 | 3;
  extras: VariantExtra[];
  patternColor: string;
  auraColor: string;
}

export interface MonsterModelSpec {
  key: string;
  name: string;
  archetype: Archetype;
  colors: {
    body: string;
    accent: string;
    detail: string;
    eye: string;
  };
  emissive?: string;
  translucent?: boolean;
  features: MonsterModelFeatures;
  proportions: {
    bulk: number;
    height: number;
    head: number;
    limb: number;
  };
  variant: MonsterVariant;
  seed: number;
}

export interface MonsterModelInput {
  slug?: string;
  name: string;
  nameEn?: string;
  type?: string;
  tokenType?: 'pc' | 'npc' | 'monster' | 'object';
  variantSeed?: string;
}

// --- RNG determinístico ------------------------------------------------------
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Paletas -----------------------------------------------------------------
const COLOR_WORDS: [RegExp, string][] = [
  [/\b(red|vermelh)/, '#b91c1c'],
  [/\b(blue|azul)/, '#1d4ed8'],
  [/\b(black|negr|pret)/, '#1f2433'],
  [/\b(green|verde)/, '#15803d'],
  [/\b(white|branc)/, '#e2e8f0'],
  [/\b(gold|ouro|dourad)/, '#d4a017'],
  [/\b(silver|prata|prateado)/, '#cbd5e1'],
  [/\b(brass|lat[aã]o)/, '#b8860b'],
  [/\b(bronze)/, '#8c6a3a'],
  [/\b(copper|cobre)/, '#b87333'],
  [/\b(purple|p[uú]rpura|roxo|violet|violeta)/, '#7e22ce'],
  [/\b(gray|grey|cinza)/, '#6b7280'],
  [/\b(ochre|ocre)/, '#c2410c'],
  [/\b(blood|sangue)/, '#7f1d1d'],
  [/\b(fire|fogo|flame|chama|hell|infern|magma|efreeti|salamander)/, '#ea580c'],
  [/\b(ice|gelo|frost|winter|inverno|polar|glacial)/, '#7dd3fc'],
  [/\b(shadow|sombra|night|noite|dark|trevas)/, '#312e81'],
  [/\b(bone|osso|skeleton|esqueleto)/, '#e7e5e4'],
  [/\b(iron|ferro)/, '#6b7280'],
  [/\b(stone|pedra|rock|rocha|earth|terra)/, '#78716c'],
  [/\b(clay|argila)/, '#a16207'],
  [/\b(flesh|carne)/, '#d6a28a'],
  [/\b(storm|tempestade|cloud|nuvem)/, '#94a3b8'],
  [/\b(ash|cinzas)/, '#57534e']
];

const TYPE_BASE: Record<string, string> = {
  aberration: '#6d28d9',
  beast: '#8b5e3c',
  celestial: '#fde68a',
  construct: '#64748b',
  dragon: '#b91c1c',
  elemental: '#38bdf8',
  fey: '#4ade80',
  fiend: '#991b1b',
  giant: '#a8a29e',
  humanoid: '#c08a5b',
  monstrosity: '#7c5c3b',
  ooze: '#84cc16',
  plant: '#3f6212',
  undead: '#9ca3af'
};

const SKIN_TONES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0673f'];
const CLOTH_TONES = ['#7f1d1d', '#1e3a8a', '#14532d', '#4c1d95', '#78350f', '#334155', '#0f766e', '#713f12'];

// --- Tipos auxiliares para as regras ----------------------------------------
type Draft = {
  archetype: Archetype;
  body?: string;
  accent?: string;
  detail?: string;
  eye?: string;
  emissive?: string;
  translucent?: boolean;
  features: MonsterModelFeatures;
  bulk?: number;
  height?: number;
  head?: number;
  limb?: number;
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera a especificação do modelo 3D de uma criatura.
 * Determinística: o mesmo monstro sempre gera o mesmo modelo.
 */
export function buildMonsterModelSpec(input: MonsterModelInput): MonsterModelSpec {
  const cleanName = input.name.replace(/\s*#\d+\s*$/, '').trim();
  const en = normalizeText(input.nameEn || '');
  const pt = normalizeText(cleanName);
  const txt = `${en} ${pt}`;
  const type = normalizeText(input.type || '').split(/[\s(]/)[0] || '';
  const key = input.slug || `name:${pt}`;
  const hashSuffix = input.name.match(/#(\d+)\s*$/)?.[1];
  const fullSeedKey = input.variantSeed
    ? `${key}:${input.variantSeed}`
    : hashSuffix && hashSuffix !== '1'
    ? `${key}:#${hashSuffix}`
    : key;
  const seed = hashString(fullSeedKey);
  const rnd = mulberry32(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
  const has = (...words: string[]) =>
    words.some((w) => {
      const exact = w.endsWith('!');
      const core = (exact ? w.slice(0, -1) : w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z0-9])' + core + (exact ? '(?![a-z0-9])' : '')).test(txt);
    });

  const d = classify(txt, type, input.tokenType, has, rnd, pick);

  // Cor por palavra-chave tem prioridade
  let keywordColor: string | undefined;
  for (const [re, color] of COLOR_WORDS) {
    if (re.test(txt)) {
      keywordColor = color;
      break;
    }
  }

  const base = d.body || keywordColor || TYPE_BASE[type] || pick(['#7c5c3b', '#57534e', '#4d7c0f', '#6b21a8']);
  const colors = {
    body: jitterColor(base, rnd, d.body ? 0.03 : 0.06),
    accent: d.accent || jitterColor(shade(base, -0.25), rnd, 0.05),
    detail: d.detail || pick(['#e7e5e4', '#fbbf24', '#1c1917', '#f8fafc', '#a8a29e']),
    eye: d.eye || pick(['#facc15', '#ef4444', '#22d3ee', '#a3e635', '#f97316', '#e879f9'])
  };

  // Variação única por monstro (semente)
  if (d.features.spikes === undefined && rnd() < 0.18 && ['quadruped', 'dragon', 'theropod', 'serpent'].includes(d.archetype)) {
    d.features.spikes = true;
  }
  if (d.features.eyes === undefined && rnd() < 0.08 && ['blob', 'ooze', 'insect', 'spider'].includes(d.archetype)) {
    d.features.eyes = 3 + Math.floor(rnd() * 4);
  }

  return {
    key,
    name: cleanName,
    archetype: d.archetype,
    colors,
    emissive: d.emissive,
    translucent: d.translucent,
    features: d.features,
    proportions: {
      bulk: (d.bulk ?? 1) * (0.82 + rnd() * 0.36),
      height: (d.height ?? 1) * (0.86 + rnd() * 0.28),
      head: (d.head ?? 1) * (0.82 + rnd() * 0.36),
      limb: (d.limb ?? 1) * (0.85 + rnd() * 0.3)
    },
    variant: buildVariant(fullSeedKey, key, d.archetype, d.features, colors.body),
    seed
  };
}

// --- Camada de Variação Única ------------------------------------------------
const INANIMATE: Archetype[] = ['ooze', 'cube', 'elemental', 'wisp', 'swarm', 'sword', 'rug', 'mimic'];
const UPRIGHT: Archetype[] = ['humanoid', 'giant', 'skeleton', 'zombie', 'ghost', 'golem', 'armor', 'naga', 'centaur', 'tree', 'mound'];
const HUMANOID_ONLY: VariantExtra[] = ['belt', 'earrings', 'warpaint', 'skullTrophy', 'tattered', 'armorPlate'];
const CREATURE_ONLY: VariantExtra[] = ['whiskers', 'mandibles', 'antennae', 'backFins', 'barnacles'];
const INANIMATE_OK: VariantExtra[] = ['crystals', 'aura', 'glowRunes', 'floatingOrbs', 'bones', 'moss'];
const ALL_EXTRAS: VariantExtra[] = [
  'crest', 'backFins', 'shoulderSpikes', 'armorPlate', 'glowRunes', 'extraEyes', 'mandibles', 'whiskers',
  'antennae', 'chinSpikes', 'scars', 'moss', 'crystals', 'belt', 'aura', 'backSpines', 'earrings',
  'warpaint', 'bones', 'skullTrophy', 'floatingOrbs', 'tattered', 'barnacles', 'plume'
];
const PATTERN_TONES = ['#fbbf24', '#f8fafc', '#1c1917', '#7f1d1d', '#065f46', '#1e3a8a', '#a16207', '#6d28d9', '#be185d', '#0e7490'];
const AURA_TONES = ['#22d3ee', '#a78bfa', '#f97316', '#4ade80', '#f43f5e', '#facc15', '#38bdf8', '#e879f9'];

export function isUprightArchetype(a: Archetype): boolean {
  return UPRIGHT.includes(a);
}

function buildVariant(seedKey: string, saltKey: string, archetype: Archetype, f: MonsterModelFeatures, bodyColor: string): MonsterVariant {
  const salt = MONSTER_VARIANT_SALTS[saltKey] ?? 0;
  const r = mulberry32(hashString(`${seedKey}::variant::${salt}`));
  const pickV = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];

  let pool: VariantExtra[];
  if (INANIMATE.includes(archetype)) {
    pool = INANIMATE_OK;
  } else if (UPRIGHT.includes(archetype)) {
    pool = ALL_EXTRAS.filter((e) => !CREATURE_ONLY.includes(e) || e === 'backFins');
  } else {
    pool = ALL_EXTRAS.filter((e) => !HUMANOID_ONLY.includes(e));
  }
  if (f.headless) pool = pool.filter((e) => !['crest', 'extraEyes', 'mandibles', 'whiskers', 'antennae', 'chinSpikes', 'earrings', 'warpaint', 'plume'].includes(e));
  if (f.helmet) pool = pool.filter((e) => e !== 'crest' && e !== 'plume');

  const count = INANIMATE.includes(archetype) ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2);
  const extras: VariantExtra[] = [];
  let guard = 0;
  while (extras.length < count && guard++ < 50) {
    const e = pickV(pool);
    if (!extras.includes(e)) extras.push(e);
  }
  extras.sort();

  const patternOptions: MonsterVariant['pattern'][] = INANIMATE.includes(archetype)
    ? ['none', 'spots']
    : ['none', 'stripes', 'spots', 'bands', 'plates'];

  // Cor do padrão contrasta com o corpo
  const [br, bg, bb] = hexToRgb(bodyColor);
  const bodyLum = (br * 299 + bg * 587 + bb * 114) / 1000;
  const tones = PATTERN_TONES.filter((t) => {
    const [tr, tg, tb] = hexToRgb(t);
    return Math.abs((tr * 299 + tg * 587 + tb * 114) / 1000 - bodyLum) > 55;
  });

  return {
    pattern: pickV(patternOptions),
    bodyShape: Math.floor(r() * 4) as MonsterVariant['bodyShape'],
    headShape: Math.floor(r() * 4) as MonsterVariant['headShape'],
    extras,
    patternColor: pickV(tones.length ? tones : PATTERN_TONES),
    auraColor: pickV(AURA_TONES)
  };
}

/**
 * Assinatura visual "grosseira" — dois monstros com a mesma assinatura pareceriam iguais.
 * Usada pelo script de unicidade para garantir que todo o Bestiário tenha modelos distintos.
 */
export function getModelVisualSignature(spec: MonsterModelSpec, includeColor = false): string {
  const [r, g, b] = hexToRgb(spec.colors.body);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    const dd = max - min;
    if (max === r) hue = ((g - b) / dd) % 6;
    else if (max === g) hue = (b - r) / dd + 2;
    else hue = (r - g) / dd + 4;
  }
  const hueBucket = Math.round(((hue * 60 + 360) % 360) / 45);
  const lumBucket = Math.round((max + min) / 2 / 85);
  const feats = Object.entries(spec.features)
    .filter(([, val]) => val !== undefined && val !== false && val !== 0)
    .map(([k, val]) => `${k}=${val}`)
    .sort()
    .join(',');
  const vv = spec.variant;
  return [
    spec.archetype,
    feats,
    `p:${vv.pattern}`,
    `b:${vv.bodyShape}`,
    `h:${vv.headShape}`,
    `x:${vv.extras.join('+')}`,
    includeColor ? `c:${hueBucket}/${lumBucket}` : ''
  ].join('|');
}

function classify(
  txt: string,
  type: string,
  tokenType: MonsterModelInput['tokenType'],
  has: (...w: string[]) => boolean,
  rnd: () => number,
  pick: <T>(arr: T[]) => T
): Draft {
  const F = (features: MonsterModelFeatures = {}): MonsterModelFeatures => features;

  // ---------------- Enxames ----------------
  if (has('swarm', 'enxame')) {
    const swarmOf: MonsterModelFeatures['swarmOf'] = has('bat!', 'morcego')
      ? 'bat'
      : has('rat!', 'rato', 'ratazana')
      ? 'rat'
      : has('snake', 'serpente', 'cobra')
      ? 'snake'
      : has('piranha', 'quipper')
      ? 'fish'
      : has('raven', 'corvo')
      ? 'bird'
      : has('claw', 'garra')
      ? 'claw'
      : has('spider', 'aranha')
      ? 'spider'
      : 'insect';
    return { archetype: 'swarm', features: F({ swarmOf }) };
  }

  // ---------------- Dragões e afins ----------------
  if (has('dragon turtle', 'tartaruga-dragao', 'tartaruga dragao')) {
    return { archetype: 'turtle', body: '#0f766e', features: F({ horns: 'big', spikes: true, tail: true }) };
  }
  if (has('wyvern', 'serpe')) {
    return { archetype: 'wyvern', body: '#4d5b2a', features: F({ wings: 'bat', tail: true, stinger: true, horns: 'small' }) };
  }
  if (has('hydra', 'hidra')) {
    return { archetype: 'hydra', body: '#166534', features: F({ heads: 5, tail: true, spikes: true }) };
  }
  if (has('pseudodragon', 'pseudodragao', 'faerie dragon', 'dragao de fada')) {
    return { archetype: 'dragon', body: '#b45309', features: F({ wings: 'bat', horns: 'small', tail: true, stinger: true }), head: 1.2 };
  }
  if (has('half-dragon', 'meio-dragao', 'half-red', 'meio dragao', 'dragonborn', 'draconato')) {
    return {
      archetype: 'humanoid',
      body: has('red', 'vermelh') ? '#b91c1c' : '#a16207',
      features: F({ snout: 'lizard', horns: 'small', tail: true, weapon: 'sword', shield: true })
    };
  }
  if (has('dragon', 'dragao') || type === 'dragon') {
    const ancient = has('ancient', 'ancia', 'anciao');
    const wyrmling = has('wyrmling', 'filhote');
    return {
      archetype: 'dragon',
      features: F({
        wings: 'bat',
        horns: ancient ? 'big' : has('blue', 'azul') ? 'single' : has('gold', 'ouro', 'dourado') ? 'curved' : 'small',
        tail: true,
        spikes: ancient || has('black', 'negro', 'green', 'verde', 'red', 'vermelho'),
        frills: has('bronze', 'silver', 'prata', 'brass', 'latao'),
        longNeck: true
      }),
      head: wyrmling ? 1.35 : 1,
      bulk: ancient ? 1.15 : wyrmling ? 0.85 : 1
    };
  }

  // ---------------- Olhos / Aberrações ----------------
  if (has('beholder', 'occuloid', 'spectator', 'observador', 'contemplador')) {
    return { archetype: 'eyeTyrant', features: F({ eyes: 10, fangs: true, floating: true }) };
  }
  if (has('gibbering', 'mouther', 'balbuciante')) {
    return { archetype: 'blob', body: '#be8f74', features: F({ eyes: 9, fangs: true }) };
  }
  if (has('aboleth')) {
    return { archetype: 'fish', body: '#3f6e7a', features: F({ tentacles: 4, eyes: 3, fins: true }), bulk: 1.3 };
  }
  if (has('cloaker', 'manto')) {
    return { archetype: 'bat', body: '#1c1917', features: F({ wings: 'bat', eyes: 2, tail: true }) };
  }
  if (has('darkmantle', 'manto escuro')) {
    return { archetype: 'cephalopod', body: '#292524', features: F({ tentacles: 6 }) };
  }
  if (has('mind flayer', 'devorador de mentes', 'illithid')) {
    return { archetype: 'humanoid', body: '#a78bfa', features: F({ tentacles: 4, robe: true }) };
  }

  // ---------------- Gosmas ----------------
  if (has('gelatinous cube', 'cubo gelatinoso')) {
    return { archetype: 'cube', body: '#7dd3fc', translucent: true, features: F() };
  }
  if (has('ooze', 'pudding', 'jelly', 'slime', 'gosma', 'pudim', 'geleia', 'lodo', 'excremental') || type === 'ooze') {
    return {
      archetype: 'ooze',
      body: has('black', 'negro', 'preto') ? '#1f2937' : has('gray', 'cinza') ? '#6b7280' : has('ochre', 'ocre') ? '#c2410c' : has('excremental') ? '#713f12' : '#84cc16',
      translucent: true,
      features: F({ eyes: has('excremental') ? 2 : 0 })
    };
  }

  // ---------------- Elementais ----------------
  if (has('will-o', 'fogo-fatuo', 'fogo fatuo', 'wisp')) {
    return { archetype: 'wisp', body: '#a5f3fc', emissive: '#67e8f9', features: F({ floating: true }) };
  }
  const element: ElementKind | undefined = has('magma', 'magmin', 'lava')
    ? 'magma'
    : has('steam', 'vapor')
    ? 'steam'
    : has('dust!', 'poeira')
    ? 'dust'
    : has('ice', 'gelo', 'frost')
    ? 'ice'
    : has('fire', 'fogo', 'flame', 'chama')
    ? 'fire'
    : has('water', 'agua')
    ? 'water'
    : has('air!', 'do ar!', 'wind', 'vento')
    ? 'air'
    : has('earth', 'terra', 'xorn')
    ? 'earth'
    : has('lightning', 'thunder', 'trovao', 'relampago', 'storm')
    ? 'lightning'
    : undefined;

  if (has('mephit', 'mefite')) {
    return {
      archetype: 'humanoid',
      features: F({ wings: 'bat', horns: 'small', element: element || 'fire', earsPointy: true }),
      emissive: element === 'fire' || element === 'magma' ? '#f97316' : undefined,
      height: 0.8,
      head: 1.3
    };
  }
  if (has('elemental', 'fusion') || type === 'elemental') {
    if (has('salamander', 'salamandra')) {
      return { archetype: 'naga', body: '#c2410c', emissive: '#f97316', features: F({ spikes: true, weapon: 'spear', element: 'fire' }) };
    }
    if (has('azer')) {
      return { archetype: 'humanoid', body: '#b45309', emissive: '#f97316', features: F({ beard: true, weapon: 'axe', element: 'fire' }), bulk: 1.2 };
    }
    if (has('djinni', 'genio', 'efreeti', 'marid', 'dao!')) {
      return {
        archetype: 'humanoid',
        body: has('efreeti') ? '#b91c1c' : '#60a5fa',
        features: F({ floating: true, element: has('efreeti') ? 'fire' : 'air', weapon: 'sword', crown: true, beard: true }),
        bulk: 1.3
      };
    }
    if (has('xorn')) {
      return { archetype: 'blob', body: '#78716c', features: F({ eyes: 3, fangs: true, arms: 3, element: 'earth' }) };
    }
    if (has('invisible stalker', 'perseguidor invisivel')) {
      return { archetype: 'elemental', body: '#e0f2fe', translucent: true, features: F({ element: 'air' }) };
    }
    return {
      archetype: 'elemental',
      features: F({ element: element || pick<ElementKind>(['fire', 'water', 'air', 'earth']) })
    };
  }

  // ---------------- Constructos ----------------
  if (has('animated armor', 'armadura animada', 'tin soldier', 'soldado de lata')) {
    return { archetype: 'armor', body: has('tin', 'lata') ? '#94a3b8' : '#64748b', features: F({ weapon: 'sword', shield: true, helmet: true }) };
  }
  if (has('flying sword', 'espada voadora', 'phantasmal sword', 'espada fantasmagorica', 'espada fantasma')) {
    return { archetype: 'sword', body: '#cbd5e1', features: F({ floating: true }) };
  }
  if (has('rug!', 'tapete')) {
    return { archetype: 'rug', body: '#7f1d1d', features: F() };
  }
  if (has('mimic', 'mimico', 'jack, in-a-box', 'jack in a box', 'animated rattle', 'chocalho')) {
    return { archetype: 'mimic', body: '#78350f', features: F({ fangs: true }) };
  }
  if (has('wooden horse', 'cavalo de madeira')) {
    return { archetype: 'quadruped', body: '#a16207', features: F({ snout: 'horse', mane: true, tail: true }) };
  }
  if (has('golem', 'shield guardian', 'guardiao escudo', 'marionette', 'marionete', 'homunculus', 'homunculo') || type === 'construct') {
    if (has('homunculus', 'homunculo')) {
      return { archetype: 'humanoid', body: '#65a30d', features: F({ wings: 'bat', earsPointy: true }), height: 0.8, head: 1.3 };
    }
    return {
      archetype: 'golem',
      body: has('iron', 'ferro')
        ? '#4b5563'
        : has('stone', 'pedra')
        ? '#78716c'
        : has('clay', 'argila')
        ? '#a16207'
        : has('flesh', 'carne')
        ? '#c4a08a'
        : has('bone', 'osso')
        ? '#e7e5e4'
        : has('ash!', 'cinza')
        ? '#44403c'
        : has('marionette', 'marionete')
        ? '#b45309'
        : undefined,
      emissive: has('iron', 'ferro', 'ash!', 'cinza') ? '#f97316' : '#22d3ee',
      features: F({ bulky: !has('marionette', 'marionete') })
    };
  }

  // ---------------- Plantas ----------------
  if (has('treant', 'tree', 'arvore', 'shrub', 'arbusto', 'bramble', 'espinheiro', 'blight')) {
    return {
      archetype: 'tree',
      body: '#5b3a1e',
      accent: has('bramble', 'espinheiro') ? '#3f6212' : '#15803d',
      features: F({ spikes: has('bramble', 'espinheiro', 'blight') }),
      height: has('shrub', 'arbusto') ? 0.55 : 1
    };
  }
  if (has('fungus', 'fungo', 'shrieker', 'guinchador', 'myconid', 'miconideo', 'violet', 'violeta', 'mushroom', 'cogumelo')) {
    return {
      archetype: 'fungus',
      body: '#e7e5e4',
      accent: has('violet', 'violeta') ? '#7e22ce' : has('shrieker', 'guinchador') ? '#a16207' : '#b91c1c',
      features: F({ tentacles: has('violet', 'violeta') ? 4 : 0, eyes: has('myconid', 'miconideo') ? 2 : 0 })
    };
  }
  if (has('shambling', 'monte', 'mound')) {
    return { archetype: 'mound', body: '#3f6212', features: F({ eyes: 2 }) };
  }

  // ---------------- Mortos-vivos ----------------
  if (has('ghost shark', 'tubarao fantasma')) {
    return {
      archetype: 'fish',
      body: '#7dd3fc',
      eye: '#22d3ee',
      emissive: '#38bdf8',
      translucent: true,
      features: F({ fins: true, fangs: true }),
      bulk: 1.15
    };
  }
  if (has('froghoul', 'sapocarnical')) {
    return {
      archetype: 'frog',
      body: '#4b6b43',
      accent: '#2f3d29',
      eye: '#ef4444',
      features: F({ fangs: true, wounds: true, spikes: true, bulky: true }),
      bulk: 1.2
    };
  }
  if (has('spider skull', 'cranio aranha')) {
    return {
      archetype: 'spider',
      body: '#e7e5e4',
      accent: '#1f2937',
      eye: '#ef4444',
      features: F({ eyes: 6, spikes: true, fangs: true })
    };
  }
  if (has('flameskull', 'cranio flamejante')) {
    return {
      archetype: 'wisp',
      body: '#e7e5e4',
      eye: '#f97316',
      emissive: '#f97316',
      features: F({ floating: true, element: 'fire' })
    };
  }
  if (has('headless', 'sem cabeca', 'holofrenes')) {
    return {
      archetype: 'zombie',
      body: '#4b5563',
      accent: '#7f1d1d',
      eye: '#38bdf8',
      emissive: '#38bdf8',
      features: F({
        headless: true,
        cape: true,
        pauldrons: true,
        weapon: 'axe',
        chains: true,
        exposedRibs: true
      }),
      bulk: 1.15
    };
  }
  if (has('metal-head', 'cabeca-de-metal', 'cabeca de metal')) {
    const isSkel = has('skeleton', 'esqueleto');
    const isMum = has('mummy', 'mumia', 'mumias');
    return {
      archetype: isSkel ? 'skeleton' : 'zombie',
      body: isSkel ? '#e7e5e4' : isMum ? '#d6c7a1' : '#5e7356',
      accent: '#64748b',
      eye: '#f97316',
      features: F({
        helmet: true,
        pauldrons: true,
        spikes: true,
        chains: true,
        wraps: isMum,
        crown: isMum,
        weapon: pick(['axe', 'sword']),
        shield: !isMum && rnd() < 0.5
      }),
      bulk: 1.15
    };
  }
  if (has('ivylash', 'de hera', 'hera', 'cadaver fly', 'skuz')) {
    return {
      archetype: 'zombie',
      body: '#4d6b3c',
      accent: '#15803d',
      eye: '#a3e635',
      features: F({
        vines: true,
        exposedRibs: true,
        wounds: true,
        spikes: has('fly-trap', 'hera', 'ivylash'),
        ragged: true,
        hunchTilt: 0.16
      })
    };
  }
  if (has('acid', 'acido', 'cuspidor', 'skulking cyst', 'cisto')) {
    return {
      archetype: 'zombie',
      body: '#5f7d3a',
      accent: '#365314',
      eye: '#bef264',
      emissive: '#84cc16',
      features: F({
        acidGlow: true,
        bulky: true,
        wounds: true,
        exposedRibs: true,
        fangs: true,
        hunchTilt: -0.15
      }),
      bulk: 1.2
    };
  }
  if (has('stitched', 'remendada', 'zombesta', 'zombeast', 'cleavergaunt')) {
    return {
      archetype: 'zombie',
      body: '#7a8a6e',
      accent: '#6b3b3b',
      eye: '#facc15',
      features: F({
        stitched: true,
        exposedRibs: true,
        wounds: true,
        bulky: true,
        chains: true,
        weapon: 'axe',
        pauldrons: has('cleavergaunt')
      }),
      bulk: 1.35,
      height: 1.18
    };
  }
  if (has('bog drowned', 'afogado', 'pantano')) {
    return {
      archetype: 'zombie',
      body: '#476b6b',
      accent: '#1e3a3a',
      eye: '#22d3ee',
      features: F({
        vines: true,
        fins: true,
        bulky: true,
        ragged: true,
        wounds: true,
        chains: true,
        hunchTilt: 0.14
      }),
      bulk: 1.15
    };
  }
  if (has('tentaghoul')) {
    return {
      archetype: 'zombie',
      body: '#6e7366',
      accent: '#4c1d95',
      eye: '#e879f9',
      features: F({
        tentacles: 4,
        fangs: true,
        exposedRibs: true,
        wounds: true,
        ragged: true
      })
    };
  }
  if (has('skeleton', 'esqueleto', 'gashadokuro', 'skeletal pillar', 'pilar esqueletico')) {
    if (has('horse', 'cavalo')) return { archetype: 'quadruped', body: '#e7e5e4', features: F({ snout: 'horse' }), bulk: 0.7 };
    const burning = has('burning', 'flamejante', 'flameskull');
    return {
      archetype: 'skeleton',
      body: '#e7e5e4',
      eye: burning ? '#fb923c' : '#22d3ee',
      emissive: burning ? '#f97316' : undefined,
      features: F({
        horns: has('minotaur', 'minotauro') ? 'bull' : undefined,
        helmet: has('armed', 'armado') || rnd() < 0.3,
        pauldrons: has('armed', 'armado', 'gashadokuro'),
        element: burning ? 'fire' : undefined,
        weapon: pick(['sword', 'spear', 'bow', 'axe']),
        shield: rnd() < 0.5
      }),
      height: has('minotaur', 'minotauro') ? 1.3 : has('gashadokuro', 'pillar', 'pilar') ? 1.45 : 1,
      bulk: has('gashadokuro') ? 1.35 : 1
    };
  }
  if (has('zombie', 'zumbi')) {
    return zombieDraft(has, pick, rnd);
  }
  if (has('ghost', 'fantasma', 'specter', 'espectro', 'wraith', 'aparicao', 'shadow', 'sombra', 'banshee', 'poltergeist', 'boogie', 'bicho-papao', 'bicho papao', 'fear gorta', 'geist', 'penumbra', 'blue scream', 'grito azul', 'spirit', 'espirito')) {
    const chained = has('chainer', 'encadeado');
    return {
      archetype: 'ghost',
      body: has('blue', 'azul')
        ? '#3b82f6'
        : has('shadow', 'sombra', 'wraith', 'aparicao', 'boogie', 'penumbra')
        ? '#1e1b4b'
        : '#cbd5e1',
      eye: has('wraith', 'aparicao', 'chainer') ? '#ef4444' : '#67e8f9',
      translucent: true,
      features: F({
        hood: has('wraith', 'aparicao', 'boogie', 'fear gorta'),
        floating: true,
        chains: chained,
        tentacles: has('penumbra') ? 4 : undefined
      })
    };
  }
  if (has('lich!')) {
    return { archetype: 'skeleton', body: '#d6d3d1', eye: '#22d3ee', emissive: '#22d3ee', features: F({ robe: true, crown: true, pauldrons: true, weapon: 'staff' }) };
  }
  if (has('mummy', 'mumia')) {
    return { archetype: 'zombie', body: '#d6c7a1', accent: '#78350f', eye: '#22c55e', features: F({ wraps: true, crown: has('lord!', 'senhor'), exposedRibs: false, pauldrons: has('lord!', 'senhor'), weapon: has('lord!', 'senhor') ? 'staff' : undefined }) };
  }
  if (has('vampire', 'vampir', 'pietr')) {
    if (has('familiar')) return { archetype: 'bat', body: '#292524', features: F({ wings: 'bat' }) };
    return { archetype: 'humanoid', body: '#e5e7eb', accent: '#7f1d1d', eye: '#dc2626', features: F({ cape: true, fangs: true, earsPointy: true, pauldrons: has('vampire', 'vampir') && !has('spawn', 'cria') }) };
  }
  if (has('ghoul', 'carnical', 'ghast!', 'lividus', 'wight', 'inumano', 'revenant', 'revenante', 'wendigo', 'walker', 'caminhante', 'dust wight', 'corpo seco')) {
    const isWight = has('wight', 'inumano', 'walker', 'caminhante', 'revenant');
    const isDust = has('dust!', 'poeira', 'corpo seco');
    return {
      archetype: 'zombie',
      body: has('wendigo') ? '#d6d3d1' : isDust ? '#a1866f' : isWight ? '#64748b' : '#78716c',
      accent: isWight ? '#334155' : '#4a3525',
      eye: isWight ? '#38bdf8' : '#ef4444',
      features: F({
        fangs: true,
        horns: has('wendigo') ? 'antlers' : undefined,
        weapon: isWight ? pick(['sword', 'axe', 'spear']) : undefined,
        helmet: has('walker', 'caminhante'),
        pauldrons: isWight,
        cape: has('revenant'),
        exposedRibs: !isWight || rnd() < 0.5,
        wounds: true,
        ragged: !isWight
      }),
      height: has('wendigo') ? 1.3 : 1
    };
  }
  if (has('necrodancer', 'necrodancarino', 'dreyfus', 'historiador', 'historian')) {
    return {
      archetype: 'zombie',
      body: '#8b9d83',
      accent: has('necrodancer', 'necrodancarino') ? '#6d28d9' : '#78350f',
      eye: '#e879f9',
      features: F({
        robe: true,
        cape: has('necrodancer', 'necrodancarino'),
        crown: has('necrodancer', 'necrodancarino'),
        hood: has('dreyfus', 'historiador', 'historian'),
        weapon: 'staff',
        exposedRibs: true
      })
    };
  }
  if (has('grave titan', 'tita sepulcral', 'tita do tumulo', 'tita tumular')) {
    return { archetype: 'giant', body: '#57534e', eye: '#22d3ee', features: F({ weapon: 'club', spikes: true, pauldrons: true, exposedRibs: true, chains: true }), bulk: 1.4 };
  }

  // ---------------- Artrópodes ----------------
  if (has('drider')) {
    return { archetype: 'spider', body: '#1f2937', features: F({ arms: 2, weapon: 'sword' }) };
  }
  if (has('ettercap')) {
    return { archetype: 'humanoid', body: '#57534e', features: F({ fangs: true, eyes: 4 }), bulk: 0.9 };
  }
  if (has('phase spider', 'aranha de fase')) {
    return { archetype: 'spider', body: '#312e81', emissive: '#818cf8', features: F({ eyes: 8 }) };
  }
  if (has('spider', 'aranha')) {
    return { archetype: 'spider', body: has('wolf', 'lobo') ? '#78716c' : '#1f2937', features: F({ eyes: 8 }) };
  }
  if (has('scorpion', 'escorpiao')) {
    return { archetype: 'scorpion', body: '#78350f', features: F({ pincers: true, stinger: true }) };
  }
  if (has('centipede', 'centopeia')) {
    return { archetype: 'centipede', body: '#7c2d12', features: F() };
  }
  if (has('crab', 'caranguejo', 'chuul')) {
    return { archetype: 'crab', body: has('chuul') ? '#365314' : '#c2410c', features: F({ pincers: true, tentacles: has('chuul') ? 4 : 0 }) };
  }
  if (has('ankheg', 'beetle', 'besouro', 'rust monster', 'monstro da ferrugem')) {
    return {
      archetype: 'insect',
      body: has('fire', 'fogo') ? '#7f1d1d' : has('rust', 'ferrugem') ? '#b45309' : has('stag', 'cervo') ? '#292524' : '#4d3b1f',
      emissive: has('fire', 'fogo') ? '#f97316' : undefined,
      features: F({ pincers: has('ankheg', 'stag', 'cervo'), shell: true, tentacles: has('rust', 'ferrugem') ? 2 : 0 }),
      bulk: has('ankheg', 'rust', 'ferrugem') ? 1.3 : 1
    };
  }
  if (has('wasp', 'vespa', 'fly!', 'mosca', 'stirge', 'estirge', 'bee!', 'abelha', 'leech', 'sanguessuga', 'mosquito', 'insect', 'inseto')) {
    return {
      archetype: 'insect',
      body: has('wasp', 'vespa', 'bee!', 'abelha') ? '#ca8a04' : has('stirge', 'estirge') ? '#7f1d1d' : '#334155',
      features: F({ wings: 'insect', stinger: has('wasp', 'vespa', 'bee!', 'abelha'), beak: has('stirge', 'estirge') })
    };
  }
  if (has('frog', 'sapo', 'toad')) {
    return { archetype: 'frog', body: has('toad', 'sapo') ? '#78716c' : '#4d7c0f', features: F() };
  }

  // ---------------- Serpentes / Vermes ----------------
  if (has('purple worm', 'verme purpura', 'remorhaz', 'grick', 'worm', 'verme')) {
    return {
      archetype: 'worm',
      body: has('purple', 'purpura') ? '#6b21a8' : has('remorhaz') ? '#1e40af' : '#57534e',
      emissive: has('remorhaz') ? '#f97316' : undefined,
      features: F({ fangs: true, spikes: has('remorhaz'), tentacles: has('grick') ? 4 : 0, legs: has('remorhaz') ? 12 : 0 })
    };
  }
  if (has('behir')) {
    return { archetype: 'centipede', body: '#1d4ed8', emissive: '#93c5fd', features: F({ horns: 'big', legs: 12 }), bulk: 1.3 };
  }
  if (has('naga', 'lamia', 'yuan-ti', 'marilith')) {
    return {
      archetype: 'naga',
      body: has('marilith') ? '#7f1d1d' : has('lamia') ? '#c08a5b' : has('spirit', 'espiritual') ? '#1f2937' : '#0f766e',
      features: F({
        arms: has('marilith') ? 6 : 2,
        weapon: has('marilith', 'yuan-ti') ? 'sword' : undefined,
        crown: has('guardian', 'guardia'),
        horns: has('marilith') ? 'small' : undefined
      })
    };
  }
  if (has('couatl')) {
    return { archetype: 'serpent', body: '#16a34a', features: F({ wings: 'feather', frills: true }) };
  }
  if (has('snake', 'serpente', 'cobra', 'constrictor', 'constritora', 'serpent')) {
    return {
      archetype: 'serpent',
      body: has('flying', 'voadora') ? '#0d9488' : pick(['#3f6212', '#713f12', '#14532d', '#a16207', '#57534e']),
      features: F({ fangs: true, wings: has('flying', 'voadora') ? 'feather' : undefined }),
      bulk: has('giant', 'gigante', 'constrictor', 'constritora') ? 1.3 : 1
    };
  }

  // ---------------- Aquáticos ----------------
  if (has('kraken', 'octopus', 'polvo', 'squid', 'lula')) {
    return { archetype: 'cephalopod', body: has('kraken') ? '#365314' : '#be185d', features: F({ tentacles: 8, eyes: 2 }), bulk: has('kraken') ? 1.4 : 1 };
  }
  if (has('archelon', 'tortoise', 'tartaruga', 'turtle', 'tortle')) {
    if (has('tortle')) return { archetype: 'humanoid', body: '#4d7c0f', features: F({ shell: true, weapon: 'spear' }) };
    return { archetype: 'turtle', body: '#365314', features: F({ fins: true }) };
  }
  if (has('shark', 'tubarao', 'whale', 'baleia', 'orca', 'piranha', 'quipper', 'fish', 'peixe', 'seahorse', 'sea horse', 'cavalo-marinho', 'cavalo marinho', 'plesiosaur', 'slothshark')) {
    const isSeahorse = has('seahorse', 'sea horse', 'cavalo-marinho', 'cavalo marinho');
    return {
      archetype: isSeahorse ? 'serpent' : 'fish',
      body: has('killer', 'orca') ? '#111827' : has('whale', 'baleia') ? '#334155' : has('piranha', 'quipper') ? '#b91c1c' : isSeahorse ? '#f59e0b' : '#64748b',
      accent: has('killer', 'orca') ? '#f8fafc' : undefined,
      features: F({ fins: true, fangs: has('shark', 'tubarao', 'piranha', 'quipper', 'slothshark'), longNeck: has('plesiosaur'), frills: isSeahorse }),
      bulk: has('whale', 'baleia', 'giant', 'gigante') ? 1.4 : 1
    };
  }
  if (has('merfolk', 'tritao', 'sereia', 'merrow', 'sahuagin', 'kuo-toa')) {
    return {
      archetype: 'naga',
      body: has('sahuagin') ? '#065f46' : has('merrow') ? '#365314' : has('kuo-toa') ? '#4b5563' : '#0e7490',
      features: F({ weapon: 'trident', fins: true, fangs: has('sahuagin', 'merrow') })
    };
  }

  // ---------------- Voadores ----------------
  if (has('bat!', 'morcego')) {
    return { archetype: 'bat', body: '#292524', features: F({ wings: 'bat', earsPointy: true }), bulk: has('giant', 'gigante') ? 1.3 : 1 };
  }
  if (has('harpy', 'harpia')) {
    return { archetype: 'humanoid', body: '#c08a5b', accent: '#57534e', features: F({ wings: 'feather', goatLegs: true }) };
  }
  if (has('vrock')) {
    return { archetype: 'humanoid', body: '#57534e', features: F({ wings: 'feather', beak: true, goatLegs: true }), bulk: 1.2 };
  }
  if (has('kenku', 'aven', 'aarakocra')) {
    return { archetype: 'humanoid', body: '#1f2937', features: F({ beak: true, wings: has('aven', 'aarakocra') ? 'feather' : undefined, weapon: 'dagger' }) };
  }
  if (has('cockatrice', 'cocatriz')) {
    return { archetype: 'bird', body: '#a16207', features: F({ beak: true, tail: true, wings: 'feather', shortLegs: false }) };
  }
  if (has('axe beak', 'bico de machado', 'bico-de-machado')) {
    return { archetype: 'bird', body: '#78350f', features: F({ beak: true, longLegs: true }), bulk: 1.2 };
  }
  if (has('pteranodon', 'pteranodonte')) {
    return { archetype: 'bird', body: '#a16207', features: F({ beak: true, wings: 'bat', horns: 'single' }) };
  }
  if (has('eagle', 'aguia', 'hawk', 'falcao', 'owl!', 'coruja', 'raven', 'corvo', 'vulture', 'abutre', 'roc!', 'thunderhawk', 'terrahawk', 'gaviao', 'bird', 'passaro')) {
    return {
      archetype: 'bird',
      body: has('raven', 'corvo') ? '#111827' : has('owl!', 'coruja') ? '#a8a29e' : has('vulture', 'abutre') ? '#44403c' : has('thunder') ? '#1e40af' : has('blood', 'sangue') ? '#7f1d1d' : '#78350f',
      emissive: has('thunder') ? '#93c5fd' : undefined,
      features: F({ beak: true, wings: 'feather', earsPointy: has('owl!', 'coruja') }),
      head: has('owl!', 'coruja') ? 1.35 : 1,
      bulk: has('roc!', 'giant', 'gigante') ? 1.3 : 1
    };
  }

  // ---------------- Dinossauros ----------------
  if (has('tyrannosaurus', 'tiranossauro', 'allosaurus', 'alossauro')) {
    return { archetype: 'theropod', body: has('allosaurus', 'alossauro') ? '#713f12' : '#4d5b2a', features: F({ fangs: true, tail: true }) };
  }

  // ---------------- Híbridos & Monstruosidades ----------------
  if (has('centaur', 'centauro')) {
    return { archetype: 'centaur', body: '#7c4a21', features: F({ weapon: pick(['bow', 'spear']), tail: true }) };
  }
  if (has('chimera', 'quimera')) {
    return { archetype: 'quadruped', body: '#a16207', features: F({ heads: 3, wings: 'bat', mane: true, horns: 'curved', tail: true, snout: 'feline' }) };
  }
  if (has('manticore', 'manticora')) {
    return { archetype: 'quadruped', body: '#9a3412', features: F({ wings: 'bat', mane: true, tail: true, spikes: true, snout: 'ape' }) };
  }
  if (has('griffon', 'grifo', 'hippogriff', 'hipogrifo')) {
    return { archetype: 'quadruped', body: has('hippo', 'hipo') ? '#a8a29e' : '#a16207', features: F({ wings: 'feather', beak: true, tail: true }) };
  }
  if (has('pegasus', 'pegaso')) {
    return { archetype: 'quadruped', body: '#f8fafc', features: F({ wings: 'feather', snout: 'horse', mane: true, tail: true }) };
  }
  if (has('unicorn', 'unicornio')) {
    return { archetype: 'quadruped', body: '#f8fafc', accent: '#fde68a', features: F({ horns: 'single', snout: 'horse', mane: true, tail: true }) };
  }
  if (has('nightmare', 'pesadelo')) {
    return { archetype: 'quadruped', body: '#111827', emissive: '#f97316', features: F({ snout: 'horse', mane: true, tail: true, element: 'fire' }) };
  }
  if (has('owlbear', 'urso-coruja', 'urso coruja')) {
    return { archetype: 'quadruped', body: '#78350f', features: F({ beak: true, bulky: true, earsPointy: true }), bulk: 1.3 };
  }
  if (has('sphinx', 'esfinge')) {
    return { archetype: 'centaur', body: '#d4a017', features: F({ wings: 'feather', crown: true, mane: true, tail: true }) };
  }
  if (has('basilisk', 'basilisco')) {
    return { archetype: 'quadruped', body: '#4d7c0f', features: F({ snout: 'lizard', spikes: true, tail: true, legs: 8, shortLegs: true }) };
  }
  if (has('gorgon', 'gorgona', 'khalkotauroi')) {
    return { archetype: 'quadruped', body: has('khalkotauroi') ? '#b45309' : '#57534e', emissive: has('khalkotauroi') ? '#f97316' : undefined, features: F({ snout: 'bull', horns: 'bull', tail: true, bulky: true }) };
  }
  if (has('bulette')) {
    return { archetype: 'quadruped', body: '#475569', features: F({ shell: true, fangs: true, spikes: true, shortLegs: true, bulky: true }) };
  }
  if (has('displacer', 'deslocador')) {
    return { archetype: 'quadruped', body: '#1e1b4b', features: F({ snout: 'feline', tentacles: 2, tail: true }) };
  }
  if (has('otyugh')) {
    return { archetype: 'blob', body: '#57534e', features: F({ tentacles: 3, fangs: true, eyes: 1, legs: 3 }) };
  }
  if (has('roper!', 'pegajoso', 'caçador das profundezas')) {
    return { archetype: 'fungus', body: '#57534e', accent: '#57534e', features: F({ tentacles: 6, eyes: 1, fangs: true }) };
  }
  if (has('gargoyle', 'gargula')) {
    return { archetype: 'humanoid', body: '#57534e', features: F({ wings: 'bat', horns: 'curved', tail: true, fangs: true }), bulk: 1.1 };
  }
  if (has('hell hound', 'cao infernal', 'cao do inferno')) {
    return { archetype: 'quadruped', body: '#1c1917', emissive: '#f97316', features: F({ snout: 'canine', earsPointy: true, tail: true, element: 'fire' }) };
  }
  if (has('death dog', 'cao da morte')) {
    return { archetype: 'quadruped', body: '#44403c', features: F({ snout: 'canine', heads: 2, tail: true, earsPointy: true }) };
  }

  // ---------------- Humanoides especiais ----------------
  if (has('minotaur', 'minotauro')) {
    return { archetype: 'humanoid', body: '#78350f', features: F({ snout: 'bull', horns: 'bull', weapon: 'axe', tail: true }), bulk: 1.35, height: 1.2 };
  }
  if (has('medusa')) {
    return { archetype: 'humanoid', body: '#4d7c0f', features: F({ snakeHair: true, weapon: 'bow', robe: true }) };
  }
  if (has('satyr', 'satiro')) {
    return { archetype: 'humanoid', body: '#c08a5b', features: F({ goatLegs: true, horns: 'curved', earsPointy: true, beard: true }) };
  }
  if (has('dryad', 'driade')) {
    return { archetype: 'humanoid', body: '#4d7c0f', accent: '#15803d', features: F({ robe: true, earsPointy: true }) };
  }
  if (has('sprite', 'pixie', 'fada', 'gift of aldanach')) {
    return { archetype: 'humanoid', body: '#a7f3d0', emissive: '#86efac', features: F({ wings: 'insect', earsPointy: true, weapon: 'dagger' }), height: 0.75, head: 1.25 };
  }
  if (has('hag!', 'bruxa', 'megera')) {
    return {
      archetype: 'humanoid',
      body: has('green', 'verde') ? '#4d7c0f' : has('sea!', 'mar!') ? '#0f766e' : has('night', 'noturna', 'noite') ? '#312e81' : '#57534e',
      features: F({ hood: true, robe: true, weapon: 'staff' })
    };
  }
  if (has('gnoll')) {
    return { archetype: 'humanoid', body: '#a16207', features: F({ snout: 'canine', earsPointy: true, weapon: pick(['spear', 'axe', 'bow']), tail: true }) };
  }
  if (has('jackalwere', 'khenra', 'werewolf', 'lobisomem')) {
    return { archetype: 'humanoid', body: '#57534e', features: F({ snout: 'canine', earsPointy: true, tail: true, fangs: true }), bulk: 1.15 };
  }
  if (has('werebear', 'urso-lobisomem', 'homem-urso')) {
    return { archetype: 'humanoid', body: '#78350f', features: F({ snout: 'canine', earsRound: true, bulky: true }), bulk: 1.4 };
  }
  if (has('wereboar', 'homem-javali')) {
    return { archetype: 'humanoid', body: '#57534e', features: F({ snout: 'boar', tusks: true, weapon: 'axe' }), bulk: 1.25 };
  }
  if (has('wererat', 'homem-rato')) {
    return { archetype: 'humanoid', body: '#78716c', features: F({ snout: 'canine', earsRound: true, tail: true, weapon: 'dagger' }), bulk: 0.9 };
  }
  if (has('weretiger', 'homem-tigre')) {
    return { archetype: 'humanoid', body: '#ea580c', features: F({ snout: 'feline', earsPointy: true, tail: true }), bulk: 1.15 };
  }
  if (has('kobold')) {
    return { archetype: 'humanoid', body: '#b45309', features: F({ snout: 'lizard', tail: true, horns: 'small', weapon: pick(['spear', 'dagger']) }), height: 0.75 };
  }
  if (has('lizardfolk', 'povo lagarto', 'homem-lagarto')) {
    return { archetype: 'humanoid', body: '#4d7c0f', features: F({ snout: 'lizard', tail: true, weapon: 'spear', shield: true, frills: true }) };
  }
  if (has('bugbear')) {
    return { archetype: 'humanoid', body: '#a16207', features: F({ earsPointy: true, fangs: true, weapon: 'club', bulky: true }), bulk: 1.3, height: 1.2 };
  }
  if (has('hobgoblin')) {
    return { archetype: 'humanoid', body: '#c2410c', features: F({ earsPointy: true, weapon: 'sword', shield: true, helmet: true }) };
  }
  if (has('goblin', 'greblin')) {
    return {
      archetype: 'humanoid',
      body: '#65a30d',
      features: F({ earsPointy: true, weapon: has('boss', 'chefe') ? 'sword' : pick(['dagger', 'bow', 'spear']), crown: has('boss', 'chefe'), fangs: true }),
      height: 0.75,
      head: 1.3
    };
  }
  if (has('orc!', 'orque!') && !has('half-orc', 'meio-orc')) {
    return { archetype: 'humanoid', body: '#4d7c0f', features: F({ tusks: true, weapon: 'axe', earsPointy: true }), bulk: 1.2 };
  }
  if (has('troll')) {
    if (has('limb', 'membro')) return { archetype: 'blob', body: '#3f6212', features: F({ arms: 1 }) };
    return { archetype: 'giant', body: '#3f6212', features: F({ earsPointy: true, fangs: true, spikes: true }), bulk: 0.95, limb: 1.25 };
  }
  if (has('ettin')) {
    return { archetype: 'giant', body: '#a16207', features: F({ heads: 2, weapon: 'club', tusks: true }) };
  }
  if (has('ogre', 'ogro')) {
    return { archetype: 'giant', body: '#a16207', features: F({ weapon: 'club', tusks: true }), bulk: 1.25 };
  }
  if (has('oni!')) {
    return { archetype: 'giant', body: '#1d4ed8', features: F({ horns: 'small', weapon: 'sword', tusks: true }) };
  }
  if (has('cyclops', 'ciclope')) {
    return { archetype: 'giant', body: '#a8a29e', features: F({ eyes: 1, weapon: 'club' }) };
  }
  if (has('giant', 'gigante') && (type === 'giant' || has('hill', 'colina', 'stone', 'pedra', 'frost', 'gelo', 'fire', 'fogo', 'cloud', 'nuvem', 'storm', 'tempestade'))) {
    return {
      archetype: 'giant',
      body: has('fire', 'fogo') ? '#7f1d1d' : has('frost', 'gelo') ? '#bae6fd' : has('stone', 'pedra') ? '#78716c' : has('cloud', 'nuvem') ? '#e2e8f0' : has('storm', 'tempestade') ? '#5b7aa3' : '#c08a5b',
      features: F({
        weapon: has('fire', 'fogo', 'storm', 'tempestade', 'cloud', 'nuvem') ? 'sword' : has('frost', 'gelo') ? 'axe' : 'club',
        beard: has('frost', 'gelo', 'fire', 'fogo', 'storm', 'tempestade'),
        helmet: has('fire', 'fogo', 'frost', 'gelo'),
        crown: has('storm', 'tempestade', 'cloud', 'nuvem')
      })
    };
  }
  if (has('tarrasque')) {
    return { archetype: 'theropod', body: '#4d5b2a', features: F({ horns: 'big', spikes: true, shell: true, fangs: true, tail: true }), bulk: 1.4 };
  }

  // ---------------- Bestas comuns (quadrúpedes) ----------------
  const beast = beastDraft(has, pick);
  if (beast) return beast;

  // ---------------- Infernais & Celestiais ----------------
  if (type === 'fiend' || has('demon', 'demonio', 'devil', 'diabo', 'imp!', 'diabrete', 'quasit', 'balor', 'pit fiend', 'succubus', 'sucubo', 'incubus', 'incubo', 'rakshasa', 'glabrezu', 'hezrou', 'nalfeshnee', 'lemure', 'dretch', 'erinyes', 'erinia', 'quill devil', 'fallen angel', 'anjo caido')) {
    if (has('lemure')) return { archetype: 'ooze', body: '#9f1239', translucent: false, features: F({ eyes: 2 }) };
    const small = has('imp!', 'diabrete', 'quasit', 'dretch');
    return {
      archetype: has('balor', 'pit fiend', 'glabrezu', 'nalfeshnee', 'hezrou') ? 'giant' : 'humanoid',
      body: has('rakshasa')
        ? '#ea580c'
        : has('ice', 'gelo')
        ? '#bae6fd'
        : has('bone', 'osso')
        ? '#e7e5e4'
        : has('erinyes', 'erinia', 'succubus', 'sucubo', 'incubus', 'incubo', 'fallen', 'caido')
        ? '#c08a5b'
        : has('hezrou', 'dretch')
        ? '#4d7c0f'
        : has('chain', 'corrente')
        ? '#57534e'
        : '#991b1b',
      emissive: has('balor', 'pit fiend') ? '#f97316' : undefined,
      features: F({
        horns: has('rakshasa') ? undefined : has('balor', 'horned', 'chifrudo', 'pit fiend') ? 'big' : 'curved',
        wings: has('balor', 'pit fiend', 'imp!', 'diabrete', 'succubus', 'sucubo', 'incubus', 'incubo', 'nalfeshnee') ? 'bat' : has('erinyes', 'erinia', 'fallen', 'caido') ? 'feather' : undefined,
        tail: !has('erinyes', 'erinia', 'fallen', 'caido'),
        weapon: has('balor') ? 'sword' : has('erinyes', 'erinia', 'fallen', 'caido') ? 'sword' : has('barbed', 'farpado', 'bearded', 'barbado', 'horned', 'chifrudo') ? 'trident' : undefined,
        pincers: has('glabrezu'),
        arms: has('glabrezu') ? 4 : undefined,
        snout: has('rakshasa') ? 'feline' : has('nalfeshnee', 'hezrou') ? 'boar' : undefined,
        spikes: has('barbed', 'farpado', 'quill', 'espinho', 'chain', 'corrente'),
        beard: has('bearded', 'barbado'),
        robe: has('rakshasa'),
        fangs: true
      }),
      height: small ? 0.75 : 1,
      head: small ? 1.25 : 1,
      bulk: has('hezrou', 'nalfeshnee') ? 1.4 : 1
    };
  }
  if (type === 'celestial' || has('deva!', 'planetar', 'solar!', 'angel', 'anjo', 'empyrean')) {
    return {
      archetype: has('planetar', 'solar!', 'empyrean') ? 'giant' : 'humanoid',
      body: has('planetar') ? '#4ade80' : has('solar!') ? '#fbbf24' : '#e2e8f0',
      accent: '#f8fafc',
      emissive: '#fde68a',
      features: F({ wings: 'feather', halo: true, weapon: has('solar!', 'planetar') ? 'sword' : 'staff', robe: !has('solar!') })
    };
  }

  // ---------------- Humanoides genéricos (NPCs) ----------------
  if (type === 'humanoid' || tokenType === 'npc' || tokenType === 'pc') {
    return humanoidDraft(has, pick, rnd);
  }

  // ---------------- Fallback por tipo ----------------
  switch (type) {
    case 'beast':
      return { archetype: 'quadruped', features: F({ tail: true, snout: pick(['canine', 'feline', 'boar']) }) };
    case 'monstrosity':
      return { archetype: 'quadruped', features: F({ spikes: true, tail: true, fangs: true, horns: pick(['small', 'curved', undefined]) as MonsterModelFeatures['horns'] }) };
    case 'aberration':
      return { archetype: 'blob', features: F({ eyes: 3 + Math.floor(rnd() * 5), tentacles: 2 + Math.floor(rnd() * 4), fangs: true }) };
    case 'plant':
      return { archetype: 'tree', body: '#5b3a1e', accent: '#15803d', features: F() };
    case 'construct':
      return { archetype: 'golem', features: F({ bulky: true }) };
    case 'undead':
      return zombieDraft(has, pick, rnd);
    case 'giant':
      return { archetype: 'giant', features: F({ weapon: 'club' }) };
    case 'fey':
      return { archetype: 'humanoid', body: '#86efac', features: F({ wings: 'insect', earsPointy: true }), height: 0.8 };
    default:
      return humanoidDraft(has, pick, rnd);
  }
}

function beastDraft(has: (...w: string[]) => boolean, pick: <T>(arr: T[]) => T): Draft | null {
  const F = (f: MonsterModelFeatures) => f;
  if (has('blink dog', 'cao intermitente', 'cao piscante')) return { archetype: 'quadruped', body: '#fbbf24', emissive: '#fde68a', features: F({ snout: 'canine', earsPointy: true, tail: true }) };
  if (has('winter wolf', 'lobo invernal', 'lobo do inverno')) return { archetype: 'quadruped', body: '#e2e8f0', features: F({ snout: 'canine', earsPointy: true, tail: true, element: 'ice' }), bulk: 1.2 };
  if (has('worg', 'dire wolf', 'lobo atroz', 'wolf', 'lobo', 'jackal', 'chacal', 'mastiff', 'mastim', 'dog!', 'cao!', 'hyena', 'hiena', 'coyote', 'coiote', 'fox!', 'raposa'))
    return {
      archetype: 'quadruped',
      body: has('worg') ? '#292524' : has('hyena', 'hiena') ? '#a16207' : has('jackal', 'chacal', 'fox!', 'raposa') ? '#c2410c' : has('mastiff', 'mastim', 'dog!') ? '#78350f' : '#6b7280',
      features: F({ snout: 'canine', earsPointy: true, tail: true, spikes: has('hyena', 'hiena') ? undefined : undefined }),
      bulk: has('dire', 'atroz', 'worg', 'giant', 'gigante') ? 1.2 : 1
    };
  if (has('saber', 'sabre', 'lion', 'leao', 'tiger', 'tigre', 'panther', 'pantera', 'cat!', 'gato', 'leopard', 'leopardo'))
    return {
      archetype: 'quadruped',
      body: has('panther', 'pantera') ? '#111827' : has('tiger', 'tigre', 'saber', 'sabre') ? '#ea580c' : has('cat!', 'gato') ? pick(['#78716c', '#c2410c', '#1f2937', '#e7e5e4']) : '#ca8a04',
      features: F({ snout: 'feline', earsPointy: true, tail: true, mane: has('lion', 'leao'), tusks: has('saber', 'sabre') })
    };
  if (has('bear', 'urso'))
    return {
      archetype: 'quadruped',
      body: has('polar') ? '#f1f5f9' : has('black', 'negro', 'preto') ? '#1f2937' : '#78350f',
      features: F({ snout: 'canine', earsRound: true, bulky: true, shortLegs: true }),
      bulk: 1.3
    };
  if (has('boar', 'javali', 'pig!', 'porco')) return { archetype: 'quadruped', body: '#57534e', features: F({ snout: 'boar', tusks: true, spikes: true, shortLegs: true, tail: true }) };
  if (has('warhorse', 'cavalo de guerra', 'horse', 'cavalo', 'pony', 'ponei', 'mule', 'mula', 'donkey', 'burro'))
    return {
      archetype: 'quadruped',
      body: pick(['#78350f', '#1c1917', '#a8a29e', '#92400e', '#e7e5e4']),
      features: F({ snout: 'horse', mane: true, tail: true, longLegs: true, helmet: has('warhorse', 'guerra') }),
      bulk: has('pony', 'ponei') ? 0.8 : 1
    };
  if (has('camel', 'camelo')) return { archetype: 'quadruped', body: '#c2a26b', features: F({ snout: 'horse', longLegs: true, longNeck: true, spikes: false, shell: false, tail: true }) };
  if (has('elephant', 'elefante', 'mammoth', 'mamute'))
    return { archetype: 'quadruped', body: has('mammoth', 'mamute') ? '#78350f' : '#78716c', features: F({ trunk: true, tusks: true, earsRound: true, bulky: true, mane: has('mammoth', 'mamute') }), bulk: 1.4 };
  if (has('rhinoceros', 'rinoceronte')) return { archetype: 'quadruped', body: '#78716c', features: F({ horns: 'single', bulky: true, shortLegs: true, tail: true }), bulk: 1.3 };
  if (has('hippopotamus', 'hipopotamo')) return { archetype: 'quadruped', body: '#8b7280', features: F({ bulky: true, shortLegs: true, tusks: true, earsRound: true }), bulk: 1.4 };
  if (has('triceratops', 'triceratopo')) return { archetype: 'quadruped', body: '#4d7c0f', features: F({ horns: 'big', frills: true, bulky: true, tail: true }), bulk: 1.4 };
  if (has('ankylosaurus', 'anquilossauro')) return { archetype: 'quadruped', body: '#713f12', features: F({ shell: true, spikes: true, tail: true, shortLegs: true, bulky: true }), bulk: 1.3 };
  if (has('deer', 'cervo', 'veado', 'elk!', 'alce', 'stag'))
    return { archetype: 'quadruped', body: '#92400e', features: F({ snout: 'horse', horns: 'antlers', longLegs: true, tail: true }), bulk: has('giant', 'gigante') ? 1.2 : 1 };
  if (has('goat', 'bode', 'cabra', 'ram!', 'carneiro', 'sheep', 'ovelha'))
    return { archetype: 'quadruped', body: '#d6d3d1', features: F({ snout: 'horse', horns: 'curved', beard: true, tail: true }) };
  if (has('ox!', 'boi', 'bull!', 'touro', 'cow!', 'vaca', 'aurochs', 'bison', 'bisao'))
    return { archetype: 'quadruped', body: '#57534e', features: F({ snout: 'bull', horns: 'bull', bulky: true, tail: true }), bulk: 1.2 };
  if (has('ape!', 'macaco', 'baboon', 'babuino', 'gorilla', 'gorila', 'hadozee'))
    return { archetype: 'humanoid', body: '#44403c', features: F({ snout: 'ape', bulky: true, earsRound: true }), bulk: has('giant', 'gigante') ? 1.5 : 1.2, limb: 1.2 };
  if (has('badger', 'texugo', 'weasel', 'doninha', 'rat!', 'rato', 'otter', 'lontra'))
    return {
      archetype: 'quadruped',
      body: has('badger', 'texugo') ? '#44403c' : has('weasel', 'doninha') ? '#a16207' : '#78716c',
      features: F({ snout: 'canine', earsRound: true, tail: true, shortLegs: true })
    };
  if (has('crocodile', 'crocodilo', 'alligator', 'jacare', 'lizard', 'lagarto', 'fern lizard'))
    return {
      archetype: 'quadruped',
      body: has('crocodile', 'crocodilo', 'alligator', 'jacare') ? '#365314' : '#4d7c0f',
      features: F({ snout: 'lizard', tail: true, shortLegs: true, spikes: has('crocodile', 'crocodilo') }),
      bulk: has('giant', 'gigante') ? 1.3 : 1
    };
  return null;
}

function zombieDraft(has: (...w: string[]) => boolean, pick: <T>(arr: T[]) => T, rnd: () => number): Draft {
  const isOgre = has('ogre', 'ogro');
  const skin = pick(['#6b8f5e', '#6f7e6b', '#7d6b57', '#5a6e7a', '#705868', '#566b4c']);
  const cloth = pick(['#3f2e21', '#334155', '#4a2525', '#273c33', '#44403c']);
  const weaponChoices: MonsterModelFeatures['weapon'][] = ['club', 'axe', 'dagger', 'sword', undefined, undefined];
  return {
    archetype: 'zombie',
    body: skin,
    accent: cloth,
    eye: pick(['#facc15', '#ef4444', '#a3e635', '#22d3ee']),
    features: {
      exposedRibs: rnd() < 0.7,
      wounds: rnd() < 0.8,
      ragged: true,
      fangs: true,
      chains: rnd() < 0.35,
      helmet: !isOgre && rnd() < 0.25,
      pauldrons: !isOgre && rnd() < 0.22,
      stitched: isOgre || rnd() < 0.2,
      weapon: isOgre ? 'club' : pick(weaponChoices),
      shield: !isOgre && rnd() < 0.12,
      hunchTilt: (rnd() - 0.5) * 0.42
    },
    bulk: isOgre ? 1.55 : 0.92 + rnd() * 0.22,
    height: isOgre ? 1.3 : 0.94 + rnd() * 0.12
  };
}

function humanoidDraft(has: (...w: string[]) => boolean, pick: <T>(arr: T[]) => T, rnd: () => number): Draft {
  const F = (f: MonsterModelFeatures) => f;
  const cloth = pick(CLOTH_TONES);
  const skin = pick(SKIN_TONES);
  if (has('archmage', 'arquimago', 'mage', 'mago', 'wizard', 'feiticeiro', 'sorcerer', 'warlock', 'bruxo', 'necromancer', 'necromante', 'evoker', 'evocador'))
    return { archetype: 'humanoid', body: skin, accent: has('necro') ? '#1c1917' : cloth, features: F({ robe: true, hood: rnd() < 0.5, weapon: 'staff', beard: has('arch', 'arqui') }) };
  if (has('priest', 'sacerdote', 'acolyte', 'acolito', 'cleric', 'clerigo'))
    return { archetype: 'humanoid', body: skin, accent: '#f8fafc', features: F({ robe: true, weapon: 'staff', pauldrons: has('cleric', 'clerigo'), halo: false }) };
  if (has('cult', 'culto', 'cultista', 'fanatic', 'fanatico'))
    return { archetype: 'humanoid', body: skin, accent: '#7f1d1d', features: F({ robe: true, hood: true, weapon: 'dagger' }) };
  if (has('druid', 'druida'))
    return { archetype: 'humanoid', body: skin, accent: '#15803d', features: F({ robe: true, weapon: 'staff', horns: 'antlers' }) };
  if (has('ranger', 'patrulheiro'))
    return { archetype: 'humanoid', body: skin, accent: '#14532d', features: F({ hood: true, cape: true, weapon: 'bow', pauldrons: false }) };
  if (has('bard', 'bardo'))
    return { archetype: 'humanoid', body: skin, accent: '#7e22ce', features: F({ cape: true, weapon: 'dagger' }) };
  if (has('monk', 'monge'))
    return { archetype: 'humanoid', body: skin, accent: '#b45309', features: F({ robe: true, weapon: 'staff' }) };
  if (has('knight', 'cavaleiro', 'paladin', 'paladino', 'guard', 'guarda', 'captain', 'capitao', 'veteran', 'veterano', 'soldier', 'soldado', 'warrior', 'guerreiro', 'infantry', 'infantaria', 'gladiator', 'gladiador', 'champion', 'campeao'))
    return {
      archetype: 'humanoid',
      body: skin,
      accent: has('knight', 'cavaleiro', 'paladin') ? '#94a3b8' : cloth,
      features: F({
        helmet: true,
        pauldrons: true,
        shield: !has('gladiator', 'gladiador') || rnd() < 0.5,
        weapon: has('gladiator', 'gladiador') ? 'spear' : pick(['sword', 'sword', 'axe', 'spear']),
        cape: has('captain', 'capitao', 'knight', 'cavaleiro', 'paladin', 'paladino')
      }),
      bulk: 1.1
    };
  if (has('berserker', 'barbarian', 'barbaro', 'tribal'))
    return { archetype: 'humanoid', body: skin, accent: '#78350f', features: F({ weapon: 'axe', beard: rnd() < 0.6, horns: has('berserker') ? 'small' : undefined }), bulk: 1.2 };
  if (has('assassin', 'assassino', 'spy', 'espiao', 'thief', 'ladrao', 'rogue', 'ladino', 'bandit', 'bandido', 'thug', 'brutamontes', 'tough!', 'pirate', 'pirata', 'scout', 'batedor', 'explorador', 'jack!'))
    return {
      archetype: 'humanoid',
      body: skin,
      accent: has('assassin', 'assassino', 'spy', 'espiao') ? '#1c1917' : cloth,
      features: F({
        hood: has('assassin', 'assassino', 'spy', 'espiao', 'bandit', 'bandido', 'scout', 'batedor'),
        weapon: has('scout', 'batedor', 'explorador') ? 'bow' : has('thug', 'brutamontes', 'tough!') ? 'club' : has('pirate', 'pirata') ? 'sword' : 'dagger',
        cape: has('captain', 'capitao'),
        beard: has('pirate', 'pirata') && rnd() < 0.7
      })
    };
  if (has('noble', 'nobre', 'king!', 'rei!', 'queen', 'rainha', 'prince', 'princip', 'lord!', 'lorde'))
    return { archetype: 'humanoid', body: skin, accent: '#7e22ce', features: F({ crown: true, cape: true, weapon: 'sword' }) };
  if (has('dwarf', 'anao', 'duergar'))
    return { archetype: 'humanoid', body: has('duergar') ? '#6b7280' : skin, accent: cloth, features: F({ beard: true, helmet: true, weapon: 'axe', shield: true }), height: 0.8, bulk: 1.25 };
  if (has('drow', 'elf', 'elfo', 'half-elf', 'meio-elfo'))
    return { archetype: 'humanoid', body: has('drow') ? '#3b3654' : skin, accent: cloth, features: F({ earsPointy: true, weapon: pick(['bow', 'sword', 'dagger']), cape: true }) };
  if (has('gnome', 'gnomo', 'halfling', 'svirfneblin'))
    return { archetype: 'humanoid', body: has('svirfneblin', 'deep') ? '#78716c' : skin, accent: cloth, features: F({ earsPointy: has('gnome', 'gnomo', 'svirfneblin'), weapon: 'dagger', hood: rnd() < 0.5 }), height: 0.7, head: 1.25 };
  if (has('half-orc', 'meio-orc'))
    return { archetype: 'humanoid', body: '#84a96b', accent: cloth, features: F({ tusks: true, weapon: 'axe' }), bulk: 1.15 };
  if (has('goliath', 'golias', 'firbolg'))
    return { archetype: 'humanoid', body: has('goliath', 'golias') ? '#a8a29e' : '#7aa0c4', accent: cloth, features: F({ weapon: 'club', beard: has('firbolg') }), bulk: 1.3, height: 1.15 };
  if (has('tiefling'))
    return { archetype: 'humanoid', body: '#b91c1c', accent: cloth, features: F({ horns: 'curved', tail: true, weapon: 'dagger' }) };
  if (has('aasimar'))
    return { archetype: 'humanoid', body: skin, accent: '#f8fafc', emissive: '#fde68a', features: F({ halo: true, weapon: 'sword' }) };
  if (has('warforged', 'forjado'))
    return { archetype: 'golem', body: '#64748b', features: F({ weapon: 'sword' }), bulk: 0.8 };
  if (has('genasi', 'changeling', 'metamorfo', 'doppelganger'))
    return { archetype: 'humanoid', body: has('water', 'agua') ? '#38bdf8' : '#d6d3d1', accent: cloth, features: F({ earsPointy: false, weapon: 'dagger' }) };
  if (has('commoner', 'plebeu', 'camponês', 'campones', 'aldeao', 'villager'))
    return { archetype: 'humanoid', body: skin, accent: pick(['#78350f', '#713f12', '#57534e']), features: F({ weapon: pick(['club', 'staff']) }) };
  if (has('spring heeled', 'salto de mola'))
    return { archetype: 'humanoid', body: '#1c1917', eye: '#ef4444', features: F({ cape: true, horns: 'small', goatLegs: true }) };
  return {
    archetype: 'humanoid',
    body: skin,
    accent: cloth,
    features: F({ weapon: pick(['sword', 'dagger', 'spear', 'axe', 'staff', 'bow']), helmet: rnd() < 0.3, hood: rnd() < 0.25, beard: rnd() < 0.3 })
  };
}

// --- Utilidades de cor -------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (amount >= 0) {
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  }
  return rgbToHex(r * (1 + amount), g * (1 + amount), b * (1 + amount));
}

function jitterColor(hex: string, rnd: () => number, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const j = () => (rnd() * 2 - 1) * 255 * amt;
  return rgbToHex(r + j(), g + j(), b + j());
}
