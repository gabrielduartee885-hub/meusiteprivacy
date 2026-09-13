import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

let store;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const rawBody = event.body || '';
  const config = await getDataStore().get('ravenbotConfig', { type: 'json' }) || {
    webhookSecret: process.env.RAVENBOT_WEBHOOK_SECRET || ''
  };
  const secret = String(config.webhookSecret || '').trim();
  const signature = event.headers['x-webhook-signature'] || event.headers['X-Webhook-Signature'] || '';

  if (secret && !validSignature(signature, rawBody, secret)) {
    return json({ error: 'Invalid webhook signature' }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid payload' }, 400);
  }

  const payment = payload.data || payload;
  const paymentId = String(payment.id || payment.transaction_id || payment.external_id || Date.now());
  const payments = await getDataStore().get('payments_ravenbot.json', { type: 'json' }) || [];
  const record = {
    transaction_id: paymentId,
    external_id: payment.external_id || null,
    amount: payment.amount || payment.value || 0,
    status: payment.status || (payload.event === 'payment.confirmed' ? 'confirmed' : ''),
    event: payload.event || payload.type || '',
    received_at: new Date().toISOString()
  };
  const index = payments.findIndex((item) => item.transaction_id === paymentId);
  if (index >= 0) payments[index] = { ...payments[index], ...record };
  else payments.push(record);
  await getDataStore().setJSON('payments_ravenbot.json', payments);

  return json({ success: true }, 200);
};

function validSignature(header, payload, secret) {
  const fields = Object.fromEntries(header.split(',').map((part) => part.trim().split('=')));
  if (!fields.t || !fields.v1 || Math.abs(Date.now() / 1000 - Number(fields.t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${fields.t}.${payload}`).digest('hex');
  return fields.v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(fields.v1), Buffer.from(expected));
}

function getDataStore() {
  if (!store) {
    const options = {};
    if (process.env.NETLIFY_SITE_ID) options.siteID = process.env.NETLIFY_SITE_ID;
    if (process.env.NETLIFY_API_TOKEN) options.token = process.env.NETLIFY_API_TOKEN;
    store = getStore('privacy-data', options);
  }
  return store;
}

function json(body, statusCode) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}
