import { useEffect, useState } from "react";

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
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

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
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: '100%', fontFamily: 'consolas' }}>
      <div style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px', whiteSpace: "nowrap" }}>
        {/* Left: Intelligence skills */}
        {IntelligenceStats.map(stat => {
          const ab = abilitiesData[stat];
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          return <div key={stat} style={{ color: ab?.color, cursor: 'pointer', background: '#1e1e1e90', borderRadius: '40px', padding: '4px 4px 4px 8px' }} onClick={() => setSelectedStat(stat)}>{mod} {ab?.abbreviation} {ab?.icon}</div>;
        })}
      </div>
      
      <div>
      <svg width={size} height={size} style={{ flex: '1 1 50%', background: '#1e1e1e90', borderRadius: '30%' }}>
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
            stroke="#333"
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
              stroke="#444"
            />
          );
        })}

        {/* Значения */}
        <polygon
          points={points}
          fill="rgba(117, 174, 243, 0.4)"
          stroke="#b3d4ffff"
          strokeWidth="2"
        />
        <polygon
          points={pointsZero}
          fill="rgba(48, 48, 48, 0.7)"
          stroke="#747474cc"
          strokeWidth="1"
        />

        {/* Подписи */}
        {radarStats.map((stat, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 20);
          const y = center + Math.sin(angle) * (radius + 20);
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          const ab = abilitiesData[stat];

          if (ab) {
            return (
              <g key={stat} onClick={() => setSelectedStat(stat)} style={{ cursor: 'pointer'}}>
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={ab.color} fontSize="12" fontWeight={700} >
                  <tspan x={x} dy="0">{ab.icon}{ab.abbreviation}</tspan>
                  <tspan x={x} dy="1.2em">{mod}</tspan>
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedStat(null)}>
          <div style={{ background: 'white', padding: 20, borderRadius: 8, maxWidth: 200, color: 'black' }} onClick={e => e.stopPropagation()}>
            <h3>{abilitiesData[selectedStat]?.icon} {abilitiesData[selectedStat]?.name}</h3>
            <p>{abilitiesData[selectedStat]?.description}</p>
            <button onClick={() => setSelectedStat(null)}>ОК</button>
          </div>
        </div>
      )}

      <div style={{ flex: '1 1 20%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', fontSize: '12px', whiteSpace: "nowrap" }}>
        {/* Right: other skills */}
        {[...StrengthStats, ...DexterityStats, ...PerceptionStats].map(stat => {
          const ab = abilitiesData[stat];
          const value = abilities[stat] ?? 0;
          const mod = Math.floor((value / 10));
          return <div key={stat} style={{ color: ab?.color, cursor: 'pointer', background: '#1e1e1e90', borderRadius: '40px', padding: '4px 8px 4px 4px' }} onClick={() => setSelectedStat(stat)}>{ab?.icon} {ab?.abbreviation} {mod}</div>;
        })}
      </div>
    </div>
  );
}


