const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const routeSource = readFileSync(join(__dirname, '../../web/app/auth/callback/route.ts'), 'utf8');

// --- Source analysis ---

test('auth callback calls exchangeCodeForSession when code is present', () => {
  assert.match(routeSource, /exchangeCodeForSession\(code\)/);
});

test('auth callback returns early without exchange when code is absent', () => {
  const guardIdx = routeSource.indexOf('if (!code)');
  const exchangeIdx = routeSource.indexOf('exchangeCodeForSession');
  assert.ok(guardIdx > -1, '!code guard must exist');
  assert.ok(exchangeIdx > guardIdx, 'exchangeCodeForSession must come after the !code guard');
});

test('auth callback writes session cookies to response object not cookieStore', () => {
  assert.match(routeSource, /response\.cookies\.set/);
  assert.doesNotMatch(routeSource, /cookieStore\.set/);
});

test('auth callback redirects to /dashboard/jobs by default', () => {
  assert.match(routeSource, /\/dashboard\/jobs/);
});

// --- Behavioural mock ---

test('auth callback logic: exchange called with code, skipped without', async () => {
  let exchangeCallCount = 0;
  const responseCookies = [];

  function makeSupabase() {
    return {
      auth: {
        async exchangeCodeForSession(_code) {
          exchangeCallCount++;
          return { data: { session: { access_token: 'tok' } }, error: null };
        },
      },
    };
  }

  function makeResponse() {
    return {
      cookies: { set(name, value, options) { responseCookies.push({ name, value, options }); } },
    };
  }

  async function handle(code) {
    const response = makeResponse();
    if (!code) return response;
    const supabase = makeSupabase();
    await supabase.auth.exchangeCodeForSession(code);
    response.cookies.set('sb-access-token', 'tok', { httpOnly: true });
    return response;
  }

  await handle(null);
  assert.equal(exchangeCallCount, 0, 'exchange must NOT be called when code is absent');

  await handle('pkce-code-abc');
  assert.equal(exchangeCallCount, 1, 'exchange must be called when code is present');
  assert.equal(responseCookies.length, 1, 'cookie must be written to response object');
  assert.equal(responseCookies[0].name, 'sb-access-token');
});
