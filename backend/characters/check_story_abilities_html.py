import json

# --- Загружаем JSON и собираем пути ---
with open("story.json", "r", encoding="utf-8") as f:
    data = json.load(f)

results = []

MAX_DEPTH = 5  # считаем только первые 5 выборов

def traverse(node, path=None, abilities=None, classes=None, depth=0):
    if path is None: path = []
    if abilities is None: abilities = {}
    if classes is None: classes = set()

    current = data["questions"][node]
    if "options" not in current or depth >= MAX_DEPTH:
        results.append({
            "path": " > ".join(path),
            "abilities": abilities,
            "classes": list(classes)
        })
        return

    for option in current.get("options", []):
        next_abilities = abilities.copy()
        for ab_dict in option.get("abilities", []):
            if isinstance(ab_dict, dict):
                for k, v in ab_dict.items():
                    next_abilities[k] = next_abilities.get(k, 0) + v
            elif isinstance(ab_dict, list):
                for d in ab_dict:
                    for k, v in d.items():
                        next_abilities[k] = next_abilities.get(k, 0) + v

        next_classes = classes.copy()
        if "class" in option:
            next_classes.add(option["class"])

        next_path = path + [option["text"]]
        if option.get("next"):
            traverse(option["next"], next_path, next_abilities, next_classes, depth + 1)
        else:
            results.append({
                "path": " > ".join(next_path),
                "abilities": next_abilities,
                "classes": list(next_classes)
            })

traverse(data["start"])

# --- Цвета способностей ---
color_map = {
    "Stealth": "#071F2E",
    "Lockpicking": "#333236",
    "Perception": "#c7ecd7",
    "Engineering": "#717FFF",
    "Charisma": "#f5ea57",
    "Strength": "#ce0e00",
    "Dexterity": "#0400f5",
    "Intelligence": "#33c99c",
    "Medicine": "#14af00",
    "Willpower": "#bf71ff",
    "Constitution": "#470000",
    "Survival": "#3f7565",
    "Crafting": "#462E10",
    "Lumion": "#00b7ff",
    "Wisdom": "#5d0281"
}

# --- HTML заголовок ---
html_header = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>График всех путей</title>
<style>
body {{ font-family: Arial, sans-serif; background: #121212; color: #eee; padding: 20px; }}
.bar-container {{ margin-bottom: 10px; 
    background: #1e1e1e; 
    border-radius: 10px; 
    padding: 5px; 
    position: relative; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
}}

.zero-line {{ 
    position: absolute; 
    left: 50%; 
    top: 0; 
    bottom: 0; 
    width: 2px; 
    background: #1f7; 
    z-index: 1; 
}}

.negative-column, .positive-column {{
    display: flex; 
    align-items: center; 
    justify-content: flex-end; /* отрицательные справа, положительные слева */ 
    width: 45%; /* фиксированная ширина колонки */ 
}}

.positive-column {{ 
    justify-content: flex-start; 
    width: 45%;
    display: flex; 
    align-items: center;
}}
.bar {{ height: 100%; border-radius: 4px; margin: 0 1px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; position: relative; }}
.bar:hover::after {{
    content: attr(data-tooltip);
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    background: #333; color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; z-index: 100;
}}
.legend {{ margin-bottom: 20px; }}
.legend div {{ display: inline-block; padding: 4px 10px; margin-right: 5px; border-radius: 4px; color: #fff; font-size: 12px; }}
h1 {{ margin-bottom: 5px; }}
.count {{ margin-bottom: 20px; font-weight: bold; }}
</style>
</head>
<body>
<h1>График всех путей и способностей</h1>
<div class="count">Всего вариантов: {len(results)}</div>
<div class="legend">
"""

# --- Легенда ---
legend_html = ""
for ab, color in color_map.items():
    legend_html += f'<div style="background:{color}">{ab}</div>\n'
legend_html += "</div>\n"

# --- Тело графика ---
scale = 10  # множитель ширины

html_body = ""
for r in results:
    negative_html = ""
    positive_html = ""
    for ab, val in r["abilities"].items():
        color = color_map.get(ab, "#7f8c8d")
        tooltip = f"{ab}: {val} | {r['path']} | 🔰: {', '.join(r['classes'])}"
        if val < 0:
            negative_html += f'<div class="bar" style="width:{-val*scale}px; background:{color}" data-tooltip="{tooltip}">{val}</div>'
        elif val > 0:
            positive_html += f'<div class="bar" style="width:{val*scale}px; background:{color}" data-tooltip="{tooltip}">+{val}</div>'
    html_body += f'<div class="bar-container"><div class="negative-column">{negative_html}</div><div class="zero-line"></div><div class="positive-column">{positive_html}</div></div>\n'

html_footer = "</body></html>"

with open("paths_graph.html", "w", encoding="utf-8") as f:
    f.write(html_header + legend_html + html_body + html_footer)

print("Готово! Открой paths_graph.html в браузере.")
