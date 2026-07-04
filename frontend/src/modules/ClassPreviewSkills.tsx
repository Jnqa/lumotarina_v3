import { useEffect, useState } from "react";
import "./ClassPreviewSkills.css";
import ElBadge from "../components/ElBadge";

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
  _unresolved?: boolean;
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
  hidden?: boolean;
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
] as const;

const CATEGORY_KEYS: (keyof SkillCategory)[] = ["actions", "ShortRest", "LongRest", "Passive"];

// Карта id -> навык по ВСЕМ блокам класса (общий блок + все стихии).
// Нужна только для подписи "Требует: <имя>" — чтобы она резолвилась,
// даже если предок лежит в другой категории или в другой стихии, а не
// только в текущем рендерящемся списке.
function buildGlobalIndex(data: ClassData) {
  const idx = new Map<string, SkillItem>();
  (data.skills || []).forEach(block => {
    CATEGORY_KEYS.forEach(key => {
      (block[key] || []).forEach(item => idx.set(item.id, item));
    });
  });
  return idx;
}

function reqLabel(skill: SkillItem, index: Map<string, SkillItem>): string | null {
  if (!skill.needs?.length) return null;
  return skill.needs.map(id => index.get(id)?.name ?? `«${id}»`).join(", ");
}

// Строит лес деревьев для списка навыков ОДНОЙ секции (база ИЛИ одна
// стихия одной категории — секции рендерятся раздельно, как и раньше).
// Если needs ссылается на id, которого нет в этом же списке — навык
// становится корнем, но помечается _unresolved, чтобы показать
// предупреждение, а не молча потерять связь (так нашлись битые needs
// в regalif.json — electro/wind2).
function buildSkillTree(skills: SkillItem[]) {
  const map = new Map<string, SkillItem>();
  skills.forEach(skill => map.set(skill.id, { ...skill, children: [] }));

  const roots: SkillItem[] = [];
  map.forEach(skill => {
    const parentId = skill.needs?.[0];
    const parent = parentId ? map.get(parentId) : undefined;
    if (parentId && !parent) {
      roots.push({ ...skill, _unresolved: true });
    } else if (parent) {
      parent.children!.push(skill);
    } else {
      roots.push(skill);
    }
  });
  return roots;
}

