import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EyeOff, Sparkles, Skull, User } from 'lucide-react';
import { RollData } from '../types/rpg';
import { computeTargetQuaternion, createDieMesh, DIE_THEMES, resolveDieKind } from '../utils/polyDice';

export interface DiceToastItem {
  id: string;
  sender: string;
  rollData: RollData;
  isSecret: boolean;
}

interface DiceRoller3DProps {
  toast: DiceToastItem;
  compact?: boolean;
}

const SENDER_BADGE_COLORS = [
  'bg-sky-500/20 border-sky-400/50 text-sky-200',
  'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
  'bg-violet-500/20 border-violet-400/50 text-violet-200',
  'bg-rose-500/20 border-rose-400/50 text-rose-200',
  'bg-amber-500/20 border-amber-400/50 text-amber-200',
  'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
];

function getSenderColorClass(sender: string): string {
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = (hash * 31 + sender.charCodeAt(i)) >>> 0;
  }
  return SENDER_BADGE_COLORS[hash % SENDER_BADGE_COLORS.length];
}

/** Lista de lados de cada dado rolado, na mesma ordem de `rollData.rolls` (suporta "2d6+1d4"). */
function expandSides(formula: string, rollCount: number): number[] {
  const sides: number[] = [];
  for (const m of formula.toLowerCase().matchAll(/(\d*)d(\d+)/g)) {
    const count = Math.min(100, Math.max(1, m[1] ? parseInt(m[1], 10) : 1));
    const s = parseInt(m[2], 10);
    for (let i = 0; i < count; i++) sides.push(s);
  }
  const fallback = sides[0] ?? 20;
  return Array.from({ length: rollCount }, (_, i) => sides[i] ?? fallback);
}

interface DieSpec {
  sides: number;
  value: number;
  theme: keyof typeof DIE_THEMES;
}

// --- Parâmetros do "palco" 3D ---
const SLOT = 3.7; // espaço horizontal de cada dado (unidades 3D)
const VIEW_H = 5.4; // altura visível (dado + altura dos quiques)
const REST_Y = -0.75; // altura de repouso do dado
const FOV = 30;
const DURATION = 1500; // ms de cada dado
const STAGGER = 110; // atraso entre dados

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Canvas WebGL que "joga" os dados poliédricos: entram pelo lado, giram, quicam
 * e assentam com a face sorteada voltada para a câmera.
 */
const PolyDiceCanvas: React.FC<{ dice: DieSpec[]; dieSize: number }> = ({ dice, dieSize }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = Math.max(1, dice.length) * dieSize;
  const height = Math.round((VIEW_H / SLOT) * dieSize);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || dice.length === 0) return;

    // O canvas é criado aqui (e não via JSX) para funcionar com o StrictMode,
    // que monta/desmonta o efeito duas vezes em desenvolvimento.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 100);
    camera.position.set(0, 0, VIEW_H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    camera.lookAt(0, 0, 0);

    // Iluminação estilo estúdio escuro (igual ao protótipo)
    scene.add(new THREE.AmbientLight(0x2a1418, 2.2));
    const key = new THREE.DirectionalLight(0xfff5f5, 3.2);
    key.position.set(0.6, 1.4, 3.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6b2020, 1.0);
    fill.position.set(-2.5, -1.5, 1.2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x993333, 0.9);
    rim.position.set(0, 2.5, -3);
    scene.add(rim);

    const randQuat = () =>
      new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2))
        .normalize();

    const items = dice.map((d, i) => {
      const mesh = createDieMesh(resolveDieKind(d.sides), d.theme);
      const slotX = (i - (dice.length - 1) / 2) * SLOT;
      const fromLeft = Math.random() < 0.5;
      const item = {
        mesh,
        slotX,
        startX: slotX + (fromLeft ? -1 : 1) * (2.6 + Math.random() * 1.6),
        dropHeight: 2.2 + Math.random() * 0.8,
        startQuat: randQuat(),
        targetQuat: computeTargetQuaternion(mesh, d.value),
        spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        extraTurns: (3 + Math.floor(Math.random() * 3)) * Math.PI * 2,
        delay: i * STAGGER
      };
      mesh.visible = false;
      scene.add(mesh);
      return item;
    });

    const tmpQ = new THREE.Quaternion();
    const spinQ = new THREE.Quaternion();
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      let allDone = true;
      for (const it of items) {
        const t = Math.min(1, Math.max(0, (now - start - it.delay) / DURATION));
        if (now - start < it.delay) {
          allDone = false;
          continue;
        }
        it.mesh.visible = true;
        if (t < 1) allDone = false;

        const e = easeOutCubic(t);
        // Trajetória: desliza até o lugar e quica 3 vezes com amortecimento
        const bounce = Math.pow(1 - t, 2) * Math.abs(Math.cos(t * Math.PI * 2.5));
        it.mesh.position.set(
          THREE.MathUtils.lerp(it.startX, it.slotX, e),
          REST_Y + bounce * it.dropHeight,
          0
        );
        const s = 0.65 + 0.35 * Math.min(1, t / 0.2);
        it.mesh.scale.setScalar(s);

        // Rotação: interpola até a face sorteada + voltas extras que decaem a zero
        tmpQ.copy(it.startQuat).slerp(it.targetQuat, e);
        spinQ.setFromAxisAngle(it.spinAxis, it.extraTurns * (1 - e));
        it.mesh.quaternion.copy(tmpQ).multiply(spinQ).normalize();

        if (t >= 1) {
          it.mesh.quaternion.copy(it.targetQuat);
          it.mesh.position.set(it.slotX, REST_Y, 0);
          it.mesh.scale.setScalar(1);
        }
      }
      renderer.render(scene, camera);
      if (!allDone) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      // Geometrias/materiais ficam em cache; só liberamos o contexto WebGL
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} style={{ width, height }} />;
};

