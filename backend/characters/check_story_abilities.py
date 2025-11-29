import json
from collections import defaultdict

with open("story.json", "r", encoding="utf-8") as f:
    data = json.load(f)

results = []

def merge_abilities(a, b):
    merged = defaultdict(int)
    # Убедимся, что a и b — списки
    if isinstance(a, dict):
        a = [a]
    if isinstance(b, dict):
        b = [b]
    for ab in a + b:
        for k, v in ab.items():
            merged[k] += v
    return dict(merged)

def traverse(node_key, abilities=None, classes=None, path=None):
    if abilities is None:
        abilities = []
    if classes is None:
        classes = set()
    if path is None:
        path = []

    node = data["questions"][node_key]

    # Добавляем название узла в путь
    node_name = node.get("text", node_key)
    path.append(node_name)

    # Добавляем class на текущем узле, если есть
    if "class" in node:
        classes.add(node["class"])

    # Добавляем abilities на текущем узле, если есть
    if "abilities" in node:
        abilities = merge_abilities(abilities, node["abilities"])

    if node["type"] == "choice":
        for option in node["options"]:
            next_abilities = abilities.copy()
            next_classes = classes.copy()
            next_path = path.copy()

            # Добавляем название выбора в путь
            next_path.append(option["text"])

            if "abilities" in option:
                next_abilities = merge_abilities(next_abilities, option["abilities"])
            if "class" in option:
                next_classes.add(option["class"])

            if "next" in option and option["next"]:
                traverse(option["next"], next_abilities, next_classes, next_path)
            else:
                results.append({
                    "path": next_path,
                    "abilities": next_abilities,
                    "classes": next_classes
                })

# Стартуем
traverse(data["start"])

# Выводим красиво
for r in results:
    print("---")
    print("💨 Путь: " + " > ".join(r["path"]))
    ab_str = "  ".join(f"{k}: {v}" for k, v in r["abilities"].items())
    print(f"\n✳ Abilities: {ab_str}")
    print(f"\n👁‍🗨 Классы: {', '.join(r['classes'])}")
