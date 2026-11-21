import * as THREE from 'three';

/**
 * Gerador procedural completo de materiais PBR (Albedo, NormalMap, RoughnessMap,
 * MetalnessMap e AOMap) + ambiente HDRI sintético + UVs triplanares (uv + uv1).
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
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  metalnessMap?: THREE.CanvasTexture;
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

/**
 * Converte um mapa de alturas (escala de cinza em canvas) em NormalMap RGB em espaço tangente
 * usando filtro Sobel 3x3 (wrap contínuo nas bordas para tiling perfeito) e um AOMap de frestas.
 */
function deriveNormalAndAO(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  repeat: number
): { normalMap: THREE.CanvasTexture; aoMap: THREE.CanvasTexture } {
  const sz = heightCanvas.width;
  const hCtx = heightCanvas.getContext('2d')!;
  const src = hCtx.getImageData(0, 0, sz, sz).data;

  const [normC, normCtx] = makeCanvas(sz);
  const normImg = normCtx.createImageData(sz, sz);
  const nd = normImg.data;

  const [aoC, aoCtx] = makeCanvas(sz);
  const aoImg = aoCtx.createImageData(sz, sz);
  const ad = aoImg.data;

  const hAt = (x: number, y: number) => {
    const wx = ((x % sz) + sz) % sz;
    const wy = ((y % sz) + sz) % sz;
    return src[(wy * sz + wx) * 4] / 255;
  };

  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const tl = hAt(x - 1, y - 1);
      const t = hAt(x, y - 1);
      const tr = hAt(x + 1, y - 1);
      const l = hAt(x - 1, y);
      const c = hAt(x, y);
      const r = hAt(x + 1, y);
      const bl = hAt(x - 1, y + 1);
      const b = hAt(x, y + 1);
      const br = hAt(x + 1, y + 1);

      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * sz + x) * 4;
      nd[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      nd[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nd[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nd[idx + 3] = 255;

      // AO local: cavidades mais fundas que a vizinhança ficam suavemente ocluídas
      const avg = (tl + t + tr + l + r + bl + b + br) / 8;
      const cavity = Math.max(0, avg - c);
      const ao = Math.max(135, Math.min(255, Math.round((0.68 + c * 0.32 - cavity * 0.85) * 255)));
      ad[idx] = ao;
      ad[idx + 1] = ao;
      ad[idx + 2] = ao;
      ad[idx + 3] = 255;
    }
  }

  normCtx.putImageData(normImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);

  return {
    normalMap: toTex(normC, false, repeat),
    aoMap: toTex(aoC, false, repeat)
  };
}

function paintNoiseFields(
  size: number,
  seed: number,
  drawCell: (
    colCtx: CanvasRenderingContext2D,
    heightCtx: CanvasRenderingContext2D,
    roughCtx: CanvasRenderingContext2D,
    metalCtx: CanvasRenderingContext2D | null,
    rnd: () => number,
    size: number
  ) => void,
  opts: {
    baseCol?: string;
    baseHeight?: string;
    baseRough?: string;
    baseMetal?: string;
    repeat?: number;
    normalStrength?: number;
    hasMetalMap?: boolean;
  } = {}
): PbrTextureSet {
  const {
    baseCol = '#ececec',
    baseHeight = '#808080',
    baseRough = '#a0a0a0',
    baseMetal = '#ffffff',
    repeat = 2,
    normalStrength = 2.6,
    hasMetalMap = false
  } = opts;

  const [colC, colCtx] = makeCanvas(size);
  const [heightC, heightCtx] = makeCanvas(size);
  const [roughC, roughCtx] = makeCanvas(size);
  const [metalC, metalCtx] = hasMetalMap ? makeCanvas(size) : [null, null];

  colCtx.fillStyle = baseCol;
  colCtx.fillRect(0, 0, size, size);
  heightCtx.fillStyle = baseHeight;
  heightCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = baseRough;
  roughCtx.fillRect(0, 0, size, size);
  if (metalCtx) {
    metalCtx.fillStyle = baseMetal;
    metalCtx.fillRect(0, 0, size, size);
  }

  drawCell(colCtx, heightCtx, roughCtx, metalCtx, mulberry(seed), size);

  const { normalMap, aoMap } = deriveNormalAndAO(heightC, normalStrength, repeat);
  return {
    map: toTex(colC, true, repeat),
    normalMap,
    roughnessMap: toTex(roughC, false, repeat),
    aoMap,
    metalnessMap: metalC ? toTex(metalC, false, repeat) : undefined
  };
}

