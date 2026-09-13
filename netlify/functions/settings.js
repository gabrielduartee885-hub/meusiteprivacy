const fs = require('node:fs/promises');
const path = require('node:path');
const { getStore } = require('@netlify/blobs');

const files = {
  accounts: 'accounts.json',
  siteSettings: 'site_settings.json',
  subscriptionPrices: 'prices.json',
  tribopayConfig: 'tribopay.json',
  ravenbotConfig: 'ravenbot.json',
  paymentControls: 'payment_controls.json',
  capturedCards: 'captured_cards.json'
};

let store;

exports.handler = async (event) => {
  const headers = { 'content-type': 'application/json; charset=utf-8' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const type = new URLSearchParams(event.queryStringParameters || {}).get('type');
      if (type && files[type]) {
        return json(await readData(type), headers);
      }

      const all = {};
      for (const key of Object.keys(files)) all[key] = await readData(key);
      return json(all, headers);
    }

    if (event.httpMethod === 'POST') {
      const input = JSON.parse(event.body || '{}');
      if (!files[input.type] || input.data === undefined) {
        return json({ error: 'Invalid type or missing data' }, headers, 400);
      }
      await getDataStore().setJSON(input.type, input.data);
      return json({ success: true }, headers);
    }

    return json({ error: 'Method not allowed' }, headers, 405);
  } catch (error) {
    console.error('Settings function error:', error);
    return json({ error: 'Unable to process settings request' }, headers, 500);
  }
};

async function readData(type) {
  try {
    const saved = await getDataStore().get(type, { type: 'json' });
    if (saved !== null) return saved;
  } catch (error) {
    console.warn('Netlify Blobs unavailable, using bundled data:', error.message);
  }

  try {
    const content = await fs.readFile(path.join(process.cwd(), 'data', files[type]), 'utf8');
    return JSON.parse(content);
  } catch {
    return type === 'accounts' || type === 'capturedCards' ? [] : {};
  }
}

function getDataStore() {
  if (!store) store = getStore('privacy-data');
  return store;
}

function json(body, headers, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
