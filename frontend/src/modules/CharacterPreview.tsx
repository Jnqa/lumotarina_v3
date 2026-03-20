import { useEffect, useState } from "react";
import "./uni-style.css";

type AbilityMap = Record<string, number>;

type CharacterData = {
  id: string;
  name: string;
  class: string;
  abilities: AbilityMap;
  // add other fields as needed
};

type AbilityInfo = {
  name: string;
  description: string;
  abbreviation: string;
  abbreviation_RU: string;
  color: string;
  icon: string;
};

type AbilitiesData = Record<string, AbilityInfo>;

const RADAR_STATS = [
  "Charisma",
  "Strength",
  "Dexterity",
  "Perception",
  "Willpower",
  "Intelligence",
  "Lumion",
];

const DexterityStats = ["Acrobatics", "Stealth", "Lockpicking"];
const PerceptionStats = ["Survival"];
const IntelligenceStats = ["Engineering", "Medicine", "History", "Crafting", "Nature"];
const StrengthStats = ["Athletics"];

const MAX_VALUE = 75; // верхняя граница для нормализации
const MIN_VALUE = -25;

export default function CharacterPreview({ userId, charId }: { userId: string; charId: string }) {
  const [data, setData] = useState<CharacterData | null>(null);
  const [abilitiesData, setAbilitiesData] = useState<AbilitiesData>({});
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [useRU, setUseRU] = useState<boolean>(false);
  const [showABBR, setShowABBR] = useState<boolean>(true);
  const ABBR_KEY = 'characterPreview.abbreviation_RU';
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3111';

  useEffect(() => {
    try {
      const v = localStorage.getItem(ABBR_KEY);
      if (v === 'true') setUseRU(true);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/characters/abilities`)
      .then(r => r.json())
      .then(setAbilitiesData);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/characters/user/${userId}/${charId}`)
      .then(r => r.json())
      .then(setData);
  }, [userId, charId]);

  if (!data) return null;

  const abilities: AbilityMap = data.abilities || {};

  const radarStats = RADAR_STATS.filter(stat => stat === "Lumion" ? (abilities[stat] ?? 0) >= 10 : true);

  const size = 180;
  const center = size / 2;
  const radius = 50;

  const angleStep = (Math.PI * 2) / radarStats.length;

  const normalize = (value: number) => {
    const clamped = Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
    return (clamped - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
  };

  const pointsZero = radarStats.map((_stat, i) => {
    const r = normalize(0) * radius;
    const angle = i * angleStep - Math.PI / 2;

    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;

    return `${x},${y}`;
  }).join(" ");

  const points = radarStats.map((stat, i) => {
    const value = abilities[stat] ?? 0;
    const r = normalize(value) * radius;
    const angle = i * angleStep - Math.PI / 2;

    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;

    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ position: 'relative', display: "flex", alignItems: "center", gap: '2px', width: '100%', fontFamily: 'consolas' }}>
      <button
        onClick={() => {
          try {
            const next = !showABBR;
            setShowABBR(next);
            localStorage.setItem(ABBR_KEY, next ? 'true' : 'false');
          } catch (e) {}
        }}
        title="Toggle abbreviation RU/EN"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 20, padding: '2px 4px', borderRadius: 8, background: '#22222242', color: '#dddddd', border: '1px solid #4444443d' }}
      >
        {showABBR ? '⊷' : '⊶'}
      </button>
      <button
        onClick={() => {
          try {
            const next = !useRU;
            setUseRU(next);
            localStorage.setItem(ABBR_KEY, next ? 'true' : 'false');
          } catch (e) {}
        }}
        title="Toggle abbreviation RU/EN"
        style={{ position: 'absolute', top: 0, right: 0, zIndex: 20, padding: '2px 4px', borderRadius: 8, background: '#22222242', color: '#dddddd', border: '1px solid #4444443d' }}
      >
        {useRU ? '🇷🇺' : '🇬🇧'}
      </button>
      <div className="abilities-text" style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: showABBR ? '12px' : '18px', whiteSpace: "nowrap" }}>
        {/* Left: Intelligence skills */}
        {IntelligenceStats.map(stat => {
          const ab = abilitiesData[stat];
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          const getAbbr = (a?: AbilityInfo) => a ? (useRU ? (a.abbreviation_RU || a.abbreviation) : (a.abbreviation || a.abbreviation_RU)) : '';
          return <div key={stat} style={{ color: ab?.color, cursor: 'pointer', borderRadius: '40px', padding: '4px 4px 4px 8px' }} onClick={() => setSelectedStat(stat)}>{mod} {showABBR ? getAbbr(ab) : ''} {ab?.icon}</div>;
        })}
      </div>
      
      <div>
        {/* убрали - flex: '1 1 50%',*/}
      <svg width={size} height={size} style={{  background: 'transparent', overflow: 'visible' }}> 
        {/* Сияние */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Сетка */}
        {[0.25, 0.5, 0.75, 1].map((k, i) => (
          <polygon
            key={i}
            points={radarStats.map((_, j) => {
              const angle = j * angleStep - Math.PI / 2;
              const x = center + Math.cos(angle) * radius * k;
              const y = center + Math.sin(angle) * radius * k;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(139, 115, 85, 0.2)"
            strokeWidth="1"
          />
        ))}

        {/* Оси */}
        {radarStats.map((stat, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;

          return (
            <line
              key={stat}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(139, 115, 85, 0.3)"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Значения */}
        <polygon
          points={pointsZero}
          fill="rgba(139, 115, 85, 0.3)"
          stroke="rgba(139, 115, 85, 0.3)"
          strokeWidth="1"
        />
        <polygon
          points={points}
          fill="rgba(255, 215, 0, 0.15)"
          stroke="#ffd700"
          strokeWidth="2"
          filter="url(#glow)" /* Применяем свечение */
        />


        {/* Подписи */}
        {radarStats.map((stat, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const offset = showABBR ? 12 : 10; 
          const x = center + Math.cos(angle) * (radius + offset);
          const y = center + Math.sin(angle) * (radius + offset + 3);
          const x_icon = center + Math.cos(angle) * (radius + offset + 12);
          // const y_icon = center + Math.sin(angle) * (radius + offset + 7);
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          const ab = abilitiesData[stat];

          if (ab) {
            return (
              <g key={stat} onClick={() => setSelectedStat(stat)} style={{ cursor: 'pointer'}}>
                {/* Невидимый круг для легкого попадания пальцем */}
                <circle cx={x} cy={y} r="25" fill="transparent" /> 
                <text 
                  x={x} 
                  y={y} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill={ab.color} 
                  fontWeight={700} 
                  style={{ fontFamily: 'Cinzel, serif', transition: 'all 0.3s' }} 
                >
                  <tspan 
                    className="abilities-text-center" 
                    x={x_icon} 
                    dy="-0.2em" 
                    fontSize={showABBR ? "12" : "18"} 
                    fontWeight="900"
                  >
                    {showABBR ? (ab ? `${ab.icon} ${useRU ? ab.abbreviation_RU : ab.abbreviation}` : stat) : `${ab.icon}`}
                  </tspan>
                  <tspan 
                    x={x} 
                    dy={showABBR ? "1.4em" : "0.8em" }
                    fontSize={showABBR ? "14" : "20"}  
                    fontWeight="900"
                  >
                    {mod}
                  </tspan>
                </text>
              </g>
            );
          } else {
            return (
              <text
                key={stat}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ccc"
                fontSize="12"
              >
                {stat} ({mod})
              </text>
            );
          }
        })}
      </svg>
      </div>

      {selectedStat && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
          }} 
          onClick={() => setSelectedStat(null)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <h3>{abilitiesData[selectedStat]?.icon} {abilitiesData[selectedStat]?.name}</h3>
            <p>{abilitiesData[selectedStat]?.description}</p>
            <button onClick={() => setSelectedStat(null)} className="btn-gold-ok">ОК</button>
          </div>
        </div>
      )}

      <div style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontSize: showABBR ? '12px' : '18px', whiteSpace: "nowrap" }}>
        {/* Right: other skills */}
        {[...StrengthStats, ...DexterityStats, ...PerceptionStats].map(stat => {
          const ab = abilitiesData[stat];
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          return <div key={stat} className="abilities-text" style={{ color: ab?.color, cursor: 'pointer', borderRadius: '40px', padding: '4px 8px 4px 4px' }} onClick={() => setSelectedStat(stat)}>{ab?.icon} {showABBR ? (ab ? (useRU ? (ab.abbreviation_RU || ab.abbreviation) : (ab.abbreviation || ab.abbreviation_RU)) : '') : ''} {mod}</div>;
        })}
      </div>
    </div>
  );
}



