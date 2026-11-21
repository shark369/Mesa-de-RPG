import * as THREE from 'three';

/**
 * DADOS POLIÉDRICOS 3D
 * Porte (TypeScript / three r170) do protótipo `rolador_de_dados_rpg_3d.html`:
 *  - Poliedros reais (D4 tetraedro, D6 cubo, D8 octaedro, D10 trapezoedro pentagonal,
 *    D12 dodecaedro, D20 icosaedro e D100 "Zocchihedron" de 100 faces).
 *  - Cada face poligonal recebe UV plano próprio, com o número centralizado.
 *  - `computeTargetQuaternion` gira o dado para que a face sorteada fique de frente para a câmera.
 */

export type DieKind = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DieFaceMeta {
  label: string;
  normal: THREE.Vector3;
  upDir: THREE.Vector3;
}

export interface DieTheme {
  base: string; // cor de fundo da face
  glow: string; // brilho do gradiente central
  edge: string; // escurecimento das bordas
  ink: string; // cor do número
}

export const DIE_THEMES: Record<'red' | 'secret' | 'discarded', DieTheme> = {
  red: { base: '#820e0e', glow: 'rgba(170, 28, 28, 0.34)', edge: 'rgba(55, 3, 3, 0.4)', ink: '#f8fafc' },
  secret: { base: '#4c1d95', glow: 'rgba(139, 92, 246, 0.32)', edge: 'rgba(25, 8, 60, 0.45)', ink: '#f5f3ff' },
  discarded: { base: '#3a3f4b', glow: 'rgba(120, 130, 150, 0.25)', edge: 'rgba(10, 12, 18, 0.45)', ink: '#cbd5e1' }
};

const SUPPORTED: DieKind[] = [4, 6, 8, 10, 12, 20, 100];
const UNDERLINE = new Set(['6', '9', '66', '68', '86', '89', '96', '98']);
const FONT = `'Rubik', 'Inter', system-ui, sans-serif`;

/** Escolhe o poliedro real que representa um dado de N lados (d2/d3 viram d4, etc.). */
export function resolveDieKind(sides: number): DieKind {
  return SUPPORTED.find((s) => s >= sides) ?? 100;
}

// ---------------------------------------------------------------------------
// Texturas
// ---------------------------------------------------------------------------

