// =============================================================================
// Construtor de Modelos 3D Low-Poly (Three.js) — Aetheria VTT
// Transforma uma MonsterModelSpec em um THREE.Group com malhas reais.
// Convenções: chão em y = 0, criatura olhando para +Z, altura típica ~1.6 unidades.
// =============================================================================
import * as THREE from 'three';
import { isUprightArchetype, MonsterModelSpec, mulberry32, shade } from './monsterModelSpec';

type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);

interface Ctx {
  g: THREE.Group;
  spec: MonsterModelSpec;
  rnd: () => number;
  m: {
    body: THREE.Material;
    accent: THREE.Material;
    detail: THREE.Material;
    eye: THREE.Material;
    metal: THREE.Material;
    dark: THREE.Material;
    bone: THREE.Material;
    wood: THREE.Material;
    cloth: THREE.Material;
    membrane: THREE.Material;
    glow: THREE.Material;
    wound: THREE.Material;
    vine: THREE.Material;
    acid: THREE.Material;
  };
  animated: THREE.Object3D[];
  anchors?: Anchors;
}

interface Anchors {
  head: V3;
  headR: number;
  body: V3;
  bodyR: number;
  bodyLen: number;
  upright: boolean;
}

function std(color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  // Sombreamento suave + leve brilho de verniz (estilo miniatura pintada)
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.06, flatShading: false, ...o });
}

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, s?: V3, r?: V3): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(p);
  if (s) m.scale.copy(s);
  if (r) m.rotation.set(r.x, r.y, r.z);
  parent.add(m);
  return m;
}

// Geometrias com mais subdivisões para superfícies mais lisas e silhuetas arredondadas
const sph = (r: number, d = 1) => new THREE.IcosahedronGeometry(r, Math.min(3, d + 1));
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, s = 10) => new THREE.CylinderGeometry(rt, rb, h, Math.max(s, 12));
const cone = (r: number, h: number, s = 7) => new THREE.ConeGeometry(r, h, Math.max(s, 8));

/** Cilindro conectando dois pontos (membros, pescoços, caudas). */
function limb(parent: THREE.Object3D, a: V3, b: V3, rA: number, mat: THREE.Material, rB = rA, seg = 8): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(0.0001, dir.length());
  const m = new THREE.Mesh(cyl(rB, rA, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
  return m;
}

/** Cone apontando de "base" para "tip". */
function spike(parent: THREE.Object3D, base: V3, tip: V3, r: number, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(tip, base);
  const len = Math.max(0.0001, dir.length());
  const m = new THREE.Mesh(cone(r, len, 5), mat);
  m.position.copy(base).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
  return m;
}

/** Cadeia suave de segmentos (cauda, tentáculo, pescoço de serpente). */
function chain(parent: THREE.Object3D, pts: V3[], r0: number, r1: number, mat: THREE.Material): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = i / (pts.length - 1);
    const t1 = (i + 1) / (pts.length - 1);
    const ra = r0 + (r1 - r0) * t0;
    const rb = r0 + (r1 - r0) * t1;
    limb(parent, pts[i], pts[i + 1], ra, mat, rb);
    mesh(parent, sph(rb, 0), mat, pts[i + 1]);
  }
}

function curvePts(a: V3, ctrl: V3, b: V3, n: number): V3[] {
  const curve = new THREE.QuadraticBezierCurve3(a, ctrl, b);
  return curve.getPoints(n);
}

// --- Partes reutilizáveis -----------------------------------------------------

function eyes(c: Ctx, head: V3, r: number, count = 2, forward = 1): void {
  const n = Math.max(1, count);
  if (n === 1) {
    mesh(c.g, sph(r * 0.32, 1), c.m.detail, v(head.x, head.y + r * 0.15, head.z + r * 0.82 * forward));
    mesh(c.g, sph(r * 0.17, 1), c.m.eye, v(head.x, head.y + r * 0.15, head.z + r * 1.05 * forward));
    return;
  }
  for (let i = 0; i < n; i++) {
    const t = n === 2 ? (i === 0 ? -1 : 1) : (i / (n - 1)) * 2 - 1;
    const row = n > 4 ? (i % 2) * 0.22 : 0;
    const x = head.x + t * r * 0.42;
    const y = head.y + r * (0.18 + row);
    const z = head.z + r * 0.84 * forward;
    mesh(c.g, sph(r * (n > 4 ? 0.1 : 0.15), 0), c.m.eye, v(x, y, z));
  }
}

function horns(c: Ctx, head: V3, r: number, kind: NonNullable<MonsterModelSpec['features']['horns']>): void {
  const mat = c.m.bone;
  if (kind === 'single') {
    spike(c.g, v(head.x, head.y + r * 0.6, head.z + r * 0.55), v(head.x, head.y + r * 1.7, head.z + r * 1.1), r * 0.16, mat);
    return;
  }
  for (const s of [-1, 1]) {
    if (kind === 'antlers') {
      const base = v(head.x + s * r * 0.4, head.y + r * 0.7, head.z);
      const top = v(head.x + s * r * 1.1, head.y + r * 1.9, head.z - r * 0.2);
      limb(c.g, base, top, r * 0.07, mat, r * 0.05);
      limb(c.g, base.clone().lerp(top, 0.45), v(head.x + s * r * 0.4, head.y + r * 1.75, head.z + r * 0.3), r * 0.05, mat, r * 0.03);
      limb(c.g, base.clone().lerp(top, 0.75), v(head.x + s * r * 1.55, head.y + r * 1.7, head.z + r * 0.1), r * 0.05, mat, r * 0.03);
    } else if (kind === 'curved') {
      const pts = curvePts(
        v(head.x + s * r * 0.45, head.y + r * 0.65, head.z),
        v(head.x + s * r * 1.2, head.y + r * 1.4, head.z - r * 0.6),
        v(head.x + s * r * 0.9, head.y + r * 0.7, head.z - r * 1.0),
        5
      );
      chain(c.g, pts, r * 0.16, r * 0.04, mat);
    } else if (kind === 'bull') {
      const pts = curvePts(
        v(head.x + s * r * 0.6, head.y + r * 0.5, head.z),
        v(head.x + s * r * 1.5, head.y + r * 0.6, head.z + r * 0.1),
        v(head.x + s * r * 1.3, head.y + r * 1.3, head.z + r * 0.35),
        5
      );
      chain(c.g, pts, r * 0.15, r * 0.03, mat);
    } else {
      const big = kind === 'big';
      spike(
        c.g,
        v(head.x + s * r * 0.4, head.y + r * 0.6, head.z - r * 0.1),
        v(head.x + s * r * (big ? 0.85 : 0.6), head.y + r * (big ? 1.9 : 1.3), head.z - r * (big ? 0.9 : 0.5)),
        r * (big ? 0.2 : 0.13),
        mat
      );
    }
  }
}

function snout(c: Ctx, head: V3, r: number, kind: NonNullable<MonsterModelSpec['features']['snout']>, mat: THREE.Material): V3 {
  const len = kind === 'lizard' || kind === 'horse' ? 1.0 : kind === 'canine' || kind === 'bull' ? 0.75 : kind === 'boar' ? 0.6 : 0.45;
  const tip = v(head.x, head.y - r * 0.2, head.z + r * (0.6 + len));
  limb(c.g, v(head.x, head.y - r * 0.05, head.z + r * 0.4), tip, r * 0.5, mat, r * (kind === 'feline' || kind === 'ape' ? 0.42 : 0.3));
  mesh(c.g, sph(r * 0.12, 0), c.m.dark, v(tip.x, tip.y + r * 0.08, tip.z + r * 0.08));
  return tip;
}

function ears(c: Ctx, head: V3, r: number, pointy: boolean, mat: THREE.Material): void {
  for (const s of [-1, 1]) {
    if (pointy) {
      spike(c.g, v(head.x + s * r * 0.55, head.y + r * 0.45, head.z), v(head.x + s * r * 1.05, head.y + r * 1.05, head.z - r * 0.2), r * 0.18, mat);
    } else {
      mesh(c.g, sph(r * 0.28, 0), mat, v(head.x + s * r * 0.7, head.y + r * 0.6, head.z - r * 0.05), v(1, 1, 0.45));
    }
  }
}

/** Asas: morcego (membrana), pena (leque) ou inseto (translúcidas). */
function wings(c: Ctx, at: V3, span: number, kind: 'bat' | 'feather' | 'insect', side = 1): void {
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.copy(at);
    if (kind === 'bat') {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(span * 0.35, span * 0.55);
      shape.lineTo(span, span * 0.42);
      shape.lineTo(span * 0.82, span * 0.05);
      shape.lineTo(span * 0.62, span * 0.18);
      shape.lineTo(span * 0.48, -span * 0.12);
      shape.lineTo(span * 0.3, span * 0.05);
      shape.lineTo(span * 0.12, -span * 0.25);
      shape.lineTo(0, 0);
      const geo = new THREE.ShapeGeometry(shape);
      const memb = new THREE.Mesh(geo, c.m.membrane);
      memb.scale.x = s;
      wing.add(memb);
      limb(wing, v(0, 0, 0), v(s * span * 0.35, span * 0.55, 0), span * 0.035, c.m.accent);
      limb(wing, v(s * span * 0.35, span * 0.55, 0), v(s * span, span * 0.42, 0), span * 0.025, c.m.accent);
    } else if (kind === 'feather') {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const len = span * (1 - t * 0.45);
        const ang = 0.15 + t * 0.9;
        const f = new THREE.Mesh(box(len, span * 0.1, span * 0.03), i % 2 ? c.m.accent : c.m.body);
        f.position.set(s * Math.cos(ang) * len * 0.5, Math.sin(ang) * len * 0.5 - t * span * 0.15, -t * span * 0.04);
        f.rotation.z = s * ang;
        wing.add(f);
      }
    } else {
      for (const k of [0, 1]) {
        const w = new THREE.Mesh(sph(span * 0.5, 1), c.m.membrane);
        w.scale.set(1, 0.06, 0.38);
        w.position.set(s * span * 0.5, k * -span * 0.12, -k * span * 0.15);
        w.rotation.z = s * (0.35 - k * 0.3);
        wing.add(w);
      }
    }
    wing.rotation.y = s * -0.35 * side;
    wing.userData.flap = s;
    c.g.add(wing);
    c.animated.push(wing);
  }
}

function tailChain(c: Ctx, from: V3, length: number, r: number, mat: THREE.Material, stinger = false, lift = 0.2): void {
  const end = v(from.x + (c.rnd() - 0.5) * length * 0.4, Math.max(0.08, from.y - length * 0.25 + lift * length), from.z - length);
  const ctrl = v(from.x, from.y + length * 0.1, from.z - length * 0.55);
  const pts = curvePts(from, ctrl, end, 6);
  chain(c.g, pts, r, r * 0.25, mat);
  if (stinger) spike(c.g, end, v(end.x, end.y + length * 0.2, end.z - length * 0.15), r * 0.6, c.m.bone);
}

function backSpikes(c: Ctx, from: V3, to: V3, height: number, n = 5): void {
  for (let i = 0; i < n; i++) {
    const p = from.clone().lerp(to, i / Math.max(1, n - 1));
    spike(c.g, p, v(p.x, p.y + height * (1 - Math.abs(i / (n - 1) - 0.4) * 0.6), p.z - height * 0.25), height * 0.3, c.m.accent);
  }
}

function weapon(c: Ctx, hand: V3, kind: NonNullable<MonsterModelSpec['features']['weapon']>, scale = 1): void {
  const s = scale;
  const h = hand;
  switch (kind) {
    case 'sword':
      mesh(c.g, box(0.08 * s, 0.74 * s, 0.025 * s), c.m.metal, v(h.x, h.y + 0.44 * s, h.z + 0.05));
      mesh(c.g, cone(0.055 * s, 0.16 * s, 4), c.m.metal, v(h.x, h.y + 0.89 * s, h.z + 0.05), v(1, 1, 0.45), v(0, Math.PI / 4, 0));
      mesh(c.g, box(0.26 * s, 0.045 * s, 0.07 * s), c.m.detail, v(h.x, h.y + 0.06 * s, h.z + 0.05));
      mesh(c.g, cyl(0.025 * s, 0.025 * s, 0.16 * s, 6), c.m.wood, v(h.x, h.y - 0.04 * s, h.z + 0.05));
      mesh(c.g, sph(0.04 * s, 0), c.m.detail, v(h.x, h.y - 0.13 * s, h.z + 0.05));
      break;
    case 'dagger':
      mesh(c.g, box(0.05 * s, 0.28 * s, 0.02 * s), c.m.metal, v(h.x, h.y + 0.18 * s, h.z + 0.05));
      mesh(c.g, cone(0.036 * s, 0.1 * s, 4), c.m.metal, v(h.x, h.y + 0.37 * s, h.z + 0.05), v(1, 1, 0.4), v(0, Math.PI / 4, 0));
      mesh(c.g, box(0.14 * s, 0.03 * s, 0.045 * s), c.m.detail, v(h.x, h.y + 0.04 * s, h.z + 0.05));
      break;
    case 'axe':
      limb(c.g, v(h.x, h.y - 0.16 * s, h.z), v(h.x, h.y + 0.78 * s, h.z), 0.026 * s, c.m.wood);
      mesh(c.g, cyl(0.045 * s, 0.045 * s, 0.12 * s, 8), c.m.metal, v(h.x, h.y + 0.62 * s, h.z));
      mesh(c.g, box(0.035 * s, 0.26 * s, 0.24 * s), c.m.metal, v(h.x, h.y + 0.62 * s, h.z + 0.12 * s));
      mesh(c.g, cone(0.08 * s, 0.14 * s, 4), c.m.metal, v(h.x, h.y + 0.62 * s, h.z + 0.27 * s), v(0.4, 1.8, 1), v(Math.PI / 2, 0, 0));
      break;
    case 'club':
      limb(c.g, v(h.x, h.y - 0.12 * s, h.z), v(h.x, h.y + 0.72 * s, h.z + 0.05), 0.038 * s, c.m.wood, 0.095 * s);
      mesh(c.g, cyl(0.11 * s, 0.09 * s, 0.14 * s, 8), c.m.metal, v(h.x, h.y + 0.6 * s, h.z + 0.04));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        spike(c.g, v(h.x + Math.cos(a) * 0.09 * s, h.y + 0.6 * s, h.z + 0.04 + Math.sin(a) * 0.09 * s), v(h.x + Math.cos(a) * 0.17 * s, h.y + 0.62 * s, h.z + 0.04 + Math.sin(a) * 0.17 * s), 0.025 * s, c.m.metal);
      }
      break;
    case 'staff':
      limb(c.g, v(h.x, 0.02, h.z), v(h.x, h.y + 0.54 * s, h.z), 0.026 * s, c.m.wood);
      mesh(c.g, sph(0.075 * s, 1), c.m.glow, v(h.x, h.y + 0.62 * s, h.z));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        limb(c.g, v(h.x, h.y + 0.52 * s, h.z), v(h.x + Math.cos(a) * 0.09 * s, h.y + 0.64 * s, h.z + Math.sin(a) * 0.09 * s), 0.015 * s, c.m.metal, 0.008 * s);
      }
      break;
    case 'spear':
    case 'trident':
      limb(c.g, v(h.x, h.y - 0.5 * s, h.z), v(h.x, h.y + 0.95 * s, h.z), 0.022 * s, c.m.wood);
      mesh(c.g, cyl(0.032 * s, 0.032 * s, 0.08 * s, 8), c.m.metal, v(h.x, h.y + 0.92 * s, h.z));
      if (kind === 'spear') {
        spike(c.g, v(h.x, h.y + 0.95 * s, h.z), v(h.x, h.y + 1.2 * s, h.z), 0.05 * s, c.m.metal);
      } else {
        for (const o of [-0.075, 0, 0.075]) spike(c.g, v(h.x + o * s, h.y + 0.95 * s, h.z), v(h.x + o * s, h.y + 1.15 * s, h.z), 0.022 * s, c.m.metal);
        mesh(c.g, box(0.2 * s, 0.03 * s, 0.035 * s), c.m.metal, v(h.x, h.y + 0.95 * s, h.z));
      }
      break;
    case 'bow': {
      const pts = curvePts(v(h.x, h.y - 0.42 * s, h.z), v(h.x, h.y, h.z + 0.27 * s), v(h.x, h.y + 0.42 * s, h.z), 7);
      chain(c.g, pts, 0.022 * s, 0.018 * s, c.m.wood);
      limb(c.g, pts[0], pts[pts.length - 1], 0.005 * s, c.m.detail);
      limb(c.g, v(h.x, h.y, h.z + 0.02 * s), v(h.x, h.y, h.z + 0.42 * s), 0.009 * s, c.m.wood);
      spike(c.g, v(h.x, h.y, h.z + 0.42 * s), v(h.x, h.y, h.z + 0.5 * s), 0.02 * s, c.m.metal);
      break;
    }
  }
}

function shield(c: Ctx, at: V3, size = 1): void {
  mesh(c.g, cyl(0.24 * size, 0.24 * size, 0.04, 12), c.m.metal, at, undefined, v(Math.PI / 2, 0, 0));
  mesh(c.g, cyl(0.19 * size, 0.19 * size, 0.05, 12), c.m.accent, v(at.x, at.y, at.z + 0.008), undefined, v(Math.PI / 2, 0, 0));
  mesh(c.g, sph(0.065 * size, 1), c.m.metal, v(at.x, at.y, at.z + 0.045));
}

