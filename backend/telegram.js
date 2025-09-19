// Telegram authentication logic
const crypto = require('crypto');

// Проверка подписи Telegram WebApp
function checkTelegramAuth(data, botToken) {
  const authData = { ...data };
  const hash = authData.hash;
  delete authData.hash;
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', botToken).digest();
  const hex = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return hex === hash;
}

module.exports = { checkTelegramAuth };