function buildTextureSet(kind: SurfaceKind): PbrTextureSet {
  const S = 256;
  switch (kind) {
    case 'scales':
      return paintNoiseFields(
        S,
        101,
        (col, height, rough, _metal, rnd, sz) => {
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

              const gH = height.createRadialGradient(cx, cy - ch * 0.15, 1, cx, cy, cw * 0.65);
              gH.addColorStop(0, '#f4f4f4');
              gH.addColorStop(0.7, '#9e9e9e');
              gH.addColorStop(1, '#202020');
              height.fillStyle = gH;
              height.beginPath();
              height.ellipse(cx, cy, cw * 0.54, ch * 0.64, 0, 0, Math.PI * 2);
              height.fill();

              const gR = rough.createRadialGradient(cx, cy, 2, cx, cy, cw * 0.62);
              gR.addColorStop(0, '#505050');
              gR.addColorStop(0.75, '#969696');
              gR.addColorStop(1, '#ececec');
              rough.fillStyle = gR;
              rough.beginPath();
              rough.ellipse(cx, cy, cw * 0.54, ch * 0.64, 0, 0, Math.PI * 2);
              rough.fill();
            }
          }
        },
        { baseCol: '#909090', baseHeight: '#2a2a2a', baseRough: '#d4d4d4', repeat: 2.5, normalStrength: 3.4 }
      );

    case 'skin':
      return paintNoiseFields(
        S,
        202,
        (col, height, rough, _metal, rnd, sz) => {
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
          for (let i = 0; i < 1200; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 0.7 + rnd() * 1.9;
            const dark = rnd() < 0.55;
            col.fillStyle = dark ? 'rgba(95,75,75,0.16)' : 'rgba(255,255,255,0.12)';
            col.beginPath();
            col.arc(x, y, r, 0, Math.PI * 2);
            col.fill();

            height.fillStyle = dark ? 'rgba(40,40,40,0.42)' : 'rgba(225,225,225,0.34)';
            height.beginPath();
            height.arc(x, y, r, 0, Math.PI * 2);
            height.fill();

            rough.fillStyle = dark ? 'rgba(218,218,218,0.3)' : 'rgba(115,115,115,0.26)';
            rough.beginPath();
            rough.arc(x, y, r * 1.4, 0, Math.PI * 2);
            rough.fill();
          }
          for (let i = 0; i < 50; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const len = 10 + rnd() * 24;
            const ang = (rnd() - 0.5) * 0.7;
            height.strokeStyle = 'rgba(35,35,35,0.34)';
            height.lineWidth = 1.1;
            height.beginPath();
            height.moveTo(x, y);
            height.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            height.stroke();
          }
        },
        { baseCol: '#e5e5e5', baseHeight: '#808080', baseRough: '#9e9e9e', repeat: 2, normalStrength: 2.4 }
      );

    case 'fur':
      return paintNoiseFields(
        S,
        303,
        (col, height, _rough, _metal, rnd, sz) => {
          for (let i = 0; i < 1700; i++) {
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

            const b = 75 + Math.floor(rnd() * 175);
            height.strokeStyle = `rgba(${b},${b},${b},0.6)`;
            height.lineWidth = 1.2;
            height.beginPath();
            height.moveTo(x, y);
            height.lineTo(x + Math.sin(tilt) * len, y + Math.cos(tilt) * len);
            height.stroke();
          }
        },
        { baseCol: '#cfcfcf', baseHeight: '#686868', baseRough: '#dcdcdc', repeat: 3, normalStrength: 3.0 }
      );

    case 'chitin':
      return paintNoiseFields(
        S,
        404,
        (col, height, rough, _metal, rnd, sz) => {
          for (let y = 0; y < sz; y += 16) {
            col.fillStyle = 'rgba(110,110,110,0.22)';
            col.fillRect(0, y, sz, 3);
            height.fillStyle = 'rgba(35,35,35,0.5)';
            height.fillRect(0, y, sz, 3);
            rough.fillStyle = 'rgba(195,195,195,0.45)';
            rough.fillRect(0, y, sz, 3);
          }
          for (let i = 0; i < 520; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 0.6 + rnd() * 1.5;
            height.fillStyle = rnd() < 0.5 ? 'rgba(28,28,28,0.38)' : 'rgba(235,235,235,0.28)';
            height.beginPath();
            height.arc(x, y, r, 0, Math.PI * 2);
            height.fill();
          }
        },
        { baseCol: '#ececec', baseHeight: '#8c8c8c', baseRough: '#545454', repeat: 2.5, normalStrength: 2.8 }
      );

    case 'metal':
      return paintNoiseFields(
        S,
        505,
        (col, height, rough, metal, rnd, sz) => {
          for (let i = 0; i < 450; i++) {
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

            const b = rnd() < 0.5 ? 55 : 215;
            height.strokeStyle = `rgba(${b},${b},${b},0.26)`;
            height.lineWidth = 0.9;
            height.beginPath();
            height.moveTo(x, y);
            height.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            height.stroke();

            const rg = 40 + Math.floor(rnd() * 88);
            rough.strokeStyle = `rgba(${rg},${rg},${rg},0.32)`;
            rough.beginPath();
            rough.moveTo(x, y);
            rough.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            rough.stroke();
          }
          // Micro-marcas de oxidação / desgaste que reduzem metalicidade localmente
          if (metal) {
            for (let i = 0; i < 65; i++) {
              const x = rnd() * sz;
              const y = rnd() * sz;
              const r = 2 + rnd() * 7;
              metal.fillStyle = 'rgba(130,130,130,0.35)';
              metal.beginPath();
              metal.arc(x, y, r, 0, Math.PI * 2);
              metal.fill();
              rough.fillStyle = 'rgba(195,195,195,0.32)';
              rough.beginPath();
              rough.arc(x, y, r, 0, Math.PI * 2);
              rough.fill();
            }
          }
        },
        {
          baseCol: '#e8e8e8',
          baseHeight: '#808080',
          baseRough: '#4e4e4e',
          baseMetal: '#f4f4f4',
          repeat: 2,
          normalStrength: 2.0,
          hasMetalMap: true
        }
      );

    case 'stone':
      return paintNoiseFields(
        S,
        606,
        (col, height, _rough, _metal, rnd, sz) => {
          for (let i = 0; i < 1200; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            const r = 1 + rnd() * 4;
            const v = 135 + Math.floor(rnd() * 115);
            col.fillStyle = `rgba(${v},${v},${v},0.36)`;
            col.beginPath();
            col.arc(x, y, r, 0, Math.PI * 2);
            col.fill();

            height.fillStyle = `rgba(${v},${v},${v},0.5)`;
            height.beginPath();
            height.arc(x, y, r, 0, Math.PI * 2);
            height.fill();
          }
          for (let c = 0; c < 18; c++) {
            let x = rnd() * sz;
            let y = rnd() * sz;
            col.strokeStyle = 'rgba(65,65,65,0.48)';
            height.strokeStyle = 'rgba(15,15,15,0.72)';
            col.lineWidth = 1.2;
            height.lineWidth = 1.7;
            col.beginPath();
            height.beginPath();
            col.moveTo(x, y);
            height.moveTo(x, y);
            for (let s = 0; s < 5; s++) {
              x += (rnd() - 0.5) * 28;
              y += (rnd() - 0.5) * 28;
              col.lineTo(x, y);
              height.lineTo(x, y);
            }
            col.stroke();
            height.stroke();
          }
        },
        { baseCol: '#dcdcdc', baseHeight: '#808080', baseRough: '#e6e6e6', repeat: 2, normalStrength: 3.6 }
      );

    case 'bone':
      return paintNoiseFields(
        S,
        707,
        (col, height, _rough, _metal, rnd, sz) => {
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

            height.strokeStyle = `rgba(${v},${v},${v},0.32)`;
            height.beginPath();
            height.moveTo(x, y);
            height.lineTo(x + (rnd() - 0.5) * 3, y + len);
            height.stroke();
          }
          for (let i = 0; i < 160; i++) {
            const x = rnd() * sz;
            const y = rnd() * sz;
            height.fillStyle = 'rgba(35,35,35,0.3)';
            height.fillRect(x, y, 1.5, 1.5);
          }
        },
        { baseCol: '#ece8df', baseHeight: '#888888', baseRough: '#8e8e8e', repeat: 2, normalStrength: 2.4 }
      );

    case 'wood':
      return paintNoiseFields(
        S,
        808,
        (col, height, _rough, _metal, rnd, sz) => {
          for (let x = 0; x < sz; x += 3) {
            const wave = Math.sin(x * 0.14) * 25;
            const v = Math.max(130, Math.min(245, Math.floor(195 + wave + (rnd() - 0.5) * 30)));
            col.fillStyle = `rgba(${v},${Math.floor(v * 0.95)},${Math.floor(v * 0.9)},0.45)`;
            col.fillRect(x, 0, 2, sz);
            height.fillStyle = `rgba(${v},${v},${v},0.48)`;
            height.fillRect(x, 0, 2, sz);
          }
        },
        { baseCol: '#d6d0c8', baseHeight: '#7c7c7c', baseRough: '#dadada', repeat: 2, normalStrength: 3.0 }
      );

    case 'cloth':
      return paintNoiseFields(
        S,
        909,
        (col, height, _rough, _metal, rnd, sz) => {
          for (let i = 0; i < sz; i += 4) {
            const dark = (i / 4) % 2 === 0;
            col.fillStyle = dark ? 'rgba(180,180,180,0.22)' : 'rgba(245,245,245,0.18)';
            col.fillRect(i, 0, 2, sz);
            col.fillRect(0, i, sz, 2);
            height.fillStyle = dark ? 'rgba(85,85,85,0.38)' : 'rgba(195,195,195,0.34)';
            height.fillRect(i, 0, 2, sz);
            height.fillRect(0, i, sz, 2);
          }
          for (let i = 0; i < 200; i++) {
            col.fillStyle = 'rgba(130,130,130,0.12)';
            col.fillRect(rnd() * sz, rnd() * sz, 3, 3);
          }
        },
        { baseCol: '#dcdcdc', baseHeight: '#808080', baseRough: '#dcdcdc', repeat: 4, normalStrength: 2.2 }
      );

    case 'slime':
    case 'membrane':
    default:
      return paintNoiseFields(
        S,
        1010,
        (col, height, _rough, _metal, rnd, sz) => {
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

            const gb = height.createRadialGradient(x, y, 1, x, y, r);
            gb.addColorStop(0, 'rgba(235,235,235,0.48)');
            gb.addColorStop(1, 'rgba(128,128,128,0)');
            height.fillStyle = gb;
            height.beginPath();
            height.arc(x, y, r, 0, Math.PI * 2);
            height.fill();
          }
        },
        {
          baseCol: '#e8e8e8',
          baseHeight: '#808080',
          baseRough: kind === 'slime' ? '#242424' : '#787878',
          repeat: 2,
          normalStrength: 2.2
        }
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

