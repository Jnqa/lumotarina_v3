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
  { type: "actions", icon: "◻", name: "Трюки" },
  { type: "ShortRest", icon: "🔹", name: "Силовые приёмы" },
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
  learnedSet,
  onLearn,
}: {
  skill: SkillItem;
  icon: string;
  learnedSet: Set<string>;
  skillPoints: number;
  onLearn: (skill: SkillItem) => void;
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
          learnedSet={learnedSet}
          onLearn={onLearn}
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
  learnedSet,
  onLearn,
}: {
  skill: SkillItem;
  icon: string;
  depth?: number;
  expanded?: boolean;
  learnedSet: Set<string>;
  onLearn: (skill: SkillItem) => void;
}) {
  const hasChildren = skill.children && skill.children.length > 0;

  const isLearned = learnedSet.has(skill.name);

  const needsMet =
    !skill.needs ||
    skill.needs.every(n => learnedSet.has(n));

  const canLearn = !isLearned && needsMet;

  return (
    <>
      <div className={`skill-row depth ${isLearned ? "learned" : ""}`}>
        <div className="skill-icon">
          {depth === 0 ? icon : "∟"}
        </div>
        {skill.level && (
          <span className="skill-level-mini">Lv {skill.level}</span>
        )}
        {skill.dice && (
            <span className="skill-dice-mini">🎲 {skill.dice}</span>
          )}
        <div className="skill-header">
          <span className="skill-name">{skill.name}</span> 
          <div className="skill-effect">{skill.effect}</div>
          {canLearn ? (
            <button
              className="skill-learn-btn"
              onClick={e => {
                e.stopPropagation();
                onLearn(skill);
              }}
            >
              +
            </button>
          ) : isLearned ? (
            <button
              className="skill-learn-btn learned"
              onClick={e => {
                e.stopPropagation();
                onLearn(skill);
              }}
            >
              ✓
            </button>
          ) : (
            <button
              className="skill-learn-btn"
              onClick={e => {
                e.stopPropagation();
                onLearn(skill);
              }}
            >
              ...
            </button>
          )}
        </div>

        {!needsMet && !isLearned && (
          <span className="skill-locked">Требуются навыки</span>
        )}
      </div>

      {hasChildren && expanded && skill.children!.map(child => (
        <SkillRow
          key={child.id}
          skill={child}
          icon={icon}
          depth={depth + 1}
          expanded={expanded}
          learnedSet={learnedSet}
          onLearn={onLearn}
        />
      ))}

      {hasChildren && !expanded && depth === 0 && (
        <div className="skill-row depth skill-collapsed">
          <div className="skill-icon">∟</div>
          <div className="skill-effect">…</div>
        </div>
      )}
    </>
  );
}

interface CharacterIDs {
  userId: string;
  characterId: string;
}