function crown(c: Ctx, head: V3, r: number): void {
  mesh(c.g, cyl(r * 0.6, r * 0.62, r * 0.25, 8), std('#eab308', { metalness: 0.7, roughness: 0.3 }), v(head.x, head.y + r * 0.85, head.z));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    spike(c.g, v(head.x + Math.cos(a) * r * 0.55, head.y + r * 0.95, head.z + Math.sin(a) * r * 0.55), v(head.x + Math.cos(a) * r * 0.55, head.y + r * 1.25, head.z + Math.sin(a) * r * 0.55), r * 0.08, std('#facc15', { metalness: 0.7 }));
  }
}

function halo(c: Ctx, head: V3, r: number): void {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.7, r * 0.07, 6, 18), std('#fde68a', { emissive: '#fbbf24', emissiveIntensity: 1.2 }));
  t.position.set(head.x, head.y + r * 1.5, head.z - r * 0.2);
  t.rotation.x = Math.PI / 2.4;
  c.g.add(t);
}

// --- Arquétipos ----------------------------------------------------------------

function buildHumanoid(c: Ctx, opts: { scale?: number; undead?: 'skeleton' | 'zombie'; giant?: boolean } = {}): void {
  const { spec } = c;
  const f = spec.features;
  const P = spec.proportions;
  const S = (opts.scale ?? 1) * P.height;
  const bulk = P.bulk * (f.bulky ? 1.2 : 1) * (opts.giant ? 1.25 : 1);
  const skel = opts.undead === 'skeleton';
  const zomb = opts.undead === 'zombie';
  const bodyMat = c.m.body;
  const clothMat = skel ? c.m.bone : c.m.cloth;
  const lift = f.floating ? 0.25 : 0;

  const hipY = 0.72 * S + lift;
  const chestY = 1.22 * S + lift;
  const headR = 0.2 * P.head * (opts.giant ? 0.85 : 1) * S;
  const headY = chestY + 0.18 * S + headR;
  const tilt = f.hunchTilt ?? (zomb ? (c.rnd() - 0.5) * 0.26 : 0);
  const head = v(tilt * 0.22 * S, headY - (zomb ? 0.04 * S : 0), zomb ? 0.11 * S : 0);
  const shoulderX = 0.27 * bulk * S;

  // Pernas / Robe / Cauda / Trapos
  if (f.robe) {
    mesh(c.g, cone(0.37 * bulk * S, hipY + 0.16, 10), clothMat, v(0, (hipY + 0.16) / 2, 0));
    mesh(c.g, cyl(0.24 * bulk * S, 0.26 * bulk * S, 0.08 * S, 10), c.m.dark, v(0, hipY - 0.02, 0));
  } else if (!f.floating) {
    for (const s of [-1, 1]) {
      const hip = v(s * 0.12 * bulk * S, hipY, 0);
      if (f.goatLegs) {
        const knee = v(s * 0.14 * bulk * S, hipY * 0.5, 0.12 * S);
        limb(c.g, hip, knee, (skel ? 0.04 : 0.09) * bulk * S, c.m.accent, 0.07 * S);
        limb(c.g, knee, v(s * 0.14 * bulk * S, 0.06, -0.05 * S), 0.06 * S, c.m.accent, 0.045 * S);
        mesh(c.g, box(0.1 * S, 0.08, 0.14 * S), c.m.dark, v(s * 0.14 * bulk * S, 0.04, -0.02));
      } else {
        const limpZ = zomb && s === 1 ? 0.09 * S : zomb ? -0.03 * S : 0;
        const footPos = v(s * 0.13 * bulk * S, 0.06, limpZ);
        limb(c.g, hip, footPos, (skel ? 0.035 : 0.085) * bulk * S, skel ? c.m.bone : clothMat, (skel ? 0.03 : 0.065) * bulk * S);
        if (!skel) {
          // Bota / cano da bota
          mesh(c.g, cyl(0.078 * bulk * S, 0.072 * bulk * S, 0.18 * S, 8), c.m.dark, v(footPos.x, 0.13 * S, limpZ));
        }
        mesh(c.g, box(0.13 * bulk * S, 0.08, 0.22 * S), skel ? c.m.bone : c.m.dark, v(s * 0.13 * bulk * S, 0.04, 0.04 + limpZ));
      }
    }
    if (f.ragged && !skel) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const flap = mesh(c.g, box(0.14 * bulk * S, 0.26 * S, 0.025), clothMat, v(Math.sin(a) * 0.2 * bulk * S, hipY - 0.1 * S, Math.cos(a) * 0.18 * bulk * S));
        flap.rotation.y = a;
        flap.rotation.x = 0.18;
      }
    }
  } else {
    mesh(c.g, cone(0.25 * bulk * S, hipY, 10), f.element ? c.m.glow : clothMat, v(0, hipY / 2 + 0.05, 0), undefined, v(Math.PI, 0, 0));
  }

  // Torso
  if (skel) {
    limb(c.g, v(0, hipY, 0), v(0, chestY + 0.12 * S, 0), 0.03 * S, c.m.bone);
    for (let i = 0; i < 4; i++) {
      const y = chestY - 0.22 * S + i * 0.09 * S;
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.15 * S * (1 - i * 0.08), 0.018 * S, 5, 12), c.m.bone);
      t.position.set(0, y, 0);
      t.rotation.x = Math.PI / 2;
      c.g.add(t);
    }
    mesh(c.g, box(0.3 * S, 0.06 * S, 0.14 * S), c.m.bone, v(0, hipY, 0));
  } else {
    const leanZ = zomb ? 0.07 * S : 0;
    const torso = mesh(c.g, cyl(0.25 * bulk * S, 0.19 * bulk * S, chestY - hipY + 0.3 * S, 10), f.wraps ? c.m.detail : clothMat, v(0, (hipY + chestY) / 2 + 0.05 * S, leanZ));
    torso.rotation.x = zomb ? 0.24 : 0;
    torso.rotation.z = tilt * 0.35;
    // Peitoral / gola
    mesh(c.g, sph(0.2 * bulk * S, 2), bodyMat, v(0, chestY + 0.05 * S, 0.02 + leanZ), v(1.2, 0.58, 0.9));
    // Cinto + fivela metálica
    mesh(c.g, cyl(0.215 * bulk * S, 0.215 * bulk * S, 0.075 * S, 10), c.m.dark, v(0, hipY + 0.06 * S, leanZ * 0.4));
    mesh(c.g, box(0.09 * S, 0.07 * S, 0.04 * S), c.m.metal, v(0, hipY + 0.06 * S, 0.21 * bulk * S));

    if (f.wraps) {
      for (let i = 0; i < 4; i++) {
        mesh(c.g, cyl(0.24 * bulk * S, 0.24 * bulk * S, 0.032 * S, 10), c.m.detail, v(0, hipY + 0.1 + i * 0.12 * S, leanZ * 0.5), undefined, v(0.2 * (i % 2 ? 1 : -1), 0, 0));
      }
    }

    // Costelas expostas / ferida aberta no peito (zumbis & mortos-vivos)
    if (f.exposedRibs) {
      mesh(c.g, sph(0.14 * bulk * S, 1), c.m.wound, v(0, chestY - 0.14 * S, 0.16 * bulk * S + leanZ), v(1.05, 1.15, 0.45));
      for (let r = 0; r < 3; r++) {
        const ribY = chestY - 0.06 * S - r * 0.065 * S;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.11 * bulk * S, 0.016 * S, 5, 10, Math.PI * 0.85), c.m.bone);
        rib.position.set(0, ribY, 0.15 * bulk * S + leanZ);
        rib.rotation.set(Math.PI / 2.2, 0, Math.PI * 0.08);
        c.g.add(rib);
      }
    }

    // Ferimentos / flecha encravada
    if (f.wounds) {
      mesh(c.g, sph(0.08 * bulk * S, 1), c.m.wound, v(-0.14 * bulk * S, chestY - 0.02 * S, 0.17 * bulk * S + leanZ), v(1, 0.7, 0.4));
      if (c.spec.seed % 3 === 0) {
        // Flecha quebrada cravada no ombro/peito
        limb(c.g, v(0.15 * bulk * S, chestY - 0.02 * S, 0.15 * bulk * S), v(0.28 * bulk * S, chestY + 0.15 * S, 0.34 * bulk * S), 0.012 * S, c.m.wood);
        mesh(c.g, cone(0.035 * S, 0.06 * S, 4), c.m.detail, v(0.29 * bulk * S, chestY + 0.16 * S, 0.35 * bulk * S), undefined, v(0.8, 0, -0.5));
      }
    }

    // Remendos e grampos cirúrgicos (Zombesta Remendada)
    if (f.stitched) {
      mesh(c.g, box(0.24 * bulk * S, 0.22 * S, 0.16 * bulk * S), c.m.wound, v(0.12 * bulk * S, chestY - 0.15 * S, 0.14 * bulk * S));
      for (let st = 0; st < 4; st++) {
        mesh(c.g, box(0.08 * S, 0.016 * S, 0.025 * S), c.m.metal, v(0.02 * S, chestY - 0.05 * S - st * 0.06 * S, 0.22 * bulk * S), undefined, v(0, 0, 0.3));
      }
    }

    // Bolhas ácidas brilhantes (Zumbi Cuspidor de Ácido)
    if (f.acidGlow) {
      for (const [px, py, pz, pr] of [
        [0.14, -0.06, 0.2, 0.07],
        [-0.12, -0.18, 0.19, 0.06],
        [0.04, -0.25, 0.22, 0.055],
        [-0.22, 0.08, 0.05, 0.065]
      ]) {
        const sac = mesh(c.g, sph(pr * bulk * S, 1), c.m.acid, v(px * bulk * S, chestY + py * S, pz * bulk * S + leanZ));
        sac.userData.wobble = Math.round((px + 1) * 5);
        c.animated.push(sac);
      }
    }

    // Hera e raízes crescendo no cadáver (Zumbi de Hera / Afogado)
    if (f.vines) {
      const vinePts = curvePts(
        v(-0.18 * bulk * S, hipY + 0.05 * S, 0.14 * bulk * S),
        v(0.05 * S, chestY - 0.12 * S, 0.22 * bulk * S),
        v(0.22 * bulk * S, chestY + 0.14 * S, 0.04 * S),
        6
      );
      chain(c.g, vinePts, 0.025 * S, 0.015 * S, c.m.vine);
      for (let lv = 0; lv < 5; lv++) {
        const lp = vinePts[Math.min(vinePts.length - 1, lv + 1)];
        mesh(c.g, sph(0.065 * S, 0), c.m.vine, v(lp.x + (lv % 2 ? 0.04 : -0.04), lp.y + 0.03, lp.z + 0.03), v(1.3, 0.5, 0.8));
      }
    }
  }

  if (f.shell) {
    mesh(c.g, sph(0.33 * bulk * S, 2), c.m.accent, v(0, chestY - 0.1 * S, -0.15 * S), v(1, 1.15, 0.6));
  }

  // Braços
  const armCount = Math.max(2, f.arms ?? 2);
  const hands: V3[] = [];
  for (let i = 0; i < armCount; i++) {
    const s = i % 2 === 0 ? 1 : -1;
    const tier = Math.floor(i / 2);
    const sh = v(s * shoulderX, chestY - tier * 0.16 * S + (zomb && s < 0 ? -0.04 * S : 0), zomb ? 0.05 * S : 0);
    const reach = zomb
      ? v(s * shoulderX * 0.92, chestY + (s > 0 ? 0.02 * S : -0.18 * S) - tier * 0.15 * S, (s > 0 ? 0.54 : 0.42) * S)
      : v(s * (shoulderX + 0.12 * S + tier * 0.1 * S), hipY + 0.05 * S + tier * 0.1 * S, 0.12 * S + tier * 0.08 * S);
    const elbow = sh.clone().lerp(reach, 0.5).add(v(s * 0.06 * S, 0, -0.04 * S));
    const armR = (skel ? 0.03 : 0.065) * bulk * S * P.limb;
    const armMat = f.stitched && s < 0 ? c.m.wound : skel ? c.m.bone : f.robe ? clothMat : bodyMat;
    limb(c.g, sh, elbow, armR, armMat, armR * 0.9);
    limb(c.g, elbow, reach, armR * 0.9, skel ? c.m.bone : bodyMat, armR * 0.75);
    if (!skel && (f.pauldrons || f.helmet)) {
      // Braçadeira metálica no antebraço
      limb(c.g, elbow.clone().lerp(reach, 0.25), reach, armR * 1.05, c.m.metal, armR * 0.92);
    }
    mesh(c.g, sph(armR * 1.15, 0), skel ? c.m.bone : bodyMat, reach);
    if (f.pincers && i >= 2) {
      spike(c.g, reach, v(reach.x + s * 0.05, reach.y + 0.12, reach.z + 0.12), 0.05 * S, c.m.bone);
    }
    if (f.chains && i < 2) {
      // Algema no pulso + elos pendurados
      mesh(c.g, cyl(armR * 1.28, armR * 1.28, 0.05 * S, 8), c.m.metal, reach);
      for (let ch = 1; ch <= 3; ch++) {
        const lk = new THREE.Mesh(new THREE.TorusGeometry(0.032 * S, 0.009 * S, 4, 8), c.m.metal);
        lk.position.set(reach.x, reach.y - ch * 0.05 * S, reach.z);
        lk.rotation.y = (ch % 2) * (Math.PI / 2);
        c.g.add(lk);
      }
    }
    hands.push(reach);

    // Ombreira / Pauldron
    if (f.pauldrons && !skel) {
      mesh(c.g, sph(armR * 2.1, 1), c.m.metal, v(sh.x + s * 0.03 * S, sh.y + 0.04 * S, sh.z), v(1.2, 0.85, 1.15));
      if (f.spikes) {
        spike(c.g, v(sh.x + s * 0.04 * S, sh.y + 0.09 * S, sh.z), v(sh.x + s * 0.18 * S, sh.y + 0.25 * S, sh.z), 0.045 * S, c.m.metal);
      }
    } else {
      mesh(c.g, sph(armR * 1.4, 0), f.helmet && !skel ? c.m.metal : skel ? c.m.bone : clothMat, sh);
    }
  }

  // Pescoço & Cabeça
  if (f.headless) {
    // Sem cabeça: toco ensanguentado + chama espectral no pescoço + crânio preso na mão esquerda
    limb(c.g, v(0, chestY + 0.08 * S, 0), v(0, chestY + 0.18 * S, 0.04 * S), 0.08 * S, c.m.wound, 0.065 * S);
    const fl = mesh(c.g, cone(0.11 * S, 0.28 * S, 6), c.m.glow, v(0, chestY + 0.3 * S, 0.04 * S));
    fl.userData.flicker = 1;
    c.animated.push(fl);
    if (hands[1]) {
      mesh(c.g, sph(headR * 0.8, 1), c.m.bone, v(hands[1].x, hands[1].y - 0.05 * S, hands[1].z + 0.08 * S));
      eyes(c, v(hands[1].x, hands[1].y - 0.05 * S, hands[1].z + 0.08 * S), headR * 0.8, 2);
    }
  } else {
    limb(c.g, v(0, chestY + 0.1 * S, zomb ? 0.05 * S : 0), head, 0.07 * S, skel ? c.m.bone : bodyMat);
    if (skel) {
      mesh(c.g, sph(headR, 2), c.m.bone, head, v(0.9, 1, 1));
      mesh(c.g, box(headR * 1.1, headR * 0.45, headR * 0.8), c.m.bone, v(head.x, head.y - headR * 0.75, head.z + headR * 0.15));
      for (const s of [-1, 1]) mesh(c.g, sph(headR * 0.24, 0), c.m.dark, v(head.x + s * headR * 0.36, head.y + headR * 0.05, head.z + headR * 0.78));
      for (const s of [-1, 1]) mesh(c.g, sph(headR * 0.1, 0), c.m.eye, v(head.x + s * headR * 0.36, head.y + headR * 0.05, head.z + headR * 0.9));
    } else {
      mesh(c.g, sph(headR, 2), bodyMat, head);
      if (zomb) {
        // Olheiras fundas e mandíbula caída para dar cara de morto-vivo
        for (const s of [-1, 1]) {
          mesh(c.g, sph(headR * 0.23, 0), c.m.dark, v(head.x + s * headR * 0.36, head.y + headR * 0.14, head.z + headR * 0.75));
        }
        mesh(c.g, box(headR * 0.76, headR * 0.3, headR * 0.52), c.m.dark, v(head.x, head.y - headR * 0.62, head.z + headR * 0.48), undefined, v(0.22, 0, tilt * 0.5));
        if (f.acidGlow) {
          mesh(c.g, cone(headR * 0.18, headR * 0.5, 5), c.m.acid, v(head.x, head.y - headR * 0.85, head.z + headR * 0.72), undefined, v(Math.PI, 0, 0));
        }
        if (f.vines) {
          mesh(c.g, sph(headR * 0.35, 0), c.m.vine, v(head.x - headR * 0.5, head.y + headR * 0.75, head.z), v(1.3, 0.7, 1.1));
        }
      }
      if (f.fins) {
        spike(c.g, v(head.x, head.y + headR * 0.5, head.z), v(head.x, head.y + headR * 1.4, head.z - headR * 0.6), headR * 0.22, c.m.accent);
      }
      if (f.snout) {
        snout(c, head, headR, f.snout, bodyMat);
      }
      if (f.beak) {
        spike(c.g, v(head.x, head.y, head.z + headR * 0.7), v(head.x, head.y - headR * 0.35, head.z + headR * 1.7), headR * 0.35, c.m.detail);
      }
      eyes(c, head, headR, f.eyes ?? 2);
      if (f.tusks) {
        for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.35, head.y - headR * 0.45, head.z + headR * 0.75), v(head.x + s * headR * 0.42, head.y - headR * 0.05, head.z + headR * 1.0), headR * 0.1, c.m.bone);
      }
      if (f.fangs && !f.tusks) {
        for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.18, head.y - headR * 0.35, head.z + headR * 0.9), v(head.x + s * headR * 0.18, head.y - headR * 0.65, head.z + headR * 0.92), headR * 0.06, c.m.bone);
      }
      if (f.beard) {
        mesh(c.g, cone(headR * 0.6, headR * 1.2, 6), c.m.accent, v(head.x, head.y - headR * 0.95, head.z + headR * 0.45), undefined, v(Math.PI + 0.25, 0, 0));
      }
      if (f.earsPointy || f.earsRound) ears(c, head, headR, Boolean(f.earsPointy), bodyMat);
      if (f.tentacles) {
        for (let i = 0; i < f.tentacles; i++) {
          const x = (i / Math.max(1, f.tentacles - 1) - 0.5) * headR * 0.9;
          const start = v(head.x + x, head.y - headR * 0.4, head.z + headR * 0.6);
          chain(c.g, curvePts(start, v(start.x * 1.2, start.y - headR * 0.8, start.z + headR * 0.5), v(start.x * 1.4, start.y - headR * 1.6, start.z + headR * 0.2), 4), headR * 0.1, headR * 0.03, bodyMat);
        }
      }
      if (f.snakeHair) {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const base = v(head.x + Math.cos(a) * headR * 0.7, head.y + headR * 0.55, head.z + Math.sin(a) * headR * 0.6 - headR * 0.2);
          const tip = v(base.x + Math.cos(a) * headR * 0.7, base.y + headR * 0.5, base.z + Math.sin(a) * headR * 0.5);
          chain(c.g, curvePts(base, v(base.x, base.y + headR * 0.6, base.z), tip, 3), headR * 0.08, headR * 0.05, c.m.accent);
          mesh(c.g, sph(headR * 0.1, 0), c.m.accent, tip);
        }
      }
      if (f.hood) {
        mesh(c.g, cone(headR * 1.25, headR * 2.4, 8), clothMat, v(head.x, head.y + headR * 0.35, head.z - headR * 0.18));
        mesh(c.g, sph(headR * 0.8, 1), c.m.dark, v(head.x, head.y, head.z + headR * 0.32), v(1, 1, 0.6));
        eyes(c, v(head.x, head.y - headR * 0.05, head.z + headR * 0.05), headR, 2);
      }
      if (f.helmet) {
        mesh(c.g, new THREE.SphereGeometry(headR * 1.1, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), c.m.metal, head);
        mesh(c.g, box(headR * 0.12, headR * 0.6, headR * 0.2), c.m.metal, v(head.x, head.y - headR * 0.1, head.z + headR * 0.98));
        if (f.spikes) {
          spike(c.g, v(head.x, head.y + headR * 1.0, head.z), v(head.x, head.y + headR * 1.65, head.z - headR * 0.15), headR * 0.16, c.m.metal);
        }
      }
    }
    if (f.horns) horns(c, head, headR, f.horns);
    if (f.crown) crown(c, head, headR);
    if (f.halo) halo(c, head, headR);
  }

  if (opts.giant && (f.heads ?? 1) > 1) {
    const h2 = v(head.x + headR * 2.1, head.y - headR * 0.2, head.z);
    limb(c.g, v(shoulderX * 0.6, chestY + 0.1 * S, 0), h2, 0.07 * S, bodyMat);
    mesh(c.g, sph(headR * 0.95, 1), bodyMat, h2);
    eyes(c, h2, headR * 0.95, 2);
    head.x -= headR * 0.6;
  }

  // Cauda, asas, capa
  if (f.tail) tailChain(c, v(0, hipY, -0.12 * S), 0.75 * S, 0.06 * S, bodyMat, f.stinger, 0.05);
  if (f.wings) wings(c, v(0, chestY, -0.15 * S), 0.9 * S * (f.wings === 'insect' ? 0.7 : 1), f.wings);
  if (f.cape) {
    const capeMat = std(shade(spec.colors.accent, -0.15), { side: THREE.DoubleSide });
    const cape = mesh(c.g, new THREE.PlaneGeometry(0.55 * bulk * S, chestY - 0.05), capeMat, v(0, (chestY + 0.1) / 2 + 0.05, -0.22 * bulk * S));
    cape.rotation.x = 0.12;
  }

  // Arma & escudo
  if (f.weapon && hands[0]) weapon(c, hands[0], f.weapon, S * (opts.giant ? 1.3 : 1));
  if (f.shield && hands[1]) shield(c, v(hands[1].x - 0.05, hands[1].y + 0.1, hands[1].z + 0.12), S);

  if (f.element === 'fire' || f.element === 'magma') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const fl = mesh(c.g, cone(headR * 0.25, headR * 1.1, 5), c.m.glow, v(head.x + Math.cos(a) * headR * 0.5, head.y + headR * 0.9, head.z + Math.sin(a) * headR * 0.5));
      c.animated.push(fl);
      fl.userData.flicker = i;
    }
  }

  c.anchors = {
    head: head.clone(),
    headR,
    body: v(0, (hipY + chestY) / 2 + 0.05 * S, zomb ? 0.05 * S : 0),
    bodyR: 0.23 * bulk * S,
    bodyLen: chestY - hipY + 0.3 * S,
    upright: true
  };
}