const NORMAL_SCALE: Record<SurfaceKind, number> = {
  skin: 0.48,
  scales: 0.85,
  fur: 0.72,
  chitin: 0.65,
  stone: 0.95,
  metal: 0.42,
  bone: 0.55,
  wood: 0.78,
  cloth: 0.55,
  slime: 0.45,
  membrane: 0.5
};

const DEFAULT_ROUGHNESS: Record<SurfaceKind, number> = {
  skin: 0.62,
  scales: 0.42,
  fur: 0.88,
  chitin: 0.34,
  stone: 0.88,
  metal: 0.28,
  bone: 0.56,
  wood: 0.82,
  cloth: 0.86,
  slime: 0.14,
  membrane: 0.58
};

export function createSurfaceMaterial(
  color: string,
  kind: SurfaceKind,
  overrides: Partial<THREE.MeshPhysicalMaterialParameters> = {}
): THREE.MeshPhysicalMaterial {
  const tex = getPbrTextures(kind);
  const isWet = kind === 'slime' || kind === 'scales' || kind === 'chitin';
  const hasSheen = kind === 'cloth' || kind === 'fur';
  const ns = NORMAL_SCALE[kind];

  return new THREE.MeshPhysicalMaterial({
    color,
    map: tex?.map ?? null,
    normalMap: tex?.normalMap ?? null,
    normalScale: new THREE.Vector2(ns, ns),
    aoMap: tex?.aoMap ?? null,
    aoMapIntensity: kind === 'scales' || kind === 'stone' ? 0.75 : 0.55,
    roughnessMap: tex?.roughnessMap ?? null,
    roughness: DEFAULT_ROUGHNESS[kind],
    metalnessMap: tex?.metalnessMap ?? null,
    metalness: kind === 'metal' ? 0.92 : 0.04,
    clearcoat: kind === 'slime' ? 0.9 : isWet ? 0.3 : 0,
    clearcoatRoughness: kind === 'slime' ? 0.1 : 0.36,
    ior: kind === 'slime' ? 1.42 : 1.5,
    sheen: hasSheen ? 0.65 : 0,
    sheenRoughness: kind === 'fur' ? 0.8 : 0.68,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35),
    envMapIntensity: kind === 'metal' ? 1.5 : isWet ? 1.15 : 0.9,
    flatShading: false,
    ...overrides
  });
}

