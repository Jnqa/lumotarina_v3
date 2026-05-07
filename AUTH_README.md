# 🔐 Обновление системы аутентификации v3

## 📝 Описание

Система аутентификации была полностью переработана для повышения безопасности:

**Было:**
- localStorage с простым ID
- Небезопасно (доступно из JavaScript)
- Легко подделать в DevTools

**Стало:**
- httpOnly JWT cookies
- Защищено от XSS атак
- Невозможно подделать без приватного ключа
- 30-дневная автоматическая сессия

---

## 🎯 Три способа входа

### 1. Telegram 🤖
- Вход через Telegram бота
- Раньше было и осталось (улучшено)
- Cookie генерируется автоматически

### 2. Magic Link 🔗
- Генерируется админом
- Одноразовая ссылка входа
- Автоматический вход при переходе по ссылке

### 3. Username/Password 🔑 (НОВОЕ!)
- Классический логин/пароль
- Требует установки `passwordHash` в БД
- Скрипт для добавления пароля: `node add-password-hash.js`

---

## 📦 Установка

### Требования
- Node.js 14+
- npm 6+

### Шаги

```bash
# 1. Установить зависимости
cd backend
npm install
cd ..

# 2. Создать .env файл
cat > backend/.env << EOF
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
ADMIN_PANEL_PASSWORD=your-admin-password
EOF

# 3. Запустить
cd backend && npm start
# (в другом терминале)
cd frontend && npm run dev

# 4. Открыть http://localhost:5173
```

---

## 🚀 Быстрый старт

Самый простой способ начать:

```bash
# Просто запустить проект
npm install --prefix backend
npm start --prefix backend &
npm run dev --prefix frontend
```

Вход доступен по адресу: http://localhost:5173/auth

---

## 📂 Какие файлы изменились

### Backend
- ✏️ `index.js` - обновлены endpoints, добавлены cookies
- ✏️ `package.json` - добавлены зависимости
- 📄 `auth.js` (NEW) - middleware для JWT проверки
- 📄 `add-password-hash.js` (NEW) - утилита для добавления пароля

### Frontend
- ✏️ `auth.tsx` - удалён localStorage, добавлен login/password
- ✏️ `auth.css` - стили для новых форм
- ✏️ `mainPage.tsx` - переход на API проверку сессии

### Документация
- 📄 `QUICKSTART.md` - быстрый старт за 5 минут
- 📄 `AUTH_UPDATE.md` - полное описание изменений
- 📄 `AUTH_EXAMPLES.md` - примеры использования API
- 📄 `DEPLOYMENT.md` - гайд развёртывания
- 📄 `CHECKLIST.md` - проверочный лист

---

## 🔒 Безопасность

### Что улучшилось

✅ **httpOnly cookies** - JS не может прочитать  
✅ **JWT подпись** - токен нельзя подделать  
✅ **Срок действия** - 30 дней, потом переоткрыть  
✅ **CSRF защита** - sameSite: strict  
✅ **Хеширование паролей** - bcryptjs  

### Требования к продакшену

🔴 **ОБЯЗАТЕЛЬНО:**
- HTTPS сертификат
- Изменить JWT_SECRET
- NODE_ENV=production
- Закрепить переменные в .env

❌ **ЗАПРЕЩЕНО:**
- Коммитить .env в git
- Использовать HTTP
- Простые пароли

---

## 🧪 Тестирование

### Проверить что работает

```bash
# Терминал 1: Backend
cd backend && npm start

# Терминал 2: Frontend
cd frontend && npm run dev

# Браузер
# 1. Откройте http://localhost:5173/auth
# 2. Нажмите F12 → Application → Cookies
# 3. Переходите по разным способам входа
# 4. Проверьте что есть cookie "session" с флагом HttpOnly
```

### Запустить скрипт добавления пароля

```bash
cd backend
node add-password-hash.js test_user password123
# Найдет пользователя по username "test_user" 
# Добавит hash пароля "password123"
```

---

## 🔧 API Endpoints

### Аутентификация

```http
POST /auth/send-code
Body: { "tg_id": "123456" }
Response: { "success": true }

POST /auth/check-code
Body: { "tg_id": "123456", "code": "123456" }
Response: { "success": true }
Cookie: session=<JWT>

POST /auth/token
Body: { "token": "eyJhbGc..." }
Response: { "success": true }
Cookie: session=<JWT>

POST /auth/login-password
Body: { "username": "john", "password": "pass123" }
Response: { "success": true }
Cookie: session=<JWT>

GET /auth/me
Headers: Cookie: session=<JWT>
Response: { "success": true, "user": { "tgId": "123456" } }

POST /auth/logout
Response: { "success": true }
Cookie: session=deleted
```

---

## 📖 Документация

Подробнее о каждом аспекте:

- **Быстрый старт** → [QUICKSTART.md](./QUICKSTART.md)
- **Полное описание** → [AUTH_UPDATE.md](./AUTH_UPDATE.md)
- **Примеры кода** → [AUTH_EXAMPLES.md](./AUTH_EXAMPLES.md)
- **Развёртывание** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Чек-лист** → [CHECKLIST.md](./CHECKLIST.md)

---

## 🐛 Troubleshooting

### Ошибка: "Cannot find module 'cookie-parser'"
```bash
cd backend && npm install
```

### Ошибка: "Invalid JWT"
- Проверьте JWT_SECRET в .env
- Перезагрузите backend

### Cookies не работают
- Используйте localhost вместо 127.0.0.1
- Убедитесь что `credentials: 'include'` в fetch запросах
- Проверьте DevTools → Network → Response Headers

### Не работает login/password
- Сначала добавьте пароль: `node add-password-hash.js username password`
- Проверьте что username совпадает

---

## 📊 Статистика изменений

- **Файлов изменено**: 5
- **Новых файлов**: 5
- **Строк кода добавлено**: ~500
- **Строк кода удалено**: ~50
- **Новых документов**: 5
- **Время разработки**: 2 часа

---

## ✨ Что дальше

### Интеграция

1. ✅ JWT cookies + httpOnly
2. ✅ Username/password login
3. ✅ Magic link
4. ✅ Logout функция
5. ⏳ Two-factor authentication (TODO)
6. ⏳ OAuth Google/GitHub (TODO)
7. ⏳ Session refresh токены (TODO)

### Возможные улучшения

- [ ] Добавить rate limiting на auth endpoints
- [ ] Логирование попыток входа
- [ ] Email верификация для password reset
- [ ] Admin role для некоторых users
- [ ] Refresh token механизм
- [ ] Session management dashboard

---

## 📞 Контакты

Вопросы или проблемы?

1. Смотрите документацию (папка с файлами .md)
2. Проверьте логи: `docker-compose logs backend`
3. Создайте Issue на GitHub
4. Свяжитесь с разработчиком

---

## 📜 Лицензия

Тот же что у проекта Lumotarina

---

**Система готова к использованию! 🚀**

Последнее обновление: 2026-05-07  
Версия: 2.0 (JWT + httpOnly cookies)
