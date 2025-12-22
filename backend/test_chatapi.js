// Simple test script for chatapiRequest
// Usage:
//   CHATAPI_HOST=localhost node test_chatapi.js "Привет!" test-user
// Or on Windows PowerShell:
//   $env:CHATAPI_HOST='localhost'; node test_chatapi.js "Привет!" test-user

const { chatapiRequest } = require('./chatapi');

const host = process.env.CHATAPI_HOST || 'localhost';
const prompt = process.argv[2] || 'Привет, как дела?';
const attempts = Number(process.env.ATTEMPTS) || 3;
const timeout = Number(process.env.TIMEOUT_MS) || 5000;

(async () => {
  try {
    const body = {
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'user', content: prompt }
      ]
    };

    const reply = await chatapiRequest(body, { host, attempts, timeout });
    console.log('--- Reply ---');
    console.log(reply);
  } catch (e) {
    console.error('Test failed:', e);
    process.exitCode = 1;
  }
})();
