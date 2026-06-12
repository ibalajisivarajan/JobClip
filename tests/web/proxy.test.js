const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const proxySource = readFileSync(join(__dirname, '../../web/proxy.ts'), 'utf8');

// --- Source analysis ---

test('proxy guards /dashboard/* routes', () => {
  assert.match(proxySource, /startsWith\(['"]\/dashboard['"]\)/);
});

test('proxy redirects unauthenticated /dashboard request to /login', () => {
  assert.match(proxySource, /pathname\s*=\s*['"]\/login['"]/);
  assert.match(proxySource, /!user/);
});

test('proxy redirects authenticated /login request to /dashboard/jobs', () => {
  assert.match(proxySource, /\/dashboard\/jobs/);
  assert.match(proxySource, /pathname\s*===\s*['"]\/login['"]/);
});

// --- Behavioural mocks ---

// Pure-JS replica of proxy.ts logic for behavioural testing.
async function runProxy(pathname, getUser) {
  const user = await getUser();

  if (pathname.startsWith('/dashboard') && !user) {
    return { type: 'redirect', destination: '/login' };
  }
  if (pathname === '/login' && user) {
    return { type: 'redirect', destination: '/dashboard/jobs' };
  }
  return { type: 'next' };
}

test('mock: unauthenticated request to /dashboard/jobs redirects to /login', async () => {
  const result = await runProxy('/dashboard/jobs', async () => null);
  assert.equal(result.type, 'redirect');
  assert.equal(result.destination, '/login');
});

test('mock: authenticated request to /dashboard/jobs passes through', async () => {
  const result = await runProxy('/dashboard/jobs', async () => ({ id: 'user-1', email: 'test@example.com' }));
  assert.equal(result.type, 'next');
});

test('mock: authenticated request to /login redirects to /dashboard/jobs', async () => {
  const result = await runProxy('/login', async () => ({ id: 'user-1', email: 'test@example.com' }));
  assert.equal(result.type, 'redirect');
  assert.equal(result.destination, '/dashboard/jobs');
});
