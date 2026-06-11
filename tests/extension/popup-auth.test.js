const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const popup = readFileSync(join(__dirname, '../../extension/popup.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(__dirname, '../../extension/manifest.json'), 'utf8'));

test('Manifest V3 has identity permission and no background worker', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes('identity'));
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(manifest.permissions.includes('scripting'));
  assert.equal(manifest.background, undefined);
});

test('popup starts Supabase Google PKCE flow through chrome.identity', () => {
  assert.match(popup, /chrome\.identity\.getRedirectURL\('auth'\)/);
  assert.match(popup, /chrome\.identity\.launchWebAuthFlow/);
  assert.match(popup, /provider['"],\s*['"]google/);
  assert.match(popup, /code_challenge_method['"],\s*['"]S256/);
  assert.match(popup, /grant_type=pkce/);
});

test('popup refreshes and logs out Supabase session', () => {
  assert.match(popup, /grant_type=refresh_token/);
  assert.match(popup, /refresh_token/);
  assert.match(popup, /\/auth\/v1\/logout/);
  assert.match(popup, /storageRemove\(sessionKey\)/);
});

test('popup requires authenticated session before save and writes user_id', () => {
  assert.match(popup, /if \(!currentSession\)/);
  assert.match(popup, /currentSession\.user/);
  assert.match(popup, /user_id:\s*user\.id/);
  assert.match(popup, /Authorization:\s*`Bearer \$\{currentSession\.access_token\}`/);
});
