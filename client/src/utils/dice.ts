import { RollData, RollMode } from '../types/rpg';

// Efeito sonoro sutil sintetizado (sem necessidade de arquivos MP3 externos)
export function playDiceSound(isCrit = false, isFumble = false) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Som de "clique/chocalho" curto de dados
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180 + Math.random() * 240, ctx.currentTime + i * 0.045);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.045 + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.045);
      osc.stop(ctx.currentTime + i * 0.045 + 0.055);
    }

    if (isCrit) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.14);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.22);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.30);
      gain.gain.setValueAtTime(0.09, ctx.currentTime + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.14);
      osc.stop(ctx.currentTime + 0.56);
    } else if (isFumble) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.14);
      osc.frequency.linearRampToValueAtTime(95, ctx.currentTime + 0.42);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.14);
      osc.stop(ctx.currentTime + 0.46);
    }
  } catch {
    // Ignora se autoplay de áudio estiver bloqueado
  }
}

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Avalia expressões de dados como "1d20+5", "2d6+1d4-1", "d20", "4d6kh3" (ou simples)
 */
export function executeRollFormula(
  rawFormula: string,
  mode: RollMode = 'normal',
  label?: string
): RollData | null {
  const formula = rawFormula.replace(/\s+/g, '').toLowerCase();
  if (!formula) return null;

  // Caso especial: rolagem simples de 1d20 com vantagem/desvantagem
  const singleD20Match = formula.match(/^1?d20([+-]\d+)?$/);
  if (singleD20Match && (mode === 'advantage' || mode === 'disadvantage')) {
    const mod = singleD20Match[1] ? parseInt(singleD20Match[1], 10) : 0;
    const r1 = rollDie(20);
    const r2 = rollDie(20);
    const kept = mode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2);
    const discarded = mode === 'advantage' ? Math.min(r1, r2) : Math.max(r1, r2);

    return {
      formula: `1d20${mod >= 0 ? (mod === 0 ? '' : `+${mod}`) : mod}`,
      rolls: [kept],
      discarded: [discarded],
      modifier: mod,
      total: kept + mod,
      mode,
      label,
      isCrit: kept === 20,
      isFumble: kept === 1
    };
  }

  // Parser geral de termos separados por + ou -
  const tokenRegex = /([+-]?)(\d*d\d+|\d+)/g;
  const matches = [...formula.matchAll(tokenRegex)];
  if (matches.length === 0) return null;

  // Garante que a string inteira era composta por termos válidos
  const reconstructed = matches.map((m) => m[0]).join('');
  if (reconstructed !== formula) return null;

  const rolls: number[] = [];
  let modifier = 0;
  let diceSum = 0;
  let hasSingleD20 = false;
  let totalDiceCount = 0;

  for (const match of matches) {
    const sign = match[1] === '-' ? -1 : 1;
    const term = match[2];

    if (term.includes('d')) {
      const [countStr, sidesStr] = term.split('d');
      const count = Math.min(100, Math.max(1, countStr ? parseInt(countStr, 10) : 1));
      const sides = Math.min(1000, Math.max(2, parseInt(sidesStr, 10)));

      if (count === 1 && sides === 20 && sign === 1) {
        hasSingleD20 = true;
      }

      for (let i = 0; i < count; i++) {
        const val = rollDie(sides);
        rolls.push(sign * val);
        diceSum += sign * val;
        totalDiceCount++;
      }
    } else {
      modifier += sign * parseInt(term, 10);
    }
  }

  const isCrit = hasSingleD20 && totalDiceCount === 1 && rolls[0] === 20;
  const isFumble = hasSingleD20 && totalDiceCount === 1 && rolls[0] === 1;

  return {
    formula,
    rolls,
    modifier,
    total: diceSum + modifier,
    mode: 'normal',
    label,
    isCrit,
    isFumble
  };
}
