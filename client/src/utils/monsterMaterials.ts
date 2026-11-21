import * as THREE from 'three';

/**
 * Gerador procedural de mapas PBR (Albedo/Map, BumpMap e RoughnessMap) + UVs triplanares
 * para substituir o aspecto liso de "massa de modelar" por superfícies orgânicas e rígidas
 * realistas (pele, escamas, pelo, quitina, pedra, metal escovado, osso, madeira, tecido, limo).
 */

export type SurfaceKind =
  | 'skin'
  | 'scales'
  | 'fur'
  | 'chitin'
  | 'stone'
  | 'metal'
  | 'bone'
  | 'wood'
  | 'cloth'
  | 'slime'
  | 'membrane';

interface PbrTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

const TEXTURE_CACHE = new Map<SurfaceKind, PbrTextureSet>();

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function toTex(canvas: HTMLCanvasElement, srgb: boolean, repeat = 2): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

function paintNoiseFields(
  size: number,
  seed: number,
  drawCell: (
    colCtx: CanvasRenderingContext2D,
    bumpCtx: CanvasRenderingContext2D,
    roughCtx: CanvasRenderingContext2D,
    rnd: () => number,
    size: number
  ) => void,
  baseCol = '#ececec',
  baseBump = '#808080',
  baseRough = '#a0a0a0',
  repeat = 2
): PbrTextureSet {
  const [colC, colCtx] = makeCanvas(size);
  const [bumpC, bumpCtx] = makeCanvas(size);
  const [roughC, roughCtx] = makeCanvas(size);

  colCtx.fillStyle = baseCol;
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = baseBump;
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = baseRough;
  roughCtx.fillRect(0, 0, size, size);

  drawCell(colCtx, bumpCtx, roughCtx, mulberry(seed), size);

  return {
    map: toTex(colC, true, repeat),
    bumpMap: toTex(bumpC, false, repeat),
    roughnessMap: toTex(roughC, false, repeat)
  };
}

