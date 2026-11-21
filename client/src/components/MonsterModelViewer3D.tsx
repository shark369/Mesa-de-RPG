import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCw, Pause, Play, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  Archetype,
  buildMonsterModelSpec,
  MonsterModelInput
} from '../utils/monsterModelSpec';
import { buildMonsterModel } from '../utils/monsterModelBuilder';

interface MonsterModelViewer3DProps {
  input: MonsterModelInput;
  heightClass?: string;
}

const ARCHETYPE_PT: Record<Archetype, string> = {
  humanoid: 'Humanoide',
  giant: 'Gigante / Colosso',
  skeleton: 'Esqueleto',
  zombie: 'Morto-Vivo',
  ghost: 'Espectro / Fantasma',
  quadruped: 'Quadrúpede / Fera',
  theropod: 'Terópode / Dinossauro',
  bird: 'Ave / Alado',
  bat: 'Morcego / Quiroptero',
  insect: 'Inseto',
  spider: 'Aracnídeo',
  scorpion: 'Escorpião',
  centipede: 'Miriápode',
  crab: 'Crustáceo',
  frog: 'Anfíbio',
  serpent: 'Serpente',
  worm: 'Verme Gigante',
  naga: 'Naga / Híbrido',
  fish: 'Aquático',
  cephalopod: 'Cefalópode',
  dragon: 'Dragão',
  wyvern: 'Serpe / Wyvern',
  turtle: 'Quelônio',
  hydra: 'Hidra',
  ooze: 'Gosma / Limo',
  cube: 'Cubo Gelatinoso',
  elemental: 'Elemental',
  golem: 'Golem / Constructo',
  armor: 'Armadura Animada',
  sword: 'Espada Voadora',
  rug: 'Tapete Animado',
  tree: 'Árvore / Planta',
  fungus: 'Fungo',
  mound: 'Monte Errante',
  eyeTyrant: 'Tirano Ocular',
  blob: 'Aberração Amorfa',
  centaur: 'Centauro / Esfinge',
  swarm: 'Enxame',
  mimic: 'Mímico',
  wisp: 'Fogo-Fátuo'
};