function buildQuadruped(c: Ctx): void {
  const { spec } = c;
  const f = spec.features;
  const P = spec.proportions;
  const bulk = P.bulk * (f.bulky ? 1.2 : 1);
  const legLen = (f.shortLegs ? 0.32 : f.longLegs ? 0.7 : 0.5) * P.limb;
  const bodyLen = 0.95 * bulk;
  const bodyR = 0.3 * bulk;
  const bodyY = legLen + bodyR * 0.85;
  const m = c.m.body;

  mesh(c.g, sph(bodyR, 1), m, v(0, bodyY, 0), v(1, 0.92, bodyLen / (bodyR * 1.4)));
  if (f.shell) {
    mesh(c.g, new THREE.SphereGeometry(bodyR * 1.15, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.m.accent, v(0, bodyY - bodyR * 0.1, 0), v(1, 0.9, bodyLen / (bodyR * 1.4)));
  }
  if (f.mane) {
    mesh(c.g, sph(bodyR * 0.95, 1), c.m.accent, v(0, bodyY + bodyR * 0.25, bodyLen * 0.38), v(1.05, 1.05, 0.75));
  }

  // Pernas
  const legPairs = Math.max(2, Math.round((f.legs ?? 4) / 2));
  for (let i = 0; i < legPairs; i++) {
    const z = bodyLen * 0.4 - (i / (legPairs - 1)) * bodyLen * 0.8;
    for (const s of [-1, 1]) {
      const top = v(s * bodyR * 0.62, bodyY - bodyR * 0.3, z);
      const foot = v(s * bodyR * 0.68, 0.04, z + 0.03);
      const knee = top.clone().lerp(foot, 0.5).add(v(0, 0, i === 0 ? 0.05 : -0.06));
      const lr = 0.075 * bulk * (f.bulky ? 1.35 : 1);
      limb(c.g, top, knee, lr, m, lr * 0.85);
      limb(c.g, knee, foot, lr * 0.85, m, lr * 0.65);
      mesh(c.g, box(lr * 1.8, 0.06, lr * 2.2), f.snout === 'horse' || f.snout === 'bull' ? c.m.dark : m, v(foot.x, 0.03, foot.z + 0.02));
    }
  }

  // Pescoço & cabeça(s)
  const nHeads = Math.max(1, f.heads ?? 1);
  const headR = 0.19 * P.head * (f.bulky ? 1.15 : 1);
  for (let h = 0; h < nHeads; h++) {
    const off = nHeads === 1 ? 0 : (h / (nHeads - 1) - 0.5) * bodyR * 1.6;
    const neckBase = v(off * 0.5, bodyY + bodyR * 0.2, bodyLen * 0.42);
    const head = v(off, bodyY + (f.longNeck ? 0.55 : 0.22) + (f.snout === 'horse' ? 0.12 : 0), bodyLen * 0.55 + (f.longNeck ? 0.2 : 0.12));
    limb(c.g, neckBase, head, bodyR * 0.45, m, headR * 0.7);
    mesh(c.g, sph(headR, 1), h === 1 && nHeads === 3 ? c.m.accent : m, head);
    if (h === 0) {
      c.anchors = { head: head.clone(), headR, body: v(0, bodyY, 0), bodyR, bodyLen, upright: false };
    }
    if (f.beak) {
      spike(c.g, v(head.x, head.y, head.z + headR * 0.6), v(head.x, head.y - headR * 0.45, head.z + headR * 1.7), headR * 0.4, c.m.detail);
    } else if (f.trunk) {
      chain(c.g, curvePts(v(head.x, head.y - headR * 0.2, head.z + headR * 0.7), v(head.x, head.y - headR * 1.2, head.z + headR * 1.6), v(head.x, 0.12, head.z + headR * 1.1), 5), headR * 0.28, headR * 0.12, m);
    } else {
      snout(c, head, headR, h === 1 && nHeads === 3 ? 'bull' : f.snout || 'canine', m);
    }
    eyes(c, head, headR, 2);
    if (f.tusks) {
      for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.35, head.y - headR * 0.45, head.z + headR * 0.85), v(head.x + s * headR * 0.55, head.y - headR * (f.trunk ? 1.2 : 0.15), head.z + headR * (f.trunk ? 1.9 : 1.3)), headR * 0.12, c.m.bone);
    }
    if (f.earsPointy || f.earsRound) ears(c, head, headR, Boolean(f.earsPointy), m);
    if (f.horns) horns(c, head, headR, h === 1 && nHeads === 3 ? 'curved' : f.horns);
    if (f.frills) {
      mesh(c.g, cyl(headR * 1.5, headR * 1.5, headR * 0.12, 10), c.m.accent, v(head.x, head.y + headR * 0.3, head.z - headR * 0.6), undefined, v(Math.PI / 2.4, 0, 0));
    }
    if (f.tentacles) {
      for (const s of [-1, 1]) chain(c.g, curvePts(v(s * bodyR * 0.4, bodyY + bodyR * 0.5, 0), v(s * bodyR * 1.2, bodyY + 0.6, -0.1), v(s * bodyR * 0.9, bodyY + 0.9, bodyLen * 0.3), 5), 0.04, 0.02, m);
    }
  }

  if (f.tail) tailChain(c, v(0, bodyY + bodyR * 0.1, -bodyLen * 0.5), f.snout === 'lizard' ? 0.9 : 0.55, f.snout === 'lizard' ? bodyR * 0.4 : 0.04, f.mane ? c.m.accent : m, f.stinger, f.snout === 'lizard' ? -0.1 : 0.35);
  if (f.spikes) backSpikes(c, v(0, bodyY + bodyR * 0.85, bodyLen * 0.35), v(0, bodyY + bodyR * 0.7, -bodyLen * 0.45), 0.22 * bulk, 6);
  if (f.wings) wings(c, v(0, bodyY + bodyR * 0.6, bodyLen * 0.1), 0.95 * bulk, f.wings);
  if (f.helmet) mesh(c.g, box(bodyR * 2.05, bodyR * 0.9, bodyLen * 0.8), c.m.metal, v(0, bodyY + bodyR * 0.25, 0));
  if (f.element === 'fire') {
    for (let i = 0; i < 4; i++) {
      const fl = mesh(c.g, cone(0.06, 0.3, 5), c.m.glow, v((i - 1.5) * 0.04, bodyY + bodyR * 0.9, bodyLen * 0.4 - i * 0.18));
      fl.userData.flicker = i;
      c.animated.push(fl);
    }
  }
}

function buildTheropod(c: Ctx): void {
  const P = c.spec.proportions;
  const f = c.spec.features;
  const m = c.m.body;
  const b = P.bulk;
  const hip = v(0, 0.75 * P.limb, -0.1);
  mesh(c.g, sph(0.34 * b, 1), m, v(0, hip.y + 0.12, 0.05), v(1, 1, 1.6));
  for (const s of [-1, 1]) {
    const top = v(s * 0.22 * b, hip.y, -0.1);
    const knee = v(s * 0.25 * b, hip.y * 0.5, 0.1);
    limb(c.g, top, knee, 0.12 * b, m, 0.09 * b);
    limb(c.g, knee, v(s * 0.24 * b, 0.05, -0.05), 0.08 * b, m, 0.06 * b);
    mesh(c.g, box(0.14 * b, 0.06, 0.26), m, v(s * 0.24 * b, 0.03, 0.04));
    limb(c.g, v(s * 0.18 * b, hip.y + 0.15, 0.45 * b), v(s * 0.22 * b, hip.y - 0.02, 0.6 * b), 0.03, m);
  }
  const neck = v(0, hip.y + 0.4, 0.55 * b);
  const head = v(0, hip.y + 0.62, 0.78 * b);
  limb(c.g, v(0, hip.y + 0.2, 0.35 * b), neck, 0.17 * b, m, 0.14 * b);
  const headR = 0.2 * P.head * b;
  mesh(c.g, box(headR * 1.6, headR * 1.3, headR * 2.6), m, v(head.x, head.y, head.z + headR * 0.4));
  mesh(c.g, box(headR * 1.5, headR * 0.4, headR * 2.3), c.m.accent, v(head.x, head.y - headR * 0.75, head.z + headR * 0.5));
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.65, head.y - headR * 0.5, head.z + headR * (1.5 - i * 0.4)), v(head.x + s * headR * 0.65, head.y - headR * 0.8, head.z + headR * (1.5 - i * 0.4)), headR * 0.06, c.m.bone);
  }
  eyes(c, v(head.x, head.y + headR * 0.3, head.z + headR * 0.2), headR, 2);
  if (f.horns) horns(c, head, headR, f.horns);
  tailChain(c, v(0, hip.y + 0.1, -0.4 * b), 1.15 * b, 0.2 * b, m, false, 0.15);
  if (f.spikes) backSpikes(c, v(0, hip.y + 0.45, 0.4 * b), v(0, hip.y + 0.3, -0.7 * b), 0.25 * b, 7);
  if (f.shell) mesh(c.g, new THREE.SphereGeometry(0.4 * b, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.m.accent, v(0, hip.y + 0.2, -0.05), v(1, 0.9, 1.6));
  c.anchors = { head: v(head.x, head.y, head.z + headR * 0.4), headR: headR * 0.9, body: v(0, hip.y + 0.12, 0.05), bodyR: 0.34 * b, bodyLen: 1.0 * b, upright: false };
}

function buildBird(c: Ctx): void {
  const P = c.spec.proportions;
  const f = c.spec.features;
  const m = c.m.body;
  const b = P.bulk;
  const legH = (f.longLegs ? 0.55 : 0.3) * P.limb;
  const body = v(0, legH + 0.22 * b, 0);
  mesh(c.g, sph(0.25 * b, 1), m, body, v(0.9, 0.9, 1.3));
  mesh(c.g, sph(0.2 * b, 1), c.m.accent, v(0, body.y - 0.04, 0.12 * b), v(0.85, 0.85, 0.8));
  const headR = 0.14 * P.head * b;
  const head = v(0, body.y + 0.28 * b, 0.25 * b);
  limb(c.g, body, head, 0.1 * b, m);
  mesh(c.g, sph(headR, 1), m, head);
  spike(c.g, v(head.x, head.y, head.z + headR * 0.7), v(head.x, head.y - headR * 0.6, head.z + headR * (f.longLegs ? 2.6 : 1.9)), headR * 0.45, c.m.detail);
  eyes(c, head, headR, 2);
  if (f.earsPointy) ears(c, head, headR, true, m);
  if (f.horns) horns(c, head, headR, f.horns);
  for (const s of [-1, 1]) {
    limb(c.g, v(s * 0.09 * b, body.y - 0.15 * b, 0), v(s * 0.1 * b, 0.04, 0.03), 0.025 * b, c.m.detail);
    for (const a of [-0.5, 0, 0.5]) spike(c.g, v(s * 0.1 * b, 0.03, 0.03), v(s * 0.1 * b + Math.sin(a) * 0.08, 0.02, 0.03 + Math.cos(a) * 0.1), 0.012, c.m.detail);
  }
  for (let i = 0; i < 4; i++) {
    const t = mesh(c.g, box(0.07 * b, 0.02, 0.32 * b), i % 2 ? c.m.accent : m, v((i - 1.5) * 0.05 * b, body.y + 0.02, -0.38 * b));
    t.rotation.y = (i - 1.5) * 0.2;
    t.rotation.x = -0.25;
  }
  if (f.tail) tailChain(c, v(0, body.y, -0.3 * b), 0.4 * b, 0.04, c.m.accent, false, 0.3);
  if (f.wings) wings(c, v(0, body.y + 0.1 * b, -0.02), 0.85 * b, f.wings);
  c.anchors = { head: head.clone(), headR, body: body.clone(), bodyR: 0.23 * b, bodyLen: 0.6 * b, upright: false };
}

