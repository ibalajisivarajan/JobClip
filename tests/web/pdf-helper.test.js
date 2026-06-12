'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

// Inline sanitizeFilename logic mirroring web/lib/pdf.ts — keep in sync.
function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)
    .replace(/^_+|_+$/g, '') || 'resume';
}

test('spaces become underscores', () => {
  assert.equal(sanitizeFilename('Acme Corp TPM Resume'), 'Acme_Corp_TPM_Resume');
});

test('special chars are stripped', () => {
  assert.equal(sanitizeFilename('My rsum!'), 'My_rsum');
});

test('leading and trailing underscores are trimmed', () => {
  const result = sanitizeFilename('  leading trailing  ');
  assert.equal(result, 'leading_trailing');
});

test('empty string returns resume fallback', () => {
  assert.equal(sanitizeFilename(''), 'resume');
});

test('output is truncated to 80 chars', () => {
  assert.equal(sanitizeFilename('a'.repeat(200)).length, 80);
});

test('hyphens and dots are preserved', () => {
  assert.match(sanitizeFilename('my-resume_v1.0'), /^my-resume_v1\.0$/);
});