export const MonsterModelViewer3D: React.FC<MonsterModelViewer3DProps> = ({
  input,
  heightClass = 'h-56'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglError, setWebglError] = useState(false);

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const orbitRef = useRef({
    yaw: 0.45,
    pitch: 0.25,
    distance: 3.1,
    dragging: false,
    lastX: 0,
    lastY: 0
  });

  const spec = useMemo(
    () => buildMonsterModelSpec(input),
    [input.slug, input.name, input.nameEn, input.type, input.tokenType]
  );

  const EXTRA_PT: Record<string, string> = {
    crest: 'Crista',
    backFins: 'Barbatanas',
    shoulderSpikes: 'Ombreiras c/ Espinhos',
    armorPlate: 'Peitoral',
    glowRunes: 'Runas Flutuantes',
    extraEyes: 'Olhos Extras',
    mandibles: 'Mandíbulas',
    whiskers: 'Bigodes',
    antennae: 'Antenas',
    chinSpikes: 'Espinhos no Queixo',
    scars: 'Cicatrizes',
    moss: 'Musgo',
    crystals: 'Cristais',
    belt: 'Cinturão/Bolsas',
    aura: 'Aura Mágica',
    backSpines: 'Espinhos Dorsais',
    earrings: 'Brincos',
    warpaint: 'Pintura de Guerra',
    bones: 'Ossos no Chão',
    skullTrophy: 'Troféu de Crânio',
    floatingOrbs: 'Orbes Flutuantes',
    tattered: 'Trapos',
    barnacles: 'Cracas',
    plume: 'Pluma'
  };

  const featureTags = useMemo(() => {
    const tags: string[] = [ARCHETYPE_PT[spec.archetype] || spec.archetype];
    const f = spec.features;
    if (f.headless) tags.push('Sem Cabeça');
    if (f.exposedRibs) tags.push('Costelas Expostas');
    if (f.vines) tags.push('Hera / Raízes');
    if (f.acidGlow) tags.push('Ácido Tóxico');
    if (f.stitched) tags.push('Costuras');
    if (f.chains) tags.push('Correntes');
    if (f.wings) tags.push('Asas');
    if (f.horns) tags.push('Chifres');
    if (f.tail) tags.push('Cauda');
    if (f.spikes) tags.push('Espinhos');
    if (f.weapon) tags.push('Arma');
    if (f.tentacles) tags.push('Tentáculos');
    if (f.shell) tags.push('Carapaça');
    if (f.element) tags.push(`Elem: ${f.element}`);
    for (const ex of spec.variant?.extras || []) {
      const label = EXTRA_PT[ex];
      if (label && !tags.includes(label)) tags.push(label);
    }
    return tags.slice(0, 6);
  }, [spec]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setWebglError(true);
      return;
    }

    setWebglError(false);
    const width = Math.max(180, container.clientWidth);
    const height = Math.max(160, container.clientHeight);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();

    // Environment map PBR (faz metais, olhos úmidos, escamas e quitina refletirem luz real)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Iluminação dramática com sombras reais para destacar musculatura, poros e armaduras
    scene.add(new THREE.HemisphereLight(0xf1f5f9, 0x0f172a, 0.7));
    const key = new THREE.DirectionalLight(0xfff7ed, 2.1);
    key.position.set(2.8, 4.8, 3.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2.4;
    key.shadow.camera.bottom = -0.5;
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x60a5fa, 1.15);
    rim.position.set(-3.5, 2.6, -3.2);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xfde68a, 0.3);
    fill.position.set(0, -1.2, 2.5);
    scene.add(fill);

    // Base circular de miniatura RPG
    const plinthGeo = new THREE.CylinderGeometry(0.86, 0.94, 0.12, 64, 2);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.3
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.06;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const ringGeo = new THREE.TorusGeometry(0.88, 0.025, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.75
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.0;
    scene.add(ring);

    // Modelo procedural da criatura enquadrado sobre o pedestal
    const built = buildMonsterModel(spec);
    const box = new THREE.Box3().setFromObject(built.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(0.4, size.x, size.y, size.z);
    const normScale = 1.45 / maxDim;

    const pivot = new THREE.Group();
    built.group.scale.setScalar(normScale);
    built.group.position.set(
      -center.x * normScale,
      -box.min.y * normScale,
      -center.z * normScale
    );
    pivot.add(built.group);
    scene.add(pivot);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(120, container.clientWidth);
      const h = Math.max(120, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    let raf = 0;
    const startMs = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - startMs) * 0.001;
      if (autoRotateRef.current && !orbitRef.current.dragging) {
        orbitRef.current.yaw += 0.009;
      }

      built.animate(elapsed);

      const { yaw, pitch, distance } = orbitRef.current;
      const clampedPitch = Math.max(-0.2, Math.min(1.15, pitch));
      const targetY = 0.62;
      camera.position.set(
        Math.sin(yaw) * Math.cos(clampedPitch) * distance,
        targetY + Math.sin(clampedPitch) * distance,
        Math.cos(yaw) * Math.cos(clampedPitch) * distance
      );
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      built.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, [spec]);

  if (webglError) {
    return (
      <div
        className={`${heightClass} rounded-xl border border-slate-800 bg-slate-950/90 flex items-center justify-center text-xs text-slate-400 p-4 text-center`}
      >
        Visualizador WebGL indisponível neste navegador.
      </div>
    );
  }

  return (
    <div
      className={`relative ${heightClass} w-full rounded-xl border border-amber-500/35 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.14),rgba(2,6,23,0.96)_72%)] overflow-hidden select-none`}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          orbitRef.current.dragging = true;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
        }}
        onPointerMove={(e) => {
          if (!orbitRef.current.dragging) return;
          const dx = e.clientX - orbitRef.current.lastX;
          const dy = e.clientY - orbitRef.current.lastY;
          orbitRef.current.lastX = e.clientX;
          orbitRef.current.lastY = e.clientY;
          orbitRef.current.yaw -= dx * 0.012;
          orbitRef.current.pitch = Math.max(
            -0.2,
            Math.min(1.15, orbitRef.current.pitch + dy * 0.01)
          );
        }}
        onPointerUp={() => {
          orbitRef.current.dragging = false;
        }}
        onPointerCancel={() => {
          orbitRef.current.dragging = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          orbitRef.current.distance = Math.max(
            1.6,
            Math.min(5.5, orbitRef.current.distance + (e.deltaY > 0 ? 0.2 : -0.2))
          );
        }}
      />

      {/* Selo com arquétipo e partes 3D */}
      <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1 max-w-[75%]">
        {featureTags.map((tag, i) => (
          <span
            key={tag}
            className={`text-[10px] px-1.5 py-0.5 rounded-md border backdrop-blur-sm font-semibold ${
              i === 0
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-900/75 border-slate-700/80 text-slate-300'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Controles da câmera */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          title={autoRotate ? 'Pausar rotação automática' : 'Girar automaticamente'}
        >
          {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            orbitRef.current.distance = Math.max(1.6, orbitRef.current.distance - 0.35);
          }}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          title="Aproximar câmera"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            orbitRef.current.distance = Math.min(5.5, orbitRef.current.distance + 0.35);
          }}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          title="Afastar câmera"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            orbitRef.current.yaw = 0.45;
            orbitRef.current.pitch = 0.25;
            orbitRef.current.distance = 3.1;
          }}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          title="Resetar câmera 3D"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-slate-400 flex items-center gap-1">
        <RotateCw className="w-3 h-3 text-amber-400/80" /> Arraste para girar 360°
      </div>
    </div>
  );
};