function buildBat(c: Ctx): void {
  const P = c.spec.proportions;
  const f = c.spec.features;
  const b = P.bulk;
  const body = v(0, 0.75, 0);
  mesh(c.g, sph(0.2 * b, 1), c.m.body, body, v(0.9, 1.2, 0.9));
  const head = v(0, body.y + 0.27 * b, 0.05);
  mesh(c.g, sph(0.14 * b * P.head, 1), c.m.body, head);
  ears(c, head, 0.14 * b, true, c.m.body);
  eyes(c, head, 0.14 * b, f.eyes ?? 2);
  for (const s of [-1, 1]) spike(c.g, v(head.x + s * 0.03, head.y - 0.06, head.z + 0.12), v(head.x + s * 0.03, head.y - 0.13, head.z + 0.12), 0.012, c.m.bone);
  for (const s of [-1, 1]) limb(c.g, v(s * 0.06, body.y - 0.2 * b, 0), v(s * 0.08, 0.04, 0), 0.02, c.m.dark);
  wings(c, v(0, body.y + 0.08, -0.04), 1.05 * b, 'bat');
  if (f.tail) tailChain(c, v(0, body.y - 0.15, -0.12), 0.5, 0.04, c.m.body, false, 0.1);
}

function buildInsect(c: Ctx): void {
  const P = c.spec.proportions;
  const f = c.spec.features;
  const m = c.m.body;
  const b = P.bulk;
  const flying = f.wings === 'insect';
  const y = flying ? 0.75 : 0.28 * P.limb;
  mesh(c.g, sph(0.15 * b, 1), m, v(0, y + 0.05, 0.3 * b));
  mesh(c.g, sph(0.17 * b, 1), c.m.accent, v(0, y + 0.06, 0.05), v(1, 0.9, 1.2));
  const abd = mesh(c.g, sph(0.25 * b, 1), f.shell ? c.m.accent : m, v(0, y + 0.08, -0.35 * b), v(0.95, 0.8, 1.45));
  if (f.stinger && !f.shell) {
    for (let i = 0; i < 3; i++) mesh(c.g, cyl(0.24 * b, 0.24 * b, 0.05, 10), c.m.dark, v(0, y + 0.08, -0.25 * b - i * 0.12 * b), undefined, v(Math.PI / 2, 0, 0));
  }
  if (f.shell) mesh(c.g, new THREE.SphereGeometry(0.3 * b, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.m.accent, v(0, y + 0.05, -0.2 * b), v(1, 0.7, 1.7));
  for (let i = 0; i < 3; i++) {
    const z = 0.12 * b - i * 0.13 * b;
    for (const s of [-1, 1]) {
      const top = v(s * 0.12 * b, y, z);
      const knee = v(s * 0.32 * b, y + 0.12, z + (i - 1) * 0.08);
      const foot = v(s * 0.42 * b, flying ? y - 0.25 : 0.02, z + (i - 1) * 0.15);
      limb(c.g, top, knee, 0.022 * b, c.m.dark);
      limb(c.g, knee, foot, 0.02 * b, c.m.dark, 0.012);
    }
  }
  const head = v(0, y + 0.05, 0.3 * b);
  eyes(c, head, 0.15 * b, f.eyes ?? 2);
  for (const s of [-1, 1]) {
    chain(c.g, curvePts(v(head.x + s * 0.05, head.y + 0.1, head.z + 0.08), v(head.x + s * 0.12, head.y + 0.35, head.z + 0.2), v(head.x + s * 0.25, head.y + 0.4, head.z + 0.35), 3), 0.012, 0.008, c.m.dark);
    if (f.pincers) chain(c.g, curvePts(v(head.x + s * 0.07, head.y - 0.03, head.z + 0.12), v(head.x + s * 0.2, head.y - 0.02, head.z + 0.3), v(head.x + s * 0.02, head.y - 0.03, head.z + 0.42), 4), 0.035, 0.012, c.m.bone);
  }
  if (f.beak) spike(c.g, v(head.x, head.y, head.z + 0.12), v(head.x, head.y - 0.05, head.z + 0.45), 0.025, c.m.dark);
  if (f.stinger) spike(c.g, v(0, abd.position.y - 0.02, -0.65 * b), v(0, abd.position.y - 0.08, -0.85 * b), 0.04, c.m.dark);
  if (f.tentacles) for (const s of [-1, 1]) chain(c.g, curvePts(v(head.x + s * 0.05, head.y + 0.1, head.z + 0.1), v(head.x + s * 0.2, head.y + 0.4, head.z + 0.3), v(head.x + s * 0.3, head.y + 0.35, head.z + 0.55), 4), 0.03, 0.04, m);
  if (flying) wings(c, v(0, y + 0.18, 0.02), 0.5 * b, 'insect');
}

function buildSpider(c: Ctx): void {
  const P = c.spec.proportions;
  const f = c.spec.features;
  const m = c.m.body;
  const b = P.bulk;
  const y = 0.32 * P.limb;
  const ceph = v(0, y, 0.18 * b);
  mesh(c.g, sph(0.2 * b, 1), m, ceph, v(1, 0.8, 1.1));
  mesh(c.g, sph(0.34 * b, 1), c.m.accent, v(0, y + 0.12, -0.32 * b), v(1, 0.85, 1.2));
  mesh(c.g, sph(0.12 * b, 0), std(c.spec.colors.detail), v(0, y + 0.38 * b, -0.3 * b), v(1, 0.3, 1.4));
  for (let i = 0; i < 4; i++) {
    const z = ceph.z + 0.12 * b - i * 0.09 * b;
    for (const s of [-1, 1]) {
      const top = v(s * 0.14 * b, y, z);
      const knee = v(s * 0.45 * b, y + 0.3 * P.limb, z + (1.5 - i) * 0.16 * b);
      const foot = v(s * 0.7 * b, 0.02, z + (1.5 - i) * 0.32 * b);
      limb(c.g, top, knee, 0.03 * b, m, 0.025 * b);
      limb(c.g, knee, foot, 0.025 * b, m, 0.012);
    }
  }
  eyes(c, v(ceph.x, ceph.y + 0.05, ceph.z), 0.2 * b, f.eyes ?? 8);
  for (const s of [-1, 1]) spike(c.g, v(ceph.x + s * 0.06, ceph.y - 0.08, ceph.z + 0.17 * b), v(ceph.x + s * 0.05, ceph.y - 0.2, ceph.z + 0.22 * b), 0.03, c.m.bone);
  if (f.arms) {
    const save = c.g;
    const torso = new THREE.Group();
    torso.position.set(0, y + 0.05, ceph.z + 0.12);
    c.g.add(torso);
    c.g = torso;
    mesh(c.g, cyl(0.13, 0.11, 0.45, 8), std(shade(c.spec.colors.body, 0.1)), v(0, 0.25, 0));
    mesh(c.g, sph(0.12, 1), std(shade(c.spec.colors.body, 0.1)), v(0, 0.6, 0));
    eyes(c, v(0, 0.6, 0), 0.12, 2);
    ears(c, v(0, 0.6, 0), 0.12, true, std(shade(c.spec.colors.body, 0.1)));
    for (const s of [-1, 1]) limb(c.g, v(s * 0.14, 0.42, 0), v(s * 0.25, 0.15, 0.12), 0.035, std(shade(c.spec.colors.body, 0.1)));
    if (f.weapon) weapon(c, v(0.25, 0.15, 0.12), f.weapon, 0.8);
    c.g = save;
  }
}

function buildScorpion(c: Ctx): void {
  const m = c.m.body;
  const b = c.spec.proportions.bulk;
  const y = 0.22;
  mesh(c.g, sph(0.26 * b, 1), m, v(0, y, 0), v(1, 0.55, 1.5));
  for (let i = 0; i < 4; i++) {
    const z = 0.15 * b - i * 0.12 * b;
    for (const s of [-1, 1]) {
      const knee = v(s * 0.38 * b, y + 0.15, z + 0.05);
      limb(c.g, v(s * 0.15 * b, y, z), knee, 0.025, c.m.accent);
      limb(c.g, knee, v(s * 0.52 * b, 0.02, z + 0.08), 0.022, c.m.accent, 0.01);
    }
  }
  for (const s of [-1, 1]) {
    const arm = v(s * 0.3 * b, y + 0.05, 0.55 * b);
    limb(c.g, v(s * 0.12 * b, y, 0.3 * b), arm, 0.04 * b, m);
    mesh(c.g, sph(0.1 * b, 1), m, v(arm.x, arm.y, arm.z + 0.08), v(0.9, 0.6, 1.4));
    spike(c.g, v(arm.x - s * 0.04, arm.y, arm.z + 0.15), v(arm.x - s * 0.08, arm.y, arm.z + 0.32 * b), 0.04 * b, c.m.accent);
    spike(c.g, v(arm.x + s * 0.03, arm.y, arm.z + 0.15), v(arm.x + s * 0.02, arm.y, arm.z + 0.3 * b), 0.035 * b, c.m.accent);
  }
  const tail = curvePts(v(0, y + 0.05, -0.35 * b), v(0, y + 0.9 * b, -0.85 * b), v(0, y + 0.85 * b, -0.05 * b), 7);
  chain(c.g, tail, 0.07 * b, 0.05 * b, m);
  spike(c.g, tail[tail.length - 1], v(0, y + 0.6 * b, 0.12 * b), 0.05 * b, c.m.dark);
  eyes(c, v(0, y + 0.06, 0.32 * b), 0.12 * b, 2);
}

function buildCentipede(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const n = 9;
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const z = 0.6 * b - t * 1.4 * b;
    const x = Math.sin(t * Math.PI * 2 + c.rnd()) * 0.2 * b;
    const y = 0.14 * b + (i === 0 ? 0.35 * b : i === 1 ? 0.18 * b : 0);
    pts.push(v(x, y, z));
  }
  pts.forEach((p, i) => {
    mesh(c.g, sph(0.13 * b * (i === 0 ? 1.2 : 1 - i * 0.03), 1), i % 2 ? c.m.accent : c.m.body, p, v(1.1, 0.8, 1));
    if (i > 0) {
      for (const s of [-1, 1]) limb(c.g, p, v(p.x + s * 0.25 * b, 0.02, p.z + 0.03), 0.018 * b, c.m.dark, 0.01);
      if (i < n - 1) limb(c.g, p, pts[i + 1], 0.09 * b, c.m.body);
    }
  });
  const head = pts[0];
  eyes(c, head, 0.15 * b, 2);
  for (const s of [-1, 1]) spike(c.g, v(head.x + s * 0.07, head.y - 0.05, head.z + 0.1), v(head.x + s * 0.02, head.y - 0.12, head.z + 0.28), 0.03, c.m.bone);
  if (f.horns) horns(c, head, 0.15 * b, f.horns);
  if (c.spec.emissive) {
    for (let i = 1; i < n; i += 2) spike(c.g, v(pts[i].x, pts[i].y + 0.1 * b, pts[i].z), v(pts[i].x, pts[i].y + 0.3 * b, pts[i].z - 0.05), 0.04 * b, c.m.glow);
  }
}

function buildCrab(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const y = 0.3;
  mesh(c.g, sph(0.32 * b, 1), c.m.body, v(0, y, 0), v(1.35, 0.55, 1));
  for (let i = 0; i < 4; i++) {
    const z = 0.12 * b - i * 0.1 * b;
    for (const s of [-1, 1]) {
      const knee = v(s * 0.55 * b, y + 0.12, z);
      limb(c.g, v(s * 0.3 * b, y, z), knee, 0.035 * b, c.m.accent);
      limb(c.g, knee, v(s * 0.7 * b, 0.02, z - 0.02), 0.03 * b, c.m.accent, 0.012);
    }
  }
  for (const s of [-1, 1]) {
    const arm = v(s * 0.45 * b, y + 0.15, 0.45 * b);
    limb(c.g, v(s * 0.25 * b, y, 0.2 * b), arm, 0.06 * b, c.m.body);
    mesh(c.g, sph(0.15 * b, 1), c.m.body, arm, v(0.8, 0.7, 1.3));
    spike(c.g, v(arm.x, arm.y + 0.03, arm.z + 0.12), v(arm.x - s * 0.05, arm.y + 0.06, arm.z + 0.35 * b), 0.06 * b, c.m.accent);
  }
  for (const s of [-1, 1]) {
    limb(c.g, v(s * 0.08, y + 0.1, 0.25 * b), v(s * 0.1, y + 0.28, 0.3 * b), 0.015, c.m.accent);
    mesh(c.g, sph(0.04, 0), c.m.eye, v(s * 0.1, y + 0.3, 0.3 * b));
  }
  if (f.tentacles) for (let i = 0; i < f.tentacles; i++) chain(c.g, curvePts(v((i - 1.5) * 0.05, y, 0.3 * b), v((i - 1.5) * 0.12, y - 0.1, 0.5 * b), v((i - 1.5) * 0.1, 0.05, 0.55 * b), 4), 0.02, 0.01, c.m.detail);
}

function buildFrog(c: Ctx): void {
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  mesh(c.g, sph(0.33 * b, 1), m, v(0, 0.3 * b, 0), v(1.15, 0.8, 1.15));
  mesh(c.g, sph(0.25 * b, 1), c.m.detail, v(0, 0.22 * b, 0.12), v(1, 0.7, 1));
  for (const s of [-1, 1]) {
    mesh(c.g, sph(0.1 * b, 1), m, v(s * 0.17 * b, 0.52 * b, 0.18 * b));
    mesh(c.g, sph(0.06 * b, 0), c.m.eye, v(s * 0.18 * b, 0.55 * b, 0.25 * b));
    mesh(c.g, sph(0.15 * b, 1), m, v(s * 0.3 * b, 0.15 * b, -0.18 * b), v(0.8, 0.6, 1.4));
    limb(c.g, v(s * 0.22 * b, 0.2 * b, 0.25 * b), v(s * 0.28 * b, 0.03, 0.35 * b), 0.04 * b, m);
  }
  mesh(c.g, box(0.4 * b, 0.02, 0.05), c.m.dark, v(0, 0.28 * b, 0.36 * b));
}

function buildSerpent(c: Ctx, naga = false): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const r = 0.11 * b;
  const pts: V3[] = [];
  const coils = 12;
  for (let i = 0; i < coils; i++) {
    const t = i / (coils - 1);
    const a = t * Math.PI * 3.2;
    const rad = 0.45 * b * (1 - t * 0.55);
    pts.push(v(Math.cos(a) * rad, r * 0.9 + t * 0.05, Math.sin(a) * rad - 0.05));
  }
  pts.reverse();
  chain(c.g, pts, r * 0.35, r, m);
  const base = pts[pts.length - 1];
  if (naga) {
    const top = v(base.x * 0.3, 0.95, 0.2);
    chain(c.g, curvePts(base, v(base.x * 0.6, 0.45, base.z + 0.2), top, 5), r, r * 0.9, m);
    const save = c.g;
    const upper = new THREE.Group();
    upper.position.copy(top).add(v(0, -0.7, 0));
    c.g.add(upper);
    c.g = upper;
    const specBackup = c.spec;
    c.spec = { ...specBackup, features: { ...f, robe: false, floating: false, tail: false, wings: undefined }, proportions: { ...specBackup.proportions, height: 0.85 } };
    // Tronco superior humanoide (sem pernas)
    const chestY = 1.0;
    mesh(c.g, cyl(0.2 * b, 0.16 * b, 0.45, 8), m, v(0, 0.82, 0));
    const headR = 0.17 * c.spec.proportions.head;
    const head = v(0, chestY + 0.32, 0.04);
    mesh(c.g, sph(headR, 1), f.fins ? c.m.body : c.m.accent, head);
    eyes(c, head, headR, 2);
    if (f.fins) for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.8, head.y, head.z), v(head.x + s * headR * 1.6, head.y + headR * 0.6, head.z - headR * 0.4), headR * 0.25, c.m.accent);
    if (f.horns) horns(c, head, headR, f.horns);
    if (f.crown) crown(c, head, headR);
    if (f.spikes) backSpikes(c, v(0, chestY + 0.1, -0.15), v(0, 0.6, -0.2), 0.2, 4);
    const arms = Math.max(2, f.arms ?? 2);
    for (let i = 0; i < arms; i++) {
      const s = i % 2 === 0 ? 1 : -1;
      const tier = Math.floor(i / 2);
      const sh = v(s * 0.22 * b, chestY - tier * 0.12, 0);
      const hand = v(s * (0.42 + tier * 0.1) * b, chestY - 0.3 + tier * 0.15, 0.2);
      limb(c.g, sh, hand, 0.05 * b, m, 0.04 * b);
      if (f.weapon && (i === 0 || arms > 2)) weapon(c, hand, f.weapon, 0.75);
    }
    c.spec = specBackup;
    c.g = save;
  } else {
    const headPos = v(base.x * 0.5, 0.55 * b, 0.35 * b);
    chain(c.g, curvePts(base, v(base.x, 0.6 * b, base.z), headPos, 5), r, r * 0.9, m);
    const head = mesh(c.g, sph(r * 1.5, 1), m, v(headPos.x, headPos.y, headPos.z + r), v(1, 0.7, 1.4));
    eyes(c, head.position, r * 1.5, 2);
    if (f.fangs) for (const s of [-1, 1]) spike(c.g, v(headPos.x + s * r * 0.4, headPos.y - r * 0.4, headPos.z + r * 2.2), v(headPos.x + s * r * 0.4, headPos.y - r * 1.1, headPos.z + r * 2.2), r * 0.15, c.m.bone);
    mesh(c.g, box(r * 0.15, r * 0.05, r * 1.2), std('#dc2626'), v(headPos.x, headPos.y - r * 0.3, headPos.z + r * 3));
    if (f.frills) mesh(c.g, cyl(r * 2.6, r * 2.6, r * 0.2, 10), c.m.accent, v(headPos.x, headPos.y + r * 0.4, headPos.z - r * 0.5), undefined, v(Math.PI / 2.3, 0, 0));
    if (f.wings) wings(c, v(headPos.x, headPos.y - r, headPos.z - r * 3), 0.7 * b, f.wings);
  }
}

