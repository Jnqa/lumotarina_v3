import { useEffect, useState } from "react";
import "./ClassPreviewSkills.css";
import { showToast } from '../utils/toast';

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
  element?: string;
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
  fire:      { icon: "🔥", name: "Огонь",  color: "#d84a37" },
  water:     { icon: "💧", name: "Вода",   color: "#4b9cd3" },
  wind:      { icon: "🌪️", name: "Ветер",  color: "#8bcf6e" },
  ice:       { icon: "❄️", name: "Лёд",    color: "#8cc0e5" },
  earth:     { icon: "⛰️", name: "Земля",  color: "#a57739" },
  lightning: { icon: "⚡", name: "Молния", color: "#f0db5a" },
};

const actionTypes = [
  { type: "actions",   icon: "⚔",  name: "Трюки" },
  { type: "ShortRest", icon: "🌙", name: "Силовые приёмы" },
  { type: "LongRest",  icon: "☀",  name: "Сверхприёмы" },
  { type: "Passive",   icon: "◈",  name: "Черты" },
] as const;

function buildSkillTree(skills: SkillItem[]) {
  const map = new Map<string, SkillItem>();
  skills.forEach(skill => map.set(skill.id, { ...skill, children: [] }));

  const roots: SkillItem[] = [];
  map.forEach(skill => {
    if (skill.needs?.length) {
      const parent = map.get(skill.needs[0]);
      if (parent) {
        parent.children!.push(skill);
      } else {
        roots.push(skill);
      }
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

// Рекурсивный узел внутри раскрытой ветки — не управляет expand-состоянием,
// просто рисует себя и своих детей.
function SkillBranch({
  skill,
  icon,
  depth,
  selectedElement,
  learnedSet,
  onLearn,
}: {
  skill: SkillItem;
  icon: string;
  depth: number;
  selectedElement: string | null;
  learnedSet: Set<string>;
  onLearn: (skill: SkillItem) => void;
}) {
  const hasChildren = !!skill.children?.length;
  const isLearned  = learnedSet.has(skill.name);
  const needsMet   = !skill.needs || skill.needs.every(n => learnedSet.has(n));
  const canLearn   = !isLearned && needsMet;

  const blockState = isLearned ? "is-learned"
    : canLearn     ? "is-available"
    : "is-locked-needs";

  const statusMark = isLearned ? "✓" : canLearn ? "+" : "🔒";
  const selectedMeta = skill.element === selectedElement ? ELEMENT_META[skill.element || ""] : null;

  return (
    <div className={`node-block ${blockState}`}>
      <div
        className="node-row node-row--clickable"
        onClick={() => onLearn(skill)}
      >
        <div className="medallion">
          {depth === 0 ? icon : "⍋"}
          {selectedMeta && (
            <span
              className="el-badge"
              style={{ borderColor: selectedMeta.color, color: selectedMeta.color }}
            >
              {selectedMeta.icon}
            </span>
          )}
        </div>
        <div className="node-main">
          <div className="node-name-line">
            <span className="node-name">{skill.name}</span>
            {skill.level != null && <span className="tag-mono">Lv {skill.level}</span>}
            {skill.dice && <span className="tag-mono dice">🎲 {skill.dice}</span>}
          </div>
          <div className="node-effect">{skill.effect}</div>
        </div>
        <div
          className="status-mark"
          onClick={e => { e.stopPropagation(); onLearn(skill); }}
        >
          {statusMark}
        </div>
      </div>

      {hasChildren && (
        <div className="chain nested">
          {skill.children!.map(child => (
            <SkillBranch
              key={child.id}
              skill={child}
              icon={icon}
              depth={depth + 1}
              selectedElement={selectedElement}
              learnedSet={learnedSet}
              onLearn={onLearn}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Корень цепочки — управляет раскрытием/свёртыванием и показывает
// "ещё N умений" в свёрнутом состоянии.
function SkillTreeRoot({
  skill,
  icon,
  selectedElement,
  learnedSet,
  onLearn,
}: {
  skill: SkillItem;
  icon: string;
  selectedElement: string | null;
  learnedSet: Set<string>;
  onLearn: (skill: SkillItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = !!skill.children?.length;

  const isLearned  = learnedSet.has(skill.name);
  const needsMet   = !skill.needs || skill.needs.every(n => learnedSet.has(n));
  const canLearn   = !isLearned && needsMet;

  const blockState = isLearned ? "is-learned"
    : canLearn     ? "is-available"
    : "is-locked-needs";

  const statusMark = isLearned ? "✓" : canLearn ? "+" : "🔒";

  const desc = countDescendants(skill);

  const selectedMeta = skill.element === selectedElement ? ELEMENT_META[skill.element || ""] : null;

  return (
    <div className={`node-block ${blockState}`}>
      <div
        className="node-row node-row--clickable"
        onClick={() => hasChildren ? setExpanded(v => !v) : onLearn(skill)}
      >
        <div className="medallion">
          {icon}
          {selectedMeta && (
            <span
              className="el-badge"
              style={{ borderColor: selectedMeta.color, color: selectedMeta.color }}
            >
              {selectedMeta.icon}
            </span>
          )}
        </div>
        <div className="node-main">
          <div className="node-name-line">
            <span className="node-name">{skill.name}</span>
            {skill.level != null && <span className="tag-mono">Lv {skill.level}</span>}
            {skill.dice && <span className="tag-mono dice">🎲 {skill.dice}</span>}
            {hasChildren && (
              <span className="node-caret">{expanded ? "▾" : "▸"}</span>
            )}
          </div>
          <div className="node-effect">{skill.effect}</div>
        </div>
        <div
          className="status-mark"
          onClick={e => { e.stopPropagation(); onLearn(skill); }}
        >
          {statusMark}
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="chain nested">
          {skill.children!.map(child => (
            <SkillBranch
              key={child.id}
              skill={child}
              icon={icon}
              depth={1}
              selectedElement={selectedElement}
              learnedSet={learnedSet}
              onLearn={onLearn}
            />
          ))}
        </div>
      )}

      {hasChildren && !expanded && (
        <div className="node-row node-row--collapsed">
          <div className="medallion medallion--ghost">⍋</div>
          <div className="node-effect">
            ещё {desc} {desc === 1 ? "умение" : "умения"} — нажми, чтобы раскрыть
          </div>
        </div>
      )}
    </div>
  );
}

interface CharacterIDs {
  userId: string;
  characterId: string;
}

export default function ClassSkills({
  CharacterID,
  isNoTitle = false,
}: {
  CharacterID: CharacterIDs;
  isNoTitle?: boolean;
}) {
  const [character, setCharacter] = useState<any | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<keyof SkillCategory | null>(null);
  const [showLearnedOnly, setShowLearnedOnly] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:3111";

  function toggleFilter() {
    setShowLearnedOnly(v => !v);
  }

  function openLearnModal(skill: SkillItem, sectionKey: keyof SkillCategory) {
    setSelectedSkill(skill);
    setSelectedSectionKey(sectionKey);
  }

  function closeModal() {
    setSelectedSkill(null);
  }

  function handleLearn(skill: SkillItem, sectionKey: keyof SkillCategory) {
    if (!character) return;

    const sp = character.skillpoints || 0;
    if (sp <= 0) {
      showToast("Нет skillpoints", { type: "error" });
      return;
    }

    const requiredLevel = skill.level || 1;
    if ((character.level || 1) < requiredLevel) {
      showToast(`Требуется уровень ${requiredLevel}`, { type: "error" });
      return;
    }

    const next = { ...character };
    if (!next.skills || typeof next.skills !== "object") next.skills = {};
    if (!Array.isArray(next.skills[sectionKey])) next.skills[sectionKey] = [];

    if ((next.skills[sectionKey] || []).some((x: any) => x.name === skill.name)) return;

    next.skills[sectionKey] = [...(next.skills[sectionKey] || []), skill];
    next.skillpoints = Math.max(0, (next.skillpoints || 0) - 1);

    setCharacter(next);
    setSelectedSkill(null);
    showToast(`Изучено: ${skill.name}`, { type: "success" });

    (async () => {
      try {
        const sresp = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!sresp.ok) throw new Error("no session");
        const sj = await sresp.json();
        const userId = sj?.success && sj.user
          ? (sj.user.tgId || sj.user.userId || sj.user.uid)
          : null;
        const remoteId = CharacterID.characterId;
        if (userId && remoteId) {
          try {
            const resp = await fetch(
              `${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}`,
              { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }
            );
            if (resp.ok) {
              showToast("Навык сохранён на сервере", { type: "success" });
            } else {
              const txt = await resp.text();
              showToast("Ошибка при сохранении навыка: " + (txt || resp.status), { type: "error" });
            }
          } catch {
            showToast("Ошибка соединения при сохранении навыка", { type: "error" });
          }
        } else {
          showToast("Навык добавлен локально (неавторизовано)", { type: "info" });
        }
      } catch {
        showToast("Навык добавлен локально (неавторизовано)", { type: "info" });
      }
    })();
  }

  useEffect(() => {
    const { userId, characterId } = CharacterID;
    if (!userId || !characterId) return;
    fetch(`${API_BASE}/characters/user/${userId}/${characterId}`)
      .then(r => r.json())
      .then(setCharacter);
  }, [CharacterID]);

  useEffect(() => {
    if (!character?.class) return;
    fetch(`${API_BASE}/classes/${character.class}`)
      .then(r => r.json())
      .then(setClassData);
  }, [character]);

  const persistedElement =
    (character as any)?.selectedElement || (character as any)?.element || null;

  useEffect(() => {
    if (persistedElement) setSelectedElement(persistedElement);
  }, [persistedElement]);

  if (!character || !classData) {
    return <div className="loading">🎡</div>;
  }

  const isVersion2 = classData.version === 2;
  const baseSkills = classData.skills?.[0] || {};
  const elementBlocks = isVersion2
    ? classData.skills?.filter(block => Boolean(block.element)) || []
    : [];

  const availableElements = isVersion2
    ? classData.element_choice?.elements?.length
      ? classData.element_choice.elements
      : elementBlocks.map(b => b.element).filter((el): el is string => Boolean(el))
    : [];

  function allSkillsByType(type: keyof SkillCategory): SkillItem[] {
    const baseList = baseSkills[type] || [];
    const elementList = isVersion2 && selectedElement
      ? (elementBlocks.find(b => b.element === selectedElement)?.[type] || []).map(skill => ({ ...skill, element: selectedElement }))
      : [];
    return [...baseList, ...elementList];
  }

  const learnedSet = new Set(
    Object.values(character.skills ?? {})
      .flat()
      .map((s: any) => s.name)
  );

  const selectedIsLearned = selectedSkill ? learnedSet.has(selectedSkill.name) : false;
  const selectedNeedsMet  = selectedSkill
    ? !selectedSkill.needs || selectedSkill.needs.every(n => learnedSet.has(n))
    : false;
  const selectedCanLearn  = !!selectedSkill && !selectedIsLearned && selectedNeedsMet && (character.skillpoints || 0) > 0;

  return (
    <div className="class-preview">
      {/* ── шапка ── */}
      {!isNoTitle && (
        <div className="skills-filter">
          <div className="skills-filter-header">
            <span>Умения:</span>
            <button
              onClick={toggleFilter}
              className={`button-skill-toggle ${showLearnedOnly ? "active" : ""}`}
            >
              {showLearnedOnly ? "Изученные" : "Все навыки"}
            </button>
            <div className="skill-points">{character.skillpoints}</div>
          </div>
        </div>
      )}

      {/* ── стихия (v2) ──
      {isVersion2 && (
        <div className="element-badge">
          <div className="element-badge-icon">
            {selectedElement && ELEMENT_META[selectedElement]
              ? ELEMENT_META[selectedElement].icon
              : "◌"}
          </div>
          <div className="element-badge-text">
            <div className="element-label">Стихия</div>
            <div className="element-value">
              {selectedElement && ELEMENT_META[selectedElement]
                ? ELEMENT_META[selectedElement].name
                : "Не выбрана"}
            </div>
          </div>
        </div>
      )} */}

      {isVersion2 && availableElements.length > 0 && (
        <div className="element-buttons">
          {availableElements.map(el => {
            const meta = ELEMENT_META[el] || { icon: "", name: el, color: "#fff" };
            const active = selectedElement === el;
            return (
              <button
                key={el}
                type="button"
                title={meta.name}
                className={`element-button ${active ? "active" : ""}`}
                style={{
                  borderColor: meta.color,
                  color: active ? "#15111f" : meta.color,
                  background: active ? meta.color : "transparent",
                }}
                onClick={() => setSelectedElement(el)}
              >
                {meta.icon}
              </button>
            );
          })}
        </div>
      )}

      {/* ── панели категорий ── */}
      {actionTypes.map(actionType => {
        const list = allSkillsByType(actionType.type as keyof SkillCategory);
        if (!list.length) return null;

        const filteredList = showLearnedOnly
          ? list.filter(skill => learnedSet.has(skill.name))
          : list;

        const tree = buildSkillTree(filteredList);
        if (!tree.length) return null;

        const anyLearned = filteredList.some(s => learnedSet.has(s.name));

        return (
          <section key={actionType.type} className="panel">
            <h3 className="panel-title">
              {actionType.icon} {actionType.name}
            </h3>

            <div className={`chain ${anyLearned ? "has-energy" : ""}`}>
              {tree.map(skill => (
                <SkillTreeRoot
                  key={skill.id}
                  skill={skill}
                  icon={actionType.icon}
                  selectedElement={selectedElement}
                  learnedSet={learnedSet}
                  onLearn={skill => openLearnModal(skill, actionType.type as keyof SkillCategory)}
                />
              ))}
            </div>
          </section>
        );
      })}
      {showLearnedOnly && (
            <button
              onClick={toggleFilter}
              className={`button-skill-toggle-bottom ${showLearnedOnly ? "active" : ""}`}
            >
              {showLearnedOnly ? "Показать все навыки" : "Показать изученные"}
            </button>
            )
      }
      {/* ── модалка изучения ── */}
      {selectedSkill && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-learn" onClick={e => e.stopPropagation()}>
            <h3>{selectedSkill.name}</h3>

            <p>{selectedSkill.effect}</p>
            {(selectedSkill.description || (selectedSkill as any).descripton) && (
              <p>{selectedSkill.description || (selectedSkill as any).descripton}</p>
            )}
            {selectedSkill.dice && <p>🎲 {selectedSkill.dice}</p>}

            <p>Очки навыков: <b>{character.skillpoints}</b></p>

            {selectedCanLearn ? (
              <button
                onClick={() => {
                  if (selectedSkill && selectedSectionKey) {
                    handleLearn(selectedSkill, selectedSectionKey);
                    closeModal();
                  }
                }}
              >
                Изучить
              </button>
            ) : (
              <div style={{ color: "#ccc", fontSize: "0.9em", marginBottom: "8px" }}>
                {selectedIsLearned
                  ? "Навык уже изучен"
                  : character.skillpoints <= 0
                  ? "Нет очков навыков"
                  : "Требуются предшествующие навыки"}
              </div>
            )}

            <button onClick={closeModal}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}