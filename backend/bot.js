// Telegram Bot: выдача ссылки для входа
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
let bot = null;
const FRONTEND_URL = 'https://dnd.lumotarina.ru';

// Временное хранилище кодов: { tg_id: { code, expires } }
const codes = {};
let telegramAvailable = false;
let pollingErrorLogged = false;
let lastPollingError = null;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Try to initialize bot, but don't crash the whole app on failures.
try {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing');
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  telegramAvailable = true;

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const loginUrl = `${FRONTEND_URL}/?tg_id=${msg.from.id}`;
    // swallow send errors to avoid noisy logs
    bot.sendMessage(chatId, `Вход в сервис: ${loginUrl}. \n Рекомендую открывать во внешнем браузере. \n(Зажать на ссылке -> Открыть в..)` ).catch(() => {});
  });

  bot.on('polling_error', (err) => {
    // store last error details for status reporting
    try { lastPollingError = err && err.toString ? err.toString() : String(err); } catch (e) { lastPollingError = String(err); }
    if (!pollingErrorLogged) {
      console.error('Telegram polling error:', lastPollingError);
      pollingErrorLogged = true;
      // allow another log only after a cooldown to avoid spamming
      setTimeout(() => { pollingErrorLogged = false; }, 5 * 60 * 1000);
    }
  });

  console.log('Telegram bot initialized');
} catch (e) {
  telegramAvailable = false;
  console.error('Telegram bot init failed (will continue without bot):', e && e.toString ? e.toString() : e);
}

function sendLoginCode(tg_id) {
  const code = generateCode();
  const expires = Date.now() + 5 * 60 * 1000; // 5 минут
  codes[tg_id] = { code, expires };
  if (bot && telegramAvailable) {
    bot.sendMessage(tg_id, `Код для входа: ${code}`).catch(() => {});
  } else {
    // when bot unavailable, do nothing but keep codes for local testing
  }
}

function checkLoginCode(tg_id, code) {
  const entry = codes[tg_id];
  if (!entry) return false;
  if (Date.now() > entry.expires) return false;
  return entry.code === code;
}

function isTelegramAvailable() {
  return !!telegramAvailable;
}

function getTelegramStatus() {
  const err = lastPollingError;
  let isConflict = false;
  if (err && typeof err === 'string') {
    // detect ETELEGRAM 409 conflict message
    if (err.indexOf('ETELEGRAM') !== -1 && err.indexOf('409') !== -1) {
      isConflict = true;
    }
    if (err.indexOf('terminated by other getUpdates request') !== -1) {
      isConflict = true;
    }
  }
  return { available: !!telegramAvailable, lastErrorMessage: err || null, isConflict };
}

module.exports = { sendLoginCode, checkLoginCode, isTelegramAvailable, getTelegramStatus };