function buildWorm(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const r = 0.25 * b;
  const pts = curvePts(v(0.3 * b, r * 0.7, -0.5 * b), v(-0.35 * b, r * 0.5, 0.1), v(0, 1.25 * b, 0.25 * b), 7);
  chain(c.g, pts, r * 0.9, r, m);
  pts.forEach((p, i) => {
    if (i % 2 === 0) mesh(c.g, new THREE.TorusGeometry(r * 1.0, r * 0.08, 5, 12), c.m.accent, p, undefined, v(Math.PI / 2, 0, 0));
    if (f.spikes && i % 2) spike(c.g, v(p.x, p.y + r * 0.8, p.z), v(p.x, p.y + r * 1.6, p.z - r * 0.3), r * 0.2, c.m.glow);
    if (f.legs && i < pts.length - 2) for (const s of [-1, 1]) limb(c.g, p, v(p.x + s * r * 1.6, 0.02, p.z), r * 0.08, c.m.accent);
  });
  const mouth = pts[pts.length - 1];
  mesh(c.g, new THREE.TorusGeometry(r * 0.75, r * 0.18, 6, 12), c.m.dark, v(mouth.x, mouth.y + r * 0.2, mouth.z + r * 0.2), undefined, v(-0.6, 0, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const base = v(mouth.x + Math.cos(a) * r * 0.7, mouth.y + r * 0.2 + Math.sin(a) * r * 0.4, mouth.z + r * 0.2 + Math.sin(a) * r * 0.3);
    spike(c.g, base, v(mouth.x, mouth.y + r * 0.3, mouth.z + r * 0.2), r * 0.08, c.m.bone);
  }
  if (f.tentacles) {
    for (let i = 0; i < f.tentacles; i++) {
      const a = (i / f.tentacles) * Math.PI * 2;
      chain(c.g, curvePts(mouth, v(mouth.x + Math.cos(a) * r * 1.5, mouth.y + r * 1.4, mouth.z + Math.sin(a) * r * 1.5), v(mouth.x + Math.cos(a) * r * 2.4, mouth.y + r * 0.4, mouth.z + Math.sin(a) * r * 2.4), 4), r * 0.18, r * 0.06, c.m.accent);
    }
  }
}

function buildFish(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const y = 0.6;
  mesh(c.g, sph(0.3 * b, 1), m, v(0, y, 0), v(0.75, 0.85, 1.7));
  mesh(c.g, sph(0.24 * b, 1), c.m.accent, v(0, y - 0.1 * b, 0.08), v(0.7, 0.6, 1.5));
  const tail = v(0, y, -0.55 * b);
  for (const s of [-1, 1]) spike(c.g, tail, v(0, y + s * 0.3 * b, -0.8 * b), 0.12 * b, m);
  spike(c.g, v(0, y + 0.22 * b, 0), v(0, y + 0.55 * b, -0.18 * b), 0.12 * b, m);
  for (const s of [-1, 1]) spike(c.g, v(s * 0.2 * b, y - 0.08, 0.15 * b), v(s * 0.5 * b, y - 0.22, -0.05), 0.07 * b, m);
  const head = v(0, y + 0.03, 0.42 * b);
  eyes(c, head, 0.17 * b, f.eyes ?? 2);
  if (f.fangs) {
    mesh(c.g, box(0.24 * b, 0.05, 0.08), c.m.dark, v(0, y - 0.08, 0.5 * b));
    for (let i = 0; i < 5; i++) spike(c.g, v((i - 2) * 0.045 * b, y - 0.05, 0.52 * b), v((i - 2) * 0.045 * b, y - 0.11, 0.53 * b), 0.012, c.m.bone);
  }
  if (f.longNeck) {
    chain(c.g, curvePts(head, v(0, y + 0.5, 0.6 * b), v(0, y + 0.8, 0.9 * b), 5), 0.1 * b, 0.07 * b, m);
    mesh(c.g, sph(0.1 * b, 1), m, v(0, y + 0.82, 0.95 * b), v(1, 0.8, 1.4));
  }
  if (f.tentacles) for (let i = 0; i < f.tentacles; i++) chain(c.g, curvePts(v((i - 1.5) * 0.08, y - 0.15, 0.3 * b), v((i - 1.5) * 0.2, y - 0.4, 0.5 * b), v((i - 1.5) * 0.25, 0.05, 0.75 * b), 4), 0.04 * b, 0.015, m);
  // Pedestal de água
  mesh(c.g, cyl(0.35 * b, 0.45 * b, 0.12, 12), std('#0ea5e9', { transparent: true, opacity: 0.55 }), v(0, 0.06, 0));
  limb(c.g, v(0, 0.1, 0), v(0, y - 0.15, 0), 0.06, std('#38bdf8', { transparent: true, opacity: 0.45 }), 0.12);
}

function buildCephalopod(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const y = 0.55 * b;
  mesh(c.g, sph(0.32 * b, 1), m, v(0, y + 0.3 * b, -0.05), v(1, 1.3, 1.05));
  eyes(c, v(0, y + 0.1 * b, 0.05), 0.3 * b, f.eyes ?? 2);
  const n = f.tentacles ?? 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const start = v(Math.cos(a) * 0.15 * b, y - 0.05, Math.sin(a) * 0.15 * b);
    const end = v(Math.cos(a) * 0.75 * b, 0.05, Math.sin(a) * 0.75 * b);
    const ctrl = v(Math.cos(a) * 0.45 * b, y * 0.3 + (i % 2) * 0.25 * b, Math.sin(a) * 0.45 * b);
    chain(c.g, curvePts(start, ctrl, end, 5), 0.07 * b, 0.015, i % 2 ? m : c.m.accent);
  }
}

function buildDragon(c: Ctx, wyvern = false): void {
  const { spec } = c;
  const f = spec.features;
  const P = spec.proportions;
  const b = P.bulk;
  const m = c.m.body;
  const legLen = 0.42 * P.limb;
  const bodyR = 0.32 * b;
  const bodyY = legLen + bodyR * 0.75;
  const bodyLen = 1.0 * b;
  mesh(c.g, sph(bodyR, 2), m, v(0, bodyY, 0), v(1, 0.9, bodyLen / (bodyR * 1.4)));
  mesh(c.g, sph(bodyR * 0.86, 2), c.m.accent, v(0, bodyY - bodyR * 0.25, 0.05), v(0.9, 0.6, bodyLen / (bodyR * 1.5)));
  // Placas peitorais escalonadas
  for (let sc = 0; sc < 4; sc++) {
    mesh(c.g, box(bodyR * (0.95 - sc * 0.08), 0.04 * b, 0.15 * b), c.m.detail, v(0, bodyY - bodyR * 0.5 + sc * 0.02, bodyLen * 0.28 - sc * 0.18 * b));
  }
  const legZs = wyvern ? [-bodyLen * 0.15] : [bodyLen * 0.35, -bodyLen * 0.3];
  for (const z of legZs) {
    for (const s of [-1, 1]) {
      const top = v(s * bodyR * 0.7, bodyY - bodyR * 0.2, z);
      const knee = v(s * bodyR * 0.9, legLen * 0.55, z + 0.08);
      const foot = v(s * bodyR * 0.85, 0.05, z + 0.02);
      limb(c.g, top, knee, 0.095 * b, m, 0.072 * b);
      limb(c.g, knee, foot, 0.072 * b, m, 0.052 * b);
      for (const a of [-0.4, 0, 0.4]) spike(c.g, foot, v(foot.x + Math.sin(a) * 0.11, 0.01, foot.z + Math.cos(a) * 0.14), 0.026, c.m.bone);
    }
  }
  const headR = 0.18 * P.head * b;
  const neckBase = v(0, bodyY + bodyR * 0.3, bodyLen * 0.45);
  const head = v(0, bodyY + 0.62 * b, bodyLen * 0.75);
  chain(c.g, curvePts(neckBase, v(0, bodyY + 0.55 * b, bodyLen * 0.48), head, 6), bodyR * 0.5, headR * 0.75, m);
  mesh(c.g, sph(headR, 2), m, head, v(0.95, 0.85, 1.1));
  const snoutTip = v(head.x, head.y - headR * 0.15, head.z + headR * 1.65);
  limb(c.g, v(head.x, head.y, head.z + headR * 0.3), snoutTip, headR * 0.65, m, headR * 0.38);
  mesh(c.g, box(headR * 0.9, headR * 0.25, headR * 1.3), c.m.accent, v(head.x, head.y - headR * 0.5, head.z + headR * 0.95));
  for (const s of [-1, 1]) {
    spike(c.g, v(head.x + s * headR * 0.25, head.y - headR * 0.4, head.z + headR * 1.4), v(head.x + s * headR * 0.25, head.y - headR * 0.75, head.z + headR * 1.42), headR * 0.07, c.m.bone);
    mesh(c.g, sph(headR * 0.13, 0), c.m.eye, v(head.x + s * headR * 0.45, head.y + headR * 0.25, head.z + headR * 0.6));
    // Arcada supraciliar
    mesh(c.g, box(headR * 0.32, headR * 0.1, headR * 0.45), c.m.accent, v(head.x + s * headR * 0.42, head.y + headR * 0.38, head.z + headR * 0.52), undefined, v(0.18, 0, s * -0.25));
  }
  horns(c, head, headR, f.horns || 'small');
  if (f.frills) {
    for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.8, head.y, head.z - headR * 0.2), v(head.x + s * headR * 1.7, head.y + headR * 0.3, head.z - headR * 0.8), headR * 0.35, c.m.membrane);
  }
  tailChain(c, v(0, bodyY, -bodyLen * 0.5), 1.25 * b, bodyR * 0.45, m, wyvern || f.stinger, 0.05);
  if (!wyvern && !f.stinger) {
    // Ponta de lança na cauda do dragão
    spike(c.g, v(0, Math.max(0.08, bodyY - 0.22), -bodyLen * 0.5 - 1.22 * b), v(0, Math.max(0.12, bodyY - 0.15), -bodyLen * 0.5 - 1.52 * b), 0.11 * b, c.m.accent);
  }
  if (f.spikes || f.horns === 'big') backSpikes(c, v(0, bodyY + bodyR * 0.85, bodyLen * 0.35), v(0, bodyY + bodyR * 0.5, -bodyLen * 0.75), 0.2 * b, 7);
  wings(c, v(0, bodyY + bodyR * 0.65, bodyLen * 0.12), 1.35 * b, 'bat');
  c.anchors = { head: head.clone(), headR, body: v(0, bodyY, 0), bodyR, bodyLen, upright: false };
}

function buildTurtle(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  mesh(c.g, new THREE.SphereGeometry(0.55 * b, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), c.m.accent, v(0, 0.2, 0), v(1, 0.8, 1.2));
  mesh(c.g, cyl(0.56 * b, 0.5 * b, 0.12, 12), m, v(0, 0.2, 0), v(1, 1, 1.2));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    mesh(c.g, sph(0.13 * b, 1), m, v(x * 0.42 * b, 0.12, z * 0.45 * b), f.fins ? v(1.6, 0.4, 0.9) : v(1, 1.2, 1));
  }
  const head = v(0, 0.42 * b, 0.82 * b);
  limb(c.g, v(0, 0.25, 0.5 * b), head, 0.12 * b, m, 0.1 * b);
  mesh(c.g, sph(0.16 * b, 1), m, head, v(1, 0.9, 1.25));
  eyes(c, head, 0.16 * b, 2);
  if (f.horns) horns(c, head, 0.16 * b, f.horns);
  if (f.spikes) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      spike(c.g, v(Math.cos(a) * 0.3 * b, 0.55 * b, Math.sin(a) * 0.36 * b), v(Math.cos(a) * 0.36 * b, 0.78 * b, Math.sin(a) * 0.42 * b), 0.06 * b, c.m.bone);
    }
  }
  if (f.tail) tailChain(c, v(0, 0.2, -0.6 * b), 0.4 * b, 0.07 * b, m, false, 0.1);
}

function buildHydra(c: Ctx): void {
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const bodyY = 0.5;
  mesh(c.g, sph(0.38 * b, 1), m, v(0, bodyY, -0.1), v(1.1, 0.85, 1.35));
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    limb(c.g, v(x * 0.25 * b, bodyY - 0.1, z * 0.3 * b - 0.1), v(x * 0.3 * b, 0.04, z * 0.32 * b - 0.1), 0.08 * b, m, 0.06 * b);
  }
  const n = c.spec.features.heads ?? 5;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = -0.9 + t * 1.8;
    const base = v(Math.sin(a) * 0.18 * b, bodyY + 0.2, 0.2 * b);
    const head = v(Math.sin(a) * 0.65 * b, bodyY + 0.55 + (1 - Math.abs(a)) * 0.45, 0.55 * b + Math.cos(a) * 0.15);
    chain(c.g, curvePts(base, v(Math.sin(a) * 0.35 * b, bodyY + 0.8, 0.25 * b), head, 5), 0.07 * b, 0.05 * b, m);
    mesh(c.g, sph(0.1 * b, 1), m, head, v(0.9, 0.8, 1.4));
    eyes(c, head, 0.1 * b, 2);
    for (const s of [-1, 1]) spike(c.g, v(head.x + s * 0.02, head.y - 0.04, head.z + 0.12 * b), v(head.x + s * 0.02, head.y - 0.1, head.z + 0.13 * b), 0.012, c.m.bone);
  }
  tailChain(c, v(0, bodyY, -0.6 * b), 0.7 * b, 0.12 * b, m, false, 0);
}

function buildOoze(c: Ctx): void {
  const b = c.spec.proportions.bulk;
  const f = c.spec.features;
  const n = 6 + Math.floor(c.rnd() * 4);
  mesh(c.g, sph(0.42 * b, 2), c.m.body, v(0, 0.3 * b, 0), v(1.25, 0.72, 1.15));
  for (let i = 0; i < n; i++) {
    const a = c.rnd() * Math.PI * 2;
    const d = 0.25 + c.rnd() * 0.3;
    const r = 0.12 + c.rnd() * 0.16;
    const bub = mesh(c.g, sph(r * b, 1), c.m.body, v(Math.cos(a) * d * b, r * b * 0.7 + c.rnd() * 0.25 * b, Math.sin(a) * d * b));
    bub.userData.wobble = i;
    c.animated.push(bub);
  }
  for (let i = 0; i < 4; i++) {
    mesh(c.g, i % 2 ? sph(0.05 * b, 0) : box(0.08 * b, 0.03, 0.03), c.m.bone, v((c.rnd() - 0.5) * 0.5 * b, 0.2 * b + c.rnd() * 0.15, (c.rnd() - 0.5) * 0.4 * b), undefined, v(c.rnd(), c.rnd(), c.rnd()));
  }
  if (f.eyes) eyes(c, v(0, 0.48 * b, 0.25 * b), 0.3 * b, f.eyes);
}

function buildCube(c: Ctx): void {
  const s = 1.15 * c.spec.proportions.bulk;
  mesh(c.g, box(s, s, s), c.m.body, v(0, s / 2, 0));
  mesh(c.g, sph(0.13, 1), c.m.bone, v(0.1, s * 0.4, 0.05));
  mesh(c.g, box(0.32, 0.04, 0.04), c.m.bone, v(-0.15, s * 0.3, -0.1), undefined, v(0.3, 0.7, 0.4));
  mesh(c.g, box(0.05, 0.3, 0.03), c.m.metal, v(0.2, s * 0.6, -0.2), undefined, v(0.6, 0, 0.4));
  mesh(c.g, cyl(0.07, 0.07, 0.02, 10), std('#facc15', { metalness: 0.8 }), v(-0.25, s * 0.15, 0.2), undefined, v(0.5, 0, 0.3));
}

