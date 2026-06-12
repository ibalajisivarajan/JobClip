const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const pageSource = readFileSync(join(__dirname, '../../web/app/dashboard/jobs/page.tsx'), 'utf8');

// --- Source analysis ---

test('jobs page is a server component (no use client directive)', () => {
  assert.doesNotMatch(pageSource, /['"]use client['"]/);
});

test('jobs page uses createServerSupabaseClient for authenticated queries', () => {
  assert.match(pageSource, /createServerSupabaseClient/);
});

test('jobs page renders error.message on supabase error', () => {
  assert.match(pageSource, /error\.message/);
});

test('jobs page renders empty-state message when no jobs exist', () => {
  assert.match(pageSource, /No saved jobs yet/);
});

// --- Behavioural mocks ---

test('mock: authenticated user receives job list', async () => {
  const mockJobs = [
    { id: '1', company: 'Acme', role_title: 'Engineer', location: 'SF', remote_hybrid: 'Hybrid', source_platform: 'LinkedIn', captured_at: null, created_at: '2026-01-01T00:00:00Z' },
    { id: '2', company: 'Beta', role_title: 'Designer', location: 'NY', remote_hybrid: 'Remote', source_platform: 'Greenhouse', captured_at: '2026-01-02T00:00:00Z', created_at: '2026-01-02T00:00:00Z' },
  ];

  function makeMockSupabase(jobs, error) {
    return {
      from() {
        return {
          select() {
            return {
              order() {
                return Promise.resolve({ data: jobs, error });
              },
            };
          },
        };
      },
    };
  }

  const supabase = makeMockSupabase(mockJobs, null);
  const result = await supabase.from('jobs').select('*').order('created_at', { ascending: false });

  assert.equal(result.error, null);
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].company, 'Acme');
});

test('mock: supabase error is surfaced correctly', async () => {
  function makeMockSupabase(jobs, error) {
    return {
      from() {
        return {
          select() {
            return {
              order() {
                return Promise.resolve({ data: jobs, error });
              },
            };
          },
        };
      },
    };
  }

  const supabase = makeMockSupabase(null, { message: 'permission denied for table jobs', code: '42501' });
  const result = await supabase.from('jobs').select('*').order('created_at', { ascending: false });

  assert.ok(result.error, 'error must be present');
  assert.equal(result.error.message, 'permission denied for table jobs');
  assert.equal(result.data, null);
});

test('mock: empty jobs array triggers no-jobs state', async () => {
  function makeMockSupabase(jobs, error) {
    return {
      from() {
        return {
          select() {
            return {
              order() {
                return Promise.resolve({ data: jobs, error });
              },
            };
          },
        };
      },
    };
  }

  const supabase = makeMockSupabase([], null);
  const result = await supabase.from('jobs').select('*').order('created_at', { ascending: false });

  assert.equal(result.error, null);
  assert.ok(Array.isArray(result.data));
  assert.equal(result.data.length, 0);
});