export const DiceRoller3D: React.FC<DiceRoller3DProps> = ({ toast, compact = false }) => {
  const { sender, rollData, isSecret } = toast;
  const maxShown = compact ? 4 : 6;
  const sidesList = expandSides(rollData.formula, rollData.rolls.length);

  const dice: DieSpec[] = rollData.rolls.slice(0, maxShown).map((v, i) => ({
    sides: sidesList[i],
    value: Math.abs(v),
    theme: isSecret ? 'secret' : 'red'
  }));
  // Vantagem/desvantagem: mostra também o d20 descartado (cinza)
  if (rollData.discarded && rollData.discarded.length > 0 && dice.length < maxShown) {
    rollData.discarded.slice(0, maxShown - dice.length).forEach((v) =>
      dice.push({ sides: sidesList[0] ?? 20, value: Math.abs(v), theme: 'discarded' })
    );
  }
  const hiddenCount = rollData.rolls.length - Math.min(rollData.rolls.length, maxShown);

  const accentBorder = isSecret
    ? 'border-purple-400/70 shadow-purple-500/30'
    : rollData.isCrit
    ? 'border-emerald-400 shadow-emerald-500/40'
    : rollData.isFumble
    ? 'border-rose-500 shadow-rose-500/40'
    : 'border-amber-400/70 shadow-amber-500/30';

  const senderBadgeClass = getSenderColorClass(sender);
  const landedDelayMs = DURATION * 0.8 + (dice.length - 1) * STAGGER;

  return (
    <div className="flex flex-col items-center justify-end gap-1 max-w-[460px]">
      {/* Dados poliédricos 3D sendo jogados */}
      <div className="relative flex items-end">
        <PolyDiceCanvas dice={dice} dieSize={compact ? 56 : 74} />
        {hiddenCount > 0 && (
          <span className="absolute -right-1 bottom-2 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-[10px] font-bold text-slate-300">
            +{hiddenCount}
          </span>
        )}
      </div>

      {/* Placa de Resultado individual por jogador (aparece quando os dados assentam) */}
      <div
        className={`animate-dice-pop px-3.5 py-2 rounded-2xl border bg-slate-950/92 backdrop-blur-md shadow-2xl flex items-center gap-2.5 ${accentBorder}`}
        style={{ animationDelay: `${landedDelayMs}ms`, animationFillMode: 'both' }}
      >
        <div className="min-w-0">
          <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${senderBadgeClass}`}
            >
              <User className="w-2.5 h-2.5" />
              {sender}
            </span>
            <span className="text-amber-300 font-semibold truncate max-w-[130px]">
              {rollData.label || rollData.formula}
            </span>
            {rollData.mode !== 'normal' && (
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wide ${
                  rollData.mode === 'advantage'
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                }`}
              >
                {rollData.mode === 'advantage' ? 'Vantagem (2d20↑)' : 'Desvantagem (2d20↓)'}
              </span>
            )}
            {isSecret && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[10px]">
                <EyeOff className="w-2.5 h-2.5" /> Secreto
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            [{rollData.rolls.join(', ')}]
            {rollData.discarded && rollData.discarded.length > 0 && (
              <span className="line-through text-slate-500 ml-1">
                ({rollData.discarded.join(', ')})
              </span>
            )}
            {rollData.modifier !== 0 &&
              (rollData.modifier > 0 ? ` +${rollData.modifier}` : ` ${rollData.modifier}`)}
            {rollData.isCrit && (
              <span className="ml-1.5 text-emerald-400 font-bold inline-flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> CRÍTICO!
              </span>
            )}
            {rollData.isFumble && (
              <span className="ml-1.5 text-rose-400 font-bold inline-flex items-center gap-0.5">
                <Skull className="w-3 h-3" /> FALHA CRÍTICA!
              </span>
            )}
          </div>
        </div>
        <div className="text-xl font-black font-mono text-amber-300 pl-2 border-l border-slate-800 shrink-0">
          {rollData.total}
        </div>
      </div>
    </div>
  );
};

export const DiceTray3D: React.FC<{ toasts: DiceToastItem[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-4 z-30 flex flex-wrap items-end justify-center gap-4">
      {toasts.map((toast) => (
        <DiceRoller3D key={toast.id} toast={toast} compact={toasts.length > 1} />
      ))}
    </div>
  );
};
