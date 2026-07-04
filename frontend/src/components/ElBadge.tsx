import "../modules/ClassPreviewSkills.css";

type ElemBlock = { element?: string; element_name?: string };

const ELEMENT_META: Record<string, { icon: string; name: string; color: string }> = {
  fire: { icon: "🔥", name: "Огонь", color: "#d84a37" },
  water: { icon: "💧", name: "Вода", color: "#4b9cd3" },
  wind: { icon: "🌪️", name: "Ветер", color: "#8bcf6e" },
  ice: { icon: "❄️", name: "Лёд", color: "#8cc0e5" },
  earth: { icon: "⛰️", name: "Земля", color: "#a57739" },
  lightning: { icon: "⚡", name: "Молния", color: "#f0db5a" },
};

export default function ElBadge({
  element = null,
  elements = undefined,
  label = "Стихии",
}: {
  element?: string | null;
  elements?: ElemBlock[] | undefined;
  label?: string;
}) {
  if (elements && elements.length > 0) {
    const list = elements
      .map(b => `${ELEMENT_META[b.element || ""]?.icon || ""} ${b.element_name || b.element || ""}`)
      .join(", ");
    return (
      <div className="element-banner">
        <div className="element-badge-icon">✦</div>
        <div className="element-badge-text">
          <div className="element-label">{label}</div>
          <div className="element-value">{list || "Нет данных"}</div>
        </div>
      </div>
    );
  }

  const meta = element ? ELEMENT_META[element] : null;
  return (
    <div className="element-badge">
      <div className="element-badge-icon">{meta ? meta.icon : "◌"}</div>
      <div className="element-badge-text">
        <div className="element-label">{label.slice(0, 7)}</div>
        <div className="element-value">{meta ? meta.name : "Не выбрана"}</div>
      </div>
    </div>
  );
}
