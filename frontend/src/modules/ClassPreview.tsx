import { useEffect, useState } from "react";

type AbilityMap = Record<string, number>;

type ClassData = {
  id: string;
  name: string;
  description: string;
  abilities: AbilityMap[];
};

const RADAR_STATS = [
    "Dexterity",
    "Perception",
    "Willpower",
    "Intelligence",
    "Charisma",
    "Strength",
];

const MAX_VALUE = 30; // верхняя граница для нормализации
const MIN_VALUE = -30;

export default function ClassPreview({ classId }: { classId: string }) {
  const [data, setData] = useState<ClassData | null>(null);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${API_BASE}/classes/${classId}`)
      .then(r => r.json())
      .then(setData);
  }, [classId]);

  if (!data) return null;

  const abilities: AbilityMap = Object.assign({}, ...data.abilities);

  const size = 260;
  const center = size / 2;
  const radius = 90;

  const angleStep = (Math.PI * 2) / RADAR_STATS.length;

  const normalize = (value: number) => {
    const clamped = Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
    return (clamped - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
  };

  const points = RADAR_STATS.map((stat, i) => {
    const value = abilities[stat] ?? 0;
    const r = normalize(value) * radius;
    const angle = i * angleStep - Math.PI / 2;

    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;

    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <svg width={size} height={size}>
        {/* Сетка */}
        {[0.25, 0.5, 0.75, 1].map((k, i) => (
          <polygon
            key={i}
            points={RADAR_STATS.map((_, j) => {
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
        {RADAR_STATS.map((stat, i) => {
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
          fill="rgba(120, 180, 255, 0.4)"
          stroke="#7ab4ff"
          strokeWidth="2"
        />

        {/* Подписи */}
        {RADAR_STATS.map((stat, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 20);
          const y = center + Math.sin(angle) * (radius + 20);

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
              {stat}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