function paintFace(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  size: number,
  label: string,
  theme: DieTheme,
  opts: { fontScale?: number; offsetY?: number; underline?: boolean }
) {
  ctx.fillStyle = theme.base;
  ctx.fillRect(ox, oy, size, size);

  const grad = ctx.createRadialGradient(
    ox + size * 0.5, oy + size * 0.45, size * 0.05,
    ox + size * 0.5, oy + size * 0.5, size * 0.65
  );
  grad.addColorStop(0, theme.glow);
  grad.addColorStop(1, theme.edge);
  ctx.fillStyle = grad;
  ctx.fillRect(ox, oy, size, size);

  const fontScale = opts.fontScale ?? (label.length >= 3 ? 0.24 : label.length === 2 ? 0.31 : 0.38);
  const fontSize = Math.round(size * fontScale);

  ctx.save();
  ctx.translate(ox + size * 0.5, oy + size * (opts.offsetY ?? 0.53));
  ctx.font = `700 ${fontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Sombra de baixo-relevo
  ctx.fillStyle = 'rgba(20, 0, 0, 0.55)';
  ctx.fillText(label, 0, size * 0.01);

  ctx.fillStyle = theme.ink;
  ctx.fillText(label, 0, 0);

  if (opts.underline && UNDERLINE.has(label)) {
    const barW = fontSize * (label.length === 2 ? 0.8 : 0.5);
    const barH = Math.max(4, fontSize * 0.085);
    ctx.fillRect(-barW / 2, fontSize * 0.47, barW, barH);
  }
  ctx.restore();
}

/** Atlas de texturas: todas as faces de um dado num único canvas (1 draw call por dado). */
function createAtlasMaterial(labels: string[], theme: DieTheme, opts: { fontScale?: number; offsetY?: number; underline?: boolean }) {
  const cols = Math.ceil(Math.sqrt(labels.length));
  const cell = labels.length > 20 ? 192 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = cols * cell;
  const ctx = canvas.getContext('2d')!;
  labels.forEach((label, i) => {
    paintFace(ctx, (i % cols) * cell, Math.floor(i / cols) * cell, cell, label, theme, opts);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.38,
    metalness: 0.12,
    flatShading: true
  });
  return { material, cols };
}

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------

interface PolyFace {
  normal: THREE.Vector3;
  verts: THREE.Vector3[]; // vértices únicos
  tris: THREE.Vector3[][]; // triângulos [a,b,c]
}

/** Agrupa triângulos coplanares em faces poligonais reais (triângulo, quadrado, pipa, pentágono). */
function groupCoplanarFaces(geometry: THREE.BufferGeometry): PolyFace[] {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const faces: PolyFace[] = [];

  for (let i = 0; i < pos.count / 3; i++) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i * 3);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i * 3 + 2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();

    let face = faces.find((f) => f.normal.dot(n) > 0.995);
    if (!face) {
      face = { normal: n, verts: [], tris: [] };
      faces.push(face);
    }
    face.tris.push([a, b, c]);
    for (const v of [a, b, c]) {
      if (!face.verts.some((u) => u.distanceToSquared(v) < 1e-6)) face.verts.push(v.clone());
    }
  }
  return faces;
}

function buildPolyhedronMesh(
  baseGeometry: THREE.BufferGeometry,
  labels: string[],
  theme: DieTheme,
  opts: { uvScale?: number; uvShiftY?: number; fontScale?: number; underline?: boolean; poleAxis?: boolean }
): THREE.Mesh {
  const faces = groupCoplanarFaces(baseGeometry);
  const { material, cols } = createAtlasMaterial(labels, theme, opts);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const meta: DieFaceMeta[] = [];
  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackUp = new THREE.Vector3(0, 0, -1);

  faces.forEach((face, idx) => {
    const label = labels[idx % labels.length];
    const normal = face.normal;
    const center = new THREE.Vector3();
    face.verts.forEach((v) => center.add(v));
    center.divideScalar(face.verts.length);

    // Eixo vertical do número
    const up = new THREE.Vector3();
    if (face.verts.length === 3) {
      // Triângulos: o topo do número aponta para um vértice
      let best = face.verts[0];
      let bestScore = -Infinity;
      face.verts.forEach((v) => {
        const d = new THREE.Vector3().subVectors(v, center).normalize();
        const score = d.y * 2 + d.x * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = v;
        }
      });
      up.subVectors(best, center);
    } else if (opts.poleAxis) {
      // D10 (pipas): o número aponta para o polo da própria face
      let pole = face.verts[0];
      face.verts.forEach((v) => {
        if (Math.abs(v.y) > Math.abs(pole.y)) pole = v;
      });
      up.subVectors(pole, center);
    } else {
      const ref = Math.abs(normal.dot(worldUp)) > 0.92 ? fallbackUp : worldUp;
      const rightTmp = new THREE.Vector3().crossVectors(ref, normal);
      up.crossVectors(normal, rightTmp);
    }
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    up.crossVectors(normal, right).normalize();

    let maxR = 0;
    face.verts.forEach((v) => {
      const rel = new THREE.Vector3().subVectors(v, center);
      maxR = Math.max(maxR, Math.hypot(rel.dot(right), rel.dot(up)));
    });

    const cellUV = 1 / cols;
    const uC = (idx % cols) * cellUV + cellUV / 2;
    const vC = 1 - Math.floor(idx / cols) * cellUV - cellUV / 2;
    const scale = ((opts.uvScale ?? 0.44) * cellUV) / (maxR || 1);
    const shift = (opts.uvShiftY ?? 0) * cellUV;

    face.tris.forEach((tri) => {
      tri.forEach((v) => {
        positions.push(v.x, v.y, v.z);
        normals.push(normal.x, normal.y, normal.z);
        const rel = new THREE.Vector3().subVectors(v, center);
        uvs.push(uC + rel.dot(right) * scale, vC + rel.dot(up) * scale + shift);
      });
    });

    meta.push({ label, normal: normal.clone(), upDir: up.clone() });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.faces = meta;
  return mesh;
}

/** Trapezoedro pentagonal (D10) com pipas planas exatas; polos no eixo Y. */
function createD10Geometry(radius: number): THREE.BufferGeometry {
  const h = radius;
  const cos36 = Math.cos(Math.PI / 5);
  // Altura do anel que torna as pipas exatamente planas (independe do raio do anel)
  const z = (h * (1 - cos36)) / (1 + cos36);
  const r = radius * 0.95;
  const top = new THREE.Vector3(0, h, 0);
  const bottom = new THREE.Vector3(0, -h, 0);
  const upper: THREE.Vector3[] = [];
  const lower: THREE.Vector3[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    upper.push(new THREE.Vector3(Math.cos(a) * r, z, Math.sin(a) * r));
    lower.push(new THREE.Vector3(Math.cos(b) * r, -z, Math.sin(b) * r));
  }
  const pts: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    // garante orientação para fora
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const centroid = new THREE.Vector3().add(a).add(b).add(c);
    if (n.dot(centroid) < 0) [b, c] = [c, b];
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let k = 0; k < 5; k++) {
    const u0 = upper[k];
    const u1 = upper[(k + 1) % 5];
    const l0 = lower[k];
    const l1 = lower[(k + 1) % 5];
    // Pipa superior: topo, u0, l0, u1
    tri(top, u0, l0);
    tri(top, l0, u1);
    // Pipa inferior: base, l0, u1, l1
    tri(bottom, l0, u1);
    tri(bottom, u1, l1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** Poliedro esférico de 100 faces planas (interseção de 100 semi-espaços). */
function createD100Mesh(radius: number, theme: DieTheme): THREE.Mesh {
  const N = 100;
  const normalsN: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    normalsN.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r).normalize());
  }
  const forces = Array.from({ length: N }, () => new THREE.Vector3());
  const diff = new THREE.Vector3();
  for (let iter = 0; iter < 90; iter++) {
    const step = 0.035 * (1 - iter / 110);
    forces.forEach((f) => f.set(0, 0, 0));
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        diff.subVectors(normalsN[i], normalsN[j]);
        diff.multiplyScalar(1 / Math.max(diff.lengthSq(), 1e-4));
        forces[i].add(diff);
        forces[j].sub(diff);
      }
    }
    for (let i = 0; i < N; i++) {
      const radial = normalsN[i].clone().multiplyScalar(forces[i].dot(normalsN[i]));
      forces[i].sub(radial).clampLength(0, 1.5);
      normalsN[i].addScaledVector(forces[i], step).normalize();
    }
  }

  const labels = Array.from({ length: N }, (_, i) => String(i + 1));
  const { material, cols } = createAtlasMaterial(labels, theme, { underline: true, fontScale: undefined });

  const positions: number[] = [];
  const meshNormals: number[] = [];
  const uvs: number[] = [];
  const meta: DieFaceMeta[] = [];
  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackUp = new THREE.Vector3(0, 0, -1);

  for (let i = 0; i < N; i++) {
    const n = normalsN[i];
    const ref = Math.abs(n.dot(worldUp)) > 0.92 ? fallbackUp : worldUp;
    const right = new THREE.Vector3().crossVectors(ref, n).normalize();
    const up = new THREE.Vector3().crossVectors(n, right).normalize();

    const L = 2.5;
    let poly: { x: number; y: number }[] = [
      { x: -L, y: -L },
      { x: L, y: -L },
      { x: L, y: L },
      { x: -L, y: L }
    ];
    for (let j = 0; j < N && poly.length >= 3; j++) {
      if (i === j) continue;
      const nj = normalsN[j];
      const d = n.dot(nj);
      if (d < 0.72) continue;
      const a = nj.dot(right);
      const b = nj.dot(up);
      const c = 1 - d;
      const next: { x: number; y: number }[] = [];
      for (let k = 0; k < poly.length; k++) {
        const cur = poly[k];
        const prev = poly[(k + poly.length - 1) % poly.length];
        const vc = a * cur.x + b * cur.y - c;
        const vp = a * prev.x + b * prev.y - c;
        if (vc <= 1e-7) {
          if (vp > 1e-7) {
            const t = vp / (vp - vc);
            next.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
          }
          next.push(cur);
        } else if (vp <= 1e-7) {
          const t = vp / (vp - vc);
          next.push({ x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y) });
        }
      }
      poly = next;
    }

    let cx = 0;
    let cy = 0;
    poly.forEach((p) => {
      cx += p.x;
      cy += p.y;
    });
    cx /= poly.length;
    cy /= poly.length;
    poly.sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx));

    let maxR = 0;
    const v3 = poly.map((p) => {
      maxR = Math.max(maxR, Math.hypot(p.x - cx, p.y - cy));
      return n.clone().addScaledVector(right, p.x).addScaledVector(up, p.y).multiplyScalar(radius);
    });
    const c3 = n.clone().addScaledVector(right, cx).addScaledVector(up, cy).multiplyScalar(radius);

    const cellUV = 1 / cols;
    const uC = (i % cols) * cellUV + cellUV / 2;
    const vC = 1 - Math.floor(i / cols) * cellUV - cellUV / 2;
    const s = (0.43 * cellUV) / (maxR || 1);

    for (let k = 0; k < v3.length; k++) {
      const a = v3[k];
      const b = v3[(k + 1) % v3.length];
      const p1 = poly[k];
      const p2 = poly[(k + 1) % poly.length];
      positions.push(c3.x, c3.y, c3.z, a.x, a.y, a.z, b.x, b.y, b.z);
      meshNormals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
      uvs.push(uC, vC, uC + (p1.x - cx) * s, vC + (p1.y - cy) * s, uC + (p2.x - cx) * s, vC + (p2.y - cy) * s);
    }
    meta.push({ label: labels[i], normal: n.clone(), upDir: up.clone() });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(meshNormals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.faces = meta;
  return mesh;
}

function buildDie(kind: DieKind, theme: DieTheme): THREE.Mesh {
  const nums = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
  switch (kind) {
    case 4:
      return buildPolyhedronMesh(new THREE.TetrahedronGeometry(1.62, 0), nums(4), theme, {
        uvScale: 0.42, uvShiftY: -0.08, fontScale: 0.34, underline: false
      });
    case 6:
      return buildPolyhedronMesh(new THREE.BoxGeometry(1.88, 1.88, 1.88), ['1', '6', '2', '5', '3', '4'], theme, {
        uvScale: 0.36, fontScale: 0.4, underline: false
      });
    case 8:
      return buildPolyhedronMesh(new THREE.OctahedronGeometry(1.55, 0), nums(8), theme, {
        uvScale: 0.43, uvShiftY: -0.05, fontScale: 0.34, underline: true
      });
    case 10:
      return buildPolyhedronMesh(createD10Geometry(1.5), nums(10), theme, {
        uvScale: 0.44, uvShiftY: 0.04, fontScale: 0.32, underline: true, poleAxis: true
      });
    case 12:
      return buildPolyhedronMesh(new THREE.DodecahedronGeometry(1.48, 0), nums(12), theme, {
        uvScale: 0.44, fontScale: 0.34, underline: true
      });
    case 20:
      return buildPolyhedronMesh(new THREE.IcosahedronGeometry(1.52, 0), nums(20), theme, {
        uvScale: 0.43, uvShiftY: -0.04, fontScale: 0.31, underline: true
      });
    case 100:
    default:
      return createD100Mesh(1.62, theme);
  }
}

// ---------------------------------------------------------------------------
// Cache (geometria + material reaproveitados entre rolagens)
// ---------------------------------------------------------------------------

const cache = new Map<string, THREE.Mesh>();

if (typeof document !== 'undefined' && document.fonts) {
  // Garante que as texturas usem a fonte correta assim que ela carregar
  document.fonts.load(`700 64px Rubik`).catch(() => undefined);
  document.fonts.ready.then(() => {
    cache.forEach((m) => {
      m.geometry.dispose();
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
    cache.clear();
  });
}

/** Retorna um novo Mesh (compartilhando geometria/material em cache) para o dado pedido. */
export function createDieMesh(kind: DieKind, themeKey: keyof typeof DIE_THEMES = 'red'): THREE.Mesh {
  const key = `${kind}-${themeKey}`;
  let proto = cache.get(key);
  if (!proto) {
    proto = buildDie(kind, DIE_THEMES[themeKey]);
    cache.set(key, proto);
  }
  const mesh = new THREE.Mesh(proto.geometry, proto.material);
  mesh.userData.faces = proto.userData.faces;
  return mesh;
}

/**
 * Quaternion que deixa a face `targetLabel` voltada para a câmera (+Z) com o número em pé (+Y).
 */
export function computeTargetQuaternion(mesh: THREE.Mesh, targetLabel: string | number, tilt = true): THREE.Quaternion {
  const faces = mesh.userData.faces as DieFaceMeta[];
  const face = faces.find((f) => f.label === String(targetLabel)) ?? faces[0];
  const zAxis = face.normal.clone().normalize();
  const yAxis = face.upDir.clone().normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  yAxis.crossVectors(zAxis, xAxis).normalize();

  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  const q = new THREE.Quaternion().setFromRotationMatrix(basis.invert());
  if (tilt) {
    // Leve inclinação para mostrar as faces vizinhas (profundidade 3D)
    q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, 0.14, 0)));
  }
  return q.normalize();
}