export default function ClassPreviewSkills({
    CharacterID,
    isNoTitle = false
  }: {
    CharacterID: CharacterIDs;
    isNoTitle?: boolean 
  }) {

  const [character, setCharacter] = useState<any | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<keyof SkillCategory | null>(null);
  const [showLearnedOnly, setShowLearnedOnly] = useState(true);

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
      showToast('Нет skillpoints', { type: 'error' });
      return;
    }

    const requiredLevel = skill.level || 1;
    if ((character.level || 1) < requiredLevel) {
      showToast(`Требуется уровень ${requiredLevel}`, { type: 'error' });
      return;
    }

    // build optimistic next state
    const next = { ...character };
    if (!next.skills || typeof next.skills !== 'object') next.skills = {};
    if (!Array.isArray(next.skills[sectionKey])) next.skills[sectionKey] = [];

    // avoid duplicates
    if ((next.skills[sectionKey] || []).some((x: any) => x.name === skill.name)) return;

    next.skills[sectionKey] = [...(next.skills[sectionKey] || []), skill];
    next.skillpoints = Math.max(0, (next.skillpoints || 0) - 1);

    // optimistic update
    setCharacter(next);
    setSelectedSkill(null); // закрыть модал
    showToast(`Изучено: ${skill.name}`, { type: 'success' });

    // persist to server
    (async () => {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const userId = session?.tgId || session?.uid || session?.userId || null;
      const remoteId = CharacterID.characterId;
      if (userId && remoteId) {
        try {
          const resp = await fetch(
            `${API_BASE}/characters/user/${encodeURIComponent(userId)}/${encodeURIComponent(remoteId)}`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }
          );
          if (resp.ok) {
            showToast('Навык сохранён на сервере', { type: 'success' });
          } else {
            const txt = await resp.text();
            showToast('Ошибка при сохранении навыка: ' + (txt || resp.status), { type: 'error' });
          }
        } catch (e) {
          showToast('Ошибка соединения при сохранении навыка', { type: 'error' });
        }
      } else {
        showToast('Навык добавлен локально (неавторизовано)', { type: 'info' });
      }
    })();
  }

  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:3111";
  
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

  if (!character || !classData) {
  return <div className="loading">🎡</div>;
  }

  const learnedSet = new Set(
  Object.values(character.skills ?? {})
    .flat()
    .map((s: any) => s.name)
  );

  const selectedIsLearned = selectedSkill ? learnedSet.has(selectedSkill.name) : false;
  const selectedNeedsMet = selectedSkill
    ? !selectedSkill.needs || selectedSkill.needs.every((need) => learnedSet.has(need))
    : false;
  const selectedCanLearn = !!selectedSkill && !selectedIsLearned && selectedNeedsMet && (character.skillpoints || 0) > 0;

 return (
  <div className="class-preview">
    {isNoTitle && <div></div> || <div className="skills-filter">
      <div className="skills-filter-header">
        <span>Умения:</span>
        <button onClick={toggleFilter} className={`button-skill-toggle ${showLearnedOnly ? 'active' : ''}`}>
          {showLearnedOnly ? "Изученные" : "Все навыки"}
        </button>
        <div className="skill-points">{character.skillpoints}</div>
      </div>
    </div>}
    {actionTypes.map(actionType => {
      const list =
        classData.skills?.[0]?.[actionType.type as keyof SkillCategory];

      if (!list?.length) return null;

      const filteredList = showLearnedOnly
        ? list.filter(skill => learnedSet.has(skill.name))
        : list;

      const tree = buildSkillTree(filteredList);

      return (
        <section key={actionType.type} className="skill-section">
          <h3 className="section-title">
            {actionType.icon} {actionType.name}
          </h3>

          {tree.length > 0 && (
            <div className="skill-table">
              {tree.map(skill => (
                <SkillTreeRoot
                  key={skill.id}
                  skill={skill}
                  icon={actionType.icon}
                  learnedSet={learnedSet}
                  skillPoints={character.skillpoints}
                  onLearn={(skill) => openLearnModal(skill, actionType.type as keyof SkillCategory)}
                />
              ))}
            </div>
          )}
        </section>
      );
    })}
    {selectedSkill && (
      <div className="modal-backdrop" onClick={closeModal}>
        <div className="modal-learn" onClick={e => e.stopPropagation()}>
          <h3>{selectedSkill.name}</h3>

          <p>{selectedSkill.effect}</p>
          {(selectedSkill.description || (selectedSkill as any).descripton) && (
            <p>{selectedSkill.description || (selectedSkill as any).descripton}</p>
          )}
          {selectedSkill.dice && <p>🎲 {selectedSkill.dice}</p>}

          <p>
            Очки навыков: <b>{character.skillpoints}</b>
          </p>
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
            <div style={{ color: '#ccc', fontSize: '0.9em', marginBottom: '8px' }}>
              {selectedIsLearned
                ? 'Навык уже изучен'
                : character.skillpoints <= 0
                ? 'Нет очков навыков'
                : 'Требуются предшествующие навыки'}
            </div>
          )}

          <button onClick={closeModal}>Отмена</button>
        </div>
      </div>
    )}
  </div>
  );
}
