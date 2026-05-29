#!/usr/bin/env node

/**
 * Скрипт для добавления пароля пользователю
 * Использование: node add-password-hash.js <username> <password> [adminPassword]
 * 
 * ⚠️  ТРЕБУЕТ чтобы backend был запущен (npm start)
 */

require('dotenv').config();

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3111';
const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || 'admin';

async function addPasswordHash() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Использование: node add-password-hash.js <username> <password> [adminPassword]');
    console.error('Пример: node add-password-hash.js johndoe mypassword123');
    console.error('\n⚠️  Backend должен быть запущен: npm start\n');
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];
  const adminPassword = args[2] || ADMIN_PASSWORD;

  try {
    console.log(`\n🔐 Добавление пароля для ${username}...`);
    console.log(`📡 Подключение к ${API_BASE}\n`);
    
    // Вызываем API endpoint
    const response = await fetch(`${API_BASE}/admin/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        adminPassword,
        username,
        newPassword: password 
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Ошибка (${response.status}): ${data.error || data.message}`);
      if (response.status === 401) {
        console.error('\n💡 Подсказка: Проверьте что админский пароль правильный');
        console.error('   Укажите через аргумент: node add-password-hash.js jnqa pass123 admin_password');
      }
      process.exit(1);
    }

    if (data.success) {
      console.log(`✅ Пароль успешно добавлен для ${username}!`);
      console.log(`\n💡 Теперь можно входить по логину/паролю:`);
      console.log(`   Логин: ${username}`);
      console.log(`   Пароль: ${password}\n`);
      process.exit(0);
    } else {
      console.error(`❌ ${data.error || 'Неизвестная ошибка'}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`❌ Ошибка подключения: ${e.message}`);
    console.error('\n⚠️  Убедитесь что:');
    console.error('1. Backend запущен: npm start');
    console.error('2. Backend доступен по адресу:', API_BASE);
    console.error('3. Интернет соединение работает\n');
    process.exit(1);
  }
}

addPasswordHash();
