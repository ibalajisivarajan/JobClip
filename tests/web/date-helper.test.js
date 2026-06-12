'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

// Inline savedDateIso logic — mirrors web/lib/date.ts.
function savedDateIso(capturedAt, createdAt) {
  return capturedAt ?? createdAt;
}

test('prefers captured_at over created_at', () => {
  const captured = '2026-06-11T22:30:00.000Z';
  const created  = '2026-06-12T01:00:00.000Z';
  assert.equal(savedDateIso(captured, created), captured);
});

test('falls back to created_at when captured_at is null', () => {
  const created = '2026-06-12T01:00:00.000Z';
  assert.equal(savedDateIso(null, created), created);
});

test('falls back to created_at when captured_at is undefined', () => {
  const created = '2026-06-12T01:00:00.000Z';
  assert.equal(savedDateIso(undefined, created), created);
});

test('returns captured_at unchanged (no server-side timezone conversion)', () => {
  // A job saved on June 11 at 10:30 PM Pacific is June 12 in UTC.
  // savedDateIso returns the raw ISO string for the client to render in local TZ.
  const captured = '2026-06-12T05:30:00.000Z'; // 10:30 PM Pacific June 11
  const result = savedDateIso(captured, '2026-06-12T06:00:00.000Z');
  // The client (DateDisplay) will render this in the user's browser timezone,
  // so a Vancouver user sees Jun 11, not Jun 12.
  assert.equal(result, captured);
});

test('captured_at is always returned as-is, not modified', () => {
  const captured = '2026-06-01T00:00:00.000Z';
  assert.equal(savedDateIso(captured, '2026-06-02T00:00:00.000Z'), captured);
});