function buildElemental(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const el = f.element || 'fire';
  if (el === 'earth') {
    const rock = c.m.body;
    mesh(c.g, new THREE.DodecahedronGeometry(0.42 * b, 0), rock, v(0, 0.95, 0), v(1.15, 1, 0.85));
    mesh(c.g, new THREE.DodecahedronGeometry(0.22 * b, 0), rock, v(0, 1.5, 0.08));
    for (const s of [-1, 1]) {
      mesh(c.g, new THREE.DodecahedronGeometry(0.2 * b, 0), rock, v(s * 0.55 * b, 1.05, 0.05));
      mesh(c.g, new THREE.DodecahedronGeometry(0.24 * b, 0), rock, v(s * 0.65 * b, 0.55, 0.15));
      mesh(c.g, new THREE.DodecahedronGeometry(0.22 * b, 0), rock, v(s * 0.22 * b, 0.32, 0));
      mesh(c.g, new THREE.DodecahedronGeometry(0.18 * b, 0), rock, v(s * 0.24 * b, 0.1, 0.05));
    }
    eyes(c, v(0, 1.5, 0.08), 0.22 * b, 2);
    for (let i = 0; i < 5; i++) mesh(c.g, new THREE.OctahedronGeometry(0.06, 0), std('#a78bfa', { emissive: '#7c3aed' }), v((c.rnd() - 0.5) * 0.6, 0.8 + c.rnd() * 0.5, 0.3));
    return;
  }
  if (el === 'air' || el === 'dust' || el === 'lightning') {
    const mat = el === 'lightning' ? c.m.glow : c.m.body;
    for (let i = 0; i < 6; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry((0.15 + i * 0.09) * b, 0.05 * b, 6, 16), mat);
      t.position.set(Math.sin(i) * 0.05, 0.15 + i * 0.25, 0);
      t.rotation.x = Math.PI / 2 + Math.sin(i * 1.7) * 0.25;
      t.userData.spin = i;
      c.g.add(t);
      c.animated.push(t);
    }
    eyes(c, v(0, 1.35, 0.25 * b), 0.3 * b, 2);
    return;
  }
  if (el === 'water' || el === 'ice' || el === 'steam') {
    const mat = c.m.body;
    mesh(c.g, cone(0.5 * b, 0.6, 10), mat, v(0, 0.3, 0), undefined, v(0, 0, 0));
    mesh(c.g, sph(0.38 * b, 2), mat, v(0, 0.9, 0), v(1, 1.2, 0.9));
    mesh(c.g, sph(0.25 * b, 1), mat, v(0, 1.45, 0.05));
    for (const s of [-1, 1]) chain(c.g, curvePts(v(s * 0.3 * b, 1.1, 0), v(s * 0.75 * b, 1.2, 0.2), v(s * 0.6 * b, 0.6, 0.35), 4), 0.12 * b, 0.07 * b, mat);
    if (el === 'ice') for (let i = 0; i < 6; i++) spike(c.g, v((c.rnd() - 0.5) * 0.6, 0.7 + c.rnd() * 0.8, (c.rnd() - 0.5) * 0.4), v((c.rnd() - 0.5) * 1.2, 1.2 + c.rnd() * 0.8, (c.rnd() - 0.5) * 0.8), 0.06, c.m.detail);
    eyes(c, v(0, 1.45, 0.05), 0.25 * b, 2);
    return;
  }
  // Fogo / Magma
  const core = c.m.glow;
  mesh(c.g, sph(0.3 * b, 1), core, v(0, 0.9, 0), v(1, 1.3, 1));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.18 + (i % 3) * 0.08;
    const fl = mesh(c.g, cone(0.15 * b, (0.7 + (i % 3) * 0.35) * b, 5), i % 2 ? core : c.m.body, v(Math.cos(a) * r * b, 0.35 + (i % 3) * 0.35, Math.sin(a) * r * b));
    fl.userData.flicker = i;
    c.animated.push(fl);
  }
  const top = mesh(c.g, cone(0.22 * b, 0.9 * b, 6), core, v(0, 1.55, 0));
  top.userData.flicker = 10;
  c.animated.push(top);
  eyes(c, v(0, 1.15, 0.22 * b), 0.25 * b, 2);
  if (el === 'magma') for (let i = 0; i < 5; i++) mesh(c.g, new THREE.DodecahedronGeometry(0.1, 0), c.m.dark, v((c.rnd() - 0.5) * 0.6, 0.4 + c.rnd() * 0.9, 0.2));
}

function buildGolem(c: Ctx): void {
  const f = c.spec.features;
  const P = c.spec.proportions;
  const b = P.bulk * (f.bulky ? 1.15 : 1);
  const m = c.m.body;
  const H = P.height;
  for (const s of [-1, 1]) {
    mesh(c.g, box(0.2 * b, 0.6 * H, 0.22 * b), m, v(s * 0.17 * b, 0.32 * H, 0));
    mesh(c.g, box(0.24 * b, 0.1, 0.32 * b), c.m.accent, v(s * 0.17 * b, 0.05, 0.04));
  }
  mesh(c.g, box(0.62 * b, 0.65 * H, 0.38 * b), m, v(0, 0.95 * H, 0));
  mesh(c.g, box(0.4 * b, 0.25 * H, 0.06), c.m.accent, v(0, 1.0 * H, 0.2 * b));
  mesh(c.g, sph(0.07, 1), c.m.glow, v(0, 1.0 * H, 0.24 * b));
  for (const s of [-1, 1]) {
    mesh(c.g, box(0.24 * b, 0.22 * H, 0.26 * b), c.m.accent, v(s * 0.43 * b, 1.18 * H, 0));
    mesh(c.g, box(0.17 * b, 0.6 * H, 0.18 * b), m, v(s * 0.47 * b, 0.78 * H, 0.04));
    mesh(c.g, box(0.21 * b, 0.18 * H, 0.22 * b), c.m.accent, v(s * 0.47 * b, 0.43 * H, 0.06));
  }
  const head = v(0, 1.42 * H, 0.02);
  mesh(c.g, box(0.28 * b, 0.26 * H, 0.26 * b), m, head);
  mesh(c.g, box(0.22 * b, 0.05, 0.05), c.m.dark, v(0, head.y + 0.02, head.z + 0.13 * b));
  for (const s of [-1, 1]) mesh(c.g, sph(0.03, 0), c.m.glow, v(s * 0.06 * b, head.y + 0.03, head.z + 0.15 * b));
  if (f.weapon) weapon(c, v(0.47 * b, 0.43 * H, 0.1), f.weapon, 1);
}

function buildArmor(c: Ctx): void {
  const f = c.spec.features;
  const metal = c.m.metal;
  for (const s of [-1, 1]) {
    limb(c.g, v(s * 0.12, 0.72, 0), v(s * 0.13, 0.08, 0), 0.08, metal, 0.07);
    mesh(c.g, box(0.14, 0.08, 0.24), c.m.dark, v(s * 0.13, 0.04, 0.04));
    mesh(c.g, sph(0.1, 1), metal, v(s * 0.3, 1.22, 0), v(1.2, 0.8, 1));
    limb(c.g, v(s * 0.3, 1.2, 0), v(s * 0.38, 0.8, 0.12), 0.06, metal);
  }
  mesh(c.g, cyl(0.25, 0.2, 0.62, 8), metal, v(0, 1.0, 0));
  mesh(c.g, cyl(0.21, 0.24, 0.2, 8), c.m.accent, v(0, 0.72, 0));
  const head = v(0, 1.48, 0);
  mesh(c.g, cyl(0.15, 0.17, 0.3, 8), metal, head);
  mesh(c.g, box(0.2, 0.04, 0.05), c.m.dark, v(0, head.y + 0.02, 0.15));
  for (const s of [-1, 1]) mesh(c.g, sph(0.025, 0), c.m.eye, v(s * 0.05, head.y + 0.02, 0.17));
  mesh(c.g, cone(0.04, 0.2, 5), std('#b91c1c'), v(0, head.y + 0.25, -0.02));
  if (f.weapon) weapon(c, v(0.38, 0.8, 0.12), f.weapon);
  if (f.shield) shield(c, v(-0.42, 0.9, 0.18));
}

function buildSword(c: Ctx): void {
  const g = new THREE.Group();
  g.position.set(0, 0.9, 0);
  g.rotation.z = 0.35;
  c.g.add(g);
  mesh(g, box(0.12, 1.1, 0.03), c.m.metal, v(0, 0.2, 0));
  mesh(g, cone(0.085, 0.2, 4), c.m.metal, v(0, 0.85, 0), undefined, v(0, Math.PI / 4, 0));
  mesh(g, box(0.4, 0.06, 0.08), std('#ca8a04', { metalness: 0.7 }), v(0, -0.38, 0));
  mesh(g, cyl(0.035, 0.035, 0.25, 6), c.m.wood, v(0, -0.53, 0));
  mesh(g, sph(0.06, 1), c.m.glow, v(0, -0.68, 0));
  g.userData.bob = true;
  c.animated.push(g);
  mesh(c.g, new THREE.TorusGeometry(0.3, 0.02, 5, 18), c.m.glow, v(0, 0.06, 0), undefined, v(Math.PI / 2, 0, 0));
}

function buildRug(c: Ctx): void {
  const geo = new THREE.PlaneGeometry(1.2, 0.8, 10, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 4) * 0.08 + Math.cos(y * 5) * 0.05 + (x > 0.3 ? (x - 0.3) * 0.6 : 0));
  }
  geo.computeVertexNormals();
  const rug = mesh(c.g, geo, std(c.spec.colors.body, { side: THREE.DoubleSide }), v(0, 0.2, 0), undefined, v(-Math.PI / 2, 0, 0.2));
  rug.userData.wobble = 1;
  const border = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), std('#ca8a04', { side: THREE.DoubleSide }));
  border.position.set(-0.05, 0.215, 0);
  border.rotation.set(-Math.PI / 2, 0, 0.2);
  c.g.add(border);
}

function buildTree(c: Ctx): void {
  const f = c.spec.features;
  const H = c.spec.proportions.height;
  const b = c.spec.proportions.bulk;
  const bark = c.m.body;
  const leaf = c.m.accent;
  limb(c.g, v(0, 0, 0), v(0, 1.1 * H, 0), 0.22 * b, bark, 0.16 * b, 7);
  for (const s of [-1, 1]) {
    limb(c.g, v(s * 0.08, 0.05, 0), v(s * 0.35 * b, 0.02, 0.2), 0.1 * b, bark, 0.04);
    limb(c.g, v(s * 0.08, 0.05, 0), v(s * 0.3 * b, 0.02, -0.25), 0.1 * b, bark, 0.04);
    const elbow = v(s * 0.45 * b, 0.95 * H, 0.1);
    limb(c.g, v(s * 0.12, 0.85 * H, 0), elbow, 0.08 * b, bark, 0.06 * b);
    limb(c.g, elbow, v(s * 0.55 * b, 0.55 * H, 0.3), 0.06 * b, bark, 0.03);
    for (const a of [-0.4, 0.4]) limb(c.g, v(s * 0.55 * b, 0.55 * H, 0.3), v(s * (0.6 + a * 0.2) * b, 0.4 * H, 0.38 + a * 0.1), 0.02, bark, 0.01);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    mesh(c.g, sph((0.32 + c.rnd() * 0.1) * b, 0), leaf, v(Math.cos(a) * 0.32 * b, 1.25 * H + c.rnd() * 0.2, Math.sin(a) * 0.28 * b));
  }
  mesh(c.g, sph(0.38 * b, 0), leaf, v(0, 1.55 * H, 0));
  eyes(c, v(0, 0.85 * H, 0.12 * b), 0.2 * b, 2);
  mesh(c.g, box(0.14 * b, 0.04, 0.05), c.m.dark, v(0, 0.68 * H, 0.2 * b));
  if (f.spikes) for (let i = 0; i < 10; i++) spike(c.g, v((c.rnd() - 0.5) * 0.3, 0.2 + c.rnd() * 0.9 * H, 0.15), v((c.rnd() - 0.5) * 0.6, 0.3 + c.rnd() * 0.9 * H, 0.35), 0.025, c.m.bone);
}

function buildFungus(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const stalk = c.m.body;
  const cap = c.m.accent;
  limb(c.g, v(0, 0, 0), v(0, 0.75, 0), 0.16 * b, stalk, 0.11 * b, 8);
  mesh(c.g, new THREE.SphereGeometry(0.48 * b, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, v(0, 0.72, 0), v(1, 0.65, 1));
  mesh(c.g, cyl(0.47 * b, 0.47 * b, 0.04, 12), c.m.detail, v(0, 0.72, 0));
  for (let i = 0; i < 7; i++) {
    const a = c.rnd() * Math.PI * 2;
    const r = 0.1 + c.rnd() * 0.25;
    mesh(c.g, sph(0.05 * b, 0), std('#f8fafc'), v(Math.cos(a) * r * b, 0.72 + 0.28 * b * (1 - r), Math.sin(a) * r * b));
  }
  for (let i = 0; i < 3; i++) {
    const a = c.rnd() * Math.PI * 2;
    limb(c.g, v(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35), v(Math.cos(a) * 0.35, 0.25, Math.sin(a) * 0.35), 0.04, stalk, 0.03);
    mesh(c.g, new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), cap, v(Math.cos(a) * 0.35, 0.24, Math.sin(a) * 0.35));
  }
  if (f.eyes) eyes(c, v(0, 0.5, 0.12 * b), 0.16 * b, f.eyes);
  if (f.fangs) {
    mesh(c.g, box(0.2 * b, 0.05, 0.05), c.m.dark, v(0, 0.35, 0.15 * b));
    for (let i = 0; i < 4; i++) spike(c.g, v((i - 1.5) * 0.04, 0.37, 0.16 * b), v((i - 1.5) * 0.04, 0.32, 0.17 * b), 0.012, c.m.bone);
  }
  if (f.tentacles) for (let i = 0; i < f.tentacles; i++) {
    const a = (i / f.tentacles) * Math.PI * 2;
    chain(c.g, curvePts(v(Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12), v(Math.cos(a) * 0.5, 0.6, Math.sin(a) * 0.5), v(Math.cos(a) * 0.7, 0.05, Math.sin(a) * 0.7), 5), 0.03, 0.01, c.m.accent);
  }
}

function buildMound(c: Ctx): void {
  const b = c.spec.proportions.bulk;
  mesh(c.g, sph(0.5 * b, 1), c.m.body, v(0, 0.5, 0), v(1, 1.15, 0.9));
  mesh(c.g, sph(0.3 * b, 1), c.m.body, v(0, 1.1, 0.05));
  for (let i = 0; i < 14; i++) {
    const a = c.rnd() * Math.PI * 2;
    const y = 0.2 + c.rnd() * 0.9;
    chain(c.g, curvePts(v(Math.cos(a) * 0.4 * b, y, Math.sin(a) * 0.38 * b), v(Math.cos(a) * 0.6 * b, y - 0.15, Math.sin(a) * 0.55 * b), v(Math.cos(a) * 0.55 * b, Math.max(0.02, y - 0.5), Math.sin(a) * 0.6 * b), 3), 0.03, 0.015, i % 2 ? c.m.accent : std('#365314'));
  }
  for (const s of [-1, 1]) chain(c.g, curvePts(v(s * 0.4 * b, 0.9, 0), v(s * 0.75 * b, 0.8, 0.2), v(s * 0.65 * b, 0.25, 0.35), 4), 0.12 * b, 0.08 * b, c.m.body);
  eyes(c, v(0, 1.12, 0.05), 0.3 * b, 2);
}

function buildEyeTyrant(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const y = 1.0;
  const R = 0.48 * b;
  mesh(c.g, sph(R, 2), c.m.body, v(0, y, 0));
  mesh(c.g, sph(R * 0.38, 1), std('#f8fafc'), v(0, y + R * 0.18, R * 0.72));
  mesh(c.g, sph(R * 0.2, 1), c.m.eye, v(0, y + R * 0.18, R * 0.98));
  mesh(c.g, sph(R * 0.09, 0), c.m.dark, v(0, y + R * 0.18, R * 1.12));
  mesh(c.g, box(R * 1.2, R * 0.15, R * 0.4), c.m.dark, v(0, y - R * 0.42, R * 0.72));
  for (let i = 0; i < 8; i++) spike(c.g, v((i - 3.5) * R * 0.15, y - R * 0.35, R * 0.92), v((i - 3.5) * R * 0.15, y - R * 0.5, R * 0.95), R * 0.04, c.m.bone);
  const n = f.eyes ?? 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const base = v(Math.cos(a) * R * 0.5, y + R * 0.75, Math.sin(a) * R * 0.5 - R * 0.1);
    const tip = v(Math.cos(a) * R * 1.1, y + R * 1.25 + (i % 3) * R * 0.15, Math.sin(a) * R * 1.0);
    chain(c.g, curvePts(base, v(base.x * 1.4, tip.y, base.z * 1.4), tip, 4), R * 0.06, R * 0.04, c.m.body);
    mesh(c.g, sph(R * 0.09, 1), std('#f8fafc'), tip);
    mesh(c.g, sph(R * 0.05, 0), c.m.eye, v(tip.x * 1.05, tip.y, tip.z * 1.05 + R * 0.04));
  }
  mesh(c.g, cyl(R * 0.4, R * 0.55, 0.06, 12), std('#1e1b4b', { transparent: true, opacity: 0.5 }), v(0, 0.03, 0));
}

