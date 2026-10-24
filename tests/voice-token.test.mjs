import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/lumin-voice-token.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.Netlify; });
const request = (body = { agent: { name: 'Lumin', company: 'LUMIN AI' } }, origin = 'https://luminai.pt') => new Request('https://elaborate-begonia-9d097b.netlify.app/.netlify/functions/lumin-voice-token', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('rejects an untrusted origin without requesting a paid session', async () => {
  globalThis.fetch = () => { throw new Error('must not contact provider'); };
  assert.equal((await handler(request({}, 'https://unknown.example'))).status, 403);
});

test('reports missing configuration without claiming a working voice', async () => {
  globalThis.Netlify = { env: { get: () => undefined } };
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'VOICE_NOT_CONFIGURED');
});

test('issues one constrained short session and never returns the master key', async () => {
  globalThis.Netlify = { env: { get: k => k === 'GOOGLE_GENERATIVE_AI_API_KEY' ? 'test-server-secret' : undefined } };
  let sent;
  globalThis.fetch = async (url, options) => { sent = { url, options, body: JSON.parse(options.body) }; return Response.json({ name: 'auth_tokens/short-session' }); };
  const before = Date.now();
  const response = await handler(request());
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.token, 'auth_tokens/short-session');
  assert.equal(sent.options.headers['x-goog-api-key'], 'test-server-secret');
  assert.equal(sent.body.uses, 1);
  assert.ok(Date.parse(sent.body.expireTime) - before <= 181000);
  assert.ok(Date.parse(sent.body.newSessionExpireTime) - before <= 61000);
  assert.match(JSON.stringify(sent.body), /português de Portugal/);
  assert.ok(!JSON.stringify(data).includes('test-server-secret'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('provider errors do not expose provider bodies or credentials', async () => {
  globalThis.Netlify = { env: { get: () => 'test-server-secret' } };
  globalThis.fetch = async () => new Response('sensitive provider details', { status: 429 });
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes('sensitive provider'));
});
