// =============================================================================
// Renderizador Compartilhado de Miniaturas 3D (Three.js -> Sprite Canvas)
// Mantém UM único contexto WebGL offscreen e um cache LRU de modelos construídos,
// gerando sprites 3D animados (com iluminação e enquadramento automático) para o
// tabuleiro sem estourar limites de contexto WebGL do navegador.
// =============================================================================
import * as THREE from 'three';
import { buildMonsterModelSpec, MonsterModelInput, MonsterModelSpec } from './monsterModelSpec';
import { buildMonsterModel, BuiltMonsterModel } from './monsterModelBuilder';
import { createStudioEnvironment } from './monsterMaterials';

const SPRITE_SIZE = 320;
const MAX_CACHED_MODELS = 80;
const FRAME_INTERVAL_MS = 55; // ~18 FPS suave para idle (asas, chamas, flutuação)

interface CachedEntry {
  cacheKey: string;
  spec: MonsterModelSpec;
  built: BuiltMonsterModel;
  wrapper: THREE.Group;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastRenderMs: number;
  lastFacingDeg: number;
  lastUsed: number;
}

class SharedMonsterSpriteRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cache = new Map<string, CachedEntry>();
  private webglFailed = false;

  constructor() {
    this.scene = new THREE.Scene();

    // Iluminação de estúdio em 3 pontos com sombras reais para os tokens do tabuleiro
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x0f172a, 0.68);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.15);
    keyLight.position.set(2.8, 4.5, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -1.8;
    keyLight.shadow.camera.right = 1.8;
    keyLight.shadow.camera.top = 2.2;
    keyLight.shadow.camera.bottom = -0.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.05);
    rimLight.position.set(-3.2, 2.2, -2.8);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfde68a, 0.3);
    fillLight.position.set(0, -1.5, 2.5);
    this.scene.add(fillLight);

    // Plano receptor invisível para projetar sombra suave no chão do token
    const shadowFloor = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 32),
      new THREE.ShadowMaterial({ opacity: 0.36 })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.002;
    shadowFloor.receiveShadow = true;
    this.scene.add(shadowFloor);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 25);
    this.camera.position.set(0.35, 1.18, 3.35);
    this.camera.lookAt(0, 0.72, 0);
  }

  private ensureRenderer(): THREE.WebGLRenderer | null {
    if (this.webglFailed) return null;
    if (this.renderer) return this.renderer;
    try {
      const glCanvas = document.createElement('canvas');
      glCanvas.width = SPRITE_SIZE;
      glCanvas.height = SPRITE_SIZE;
      const renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'default'
      });
      renderer.setSize(SPRITE_SIZE, SPRITE_SIZE, false);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene.environment = createStudioEnvironment(renderer);
      this.renderer = renderer;
      return renderer;
    } catch {
      this.webglFailed = true;
      return null;
    }
  }

  private evictIfNeeded(): void {
    if (this.cache.size < MAX_CACHED_MODELS) return;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const old = this.cache.get(oldestKey);
      old?.built.dispose();
      this.cache.delete(oldestKey);
    }
  }

  private getOrBuildEntry(cacheKey: string, input: MonsterModelInput): CachedEntry | null {
    const existing = this.cache.get(cacheKey);
    if (existing) {
      existing.lastUsed = performance.now();
      return existing;
    }

    this.evictIfNeeded();
    const spec = buildMonsterModelSpec(input);
    const built = buildMonsterModel(spec);

    // Normaliza escala e base em y = 0 usando Box3 para caber perfeitamente sobre o pedestal
    const wrapper = new THREE.Group();
    const box = new THREE.Box3().setFromObject(built.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(0.4, size.x, size.y, size.z);
    const targetDim = 1.48;
    const normScale = targetDim / maxDim;

    built.group.scale.setScalar(normScale);
    built.group.position.set(
      -center.x * normScale,
      -box.min.y * normScale,
      -center.z * normScale
    );
    wrapper.add(built.group);

    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      built.dispose();
      return null;
    }

    const entry: CachedEntry = {
      cacheKey,
      spec,
      built,
      wrapper,
      canvas,
      ctx,
      lastRenderMs: -Infinity,
      lastFacingDeg: NaN,
      lastUsed: performance.now()
    };
    this.cache.set(cacheKey, entry);
    return entry;
  }

  public getSprite(
    cacheKey: string,
    input: MonsterModelInput,
    nowMs: number,
    facingDeg = 24
  ): HTMLCanvasElement | null {
    const renderer = this.ensureRenderer();
    if (!renderer) return null;

    const entry = this.getOrBuildEntry(cacheKey, input);
    if (!entry) return null;

    const needsRedraw =
      nowMs - entry.lastRenderMs >= FRAME_INTERVAL_MS ||
      entry.lastFacingDeg !== facingDeg;

    if (!needsRedraw) {
      return entry.canvas;
    }

    entry.lastRenderMs = nowMs;
    entry.lastFacingDeg = facingDeg;

    // Atualiza animação idle + rotação
    entry.built.animate(nowMs * 0.001);
    entry.wrapper.rotation.y = (facingDeg * Math.PI) / 180;

    this.scene.add(entry.wrapper);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.scene.remove(entry.wrapper);

    entry.ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    entry.ctx.drawImage(renderer.domElement, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return entry.canvas;
  }
}

let sharedInstance: SharedMonsterSpriteRenderer | null = null;

export function getMonster3DSprite(
  cacheKey: string,
  input: MonsterModelInput,
  nowMs: number,
  facingDeg = 24
): HTMLCanvasElement | null {
  if (!sharedInstance) {
    sharedInstance = new SharedMonsterSpriteRenderer();
  }
  return sharedInstance.getSprite(cacheKey, input, nowMs, facingDeg);
}
