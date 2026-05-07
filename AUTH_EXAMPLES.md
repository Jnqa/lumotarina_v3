# Примеры использования новой системы аутентификации

## Для разработчиков

### Защита роутов с requireAuth

```javascript
const express = require('express');
const { requireAuth, canAccessUserData } = require('./auth');
const router = express.Router();

// Пример 1: Простая защита
router.get('/me', requireAuth, (req, res) => {
  res.json({
    tgId: req.user.tgId,
    message: 'Это защищённый роут'
  });
});

// Пример 2: Защита с проверкой доступа
router.get('/:userId/profile', requireAuth, async (req, res) => {
  const { userId } = req.params;
  
  // Проверяем что пользователь может получить доступ к этому профилю
  if (!canAccessUserData(req, userId)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied' 
    });
  }

  // Получаем данные
  const user = await getUserProfile(userId);
  res.json(user);
});

// Пример 3: Защита POST запроса
router.post('/:userId/update', requireAuth, express.json(), async (req, res) => {
  const { userId } = req.params;
  
  if (!canAccessUserData(req, userId)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied' 
    });
  }

  await updateUserProfile(userId, req.body);
  res.json({ success: true });
});

module.exports = router;
```

### Работа с паролями (для админов)

#### Добавить пароль пользователю:

```bash
# Из корневой папки backend
node add-password-hash.js john_doe my_secure_password_123
```

#### Программно (в Node.js коде):

```javascript
const bcrypt = require('bcryptjs');

async function setUserPassword(tgId, newPassword) {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  
  await admin.database()
    .ref(`users/${tgId}`)
    .update({ passwordHash });
  
  console.log('Пароль обновлён');
}
```

## Для конечных пользователей

### Вход по Telegram коду

1. На странице входа выберите первую панель "Вход через бота Telegram"
2. Введите ваш Telegram ID (можно получить у бота)
3. Нажмите "Получить код в Telegram"
4. Введите код, полученный в Telegram
5. Готово! 🎉

### Вход по Magic Link

1. Администратор генерирует ссылку через админ-панель
2. Администратор отправляет вам ссылку
3. Вы переходите по ссылке → автоматический вход ✓

### Вход по Логину/Паролю

1. На странице входа вторая панель → нажмите "Логин/Пароль"
2. Введите ваш логин
3. Введите ваш пароль
4. Нажмите "Войти"

## Для администраторов

### Создание Magic Link для пользователя

```bash
POST /admin/generate-magic-link

{
  "password": "admin_panel_password",
  "tg_id": "123456789"
}

Ответ:
{
  "success": true,
  "token": "eyJhbGc....."
}
```

Отправьте пользователю эту ссылку:
```
https://yourdomain.com/auth/magic-link?token=eyJhbGc.....
```

### Управление пользователями

```bash
# Получить всех пользователей
GET /admin/users?password=your_admin_password

# Создать пользователя
POST /admin/create-user

{
  "password": "admin_panel_password",
  "user": {
    "tg_id": "123456789",
    "displayName": "John Doe",
    "username": "johndoe",
    "color": "#0f9a8f"
  }
}
```

## Безопасность - Checklist

- ✅ Никогда не коммитьте `.env` файл в git
- ✅ Меняйте `JWT_SECRET` в продакшене
- ✅ Всегда используйте HTTPS в продакшене
- ✅ Регулярно обновляйте npm зависимости
- ✅ Используйте `credentials: 'include'` в fetch запросах
- ✅ Не сохраняйте пароли в plaintext - всегда хешируйте

## Отладка

### Проверить активную сессию

```javascript
// В браузере console
fetch('http://localhost:3111/auth/me', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

### Посмотреть cookies

1. Откройте DevTools (F12)
2. Перейдите на вкладку "Application"
3. В левом меню → "Cookies"
4. Выберите ваш домен
5. Найдите cookie `session`

Cookie должна иметь:
- ✓ `HttpOnly` флаг
- ✓ `Secure` флаг (только в HTTPS)
- ✓ `SameSite: Strict`

### Ошибка "Unauthorized"

Это значит что:
- Cookie с сессией истекла (30 дней)
- Пользователь вышел (logout)
- JWT токен поддельный (попытка манипуляции)

Решение: Переоткройте страницу или войдите заново

---

**Вопросы?** Обратитесь к документации или создайте Issue 🐛
