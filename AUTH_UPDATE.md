# Обновление системы аутентификации

## Что изменилось

Система аутентификации была обновлена для использования **JWT с httpOnly cookies** вместо простого localStorage. Это значительно повышает безопасность.

### Ключевые улучшения:

1. **httpOnly Cookies**: Сессионные токены хранятся в защищённых cookies, недоступных для JavaScript
2. **JWT токены**: Каждый токен подписан и имеет срок действия (30 дней)
3. **CSRF защита**: Используется `sameSite: 'strict'` для предотвращения CSRF атак
4. **Logout функциональность**: Добавлена полноценная функция выхода

## Что нужно сделать

### 1. Установить зависимости

```bash
cd backend
npm install bcryptjs cookie-parser
cd ..
```

### 2. Добавить переменные окружения

В файл `.env` добавьте (если ещё нет):

```env
JWT_SECRET=your-super-secret-key-here-change-it-in-production
NODE_ENV=development  # или production для HTTPS
```

### 3. Использовать новые endpoints

#### Вход по коду Telegram
```bash
POST /auth/send-code
POST /auth/check-code
```
Теперь cookies будут установлены автоматически!

#### Новые endpoints:

- `GET /auth/me` - проверить текущую сессию (требует auth)
- `POST /auth/logout` - выход
- `POST /auth/login-password` - вход по username/password (требует passwordHash в БД)

### 4. Настроить login/password для пользователей

Пока вход по username/password требует хеша пароля в БД. Позже нужно:

1. Добавить поле `passwordHash` к пользователю
2. При создании пользователя хешировать пароль с `bcryptjs`:

```javascript
const bcrypt = require('bcryptjs');
const passwordHash = await bcrypt.hash(password, 10);
```

### 5. Защитить защищённые роуты

Примеры добавления middleware `requireAuth` к роутам:

```javascript
const { requireAuth } = require('./auth');

// Защищённый роут
app.get('/profile/:id', requireAuth, (req, res) => {
  // req.user.tgId содержит ID пользователя
  res.json({ tgId: req.user.tgId });
});
```

## Фронтенд обновления

- ✅ Удален localStorage ('session')
- ✅ Добавлена проверка сессии через `GET /auth/me`
- ✅ Все fetch запросы используют `credentials: 'include'`
- ✅ Добавлена функция logout

## UI изменения

На странице входа теперь 3 способа входа:

1. **Telegram** - через бота (обычный способ)
2. **Magic Link** - по ссылке входа (для админов)
3. **Логин/Пароль** - username + password (готов к внедрению)

## Важные замечания

⚠️ **В продакшене обязательно**:
- Установить `NODE_ENV=production` 
- Использовать HTTPS (для `secure: true` в cookies)
- Изменить `JWT_SECRET` на надёжный ключ
- Использовать `.env` файл и не коммитить его в git

## Миграция с localStorage

Если у вас были пользователи с localStorage сессией, они будут перенаправлены на страницу входа. Это нормально - они смогут войти снова.

## Проверка работы

1. Откройте DevTools → Application → Cookies
2. После входа вы должны увидеть cookie `session` с флагом `HttpOnly` ✓
3. Cookie недоступна из JavaScript консоли (F12) - это хорошо!

---

**Все файлы обновлены и готовы к использованию!** 🎉
