import json
import os

classes_folder = "classes"
color_map = {
    "Strength": "#e74c3c",
    "Dexterity": "#3498db",
    "Constitution": "#e67e22",
    "Intelligence": "#2ecc71",
    "Wisdom": "#9b59b6",
    "Charisma": "#f1c40f",
    "Perception": "#1abc9c",
    "Willpower": "#8e44ad",
    "Engineering": "#2980b9",
    "Lumion": "#00b7ff",
    "Medicine": "#27ae60",
    "Lockpicking": "#7f8c8d",
    "Stealth": "#34495e",
    "Nature": "#2ecc71",
    "Survival": "#16a085",
    "Crafting": "#d35400"
}

results = []

# --- Сбор данных ---
for file_name in os.listdir(classes_folder):
    if not file_name.endswith(".json"):
        continue
    with open(os.path.join(classes_folder, file_name), encoding="utf-8") as f:
        data = json.load(f)
        abilities = {}
        for ab_dict in data.get("abilities", []):
            if isinstance(ab_dict, dict):
                for k, v in ab_dict.items():
                    abilities[k] = v
        results.append({
            "name": data.get("name", data.get("id")),
            "hp": data.get("hp", 0) + abilities.get("Constitution",0),
            "defense": data.get("defense",0),
            "abilities": abilities
        })

# --- HTML заголовок ---
html_header = """
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>График способностей классов</title>
<style>
body { font-family: Arial, sans-serif; background: #121212; color: #eee; padding: 20px; }
h1 { margin-bottom: 10px; }
h2 { margin: 15px 0 5px 0; }
.bar-container { 
    margin-bottom: 10px; 
    background: #1e1e1e; 
    border-radius: 10px; 
    padding: 5px; 
    position: relative; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
}

.zero-line { 
    position: absolute; 
    left: 45.2%; 
    top: 0; 
    bottom: 0; 
    width: 2px; 
    background: #1f7; 
    z-index: 1; 
}

.negative-column, .positive-column { 
    display: flex; 
    align-items: center; 
    justify-content: flex-end; /* отрицательные справа, положительные слева */ 
    width: 45%; /* фиксированная ширина колонки */ 
}

.positive-column { 
    justify-content: flex-start; 
    width: 45%;
    display: flex; 
    align-items: center;
}
.positive-column { display: flex; justify-content: flex-start; flex-grow: 1; margin-left: 5px; }
.bar { height: 18px; border-radius: 4px; position: relative; color: #fff; text-align: center; font-size: 12px; line-height: 18px; }
.bar:hover::after { content: attr(title); position: absolute; top: -25px; left: 0; background: #333; color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; z-index: 100; }
.legend { margin-bottom: 20px; }
.legend div { display: inline-block; padding: 4px 10px; margin-right: 5px; border-radius: 4px; color: #fff; font-size: 12px; }
</style>
</head>
<body>
<h1>График способностей классов (минус влево, плюс вправо)</h1>
<div class="legend">
"""

# --- Легенда ---
legend_html = ""
for ab, color in color_map.items():
    legend_html += f'<div style="background:{color}">{ab}</div>\n'
legend_html += "</div>\n"

# --- Тело графика ---
html_body = ""
scale = 5  # ширина 1 единицы
for r in results:
    html_body += f"<h2>{r['name']} (HP: {r['hp']}, Defense: {r['defense']})</h2>\n"
    html_body += '<div class="bar-container"><div class="zero-line"></div>'
    # Отрицательные
    html_body += '<div class="negative-column">'
    for ab, val in r["abilities"].items():
        if val < 0:
            color = color_map.get(ab, "#7f8c8d")
            width = abs(val) * scale
            html_body += f'<div class="bar" style="width:{width}px; background:{color}" title="{ab}: {val}">{val}</div>'
    html_body += '</div>'
    # Положительные
    html_body += '<div class="positive-column">'
    for ab, val in r["abilities"].items():
        if val >= 0:
            color = color_map.get(ab, "#7f8c8d")
            width = val * scale
            html_body += f'<div class="bar" style="width:{width}px; background:{color}" title="{ab}: {val}">+{val}</div>'
    html_body += '</div>'
    html_body += "</div>\n"

html_footer = "</body></html>"

with open("classes_graph.html", "w", encoding="utf-8") as f:
    f.write(html_header + legend_html + html_body + html_footer)

print("Готово! Открой classes_graph.html в браузере.")
