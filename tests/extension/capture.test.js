const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extractorSource = readFileSync(join(__dirname, '../../extension/extractors.js'), 'utf8');
const popupSource = readFileSync(join(__dirname, '../../extension/popup.js'), 'utf8');

// Minimal DOM builder used to drive the extractor without fixtures or a browser.
function stripTags(v) {
  return v.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function attrContains(attr, value) {
  return new RegExp(`<([a-z0-9-]+)[^>]*${attr}=["'][^"']*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
}

function makeDoc(html, hostname) {
  function findEl(html, selector) {
    const parts = selector.split(',').map((s) => s.trim());
    for (const part of parts) {
      let m;
      if (part === 'h1') m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      else if (part.startsWith('.')) m = html.match(attrContains('class', part.slice(1)));
      else if (part.startsWith('[class*="')) m = html.match(attrContains('class', part.match(/\*="([^"]+)/)[1]));
      else if (part.startsWith('[data-testid*="')) m = html.match(attrContains('data-testid', part.match(/\*="([^"]+)/)[1]));
      else if (part === 'main') m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      if (m) return { textContent: stripTags(m[2] || m[1]), innerText: stripTags(m[2] || m[1]), getAttribute: () => null };
    }
    return null;
  }

  return {
    body: { innerText: stripTags(html) },
    title: stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
    querySelector(sel) { return findEl(html, sel); },
    querySelectorAll(sel) {
      if (sel === 'script[type="application/ld+json"]') {
        return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => ({ textContent: m[1] }));
      }
      return [];
    },
  };
}

function runExtractor(html, url) {
  const u = new URL(url);
  const context = {
    console,
    document: makeDoc(html, u.hostname),
    location: { href: u.href, hostname: u.hostname },
    window: {},
    fetch() { throw new Error('fetch must not be called in extractor'); },
  };
  vm.createContext(context);
  vm.runInContext(extractorSource, context);
  return context.window.JobClipExtractors.extract();
}

// --- Tests ---

test('LinkedIn extractor returns title, company, and location from mock DOM', () => {
  const html = `
    <html>
      <body>
        <h1 class="jobs-unified-top-card__job-title">Frontend Engineer</h1>
        <span class="jobs-unified-top-card__company-name">MockCorp</span>
        <span class="jobs-unified-top-card__bullet">Austin, TX (Hybrid)</span>
        <div class="jobs-description-content__text">Build UI components.</div>
      </body>
    </html>
  `;
  const job = runExtractor(html, 'https://www.linkedin.com/jobs/view/999');
  assert.equal(job.source_platform, 'LinkedIn');
  assert.equal(job.role_title, 'Frontend Engineer');
  assert.equal(job.company, 'MockCorp');
  assert.equal(job.location, 'Austin, TX (Hybrid)');
  assert.match(job.remote_hybrid, /Hybrid/);
});

test('generic extractor returns best-effort fields from mock DOM', () => {
  const html = `
    <html>
      <title>Backend Engineer</title>
      <body>
        <h1>Backend Engineer</h1>
        <span class="company">GenericCo</span>
        <main>Build APIs. Salary $120,000 per year. Remote friendly. Visa sponsorship available.</main>
      </body>
    </html>
  `;
  const job = runExtractor(html, 'https://careers.example.com/backend-engineer');
  assert.equal(job.role_title, 'Backend Engineer');
  assert.equal(job.source_platform, 'careers.example.com');
  assert.match(job.salary, /\$120,000/);
  assert.equal(job.remote_hybrid, 'Remote');
  assert.match(job.visa_sponsorship_clue, /visa/i);
});

test('missing optional fields are empty string not undefined', () => {
  const html = `<html><body><h1>Analyst</h1></body></html>`;
  const job = runExtractor(html, 'https://careers.example.com/analyst');

  const optionalFields = ['company', 'location', 'remote_hybrid', 'employment_type', 'posted_date', 'salary', 'visa_sponsorship_clue'];
  for (const field of optionalFields) {
    assert.notEqual(job[field], undefined, `${field} must not be undefined`);
    assert.equal(typeof job[field], 'string', `${field} must be a string`);
  }
});

test('save is blocked if user is not authenticated', () => {
  assert.match(popupSource, /if \(!currentSession\)/);
  assert.match(popupSource, /Authorization:\s*`Bearer \$\{currentSession\.access_token\}`/);
  assert.match(popupSource, /user_id:\s*user\.id/);
});