function buildBlob(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const y = 0.5 * b;
  mesh(c.g, sph(0.45 * b, 2), c.m.body, v(0, y, 0), v(1.2, 1, 1.1));
  for (let i = 0; i < 4; i++) {
    const a = c.rnd() * Math.PI * 2;
    mesh(c.g, sph((0.15 + c.rnd() * 0.1) * b, 1), c.m.body, v(Math.cos(a) * 0.45 * b, 0.15, Math.sin(a) * 0.45 * b));
  }
  const n = f.eyes ?? 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 1.6 - 0.8;
    const h = 0.25 + c.rnd() * 0.5;
    const p = v(Math.sin(a) * 0.45 * b, y + (h - 0.5) * 0.7 * b, Math.cos(a) * 0.45 * b);
    mesh(c.g, sph(0.07 * b, 1), std('#f8fafc'), p);
    mesh(c.g, sph(0.035 * b, 0), c.m.eye, v(p.x * 1.07, p.y, p.z * 1.07));
  }
  if (f.fangs) {
    for (let k = 0; k < 2; k++) {
      const mz = v((k - 0.5) * 0.35 * b, y - 0.12 * b + k * 0.12, 0.5 * b);
      mesh(c.g, box(0.18 * b, 0.05, 0.04), c.m.dark, mz);
      for (let i = 0; i < 3; i++) spike(c.g, v(mz.x + (i - 1) * 0.04, mz.y + 0.03, mz.z + 0.02), v(mz.x + (i - 1) * 0.04, mz.y - 0.02, mz.z + 0.03), 0.01, c.m.bone);
    }
  }
  if (f.tentacles) for (let i = 0; i < f.tentacles; i++) {
    const a = (i / f.tentacles) * Math.PI * 2;
    chain(c.g, curvePts(v(Math.cos(a) * 0.3 * b, y + 0.2, Math.sin(a) * 0.3 * b), v(Math.cos(a) * 0.7 * b, y + 0.7, Math.sin(a) * 0.7 * b), v(Math.cos(a) * 0.85 * b, y + 0.3, Math.sin(a) * 0.9 * b), 5), 0.05 * b, 0.02, c.m.accent);
  }
  if (f.arms) for (let i = 0; i < f.arms; i++) {
    const a = (i / f.arms) * Math.PI * 2 + 0.5;
    limb(c.g, v(Math.cos(a) * 0.35 * b, y, Math.sin(a) * 0.35 * b), v(Math.cos(a) * 0.65 * b, 0.05, Math.sin(a) * 0.65 * b), 0.06 * b, c.m.body, 0.04 * b);
  }
}

function buildCentaur(c: Ctx): void {
  const f = c.spec.features;
  const b = c.spec.proportions.bulk;
  const m = c.m.body;
  const legLen = 0.55;
  const bodyR = 0.27 * b;
  const bodyY = legLen + bodyR * 0.8;
  mesh(c.g, sph(bodyR, 1), m, v(0, bodyY, -0.1), v(1, 0.9, 2.1));
  for (const z of [0.25, -0.45]) {
    for (const s of [-1, 1]) {
      const top = v(s * bodyR * 0.6, bodyY - bodyR * 0.3, z);
      const knee = v(s * bodyR * 0.65, legLen * 0.5, z + 0.04);
      limb(c.g, top, knee, 0.07 * b, m, 0.06 * b);
      limb(c.g, knee, v(s * bodyR * 0.65, 0.05, z), 0.06 * b, m, 0.045 * b);
      mesh(c.g, box(0.1, 0.06, 0.12), c.m.dark, v(s * bodyR * 0.65, 0.03, z + 0.02));
    }
  }
  if (f.tail) tailChain(c, v(0, bodyY, -0.62), 0.45, 0.05, c.m.accent, false, 0.2);
  if (f.wings) wings(c, v(0, bodyY + bodyR * 0.5, -0.1), 1.1 * b, f.wings);
  const isSphinx = Boolean(f.crown && f.mane);
  const chestY = bodyY + 0.45;
  const torsoMat = isSphinx ? m : std(SKIN(c));
  limb(c.g, v(0, bodyY + 0.05, 0.28), v(0, chestY, 0.32), 0.17 * b, torsoMat, 0.2 * b);
  const head = v(0, chestY + 0.3, 0.35);
  const headR = 0.16 * c.spec.proportions.head;
  if (isSphinx) mesh(c.g, sph(headR * 1.7, 1), c.m.accent, v(head.x, head.y - headR * 0.2, head.z - headR * 0.4), v(1, 1.1, 0.8));
  mesh(c.g, sph(headR, 1), torsoMat, head);
  eyes(c, head, headR, 2);
  if (f.crown) {
    mesh(c.g, cone(headR * 1.1, headR * 1.3, 4), std('#1d4ed8'), v(head.x, head.y + headR * 0.8, head.z - headR * 0.1));
  } else {
    mesh(c.g, sph(headR * 1.05, 1), std('#3f2a14'), v(head.x, head.y + headR * 0.35, head.z - headR * 0.2), v(1, 0.7, 1));
  }
  for (const s of [-1, 1]) {
    const hand = v(s * 0.3 * b, chestY - 0.15, 0.55);
    limb(c.g, v(s * 0.18 * b, chestY, 0.32), hand, 0.045 * b, torsoMat, 0.04 * b);
    if (s === 1 && f.weapon) weapon(c, hand, f.weapon, 0.9);
  }
}

function SKIN(c: Ctx): string {
  const tones = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
  return tones[c.spec.seed % tones.length];
}

function buildSwarm(c: Ctx): void {
  const kind = c.spec.features.swarmOf || 'insect';
  const n = kind === 'snake' || kind === 'fish' ? 9 : 16;
  for (let i = 0; i < n; i++) {
    const a = c.rnd() * Math.PI * 2;
    const r = Math.sqrt(c.rnd()) * 0.55;
    const flying = kind === 'bat' || kind === 'bird' || kind === 'insect';
    const y = flying ? 0.25 + c.rnd() * 1.1 : kind === 'fish' ? 0.2 + c.rnd() * 0.6 : 0.06;
    const p = v(Math.cos(a) * r, y, Math.sin(a) * r);
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = c.rnd() * Math.PI * 2;
    c.g.add(g);
    switch (kind) {
      case 'bat':
      case 'bird':
        mesh(g, sph(0.05, 0), c.m.body, v(0, 0, 0));
        for (const s of [-1, 1]) mesh(g, box(0.14, 0.01, 0.06), kind === 'bat' ? c.m.membrane : c.m.body, v(s * 0.08, 0.01, 0), undefined, v(0, 0, s * 0.4));
        break;
      case 'rat':
        mesh(g, sph(0.07, 0), c.m.body, v(0, 0.04, 0), v(1, 0.8, 1.6));
        limb(g, v(0, 0.04, -0.1), v(0, 0.02, -0.22), 0.01, c.m.detail);
        break;
      case 'snake':
        chain(g, curvePts(v(-0.1, 0.03, -0.1), v(0.1, 0.03, 0), v(-0.05, 0.08, 0.12), 4), 0.025, 0.02, c.m.body);
        break;
      case 'fish':
        mesh(g, sph(0.06, 0), c.m.body, v(0, 0, 0), v(0.6, 0.9, 1.5));
        spike(g, v(0, 0, -0.08), v(0, 0, -0.14), 0.04, c.m.body);
        break;
      case 'claw':
        mesh(g, box(0.08, 0.03, 0.08), c.m.body, v(0, 0.02, 0));
        for (let k = 0; k < 4; k++) limb(g, v((k - 1.5) * 0.02, 0.02, 0.04), v((k - 1.5) * 0.03, 0.01, 0.1), 0.007, c.m.body);
        break;
      case 'spider':
        mesh(g, sph(0.05, 0), c.m.body, v(0, 0.04, 0));
        for (let k = 0; k < 4; k++) for (const s of [-1, 1]) limb(g, v(0, 0.04, 0), v(s * 0.08, 0, (k - 1.5) * 0.04), 0.006, c.m.body);
        break;
      default:
        mesh(g, sph(0.035, 0), c.m.body, v(0, 0, 0), v(1, 0.8, 1.5));
        mesh(g, sph(0.03, 0), c.m.membrane, v(0.03, 0.02, 0), v(1, 0.2, 0.6));
    }
  }
  mesh(c.g, cyl(0.6, 0.65, 0.02, 14), std('#000000', { transparent: true, opacity: 0.25 }), v(0, 0.01, 0));
}

function buildMimic(c: Ctx): void {
  const wood = c.m.body;
  mesh(c.g, box(0.8, 0.45, 0.55), wood, v(0, 0.225, 0));
  for (const x of [-0.3, 0.3]) mesh(c.g, box(0.06, 0.47, 0.57), c.m.metal, v(x, 0.225, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.45, -0.27);
  lid.rotation.x = -0.75;
  c.g.add(lid);
  mesh(lid, box(0.8, 0.18, 0.55), wood, v(0, 0.09, 0.27));
  for (let i = 0; i < 8; i++) spike(lid, v(-0.35 + i * 0.1, 0, 0.5), v(-0.35 + i * 0.1, -0.1, 0.5), 0.025, c.m.bone);
  for (let i = 0; i < 8; i++) spike(c.g, v(-0.35 + i * 0.1, 0.45, 0.25), v(-0.35 + i * 0.1, 0.56, 0.25), 0.025, c.m.bone);
  chain(c.g, curvePts(v(0, 0.42, 0), v(0.1, 0.75, 0.3), v(-0.05, 0.4, 0.62), 5), 0.07, 0.04, std('#be123c'));
  for (const s of [-1, 1]) mesh(c.g, sph(0.05, 0), c.m.eye, v(s * 0.22, 0.62, 0.05));
  for (const s of [-1, 1]) limb(c.g, v(s * 0.38, 0.15, 0.2), v(s * 0.6, 0.02, 0.35), 0.04, std('#7c2d12'), 0.025);
}

function buildWisp(c: Ctx): void {
  const core = mesh(c.g, sph(0.18, 2), c.m.glow, v(0, 0.95, 0));
  core.userData.bob = true;
  c.animated.push(core);
  mesh(c.g, sph(0.32, 1), std(c.spec.colors.body, { transparent: true, opacity: 0.25, emissive: c.spec.emissive || '#67e8f9', emissiveIntensity: 0.8 }), v(0, 0.95, 0));
  for (let i = 0; i < 4; i++) {
    const s = mesh(c.g, sph(0.04, 0), c.m.glow, v(Math.cos(i * 1.6) * 0.4, 0.7 + i * 0.12, Math.sin(i * 1.6) * 0.4));
    s.userData.spin = i;
    c.animated.push(s);
  }
}

// --- Camada de Variação Única ------------------------------------------------------
// Cada monstro recebe um padrão de pele, formato de corpo/cabeça e 1–3 acessórios
// exclusivos, garantindo que dois monstros do Bestiário nunca tenham o mesmo visual.

function resolveAnchors(c: Ctx): Anchors {
  if (c.anchors) return c.anchors;
  const bb = new THREE.Box3().setFromObject(c.g);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bb.getSize(size);
  bb.getCenter(center);
  const upright = isUprightArchetype(c.spec.archetype) || size.y > Math.max(size.x, size.z) * 1.1;
  const headR = Math.max(0.08, Math.min(size.x, size.y, size.z) * 0.18);
  return {
    head: v(center.x, bb.max.y - headR * 1.1, upright ? center.z + size.z * 0.15 : bb.max.z - headR * 1.2),
    headR,
    body: center.clone(),
    bodyR: Math.max(0.1, Math.min(size.x, size.z) * 0.32),
    bodyLen: upright ? size.y * 0.45 : size.z * 0.6,
    upright
  };
}

function applyVariant(c: Ctx): void {
  const vv = c.spec.variant;
  if (!vv) return;
  const A = resolveAnchors(c);
  const r = mulberry32(c.spec.seed ^ 0x51ed27);
  const patMat = std(vv.patternColor, { roughness: 0.55 });
  const auraMat = std(vv.auraColor, { emissive: vv.auraColor, emissiveIntensity: 1.25, transparent: true, opacity: 0.85 });
  const { head, headR, body, bodyR, bodyLen, upright } = A;

  // Formato de corpo (silhueta geral)
  const shapeScale: [number, number, number][] = [
    [1, 1, 1],
    [1.12, 0.93, 1.06], // atarracado
    [0.9, 1.1, 0.94], // esguio / alto
    [0.97, 0.97, 1.16] // alongado
  ];
  const [sx, sy, sz] = shapeScale[vv.bodyShape] || shapeScale[0];
  c.g.scale.set(sx, sy, sz);

  // Formato de cabeça
  if (!c.spec.features.headless && !['ooze', 'cube', 'swarm', 'sword', 'rug', 'mimic', 'wisp', 'elemental'].includes(c.spec.archetype)) {
    if (vv.headShape === 1) {
      // Arcada pesada sobre os olhos
      mesh(c.g, box(headR * 1.25, headR * 0.22, headR * 0.5), c.m.accent, v(head.x, head.y + headR * 0.42, head.z + headR * 0.62), undefined, v(0.25, 0, 0));
    } else if (vv.headShape === 2) {
      // Crânio alongado para trás
      mesh(c.g, sph(headR * 0.78, 1), c.m.body, v(head.x, head.y + headR * 0.35, head.z - headR * 0.65), v(0.85, 0.8, 1.35));
    } else if (vv.headShape === 3) {
      // Mandíbula proeminente com dentes laterais
      mesh(c.g, box(headR * 0.95, headR * 0.35, headR * 0.7), c.m.accent, v(head.x, head.y - headR * 0.7, head.z + headR * 0.45));
      for (const s of [-1, 1]) spike(c.g, v(head.x + s * headR * 0.38, head.y - headR * 0.55, head.z + headR * 0.75), v(head.x + s * headR * 0.42, head.y - headR * 0.1, head.z + headR * 0.85), headR * 0.08, c.m.bone);
    }
  }

  // Padrão de pele / pelagem / escamas
  const onBody = (theta: number, phi: number, k = 1.0): V3 => {
    // Ponto na superfície aproximada do corpo (elipsoide)
    if (upright) {
      return v(body.x + Math.cos(theta) * bodyR * k, body.y + (phi - 0.5) * bodyLen * 0.8, body.z + Math.sin(theta) * bodyR * k);
    }
    return v(body.x + Math.cos(theta) * bodyR * k * 0.95, body.y + Math.sin(theta) * bodyR * k * 0.85, body.z + (phi - 0.5) * bodyLen * 0.8);
  };
  switch (vv.pattern) {
    case 'stripes':
      for (let i = 0; i < 5; i++) {
        const p = onBody(Math.PI / 2, 0.12 + i * 0.19, 1.0);
        if (upright) {
          // Faixas semicirculares na frente do torso
          const ring = new THREE.Mesh(new THREE.TorusGeometry(bodyR * 1.01, bodyR * 0.045, 6, 24, Math.PI), patMat);
          ring.position.set(body.x, p.y, body.z);
          ring.rotation.set(Math.PI / 2, 0, Math.PI);
          c.g.add(ring);
        } else {
          // Listras transversais ao longo do dorso (estilo tigre)
          const arc = new THREE.Mesh(new THREE.TorusGeometry(bodyR * 0.97, bodyR * 0.05, 6, 24, Math.PI), patMat);
          arc.position.set(body.x, body.y, p.z);
          arc.scale.set(1, 0.9, 1);
          c.g.add(arc);
        }
      }
      break;
    case 'spots':
      for (let i = 0; i < 9; i++) {
        const p = onBody(r() * Math.PI * (upright ? 2 : 1), 0.1 + r() * 0.8, 1.0);
        mesh(c.g, sph(bodyR * (0.1 + r() * 0.08), 1), patMat, p, v(1, 1, 0.45));
      }
      break;
    case 'bands':
      for (let i = 0; i < 3; i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(bodyR * 1.02, bodyR * 0.06, 8, 28), patMat);
        const p = onBody(0, 0.25 + i * 0.25);
        if (upright) {
          t.position.set(body.x, p.y, body.z);
          t.rotation.x = Math.PI / 2;
        } else {
          t.position.set(body.x, body.y, p.z);
          t.scale.set(0.95, 0.88, 1);
        }
        c.g.add(t);
      }
      break;
    case 'plates':
      for (let i = 0; i < 5; i++) {
        const phi = 0.12 + i * 0.19;
        const p = upright ? v(body.x, body.y + (phi - 0.5) * bodyLen * 0.8, body.z - bodyR * 0.95) : v(body.x, body.y + bodyR * 0.88, body.z + (phi - 0.5) * bodyLen * 0.8);
        mesh(c.g, sph(bodyR * 0.3, 1), patMat, p, upright ? v(1.3, 0.75, 0.4) : v(1.2, 0.35, 0.9));
      }
      break;
  }

  // Acessórios exclusivos
  const back = (t: number): V3 =>
    upright
      ? v(body.x, body.y + (t - 0.4) * bodyLen * 0.9, body.z - bodyR * 0.95)
      : v(body.x, body.y + bodyR * 0.9, body.z + (0.35 - t) * bodyLen);

  for (const ex of vv.extras) {
    switch (ex) {
      case 'crest':
        for (let i = 0; i < 4; i++) {
          const base = v(head.x, head.y + headR * 0.85, head.z + headR * (0.4 - i * 0.35));
          spike(c.g, base, v(base.x, base.y + headR * (0.75 - i * 0.12), base.z - headR * 0.3), headR * 0.16, patMat);
        }
        break;
      case 'plume':
        for (let i = 0; i < 3; i++) {
          const f = mesh(c.g, box(headR * 0.12, headR * 1.1, headR * 0.35), auraMat, v(head.x + (i - 1) * headR * 0.18, head.y + headR * 1.35, head.z - headR * 0.25));
          f.rotation.set(-0.45, 0, (i - 1) * 0.3);
        }
        break;
      case 'backFins':
        for (let i = 0; i < 4; i++) {
          const p = back(0.1 + i * 0.22);
          const fin = mesh(c.g, cone(bodyR * 0.28, bodyR * (0.85 - i * 0.1), 4), patMat, upright ? v(p.x, p.y, p.z - bodyR * 0.25) : v(p.x, p.y + bodyR * 0.3, p.z), v(0.25, 1, 1));
          if (upright) fin.rotation.x = -Math.PI / 2;
        }
        break;
      case 'backSpines':
        for (let i = 0; i < 6; i++) {
          const p = back(0.05 + i * 0.16);
          spike(c.g, p, upright ? v(p.x + (r() - 0.5) * 0.1, p.y + bodyR * 0.3, p.z - bodyR * 0.9) : v(p.x + (r() - 0.5) * 0.1, p.y + bodyR * 0.95, p.z - bodyR * 0.25), bodyR * 0.05, c.m.bone);
        }
        break;
      case 'shoulderSpikes':
        for (const s of [-1, 1]) {
          const base = upright ? v(body.x + s * bodyR * 1.1, body.y + bodyLen * 0.38, body.z) : v(body.x + s * bodyR * 0.75, body.y + bodyR * 0.6, body.z + bodyLen * 0.3);
          for (let k = 0; k < 3; k++) {
            spike(c.g, base, v(base.x + s * bodyR * (0.45 + k * 0.1), base.y + bodyR * (0.5 - k * 0.15), base.z + (k - 1) * bodyR * 0.3), bodyR * 0.09, c.m.bone);
          }
        }
        break;
      case 'armorPlate':
        mesh(c.g, box(bodyR * 1.5, bodyLen * 0.45, bodyR * 0.25), c.m.metal, v(body.x, body.y + bodyLen * 0.12, body.z + bodyR * 0.95));
        mesh(c.g, sph(bodyR * 0.16, 1), auraMat, v(body.x, body.y + bodyLen * 0.14, body.z + bodyR * 1.1));
        break;
      case 'belt':
        {
          const t = new THREE.Mesh(new THREE.TorusGeometry(bodyR * 1.04, bodyR * 0.08, 8, 28), c.m.dark);
          t.position.set(body.x, body.y - bodyLen * 0.25, body.z);
          t.rotation.x = Math.PI / 2;
          c.g.add(t);
          for (const s of [-1, 1]) mesh(c.g, box(bodyR * 0.35, bodyR * 0.4, bodyR * 0.25), patMat, v(body.x + s * bodyR * 0.75, body.y - bodyLen * 0.32, body.z + bodyR * 0.65));
        }
        break;
      case 'glowRunes':
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const rune = mesh(c.g, new THREE.OctahedronGeometry(Math.max(0.05, bodyR * 0.18), 0), auraMat, v(body.x + Math.cos(a) * bodyR * 2, body.y + bodyR * 0.6, body.z + Math.sin(a) * bodyR * 2));
          rune.userData.bob = true;
          c.animated.push(rune);
        }
        break;
      case 'floatingOrbs':
        for (const s of [-1, 1]) {
          const orb = mesh(c.g, sph(Math.max(0.05, headR * 0.35), 2), auraMat, v(head.x + s * headR * 1.8, head.y + headR * 1.1, head.z));
          orb.userData.bob = true;
          c.animated.push(orb);
        }
        break;
      case 'extraEyes':
        for (let i = 0; i < 3; i++) {
          mesh(c.g, sph(headR * 0.11, 1), c.m.eye, v(head.x + (i - 1) * headR * 0.3, head.y + headR * 0.52, head.z + headR * 0.82));
        }
        break;
      case 'mandibles':
        for (const s of [-1, 1]) {
          chain(c.g, curvePts(v(head.x + s * headR * 0.35, head.y - headR * 0.4, head.z + headR * 0.75), v(head.x + s * headR * 0.75, head.y - headR * 0.55, head.z + headR * 1.35), v(head.x + s * headR * 0.2, head.y - headR * 0.6, head.z + headR * 1.65), 4), headR * 0.1, headR * 0.03, c.m.bone);
        }
        break;
      case 'whiskers':
        for (const s of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            limb(c.g, v(head.x + s * headR * 0.3, head.y - headR * 0.2, head.z + headR * 1.05), v(head.x + s * headR * 1.5, head.y - headR * (0.05 + k * 0.2), head.z + headR * 1.0), headR * 0.015, c.m.detail, headR * 0.008);
          }
        }
        break;
      case 'antennae':
        for (const s of [-1, 1]) {
          const base = v(head.x + s * headR * 0.3, head.y + headR * 0.8, head.z + headR * 0.2);
          const tip = v(head.x + s * headR * 1.1, head.y + headR * 2.2, head.z + headR * 0.9);
          chain(c.g, curvePts(base, v(base.x + s * headR * 0.2, base.y + headR * 1.2, base.z), tip, 4), headR * 0.05, headR * 0.03, c.m.dark);
          mesh(c.g, sph(headR * 0.12, 1), auraMat, tip);
        }
        break;
      case 'chinSpikes':
        for (let i = 0; i < 3; i++) {
          spike(c.g, v(head.x + (i - 1) * headR * 0.3, head.y - headR * 0.75, head.z + headR * 0.55), v(head.x + (i - 1) * headR * 0.38, head.y - headR * 1.35, head.z + headR * 0.75), headR * 0.08, c.m.bone);
        }
        break;
      case 'earrings':
        for (const s of [-1, 1]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.18, headR * 0.04, 6, 14), std('#facc15', { metalness: 0.85, roughness: 0.25 }));
          ring.position.set(head.x + s * headR * 0.95, head.y - headR * 0.3, head.z);
          ring.rotation.y = Math.PI / 2;
          c.g.add(ring);
        }
        break;
      case 'warpaint':
        for (const s of [-1, 1]) {
          mesh(c.g, box(headR * 0.12, headR * 0.6, headR * 0.05), auraMat, v(head.x + s * headR * 0.38, head.y - headR * 0.05, head.z + headR * 0.95));
        }
        mesh(c.g, box(headR * 0.9, headR * 0.1, headR * 0.05), auraMat, v(head.x, head.y + headR * 0.45, head.z + headR * 0.88));
        break;
      case 'scars':
        for (let i = 0; i < 3; i++) {
          const p = onBody(Math.PI * (0.25 + r() * 0.5), 0.2 + r() * 0.6, 1.02);
          const sc = mesh(c.g, box(bodyR * 0.55, bodyR * 0.06, bodyR * 0.06), c.m.wound, p);
          sc.rotation.set(r() * 0.6, r() * Math.PI, r() * 1.2);
        }
        break;
      case 'moss':
        for (let i = 0; i < 5; i++) {
          const p = upright ? v(body.x + (r() - 0.5) * bodyR * 1.6, body.y + bodyLen * (0.2 + r() * 0.3), body.z + (r() - 0.5) * bodyR * 1.6) : v(body.x + (r() - 0.5) * bodyR, body.y + bodyR * 0.85, body.z + (r() - 0.5) * bodyLen * 0.8);
          mesh(c.g, sph(bodyR * (0.18 + r() * 0.12), 1), c.m.vine, p, v(1.3, 0.45, 1.2));
        }
        break;
      case 'crystals':
        for (let i = 0; i < 4; i++) {
          const p = back(0.1 + i * 0.25);
          const cr = mesh(c.g, new THREE.OctahedronGeometry(Math.max(0.05, bodyR * (0.22 - i * 0.025)), 0), auraMat, upright ? v(p.x + (r() - 0.5) * bodyR, p.y + bodyR * 0.1, p.z - bodyR * 0.2) : v(p.x + (r() - 0.5) * bodyR * 0.6, p.y + bodyR * 0.3, p.z), v(0.6, 1.6, 0.6));
          cr.rotation.set(r() * 0.5, r() * Math.PI, (r() - 0.5) * 0.6);
        }
        break;
      case 'aura': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.35, bodyR * 2.4), 0.025, 8, 40), auraMat);
        ring.position.set(body.x, 0.03, body.z);
        ring.rotation.x = Math.PI / 2;
        ring.userData.spin = 0;
        c.g.add(ring);
        c.animated.push(ring);
        break;
      }
      case 'bones':
        for (let i = 0; i < 4; i++) {
          const a = r() * Math.PI * 2;
          const d = Math.max(0.3, bodyR * 2.2);
          const p = v(body.x + Math.cos(a) * d, 0.03, body.z + Math.sin(a) * d);
          const bn = mesh(c.g, cyl(0.02, 0.02, 0.22, 8), c.m.bone, p);
          bn.rotation.set(Math.PI / 2, 0, a);
          mesh(c.g, sph(0.035, 1), c.m.bone, v(p.x + Math.cos(a) * 0.11, 0.03, p.z + Math.sin(a) * 0.11));
        }
        break;
      case 'skullTrophy': {
        const p = v(body.x + bodyR * 0.85, body.y - bodyLen * 0.3, body.z + bodyR * 0.55);
        mesh(c.g, sph(bodyR * 0.26, 1), c.m.bone, p);
        for (const s of [-1, 1]) mesh(c.g, sph(bodyR * 0.07, 0), c.m.dark, v(p.x + s * bodyR * 0.09, p.y + bodyR * 0.03, p.z + bodyR * 0.22));
        break;
      }
      case 'tattered':
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (0.7 + i * 0.15);
          const strip = mesh(c.g, box(bodyR * 0.3, bodyLen * 0.55, 0.02), c.m.cloth, v(body.x + Math.cos(a) * bodyR * 1.0, body.y - bodyLen * 0.2, body.z + Math.sin(a) * bodyR * 1.0));
          strip.rotation.set((r() - 0.5) * 0.3, -a + Math.PI / 2, (r() - 0.5) * 0.3);
        }
        break;
      case 'barnacles':
        for (let i = 0; i < 7; i++) {
          const p = onBody(r() * Math.PI, 0.1 + r() * 0.8, 1.0);
          mesh(c.g, cone(bodyR * 0.09, bodyR * 0.14, 6), patMat, p);
        }
        break;
    }
  }
}

