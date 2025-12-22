const fetch = require('node-fetch');
const express = require('express');

const router = express.Router();

/**
 * Minimal ChatAPI request helper.
 * Sends the provided `body` as JSON to the internal chatapi service and
 * returns the assistant text (if any) or the full JSON response as string.
 *
 * @param {object} body - full request body to send to chatapi (e.g. { model, messages })
 * @param {object} [opts]
 * @param {string} [opts.host='chatapi'] - host where chatapi is reachable
 * @param {number} [opts.attempts=3]
 * @param {number} [opts.timeout=15000] - ms
 * @param {number} [opts.backoff=1.5] - seconds multiplier for retry backoff
 */
async function chatapiRequest(body, opts = {}) {
  const { host = 'chatapi', attempts = 3, timeout = 15000, backoff = 1.5 } = opts;

  if (!body || typeof body !== 'object') throw new TypeError('body must be an object');

  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
	try {
	  const controller = new AbortController();
	  const id = setTimeout(() => controller.abort(), timeout);

	  const res = await fetch(`http://${host}:1337/v1/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal: controller.signal,
	  });
	  clearTimeout(id);

	  if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`status=${res.status} body=${text}`);
	  }

	  const j = await res.json();
	  if (j && Array.isArray(j.choices) && j.choices.length > 0) {
		const c = j.choices[0];
		if (c.message && typeof c.message.content === 'string') return c.message.content;
		if (typeof c.text === 'string') return c.text;
	  }

	  return JSON.stringify(j);
	} catch (e) {
	  lastErr = e;
	  if (attempt < attempts) {
		await new Promise((r) => setTimeout(r, Math.round(backoff * attempt * 1000)));
		continue;
	  }
	  throw lastErr;
	}
  }
}

// POST / - proxy endpoint; body forwarded to internal chatapi
router.post('/', async (req, res) => {
	const body = req.body || {};
	// allow host override from body.host, query param, header, or env
	const host = (body.host) || req.query.host || req.headers['x-chatapi-host'] || process.env.CHATAPI_HOST || 'chatapi';

	// If client sent a simple { prompt: '...' } convenience payload,
	// build the standard messages body the internal ChatAPI expects.
	let requestBody = body;

    if (body.history) {
        newContent="Сформируй художественную предысторию персонажа до 300 символов. Используй все данные ниже, ничего не добавляй от себя. Данные:" + body.prompt,
        requestBody = {
			model: body.model || 'gpt-4.1-mini',
			messages: [ { role: 'user', content: newContent } ]
		};
    } else if (body.calc) {
        newContent="Сформируй художественное описание решения примера до 300 символов. Используй все данные ниже, ничего не добавляй от себя. Данные:" + body.prompt,
        requestBody = {
			model: body.model || 'gpt-4.1-mini',
			messages: [ { role: 'user', content: newContent } ]
		};
    } else if (typeof body.prompt === 'string' && (!body.messages && !body.model)) {
		requestBody = {
			model: body.model || 'gpt-4.1-mini',
			messages: [ { role: 'user', content: body.prompt } ]
		};
	}


	try {
		const reply = await chatapiRequest(requestBody, { host });
		res.json({ success: true, reply });
	} catch (e) {
		res.status(500).json({ success: false, error: String(e) });
	}
});

module.exports = { chatapiRequest, router };

