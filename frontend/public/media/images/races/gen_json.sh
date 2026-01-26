#!/bin/bash

# Ищем все директории
find . -type d | while read -r dir; do
    # Собираем список файлов .webp в этой папке
    # -printf '"%f",' выведет: "1.webp","2.webp",
    files=$(find "$dir" -maxdepth 1 -type f -name "*.webp" -printf '"%f",' | sed 's/,$//')

    # Проверяем, что переменная files не пуста
    if [ -n "$files" ]; then
        echo "[$files]" > "$dir/images.json"
        echo "Создан: $dir/images.json"
    fi
done

echo "Готово!"