import { useEffect, useState } from "react";
import "./ClassPreviewSkills.css";

type AbilityMap = Record<string, number>;

type SkillItem = {
  id: string;
  name: string;
  effect: string;
  description?: string;
  level?: number;
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

type SkillBlock = SkillCategory & {
  element?: string;
  element_name?: string;
  note?: string;
  element_note?: string;
};

type ElementChoice = {
  description?: string;
  elements?: string[];
};

type ClassData = {
  id: string;
  name: string;
  version?: number;
  defense: number;
  hp: number;
  description: string;
  abilities: AbilityMap[];
  icon?: string;
  inventory?: string[][];
  element_choice?: ElementChoice;
  skills: SkillBlock[];
};

const ELEMENT_META: Record<string, { icon: string; name: string; color: string }> = {
  fire: { icon: "🔥", name: "Огонь", color: "#d84a37" },
  water: { icon: "💧", name: "Вода", color: "#4b9cd3" },
  wind: { icon: "🌪️", name: "Ветер", color: "#8bcf6e" },
  ice: { icon: "❄️", name: "Лёд", color: "#8cc0e5" },
  earth: { icon: "⛰️", name: "Земля", color: "#a57739" },
  lightning: { icon: "⚡", name: "Молния", color: "#f0db5a" },
};

const actionTypes = [
  { type: "actions", icon: "⚔", name: "Трюки" },
  { type: "ShortRest", icon: "🌙", name: "Силовые приёмы" },
  { type: "LongRest", icon: "☀", name: "Сверхприёмы" },
  { type: "Passive", icon: "◈", name: "Черты" },
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
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:3111";

  useEffect(() => {
    if (!className) return;

    fetch(`${API_BASE}/classes/${className}`)
      .then(r => r.json())
      .then(setData);
  }, [className]);

  if (!data) return <div className="loading">Loading…</div>;

  const isVersion2 = data.version === 2;
  const baseSkills = data.skills?.[0] || {};
  const elementBlocks = isVersion2 ? data.skills?.filter(block => Boolean(block.element)) || [] : [];
  const elementChoiceDescription = data.element_choice?.description || '';
  const availableElements = isVersion2
    ? data.element_choice?.elements?.length
      ? data.element_choice.elements
      : elementBlocks.map(block => block.element).filter((el): el is string => Boolean(el))
    : [];

  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  useEffect(() => {
    if (isVersion2 && !selectedElement && availableElements.length > 0) {
      setSelectedElement(availableElements[0]);
    }
  }, [isVersion2, availableElements, selectedElement]);

  const filteredElementBlocks = selectedElement
    ? elementBlocks.filter(block => block.element === selectedElement)
    : elementBlocks;

  const selectedElementBlock = selectedElement
    ? elementBlocks.find(block => block.element === selectedElement)
    : null;

  const renderTree = (list: SkillItem[]) => {
    const tree = buildSkillTree(list);
    return tree.map(skill => (
      <SkillTreeRoot
        key={skill.id}
        skill={skill}
        icon="◻"
      />
    ));
  };

  return (
    <div className="class-preview">
      {isVersion2 && (
        <div className="element-banner">
          <div className="element-label">Стихии</div>
          <div className="element-value">
            {elementBlocks.length > 0
              ? elementBlocks.map(block => `${ELEMENT_META[block.element || '']?.icon || ''} ${block.element_name || block.element || ''}`).join(', ')
              : 'Нет данных'}
          </div>
        </div>
      )}
      {isVersion2 && availableElements.length > 0 && (
        <div className="element-buttons">
          <button
            type="button"
            className={`element-button ${selectedElement === null ? 'active' : ''}`}
            onClick={() => setSelectedElement(null)}
          >
            Все
          </button>
          {availableElements.map(el => {
            const meta = ELEMENT_META[el] || { icon: '', name: el, color: '#fff' };
            return (
              <button
                key={el}
                type="button"
                className={`element-button ${selectedElement === el ? 'active' : ''}`}
                style={{ borderColor: meta.color, color: selectedElement === el ? '#fff' : meta.color, background: selectedElement === el ? meta.color : 'transparent' }}
                onClick={() => setSelectedElement(el)}
              >
                {meta.icon} {meta.name}
              </button>
            );
          })}
        </div>
      )}
      {isVersion2 && elementChoiceDescription && (
        <div className="class-description">{elementChoiceDescription}</div>
      )}
      {selectedElementBlock?.element_note && (
        <div className="class-description">{selectedElementBlock.element_note}</div>
      )}
      <div className="class-stats">
        🛡 {data.defense} · 💚 {data.hp}
      </div>

      <p className="class-description">{data.description}</p>

      {actionTypes.map(actionType => {
        const baseList = baseSkills[actionType.type as keyof SkillCategory] || [];
        const elementSections = filteredElementBlocks
          .map(block => ({
            block,
            list: block[actionType.type as keyof SkillCategory] || []
          }))
          .filter(item => item.list.length > 0);

        if (!baseList.length && elementSections.length === 0) return null;

        return (
          <section key={actionType.type} className="skill-section">
            <h3 className="section-title">
              {actionType.icon} {actionType.name}
            </h3>

            <div className="skill-table">
              {baseList.length > 0 && renderTree(baseList)}
              {elementSections.map(({ block, list }) => (
                <div key={block.element || block.element_name} className="element-section">
                  <div className="element-section-title">
                    {ELEMENT_META[block.element || '']?.icon || ''} {block.element_name || block.element}
                  </div>
                  {renderTree(list)}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
