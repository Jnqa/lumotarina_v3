// Telegram Bot: выдача ссылки для входа
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const FRONTEND_URL = 'http://localhost:5173'; // 'https://lumotarina.ru'; // Замените на ваш реальный URL

// Временное хранилище кодов: { tg_id: { code, expires } }
const codes = {};

// Генерация 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// /start просто присылает ссылку
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const loginUrl = `${FRONTEND_URL}/?tg_id=${msg.from.id}`;
  bot.sendMessage(chatId, `Вход в сервис: ${loginUrl}`);
});

// Экспортируем функцию для отправки кода
function sendLoginCode(tg_id) {
  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000; // 5 минут
  codes[tg_id] = { code, expires };
  bot.sendMessage(tg_id, `Ваш код для входа: ${code}`);
}

function checkLoginCode(tg_id, code) {
  const entry = codes[tg_id];
  if (!entry) return false;
  if (Date.now() > entry.expires) return false;
  return entry.code === code;
}

module.exports = { sendLoginCode, checkLoginCode };

console.log('Telegram bot started');
