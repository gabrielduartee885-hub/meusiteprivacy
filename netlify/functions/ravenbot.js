const fs = require('node:fs/promises');
const path = require('node:path');
const { getStore } = require('@netlify/blobs');

const store = getStore('privacy-data');

exports.handler = async (event) => {
  const headers = { 'content-type': 'application/json; charset=utf-8' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response({ error: 'Method not allowed' }, 405, headers);

  try {
    const input = JSON.parse(event.body || '{}');
    const config = await readConfig();
    const apiKey = String(config.apiKey || '').trim();
    const amount = Number(input.amount || 0);

    if (!apiKey || amount <= 0) {
      return response({ error: 'Configure a API key RavenBot e informe um valor válido' }, 400, headers);
    }

    const externalId = String(input.external_id || `privacy-${Date.now()}`);
    const ravenResponse = await fetch('https://wallet.ravenbot.com.br/api/pix/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        amount,
        description: input.description || 'Assinatura Privacy',
        external_id: externalId,
        webhook_url: input.webhook_url || ''
      })
    });

    const data = await ravenResponse.json().catch(() => ({}));
    if (!ravenResponse.ok) {
      return response({ error: data.message || data.error || 'Falha ao criar cobrança RavenBot' }, ravenResponse.status, headers);
    }

    const source = data.data || data;
    const pixCode = source.pix_code || source.pixCode || source.brcode || source.copy_paste || '';
    const qrCode = source.qr_code || source.qrCode || source.qr_code_image || '';
    const transactionId = source.id || source.transaction_id || externalId;

    if (!pixCode) return response({ error: 'A RavenBot não retornou um código Pix' }, 502, headers);
    return response({ success: true, pixCode, qrCode, transactionId, externalId, gateway: 'ravenbot' }, 200, headers);
  } catch (error) {
    console.error('RavenBot function error:', error);
    return response({ error: 'Falha ao comunicar com a Raven Wallet' }, 502, headers);
  }
};

async function readConfig() {
  const saved = await store.get('ravenbotConfig', { type: 'json' });
  if (saved !== null) return saved;
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'ravenbot.json'), 'utf8'));
  } catch {
    return {};
  }
}

function response(body, statusCode, headers) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
