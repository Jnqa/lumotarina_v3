import { useEffect, useState } from "react";
import "./ClassPreviewSkills.css";

type AbilityMap = Record<string, number>;

type SkillItem = {
  id: string;
  name: string;
  effect: string;
  level: number;
  dice?: string;
  needs?: string[];
  skills?: AbilityMap[];
  children?: SkillItem[];
};

type SkillCategory = {
  actions?: SkillItem[];
  ShortRest?: SkillItem[];
  LongRest?: SkillItem[];
  Passive?: SkillItem[];
};

type ClassData = {
  id: string;
  name: string;
  defense: number;
  hp: number;
  description: string;
  abilities: AbilityMap[];
  icon?: string;
  inventory?: string[][];
  skills: SkillCategory[];
};

const actionTypes = [
  { type: "actions", icon: "🔹", name: "Трюки" },
  { type: "ShortRest", icon: "🔶", name: "Силовые приёмы" },
  { type: "LongRest", icon: "⭐", name: "Сверхприёмы" },
  { type: "Passive", icon: "🌚", name: "Черты" },
];

function buildSkillTree(skills: SkillItem[]) {
  const map = new Map<string, SkillItem>();

  skills.forEach(skill => {
    map.set(skill.id, { ...skill, children: [] });
  });

  const roots: SkillItem[] = [];

  map.forEach(skill => {
    if (skill.needs?.length) {
      skill.needs.forEach(parentId => {
        const parent = map.get(parentId);
        if (parent) parent.children!.push(skill);
      });
    } else {
      roots.push(skill);
    }
  });

  return roots;
}

function SkillTreeRoot({
  skill,
  icon,
}: {
  skill: SkillItem;
  icon: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = skill.children && skill.children.length > 0;

  return (
    <div className="skill-root">
      <div
        className={`skill-root-header ${hasChildren ? "clickable" : ""}`}
        onClick={() => hasChildren && setExpanded(v => !v)}
      >
        <SkillRow
          skill={skill}
          icon={icon}
          depth={0}
          expanded={expanded}
        />
      </div>
    </div>
  );
}


function SkillRow({
  skill,
  icon,
  depth = 0,
  expanded,
}: {
  skill: SkillItem;
  icon: string;
  depth?: number;
  expanded?: boolean;
}) {
  const hasChildren = skill.children && skill.children.length > 0;

  return (
    <>
      <div className={`skill-row depth`}>
        <div className="skill-icon">
          {depth === 0 ? icon : "∟"}
        </div>

        <div className="skill-header">
          <span className="skill-level">Lv {skill.level}</span>
          <span className="skill-name">{skill.name}</span>

          {skill.dice && (
            <span className="skill-dice-mini">🎲 {skill.dice}</span>
          )}
        </div>

        <div className="skill-effect">{skill.effect}</div>
      </div>

      {/* ВЛОЖЕННЫЕ */}
      {hasChildren && expanded && skill.children!.map(child => (
        <SkillRow
          key={child.id}
          skill={child}
          icon={icon}
          depth={depth + 1}
          expanded={expanded}
        />
      ))}

      {/* ИНДИКАТОР СВЁРНУТОГО */}
      {hasChildren && !expanded && depth === 0 && (
        <div className="skill-row depth skill-collapsed">
          <div className="skill-icon">∟</div>
          <div className="skill-effect">…</div>
        </div>
      )}
    </>
  );
}

export default function ClassPreviewSkills({ className }: { className: string }) {
  const [data, setData] = useState<ClassData | null>(null);
  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:3001";

  useEffect(() => {
    if (!className) return;

    fetch(`${API_BASE}/classes/${className}`)
      .then(r => r.json())
      .then(setData);
  }, [className]);

  if (!data) return <div className="loading">Loading…</div>;

  const skills = data.skills[0];

  return (
    <div className="class-preview">
      <div className="class-stats">
        🛡 {data.defense} · 💚 {data.hp}
      </div>

      <p className="class-description">{data.description}</p>

      {actionTypes.map(actionType => {
        const list = skills[actionType.type as keyof SkillCategory];
        if (!list?.length) return null;

        const tree = buildSkillTree(list);

        return (
          <section key={actionType.type} className="skill-section">
            <h3 className="section-title">
              {actionType.icon} {actionType.name}
            </h3>

            <div className="skill-table">
              {tree.map(skill => (
                <SkillTreeRoot
                  key={skill.id}
                  skill={skill}
                  icon={actionType.icon}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
