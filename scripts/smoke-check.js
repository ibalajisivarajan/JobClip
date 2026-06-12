#!/usr/bin/env node
'use strict';

const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const passed = [];
const failed = [];

const manualItems = [
  'Google login completes and lands on /dashboard/jobs',
  'Unauthenticated visit to /dashboard/jobs redirects to /login',
  'Job captured via extension appears in dashboard',
  'Sign out blocks dashboard access',
  'Job detail page shows full description',
  'Add Job by URL saves correctly',
  'Add Job by paste saves correctly',
];

function check(description, fn) {
  try {
    fn();
    passed.push(description);
  } catch (err) {
    failed.push({ description, reason: err.message });
  }
}

function readJson(rel) {
  const content = readFileSync(join(root, rel), 'utf8');
  return JSON.parse(content);
}

function fileExists(rel) {
  return existsSync(join(root, rel));
}

function fileContent(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

// --- JSON validity ---

check('extension/manifest.json is valid JSON', () => readJson('extension/manifest.json'));
check('web/package.json is valid JSON', () => readJson('web/package.json'));
check('web/tsconfig.json is valid JSON', () => readJson('web/tsconfig.json'));
check('package.json is valid JSON', () => readJson('package.json'));
check('vercel.json is valid JSON', () => readJson('vercel.json'));

// --- No secrets committed ---

check('No real JWT tokens in committed files', () => {
  const ignoredDirs = new Set(['.git', 'node_modules', '.next', '.vercel', 'scripts']);
  const ignoredFiles = new Set(['.env.local', '.env.development.local', '.env.test.local', '.env.production.local']);
  const jwtPattern = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;

  function walk(dir, files = []) {
    const { readdirSync, statSync } = require('node:fs');
    const { relative } = require('node:path');
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

  const offenders = walk(root).filter((rel) => {
    try { return jwtPattern.test(fileContent(rel)); } catch { return false; }
  });
  if (offenders.length > 0) throw new Error(`JWT-like token found in: ${offenders.join(', ')}`);
});

check('No .env.local files tracked by git', () => {
  const { execSync } = require('node:child_process');
  let tracked = '';
  try {
    tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' });
  } catch {
    // git not available — skip check
    return;
  }
  const trackedFiles = tracked.split('\n').filter(Boolean);
  const found = trackedFiles.filter((f) => f === '.env.local' || f.endsWith('/.env.local'));
  if (found.length > 0) throw new Error(`.env.local files are tracked by git (must not be committed): ${found.join(', ')}`);
});

// --- extension/config.js must NOT exist ---

check('extension/config.js is not committed (must not exist)', () => {
  if (fileExists('extension/config.js')) {
    throw new Error('extension/config.js exists — it must not be committed. Add to .gitignore and remove.');
  }
});

// --- Required files exist ---

const requiredFiles = [
  'CLAUDE.md',
  'README.md',
  'vercel.json',
  'web/app/auth/callback/route.ts',
  'supabase/001_create_jobs.sql',
  'supabase/functions/process-job/prompts/tailor.txt',
  'supabase/functions/process-job/prompts/score.txt',
  'supabase/functions/process-job/prompts/questions.txt',
  'supabase/002_ai_pipeline.sql',
  'web/lib/role-detection.ts',
  'web/app/api/resumes/route.ts',
  'web/app/api/resumes/[id]/route.ts',
  'web/app/dashboard/profile/page.tsx',
  'web/components/ResumeManager.tsx',
  'web/components/ApplyActions.tsx',
  'supabase/003_api_usage.sql',
  'supabase/functions/_shared/log-usage.ts',
  'web/app/dashboard/usage/page.tsx',
  'supabase/004_user_settings.sql',
  'supabase/functions/_shared/ai-router.ts',
  'web/app/api/settings/route.ts',
];

for (const rel of requiredFiles) {
  check(`Required file exists: ${rel}`, () => {
    if (!fileExists(rel)) throw new Error(`Missing: ${rel}`);
  });
}

check('Auth proxy file exists (web/proxy.ts or web/middleware.ts)', () => {
  const hasProxy = fileExists('web/proxy.ts');
  const hasMiddleware = fileExists('web/middleware.ts');
  if (!hasProxy && !hasMiddleware) {
    throw new Error('Neither web/proxy.ts nor web/middleware.ts found');
  }
  if (hasMiddleware && !hasProxy) {
    throw new Error('web/middleware.ts found but Next.js 16 requires web/proxy.ts — rename it');
  }
});

// --- manifest.json checks ---

check('extension/manifest.json has manifest_version 3', () => {
  const manifest = readJson('extension/manifest.json');
  if (manifest.manifest_version !== 3) {
    throw new Error(`manifest_version is ${manifest.manifest_version}, expected 3`);
  }
});

check('extension/manifest.json has required permissions (identity, activeTab, scripting)', () => {
  const manifest = readJson('extension/manifest.json');
  const perms = manifest.permissions || [];
  for (const p of ['identity', 'activeTab', 'scripting']) {
    if (!perms.includes(p)) throw new Error(`Missing permission: ${p}`);
  }
});

check('extension/manifest.json has no background service worker (V1 constraint)', () => {
  const manifest = readJson('extension/manifest.json');
  if (manifest.background) throw new Error('background worker must not be present in V1');
});

// --- Report ---

const totalAuto = passed.length + failed.length;
console.log('');
console.log('JobClip Smoke Check');
console.log('===================');
console.log('');

if (failed.length > 0) {
  console.log('Failures:');
  for (const { description, reason } of failed) {
    console.log(`  ❌  ${description}`);
    console.log(`      → ${reason}`);
  }
  console.log('');
}

console.log(`✅  PASSED: ${passed.length}`);
console.log(`❌  FAILED: ${failed.length}`);
console.log('');
console.log(`⚠️   MANUAL REQUIRED: ${manualItems.length}`);
for (const item of manualItems) {
  console.log(`    • ${item}`);
}
console.log('');

if (failed.length > 0) {
  process.exit(1);
}