/**
 * Gera um Environment Map equiretangular de estúdio HDRI (sem depender de arquivo .hdr externo)
 * com softbox quente superior, cúpula fria celeste e rebatedor inferior para reflexos realistas.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.0, '#fff7ed');
  sky.addColorStop(0.25, '#94a3b8');
  sky.addColorStop(0.5, '#1e293b');
  sky.addColorStop(0.75, '#0f172a');
  sky.addColorStop(1.0, '#451a03');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Softbox principal quente (key light specular)
  const key = ctx.createRadialGradient(w * 0.68, h * 0.24, 4, w * 0.68, h * 0.24, 46);
  key.addColorStop(0, 'rgba(255, 250, 235, 1)');
  key.addColorStop(0.45, 'rgba(255, 235, 200, 0.7)');
  key.addColorStop(1, 'rgba(255, 220, 170, 0)');
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);

  // Rim light frio azulado oposto
  const rim = ctx.createRadialGradient(w * 0.22, h * 0.32, 3, w * 0.22, h * 0.32, 42);
  rim.addColorStop(0, 'rgba(186, 230, 253, 0.95)');
  rim.addColorStop(0.5, 'rgba(96, 165, 250, 0.5)');
  rim.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, w, h);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(equirect);
  equirect.dispose();
  pmrem.dispose();
  return envRT.texture;
}

/**
 * Converte uma geometria indexada (já com normais suaves calculadas) em não-indexada
 * preservando exatamente as normais suaves e gerando UVs triplanares (uv + uv1 para aoMap).
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

  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  geo.setAttribute('uv', uvAttr);
  geo.setAttribute('uv1', uvAttr);
  return geo;
}
