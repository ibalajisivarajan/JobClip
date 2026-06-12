'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

// Inline patterns mirroring web/lib/role-detection.ts — keep in sync.
const TPM_PATTERN =
  /\b(technical\s+program\s+manag|tpm\b|sr\.?\s+tpm\b|senior\s+tpm\b|staff\s+tpm\b|principal\s+tpm\b|engineering\s+program\s+manag|epm\b|technical\s+project\s+manag|platform\s+program\s+manag|infrastructure\s+program\s+manag|technology\s+program\s+manag|it\s+program\s+manag|software\s+program\s+manag)/i;

const SCRUM_PATTERN =
  /\b(scrum\s+master|senior\s+scrum\s+master|agile\s+coach|release\s+train\s+engineer|rte\b|safe\b|agile\s+delivery\s+lead|agile\s+lead|kanban\s+coach|iteration\s+manag|sprint\s+master)/i;

const PM_PATTERN =
  /\b(project\s+manag|program\s+manag|sr\.?\s+pm\b|senior\s+project\s+manag|senior\s+program\s+manag|delivery\s+manag|engagement\s+manag|it\s+project\s+manag|digital\s+project\s+manag|implementation\s+manag|pmo\s+(lead|manag)|portfolio\s+manag)/i;

function detectRoleType(roleTitle, jobDescription = '') {
  if (TPM_PATTERN.test(roleTitle)) return 'tpm';
  if (SCRUM_PATTERN.test(roleTitle)) return 'scrum_master';
  if (PM_PATTERN.test(roleTitle)) return 'pm';
  const desc = jobDescription.slice(0, 1000);
  if (TPM_PATTERN.test(desc)) return 'tpm';
  if (SCRUM_PATTERN.test(desc)) return 'scrum_master';
  if (PM_PATTERN.test(desc)) return 'pm';
  return 'general';
}

test('TPM title matches', () => {
  assert.equal(detectRoleType('Technical Program Manager'), 'tpm');
  assert.equal(detectRoleType('Senior TPM'), 'tpm');
  assert.equal(detectRoleType('Staff TPM'), 'tpm');
  assert.equal(detectRoleType('Engineering Program Manager'), 'tpm');
  assert.equal(detectRoleType('IT Program Manager'), 'tpm');
  assert.equal(detectRoleType('Infrastructure Program Manager'), 'tpm');
  assert.equal(detectRoleType('Principal TPM'), 'tpm');
});

test('Scrum Master title matches', () => {
  assert.equal(detectRoleType('Scrum Master'), 'scrum_master');
  assert.equal(detectRoleType('Senior Scrum Master'), 'scrum_master');
  assert.equal(detectRoleType('Agile Coach'), 'scrum_master');
  assert.equal(detectRoleType('Release Train Engineer'), 'scrum_master');
  assert.equal(detectRoleType('Agile Delivery Lead'), 'scrum_master');
});

test('PM title matches', () => {
  assert.equal(detectRoleType('Project Manager'), 'pm');
  assert.equal(detectRoleType('Senior Project Manager'), 'pm');
  assert.equal(detectRoleType('Delivery Manager'), 'pm');
  assert.equal(detectRoleType('Implementation Manager'), 'pm');
  assert.equal(detectRoleType('Portfolio Manager'), 'pm');
});

test('falls back to general for unrecognized titles', () => {
  assert.equal(detectRoleType('Software Engineer'), 'general');
  assert.equal(detectRoleType('Designer'), 'general');
  assert.equal(detectRoleType(''), 'general');
});

test('detects role type from job description when title is generic', () => {
  assert.equal(
    detectRoleType('Program Lead', 'We are looking for a Technical Program Manager to join our team'),
    'tpm',
  );
  assert.equal(
    detectRoleType('Delivery Lead', 'We need a Scrum Master to facilitate our sprints'),
    'scrum_master',
  );
  assert.equal(
    detectRoleType('Lead', 'This is a Project Manager role'),
    'pm',
  );
});

test('TPM takes precedence over Scrum in title', () => {
  assert.equal(detectRoleType('Technical Program Manager and Agile Coach'), 'tpm');
});