function countDescendants(skill: SkillItem): number {
  if (!skill.children?.length) return 0;
  return skill.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

function NodeContent({
  skill,
  icon,
  depth,
  globalIndex,
  caret,
}: {
  skill: SkillItem;
  icon: string;
  depth: number;
  globalIndex: Map<string, SkillItem>;
  caret?: "open" | "closed";
}) {
  const req = reqLabel(skill, globalIndex);

  return (
    <>
      <div className="medallion">{depth === 0 ? icon : "∟"}</div>
      <div className="node-main">
        <div className="node-name-line">
          <span className="node-name">{skill.name}</span>
          {skill.level != null && <span className="tag-mono">Lv {skill.level}</span>}
          {skill.dice && <span className="tag-mono dice">🎲 {skill.dice}</span>}
          {caret && <span className="node-caret">{caret === "open" ? "▾" : "▸"}</span>}
        </div>
        <div className="node-effect">{skill.effect}</div>
        {skill.description && <div className="node-desc">{skill.description}</div>}
        {req && (
          <div className={`req-line${skill._unresolved ? " req-broken" : ""}`}>
            {skill._unresolved
              ? `⚠ ссылается на несуществующий навык «${skill.needs?.[0]}»`
              : `Требует: ${req}`}
          </div>
        )}
      </div>
    </>
  );
}

// Узел внутри уже раскрытой ветки — рендерится рекурсивно, без своего
// expanded-состояния (сворачивать можно только целиком от корня, как и
// было задумано в исходной версии).
function SkillBranch({
  skill,
  icon,
  depth,
  globalIndex,
}: {
  skill: SkillItem;
  icon: string;
  depth: number;
  globalIndex: Map<string, SkillItem>;
}) {
  const hasChildren = !!skill.children?.length;

  return (
    <div className="node-block">
      <div className="node-row">
        <NodeContent skill={skill} icon={icon} depth={depth} globalIndex={globalIndex} />
      </div>
      {hasChildren && (
        <div className="chain nested">
          {skill.children!.map(child => (
            <SkillBranch key={child.id} skill={child} icon={icon} depth={depth + 1} globalIndex={globalIndex} />
          ))}
        </div>
      )}
    </div>
  );
}

// Корень цепочки — кликабелен, если есть потомки (раскрывает/сворачивает
// всю цепочку целиком).
function SkillTreeRoot({
  skill,
  icon,
  globalIndex,
}: {
  skill: SkillItem;
  icon: string;
  globalIndex: Map<string, SkillItem>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!skill.children?.length;

  return (
    <div className="node-block">
      <div
        className={`node-row ${hasChildren ? "node-row--clickable" : ""}`}
        onClick={() => hasChildren && setExpanded(v => !v)}
      >
        <NodeContent
          skill={skill}
          icon={icon}
          depth={0}
          globalIndex={globalIndex}
          caret={hasChildren ? (expanded ? "open" : "closed") : undefined}
        />
      </div>

      {hasChildren && expanded && (
        <div className="chain nested">
          {skill.children!.map(child => (
            <SkillBranch key={child.id} skill={child} icon={icon} depth={1} globalIndex={globalIndex} />
          ))}
        </div>
      )}

      {hasChildren && !expanded && (
        <div className="node-row node-row--collapsed">
          <div className="medallion medallion--ghost">∟</div>
          <div className="node-effect">
            ещё {countDescendants(skill)} {countDescendants(skill) === 1 ? "умение" : "умения"} в цепочке — нажми, чтобы раскрыть
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassPreviewSkills({ className }: { className: string }) {
  const [data, setData] = useState<ClassData | null>(null);
  // ВАЖНО: этот хук раньше объявлялся ПОСЛЕ `if (!data) return ...`, то
  // есть на первом рендере (когда data ещё null) React видел меньше хуков,
  // чем на следующем — это нарушает правило стабильного порядка хуков и
  // могло давать непредсказуемые баги состояния. Перенёс наверх, до любых
  // early return.
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:3111";

  useEffect(() => {
    if (!className) return;

    fetch(`${API_BASE}/classes/${className}`)
      .then(r => r.json())
      .then(setData);
  }, [className]);

  const isVersion2 = data?.version === 2;
  const elementBlocks = isVersion2 ? data?.skills?.filter(block => Boolean(block.element)) || [] : [];
  const availableElements = isVersion2
    ? data?.element_choice?.elements?.length
      ? data.element_choice.elements
      : elementBlocks.map(block => block.element).filter((el): el is string => Boolean(el))
    : [];

  useEffect(() => {
    if (isVersion2 && !selectedElement && availableElements.length > 0) {
      setSelectedElement(availableElements[0]);
    }
  }, [isVersion2, availableElements, selectedElement]);

  if (!data) return <div className="loading">Загрузка…</div>;

  const baseSkills = data.skills?.[0] || {};
  const elementChoiceDescription = data.element_choice?.description || "";
  const filteredElementBlocks = selectedElement
    ? elementBlocks.filter(block => block.element === selectedElement)
    : elementBlocks;
  const selectedElementBlock = selectedElement
    ? elementBlocks.find(block => block.element === selectedElement)
    : null;

  const globalIndex = buildGlobalIndex(data);

  const renderTree = (list: SkillItem[], icon: string) => {
    const tree = buildSkillTree(list);
    return (
      <div className="chain">
        {tree.map(skill => (
          <SkillTreeRoot key={skill.id} skill={skill} icon={icon} globalIndex={globalIndex} />
        ))}
      </div>
    );
  };

  return (
    <div className="class-preview">
      {data.hidden && <span className="secret-badge">🔒 Секретный класс</span>}

      {isVersion2 && <ElBadge elements={elementBlocks} label="Стихии" />}

      {isVersion2 && availableElements.length > 0 && (
        <div className="element-buttons">
          <button
            type="button"
            className={`element-button ${selectedElement === null ? "active" : ""}`}
            onClick={() => setSelectedElement(null)}
          >
            Все
          </button>
          {availableElements.map(el => {
            const meta = ELEMENT_META[el] || { icon: "", name: el, color: "#fff" };
            const active = selectedElement === el;
            return (
              <button
                key={el}
                type="button"
                className={`element-button ${active ? "active" : ""}`}
                style={{
                  borderColor: meta.color,
                  // на активной кнопке текст тёмный — у молнии/ветра
                  // светлый фон, белый текст на нём почти не читался
                  color: active ? "#15111f" : meta.color,
                  background: active ? meta.color : "transparent",
                }}
                onClick={() => setSelectedElement(el)}
              >
                {meta.icon} {meta.name}
              </button>
            );
          })}
        </div>
      )}

      {isVersion2 && elementChoiceDescription && (
        <p className="class-description">{elementChoiceDescription}</p>
      )}
      {selectedElementBlock?.element_note && (
        <p className="class-description">{selectedElementBlock.element_note}</p>
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
            list: block[actionType.type as keyof SkillCategory] || [],
          }))
          .filter(item => item.list.length > 0);

        if (!baseList.length && elementSections.length === 0) return null;

        return (
          <section key={actionType.type} className="panel">
            <h3 className="panel-title">
              {actionType.icon} {actionType.name}
            </h3>

            <div className="skill-table">
              {baseList.length > 0 && renderTree(baseList, actionType.icon)}
              {elementSections.map(({ block, list }) => (
                <div key={block.element || block.element_name} className="element-section">
                  <div className="element-section-title">
                    {ELEMENT_META[block.element || ""]?.icon || ""} {block.element_name || block.element}
                  </div>
                  {renderTree(list, actionType.icon)}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}