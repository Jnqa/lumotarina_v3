#!/usr/bin/env node

/**
 * Скрипт для хеширования пароля и добавления пользователю
 * Использование: node add-password-hash.js <username> <password>
 */

const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
require('dotenv').config();

// Инициализируем Firebase (используем существующую конфигурацию из index.js)
// Предполагаем что serviceAccountKey.json уже настроена
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL || 'https://lumotarina-default-rtdb.europe-west1.firebasedatabase.app'
  });
} catch (e) {
  console.error('Ошибка инициализации Firebase:', e.message);
  process.exit(1);
}

async function addPasswordHash() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Использование: node add-password-hash.js <username> <password>');
    console.error('Пример: node add-password-hash.js johndoe mypassword123');
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];

  try {
    console.log(`\n🔐 Хеширование пароля для ${username}...`);
    
    // Ищем пользователя по username
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    
    if (!snapshot.exists()) {
      console.error(`❌ Пользователь ${username} не найден!`);
      process.exit(1);
    }

    const usersData = snapshot.val();
    const tgId = Object.keys(usersData)[0];
    const userData = usersData[tgId];

    console.log(`✓ Найден пользователь: ${userData.displayName || username} (tgId: ${tgId})`);

    // Хешируем пароль
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log(`✓ Пароль захеширован`);

    // Обновляем пользователя
    await admin.database().ref(`users/${tgId}`).update({ passwordHash });
    console.log(`✓ Пароль сохранён в БД для ${username}`);
    
    console.log(`\n✅ Готово! Пользователь ${username} может входить по логину/паролю\n`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  }
}

addPasswordHash();
