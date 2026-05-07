# Развёртывание с новой системой аутентификации

## Перед развёртыванием в продакшен

### 1. Переменные окружения

Создайте `.env` файл в папке `backend`:

```env
# ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ ЭТИ ЗНАЧЕНИЯ!
JWT_SECRET=your-ultra-secret-key-at-least-32-characters-long-change-me-now
ADMIN_PANEL_PASSWORD=super-secret-admin-password

# Остальное
NODE_ENV=production
PORT=3111
FIREBASE_DB_URL=https://your-project.firebasedatabase.app
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Telegram (если используется)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### 2. Docker Compose обновления

Убедитесь что ваш `docker-compose.yml` передаёт переменные окружения:

```yaml
services:
  backend:
    build: ./backend
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_PANEL_PASSWORD=${ADMIN_PANEL_PASSWORD}
      - NODE_ENV=production
      - FIREBASE_DB_URL=${FIREBASE_DB_URL}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    ports:
      - "3111:3111"
```

### 3. Генерирование надёжного JWT_SECRET

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256 -as [byte]}))
```

### 4. Миграция существующих пользователей

Если у вас уже есть пользователи, they just need to log in again since the old localStorage sessions are no longer used.

### 5. SSL/HTTPS сертификаты

Для продакшена HTTPS обязателен. Используйте Let's Encrypt:

```bash
# Через Certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

## Процесс развёртывания

### Docker (рекомендуется)

```bash
# Перейдите в корневую папку проекта
cd lumotarina_v3

# Создайте .env файл
cp backend/.env.example backend/.env  # если есть
# Отредактируйте значения в .env

# Соберите и запустите
docker-compose -f docker-compose.prod.yml up -d

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Без Docker

```bash
# Backend
cd backend
npm install
export NODE_ENV=production
export JWT_SECRET="your-secret-key"
npm start

# Frontend (в отдельном терминале)
cd frontend
npm install
npm run build
npm run preview  # или используйте Nginx/Apache
```

## Проверка после развёртывания

### 1. Проверить health endpoints

```bash
# Backend доступен?
curl http://localhost:3111/auth/telegram-status

# Frontend доступен?
curl http://localhost:5173
```

### 2. Тестировать вход

- Откройте `/auth`
- Попробуйте все 3 способа входа (Telegram, Magic Link, Password)
- Проверьте что cookies установлены правильно

### 3. Проверить CORS

```bash
curl -X OPTIONS \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  http://localhost:3111/auth/check-code
```

## Мониторинг

### Логирование

Backend логирует все важные события. Проверьте:

```bash
docker-compose logs backend | grep -i error
```

### Метрики (опционально)

Можете добавить мониторинг через:
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Или обычные логи в файл

### Резервные копии

Убедитесь что Firebase база регулярно резервируется:

```bash
# Google Cloud SDK
gcloud firestore export gs://your-bucket/backup-$(date +%Y%m%d)
```

## Обновление

### Обновление с HTTP на HTTPS

1. Получите SSL сертификат
2. Обновите конфигурацию Nginx/Apache
3. Перезагрузите backend с `NODE_ENV=production`

### Обновление JWT_SECRET

⚠️ **Внимание!** Изменение JWT_SECRET разлогинит всех пользователей!

Если надо обновить:
1. Измените переменную
2. Перезагрузите backend
3. Все пользователи переоткроют страницу
4. Они заново войдут через cookie механизм

## Лучшие практики

✅ **ДЕЛАЙТЕ:**
- Используйте HTTPS в продакшене
- Регулярно обновляйте зависимости: `npm audit fix`
- Мониторьте логи на ошибки
- Резервируйте данные ежедневно
- Используйте rate limiting на auth endpoints

❌ **НЕ ДЕЛАЙТЕ:**
- Коммитьте `.env` файл
- Используйте простые пароли
- Передавайте cookies по HTTP
- Хардкодьте JWT_SECRET в коде
- Пропускайте CORS проверки

## Отладка проблем

### 401 Unauthorized

```javascript
// Проверьте cookie
document.cookie // должен содержать 'session=...'

// Проверьте backend логи
docker-compose logs backend | grep "Unauthorized"
```

### CORS ошибки

```bash
# Проверьте CORS_ORIGIN переменную
echo $CORS_ORIGIN

# Должна соответствовать фронтенд URL
```

### Cookies не сохраняются

- ✓ Проверьте что используется `credentials: 'include'` в fetch
- ✓ Проверьте что backend возвращает `Access-Control-Allow-Credentials: true`
- ✓ Убедитесь что домены совпадают (localhost с localhost, не localhost с 127.0.0.1)

## Контакты для помощи

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs backend`
2. Погуглите ошибку
3. Создайте Issue на GitHub
4. Свяжитесь с разработчиком

---

**Готово к продакшену! 🚀**