// --- Ponto de entrada ------------------------------------------------------------

export interface BuiltMonsterModel {
  group: THREE.Group;
  animate: (t: number) => void;
  dispose: () => void;
}

export function buildMonsterModel(spec: MonsterModelSpec): BuiltMonsterModel {
  const rnd = mulberry32(spec.seed ^ 0x9e3779b9);
  const col = spec.colors;
  const translucent = Boolean(spec.translucent);
  const isGhost = spec.archetype === 'ghost';
  const em = spec.emissive;

  const c: Ctx = {
    g: new THREE.Group(),
    spec,
    rnd,
    animated: [],
    m: {
      body: std(col.body, {
        transparent: translucent,
        opacity: translucent ? (isGhost ? 0.6 : 0.7) : 1,
        emissive: em || (isGhost ? col.body : '#000000'),
        emissiveIntensity: em ? 0.35 : isGhost ? 0.25 : 0,
        roughness: translucent ? 0.25 : 0.72
      }),
      accent: std(col.accent, { transparent: translucent, opacity: translucent ? 0.75 : 1 }),
      detail: std(col.detail),
      eye: std(col.eye, { emissive: col.eye, emissiveIntensity: 1.25 }),
      metal: std('#9ca3af', { metalness: 0.85, roughness: 0.24 }),
      dark: std('#111827', { roughness: 0.85 }),
      bone: std('#e7e5e4', { roughness: 0.54 }),
      wood: std('#78350f', { roughness: 0.82 }),
      cloth: std(col.accent, { transparent: translucent, opacity: translucent ? 0.6 : 1, roughness: 0.82 }),
      membrane: std(shade(col.body, -0.2), {
        side: THREE.DoubleSide,
        transparent: true,
        opacity: spec.archetype === 'insect' || spec.features.wings === 'insect' ? 0.45 : 0.92
      }),
      glow: std(em || elementGlow(spec.features.element) || '#fbbf24', {
        emissive: em || elementGlow(spec.features.element) || '#f59e0b',
        emissiveIntensity: 1.35,
        transparent: true,
        opacity: 0.92
      }),
      wound: std('#6b1d24', { roughness: 0.58 }),
      vine: std('#15803d', { roughness: 0.78 }),
      acid: std('#a3e635', { emissive: '#65a30d', emissiveIntensity: 1.15, roughness: 0.32 })
    }
  };

  switch (spec.archetype) {
    case 'humanoid':
      buildHumanoid(c);
      break;
    case 'giant':
      buildHumanoid(c, { giant: true, scale: 1.05 });
      break;
    case 'skeleton':
      buildHumanoid(c, { undead: 'skeleton' });
      break;
    case 'zombie':
      buildHumanoid(c, { undead: 'zombie' });
      break;
    case 'ghost':
      c.spec = { ...spec, features: { ...spec.features, floating: true, robe: false } };
      buildHumanoid(c);
      c.spec = spec;
      break;
    case 'quadruped':
      buildQuadruped(c);
      break;
    case 'theropod':
      buildTheropod(c);
      break;
    case 'bird':
      buildBird(c);
      break;
    case 'bat':
      buildBat(c);
      break;
    case 'insect':
      buildInsect(c);
      break;
    case 'spider':
      buildSpider(c);
      break;
    case 'scorpion':
      buildScorpion(c);
      break;
    case 'centipede':
      buildCentipede(c);
      break;
    case 'crab':
      buildCrab(c);
      break;
    case 'frog':
      buildFrog(c);
      break;
    case 'serpent':
      buildSerpent(c);
      break;
    case 'naga':
      buildSerpent(c, true);
      break;
    case 'worm':
      buildWorm(c);
      break;
    case 'fish':
      buildFish(c);
      break;
    case 'cephalopod':
      buildCephalopod(c);
      break;
    case 'dragon':
      buildDragon(c);
      break;
    case 'wyvern':
      buildDragon(c, true);
      break;
    case 'turtle':
      buildTurtle(c);
      break;
    case 'hydra':
      buildHydra(c);
      break;
    case 'ooze':
      buildOoze(c);
      break;
    case 'cube':
      buildCube(c);
      break;
    case 'elemental':
      buildElemental(c);
      break;
    case 'golem':
      buildGolem(c);
      break;
    case 'armor':
      buildArmor(c);
      break;
    case 'sword':
      buildSword(c);
      break;
    case 'rug':
      buildRug(c);
      break;
    case 'tree':
      buildTree(c);
      break;
    case 'fungus':
      buildFungus(c);
      break;
    case 'mound':
      buildMound(c);
      break;
    case 'eyeTyrant':
      buildEyeTyrant(c);
      break;
    case 'blob':
      buildBlob(c);
      break;
    case 'centaur':
      buildCentaur(c);
      break;
    case 'swarm':
      buildSwarm(c);
      break;
    case 'mimic':
      buildMimic(c);
      break;
    case 'wisp':
      buildWisp(c);
      break;
  }

  applyVariant(c);

  const root = new THREE.Group();
  root.add(c.g);
  root.name = spec.name;

  // Animações leves (asas batendo, chamas tremulando, flutuação)
  const baseY = new Map<THREE.Object3D, number>();
  const baseRot = new Map<THREE.Object3D, THREE.Euler>();
  const baseScale = new Map<THREE.Object3D, THREE.Vector3>();
  for (const o of c.animated) {
    baseY.set(o, o.position.y);
    baseRot.set(o, o.rotation.clone());
    baseScale.set(o, o.scale.clone());
  }
  const floating = spec.features.floating || ['ghost', 'eyeTyrant', 'wisp', 'elemental', 'bat'].includes(spec.archetype) || (spec.archetype === 'bird' && spec.features.wings);

  const animate = (t: number) => {
    c.g.position.y = floating ? Math.sin(t * 2) * 0.05 : Math.sin(t * 2.4) * 0.008;
    for (const o of c.animated) {
      const ud = o.userData;
      const r0 = baseRot.get(o)!;
      if (ud.flap !== undefined) {
        o.rotation.z = r0.z + Math.sin(t * 6) * 0.35 * ud.flap;
      } else if (ud.flicker !== undefined) {
        const s0 = baseScale.get(o)!;
        o.scale.set(s0.x, s0.y * (0.85 + Math.sin(t * 9 + ud.flicker * 1.7) * 0.18), s0.z);
      } else if (ud.spin !== undefined) {
        o.rotation.z = r0.z + t * (1 + ud.spin * 0.3);
      } else if (ud.wobble !== undefined) {
        const s0 = baseScale.get(o)!;
        const k = 1 + Math.sin(t * 3 + ud.wobble) * 0.06;
        o.scale.set(s0.x * k, s0.y / k, s0.z * k);
      } else if (ud.bob) {
        o.position.y = baseY.get(o)! + Math.sin(t * 2.2) * 0.06;
      }
    }
  };

  const dispose = () => {
    const mats = new Set<THREE.Material>();
    root.traverse((obj) => {
      const mm = obj as THREE.Mesh;
      if (mm.isMesh) {
        mm.geometry.dispose();
        const mt = mm.material;
        if (Array.isArray(mt)) mt.forEach((x) => mats.add(x));
        else if (mt) mats.add(mt);
      }
    });
    Object.values(c.m).forEach((mt) => mats.add(mt));
    mats.forEach((mt) => mt.dispose());
  };

  return { group: root, animate, dispose };
}

function elementGlow(el?: string): string | undefined {
  switch (el) {
    case 'fire':
      return '#fb923c';
    case 'magma':
      return '#f97316';
    case 'ice':
      return '#bae6fd';
    case 'lightning':
      return '#93c5fd';
    case 'shadow':
      return '#818cf8';
    case 'water':
    case 'steam':
      return '#7dd3fc';
    default:
      return undefined;
  }
}
