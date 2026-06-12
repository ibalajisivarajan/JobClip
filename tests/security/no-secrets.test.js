const assert = require('node:assert/strict');
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const test = require('node:test');

const root = join(__dirname, '../..');
const ignoredDirs = new Set(['.git', 'node_modules', '.next', '.vercel']);
const ignoredFiles = new Set(['.env.local', '.env.development.local', '.env.test.local', '.env.production.local']);
const allowedServiceRoleMentions = new Set([
  'README.md',
  'CLAUDE.md',
  'docs/PRODUCT.md',
  'docs/ARCHITECTURE.md',
  'docs/DECISIONS.md',
  'docs/TESTPLAN.md',
  'docs/QA_CHECKLIST.md',
  'docs/DEPLOYMENT.md',
  'docs/EXTENSION_AUTH.md',
  'tests/security/no-secrets.test.js',
  // SQL migration grants INSERT to service_role so the edge function logger can write usage rows.
  // This is a Postgres role grant, not a secret key — the actual secret lives in Supabase only.
  'supabase/003_api_usage.sql',
  'supabase/005_audit_gap_fixes.sql',
  'docs/AUDIT_REPORT.md',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const rel = relative(root, fullPath).replace(/\\/g, '/');
    if (statSync(fullPath).isDirectory()) {
      if (!ignoredDirs.has(entry)) walk(fullPath, files);
    } else {
      if (!ignoredFiles.has(entry)) files.push(rel);
    }
  }
  return files;
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('no service role key usage appears in app or extension code', () => {
  const offenders = walk(root).filter((rel) => {
    const text = read(rel);
    return /SUPABASE_SERVICE_ROLE|service_role/i.test(text) && !allowedServiceRoleMentions.has(rel);
  });
  assert.deepEqual(offenders, []);
});

test('no real Supabase JWT-like keys or local env files are committed', () => {
  const files = walk(root);
  assert.equal(files.includes('.env.local'), false);
  assert.equal(files.some((file) => file.endsWith('/.env.local')), false);

  const jwtLike = files.filter((rel) => {
    const text = read(rel);
    return /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(text);
  });
  assert.deepEqual(jwtLike, []);
});

test('extension does not use anonymous job writes', () => {
  const popup = read('extension/popup.js');
  assert.match(popup, /Authorization:\s*`Bearer \$\{currentSession\.access_token\}`/);
  assert.match(popup, /user_id:\s*user\.id/);
  assert.match(popup, /capture_method:\s*['"]chrome_extension['"]/);
  assert.doesNotMatch(popup, /from\(['"]jobs['"]\)\.insert\([^)]*\)(?![\s\S]*Authorization)/);
});

test('Supabase migration keeps RLS and capture_method constraints', () => {
  const sql = read('supabase/001_create_jobs.sql');
  assert.match(sql, /capture_method text not null default 'chrome_extension'/);
  assert.match(sql, /'chrome_extension', 'manual_url', 'manual_text'/);
  assert.match(sql, /alter table public\.jobs enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
});

test('dashboard Add Job save requires authentication and user_id', () => {
  const form = read('web/components/JobUrlForm.tsx');
  assert.match(form, /supabase\.auth\.getUser\(\)/);
  assert.match(form, /if \(userError \|\| !user\)/);
  assert.match(form, /user_id:\s*user\.id/);
  assert.match(form, /capture_method:/);
  assert.match(form, /\.from\(['"]jobs['"]\)\.insert\(payload\)/);
  const route = read('web/app/api/jobs/fetch/route.ts');
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /if \(!user\)/);
  assert.match(route, /isBlockedHost\(parsedUrl\.hostname\)/);
});

test('no background crawling or scheduled scraping logic is present', () => {
  const files = walk(root).filter((file) => /^(extension|web)\//.test(file));
  const offenders = files.filter((rel) => {
    const text = read(rel);
    return /chrome\.alarms|setInterval\s*\(|setTimeout\s*\([^,]+,\s*(?:[1-9]\d{4,}|\d+\s*\*\s*\d+)|background\s*:\s*\{|service_worker|crawler|mass scraping/i.test(text);
  });
  assert.deepEqual(offenders, []);
});
