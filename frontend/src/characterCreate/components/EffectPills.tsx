
import type { Option } from '../types';

interface EffectPillsProps {
  effects?: Option['effects'];
}

export default function EffectPills({ effects }: EffectPillsProps) {
  if (!effects?.abilities) return null;

  const entries = Object.entries(effects.abilities).filter(([, v]) => v !== 0);
  if (!entries.length) return null;

  return (
    <div className="cc-effects">
      {entries.map(([k, v]) => (
        <span key={k} className={`cc-effect-tag ${v > 0 ? 'pos' : 'neg'}`}>
          {v > 0 ? '+' : ''}{v} {k}
        </span>
      ))}
    </div>
  );
}
