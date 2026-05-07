# 🚀 Быстрый старт - Новая система аутентификации

## ⚡ За 5 минут

### 1️⃣ Установка зависимостей
```bash
cd backend
npm install
cd ..
```

### 2️⃣ Добавить .env в backend папку
```bash
# backend/.env
JWT_SECRET=your-secret-key-generated-with-openssl-rand-base64-32
NODE_ENV=development
ADMIN_PANEL_PASSWORD=your-admin-password
```

### 3️⃣ Запустить проект
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 4️⃣ Тестировать
- Откройте http://localhost:5173/auth
- Попробуйте войти любым способом
- После входа откройте DevTools → Application → Cookies
- Должна быть `session` cookie с флагом `HttpOnly` ✅

---

## 🔑 Вход по логину/паролю (опционально)

### Добавить пароль пользователю:
```bash
cd backend
node add-password-hash.js your_username your_password
```

Теперь пользователь может входить по логину/паролю!

---

## 📋 Что изменилось

| Раньше | Теперь |
|--------|--------|
| localStorage: `{tgId}` | httpOnly Cookie: JWT token |
| Небезопасно (доступно из JS) | Защищено от XSS атак |
| Бесконечная сессия | 30 дней автовыхода |
| Нет logout | Есть logout функция |

---

## 🔒 Безопасность

✅ **Что делать:**
- Менять `JWT_SECRET` в продакшене
- Использовать HTTPS в продакшене
- Не коммитить `.env` файл

❌ **Чего избегать:**
- Открытый JWT_SECRET в коде
- HTTP без SSL в продакшене
- Git коммиты с .env

---

## 🐛 Если что-то не работает

### Ошибка: "Cannot find module 'cookie-parser'"
```bash
cd backend && npm install
```

### Ошибка: "Invalid JWT"
- Проверьте что `JWT_SECRET` одинаков везде
- Перезагрузите backend

### Cookies не сохраняются
- Убедитесь что используется localhost на одном домене
- Проверьте что backend отправляет cookies
- Смотрите DevTools → Network → Response Headers

### 401 Unauthorized при входе
- Может быть истекла сессия (30 дней)
- Пользователь может переоткрыть страницу и войти заново

---

## 📚 Дальше

- [Полное описание](./AUTH_UPDATE.md)
- [Примеры использования](./AUTH_EXAMPLES.md)
- [Развёртывание](./DEPLOYMENT.md)

---

## ✅ Готово!

Система аутентификации обновлена и готова к использованию! 🎉

**Вопросы?** Смотрите документацию или создавайте Issues