function buildTextureSet(kind: SurfaceKind): PbrTextureSet {
  const S = 256;
  switch (kind) {
    case 'scales':
      return paintNoiseFields(
        S,
        101,
        (col, bump, rough, rnd, sz) => {
          const cols = 10;
          const rows = 10;
          const cw = sz / cols;
          const ch = sz / rows;
          for (let r = -1; r <= rows; r++) {
            const offset = (r % 2) * (cw * 0.5);
            for (let c = -1; c <= cols; c++) {
              const cx = c * cw + offset;
              const cy = r * ch;
              const tone = 212 + Math.floor(rnd() * 40);
              const gCol = col.createRadialGradient(cx, cy - ch * 0.15, 2, cx, cy, cw * 0.68);
              gCol.addColorStop(0, `rgb(${tone},${tone},${tone})`);
              gCol.addColorStop(0.75, `rgb(${tone - 28},${tone - 28},${tone - 28})`);
              gCol.addColorStop(1, 'rgb(135,135,135)');
              col.fillStyle = gCol;
              col.beginPath();
              col.ellipse(cx, cy, cw * 0.54, ch * 0.64, 0, 0, Math.PI * 2);
              col.fill();

              const gBmp = bump.createRadialGradient(cx, cy - ch * 0.15, 1, cx, cy, cw * 0.65);
              gBmp.addColorStop(0, '#f2f2f2');
              gBmp.addColorStop(0.7, '#9e9e9e');
              gBmp.addColorStop(1, '#262626');
              bump.fillStyle = gBmp;
              bump.beginPath();
              bump.ellipse(cx, cy, cw * 0.54, ch * 0.64, 0, 0, Math.PI * 2);
              bump.fill();

              // Centro da escama mais brilhante (menor roughness), frestas foscas
              const gR = rough.createRadialGradient(cx, cy, 2, cx, cy, cw * 0.62);
              gR.addColorStop(0, '#585858');
              gR.addColorStop(0.75, '#969696');
              gR.addColorStop(1, '#e6e6e6');
              rough.fillStyle = gR;
              rough.beginPath();
              rough.ellipse(cx, cy, cw * 0.54, ch * 0.64, 0, 0, Math.PI * 2);
              rough.fill();
            }
          }
        },
        '#909090',
        '#303030',
        '#d0d0d0',
        2.5
      );

    case 'skin':
      return paintNoiseFields(
        S,
        202,
        (col, bump, rough, rnd, sz) => {
          // Manchas orgânicas sutis (subsurface mottling)
          for (let i = 0; i < 90; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const rad = 10 + rnd() * 26;
            const v = 200 + Math.floor(rnd() * 50);
            col.fillStyle = `rgba(${v},${Math.max(150, v - 18)},${Math.max(145, v - 22)},0.16)`;
            col.beginPath();
            col.arc(x, y, rad, 0, Math.PI * 2);
            col.fill();
          }
          // Poros e micro-rugas da pele
          for (let i = 0; i < 1100; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 0.7 + rnd() * 1.9;
            const dark = rnd() < 0.55;
            col.fillStyle = dark ? 'rgba(95,75,75,0.16)' : 'rgba(255,255,255,0.12)';
            col.beginPath();
            col.arc(x, y, r, 0, Math.PI * 2);
            col.fill();

            bump.fillStyle = dark ? 'rgba(45,45,45,0.38)' : 'rgba(220,220,220,0.32)';
            bump.beginPath();
            bump.arc(x, y, r, 0, Math.PI * 2);
            bump.fill();

            rough.fillStyle = dark ? 'rgba(215,215,215,0.28)' : 'rgba(120,120,120,0.25)';
            rough.beginPath();
            rough.arc(x, y, r * 1.4, 0, Math.PI * 2);
            rough.fill();
          }
          // Rugas finas
          for (let i = 0; i < 45; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const len = 10 + rnd() * 24;
            const ang = (rnd() - 0.5) * 0.7;
            bump.strokeStyle = 'rgba(45,45,45,0.28)';
            bump.lineWidth = 1.1;
            bump.beginPath();
            bump.moveTo(x, y);
            bump.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            bump.stroke();
          }
        },
        '#e5e5e5',
        '#808080',
        '#9c9c9c',
        2
      );

    case 'fur':
      return paintNoiseFields(
        S,
        303,
        (col, bump, rough, rnd, sz) => {
          for (let i = 0; i < 1600; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const len = 8 + rnd() * 18;
            const tilt = (rnd() - 0.5) * 0.25;
            const luma = 165 + Math.floor(rnd() * 88);
            col.strokeStyle = `rgba(${luma},${luma},${luma},0.48)`;
            col.lineWidth = 1 + rnd() * 1.4;
            col.beginPath();
            col.moveTo(x, y);
            col.lineTo(x + Math.sin(tilt) * len, y + Math.cos(tilt) * len);
            col.stroke();

            const b = 80 + Math.floor(rnd() * 165);
            bump.strokeStyle = `rgba(${b},${b},${b},0.55)`;
            bump.lineWidth = 1.2;
            bump.beginPath();
            bump.moveTo(x, y);
            bump.lineTo(x + Math.sin(tilt) * len, y + Math.cos(tilt) * len);
            bump.stroke();
          }
        },
        '#cfcfcf',
        '#6a6a6a',
        '#dcdcdc',
        3
      );

    case 'chitin':
      return paintNoiseFields(
        S,
        404,
        (col, bump, rough, rnd, sz) => {
          // Estrias de quitina + microporos
          for (let y = 0; y < sz; y += 16) {
            col.fillStyle = 'rgba(110,110,110,0.22)';
            col.fillRect(0, y, sz, 3);
            bump.fillStyle = 'rgba(40,40,40,0.45)';
            bump.fillRect(0, y, sz, 3);
            rough.fillStyle = 'rgba(190,190,190,0.4)';
            rough.fillRect(0, y, sz, 3);
          }
          for (let i = 0; i < 500; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 0.6 + rnd() * 1.5;
            bump.fillStyle = rnd() < 0.5 ? 'rgba(30,30,30,0.35)' : 'rgba(235,235,235,0.25)';
            bump.beginPath();
            bump.arc(x, y, r, 0, Math.PI * 2);
            bump.fill();
          }
        },
        '#ececec',
        '#8c8c8c',
        '#5a5a5a',
        2.5
      );

    case 'metal':
      return paintNoiseFields(
        S,
        505,
        (col, bump, rough, rnd, sz) => {
          // Aço escovado e marcas sutis de forja/arranhões
          for (let i = 0; i < 420; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const len = 14 + rnd() * 48;
            const ang = (rnd() - 0.5) * 0.35;
            const luma = 185 + Math.floor(rnd() * 68);
            col.strokeStyle = `rgba(${luma},${luma},${luma},0.22)`;
            col.lineWidth = 0.8 + rnd() * 0.9;
            col.beginPath();
            col.moveTo(x, y);
            col.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            col.stroke();

            const b = rnd() < 0.5 ? 60 : 210;
            bump.strokeStyle = `rgba(${b},${b},${b},0.25)`;
            bump.lineWidth = 0.9;
            bump.beginPath();
            bump.moveTo(x, y);
            bump.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            bump.stroke();

            const rg = 45 + Math.floor(rnd() * 90);
            rough.strokeStyle = `rgba(${rg},${rg},${rg},0.3)`;
            rough.beginPath();
            rough.moveTo(x, y);
            rough.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            rough.stroke();
          }
        },
        '#e8e8e8',
        '#808080',
        '#525252',
        2
      );

    case 'stone':
      return paintNoiseFields(
        S,
        606,
        (col, bump, rough, rnd, sz) => {
          for (let i = 0; i < 1200; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 1 + rnd() * 4;
            const v = 135 + Math.floor(rnd() * 115);
            col.fillStyle = `rgba(${v},${v},${v},0.36)`;
            col.beginPath();
            col.arc(x, y, r, 0, Math.PI * 2);
            col.fill();

            bump.fillStyle = `rgba(${v},${v},${v},0.48)`;
            bump.beginPath();
            bump.arc(x, y, r, 0, Math.PI * 2);
            bump.fill();
          }
          // Rachaduras minerais
          for (let c = 0; c < 18; c++) {
            let x = rnd() * sz;
            let y = rnd() * sz;
            col.strokeStyle = 'rgba(70,70,70,0.45)';
            bump.strokeStyle = 'rgba(20,20,20,0.65)';
            col.lineWidth = 1.2;
            bump.lineWidth = 1.6;
            col.beginPath();
            bump.beginPath();
            col.moveTo(x, y);
            bump.moveTo(x, y);
            for (let s = 0; s < 5; s++) {
              x += (rnd() - 0.5) * 28;
              y += (rnd() - 0.5) * 28;
              col.lineTo(x, y);
              bump.lineTo(x, y);
            }
            col.stroke();
            bump.stroke();
          }
        },
        '#dcdcdc',
        '#808080',
        '#e5e5e5',
        2
      );

    case 'bone':
      return paintNoiseFields(
        S,
        707,
        (col, bump, rough, rnd, sz) => {
          for (let i = 0; i < 380; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const len = 16 + rnd() * 40;
            const v = 195 + Math.floor(rnd() * 55);
            col.strokeStyle = `rgba(${v},${v - 6},${v - 14},0.28)`;
            col.lineWidth = 1;
            col.beginPath();
            col.moveTo(x, y);
            col.lineTo(x + (rnd() - 0.5) * 3, y + len);
            col.stroke();

            bump.strokeStyle = `rgba(${v},${v},${v},0.3)`;
            bump.beginPath();
            bump.moveTo(x, y);
            bump.lineTo(x + (rnd() - 0.5) * 3, y + len);
            bump.stroke();
          }
          for (let i = 0; i < 160; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            bump.fillStyle = 'rgba(40,40,40,0.28)';
            bump.fillRect(x, y, 1.5, 1.5);
          }
        },
        '#ece8df',
        '#888888',
        '#909090',
        2
      );

    case 'wood':
      return paintNoiseFields(
        S,
        808,
        (col, bump, rough, rnd, sz) => {
          for (let x = 0; x < sz; x += 3) {
            const wave = Math.sin(x * 0.14) * 25;
            const v = Math.max(130, Math.min(245, Math.floor(195 + wave + (rnd() - 0.5) * 30)));
            col.fillStyle = `rgba(${v},${Math.floor(v * 0.95)},${Math.floor(v * 0.9)},0.45)`;
            col.fillRect(x, 0, 2, sz);
            bump.fillStyle = `rgba(${v},${v},${v},0.45)`;
            bump.fillRect(x, 0, 2, sz);
          }
        },
        '#d6d0c8',
        '#7c7c7c',
        '#d8d8d8',
        2
      );

    case 'cloth':
      return paintNoiseFields(
        S,
        909,
        (col, bump, rough, rnd, sz) => {
          for (let i = 0; i < sz; i += 4) {
            const dark = (i / 4) % 2 === 0;
            col.fillStyle = dark ? 'rgba(180,180,180,0.22)' : 'rgba(245,245,245,0.18)';
            col.fillRect(i, 0, 2, sz);
            col.fillRect(0, i, sz, 2);
            bump.fillStyle = dark ? 'rgba(95,95,95,0.35)' : 'rgba(190,190,190,0.32)';
            bump.fillRect(i, 0, 2, sz);
            bump.fillRect(0, i, sz, 2);
          }
          for (let i = 0; i < 200; i++) {
            col.fillStyle = 'rgba(130,130,130,0.12)';
            col.fillRect(rnd() * sz, rnd() * sz, 3, 3);
          }
        },
        '#dcdcdc',
        '#808080',
        '#dcdcdc',
        4
      );

    case 'slime':
    case 'membrane':
    default:
      return paintNoiseFields(
        S,
        1010,
        (col, bump, rough, rnd, sz) => {
          for (let i = 0; i < 50; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 6 + rnd() * 20;
            const g = col.createRadialGradient(x, y, 1, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.32)');
            g.addColorStop(1, 'rgba(150,150,150,0)');
            col.fillStyle = g;
            col.beginPath();
            col.arc(x, y, r, 0, Math.PI * 2);
            col.fill();

            const gb = bump.createRadialGradient(x, y, 1, x, y, r);
            gb.addColorStop(0, 'rgba(235,235,235,0.45)');
            gb.addColorStop(1, 'rgba(128,128,128,0)');
            bump.fillStyle = gb;
            bump.beginPath();
            bump.arc(x, y, r, 0, Math.PI * 2);
            bump.fill();
          }
        },
        '#e8e8e8',
        '#808080',
        kind === 'slime' ? '#242424' : '#787878',
        2
      );
  }
}

export function getPbrTextures(kind: SurfaceKind): PbrTextureSet | null {
  if (typeof document === 'undefined') return null;
  let set = TEXTURE_CACHE.get(kind);
  if (!set) {
    set = buildTextureSet(kind);
    TEXTURE_CACHE.set(kind, set);
  }
  return set;
}

const BUMP_STRENGTH: Record<SurfaceKind, number> = {
  skin: 0.012,
  scales: 0.028,
  fur: 0.024,
  chitin: 0.02,
  stone: 0.036,
  metal: 0.01,
  bone: 0.016,
  wood: 0.026,
  cloth: 0.015,
  slime: 0.018,
  membrane: 0.014
};

const DEFAULT_ROUGHNESS: Record<SurfaceKind, number> = {
  skin: 0.64,
  scales: 0.44,
  fur: 0.88,
  chitin: 0.34,
  stone: 0.88,
  metal: 0.3,
  bone: 0.56,
  wood: 0.82,
  cloth: 0.86,
  slime: 0.16,
  membrane: 0.58
};

export function createSurfaceMaterial(
  color: string,
  kind: SurfaceKind,
  overrides: Partial<THREE.MeshPhysicalMaterialParameters> = {}
): THREE.MeshPhysicalMaterial {
  const tex = getPbrTextures(kind);
  const isWet = kind === 'slime' || kind === 'scales' || kind === 'chitin';
  return new THREE.MeshPhysicalMaterial({
    color,
    map: tex?.map ?? null,
    bumpMap: tex?.bumpMap ?? null,
    bumpScale: BUMP_STRENGTH[kind],
    roughnessMap: tex?.roughnessMap ?? null,
    roughness: DEFAULT_ROUGHNESS[kind],
    metalness: kind === 'metal' ? 0.88 : 0.04,
    clearcoat: kind === 'slime' ? 0.85 : isWet ? 0.28 : 0,
    clearcoatRoughness: kind === 'slime' ? 0.12 : 0.38,
    envMapIntensity: kind === 'metal' ? 1.35 : isWet ? 1.1 : 0.85,
    flatShading: false,
    ...overrides
  });
}

/**
 * Converte uma geometria indexada (já com normais suaves calculadas) em não-indexada
 * preservando exatamente as normais suaves e gerando UVs triplanares livres de distorção.
 */
export function finalizeWithTriplanarUVs(indexedSmoothGeo: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = indexedSmoothGeo.index ? indexedSmoothGeo.toNonIndexed() : indexedSmoothGeo;
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const fn = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    fn.crossVectors(ab, ac);
    const ax = Math.abs(fn.x);
    const ay = Math.abs(fn.y);
    const az = Math.abs(fn.z);

    for (let k = 0; k < 3; k++) {
      const idx = i + k;
      const vx = pos.getX(idx);
      const vy = pos.getY(idx);
      const vz = pos.getZ(idx);
      if (ax >= ay && ax >= az) {
        uvs[idx * 2] = vz + 0.5;
        uvs[idx * 2 + 1] = vy + 0.5;
      } else if (ay >= ax && ay >= az) {
        uvs[idx * 2] = vx + 0.5;
        uvs[idx * 2 + 1] = vz + 0.5;
      } else {
        uvs[idx * 2] = vx + 0.5;
        uvs[idx * 2 + 1] = vy + 0.5;
      }
    }
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}
