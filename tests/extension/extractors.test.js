const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extractorSource = readFileSync(join(__dirname, '../../extension/extractors.js'), 'utf8');

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attrRegex(attr, expected) {
  return new RegExp(`<([a-z0-9-]+)[^>]*${attr}=["'][^"']*${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
}

function exactAttrRegex(attr, expected) {
  return new RegExp(`<([a-z0-9-]+)[^>]*${attr}=["']${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
}

function makeElement(html, attrs = {}) {
  return {
    textContent: stripTags(html),
    innerText: stripTags(html),
    getAttribute(name) {
      return attrs[name] || null;
    },
  };
}

function findElement(html, selector) {
  const selectors = selector.split(',').map((item) => item.trim());
  for (const item of selectors) {
    let match;
    if (item === 'h1') match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    else if (item === 'main') match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    else if (item.startsWith('#')) match = html.match(exactAttrRegex('id', item.slice(1)));
    else if (item.startsWith('.')) match = html.match(attrRegex('class', item.slice(1)));
    else if (item.startsWith('[data-testid*="')) match = html.match(attrRegex('data-testid', item.match(/\*="([^"]+)/)[1]));
    else if (item.startsWith('[class*="')) match = html.match(attrRegex('class', item.match(/\*="([^"]+)/)[1]));
    else if (item.startsWith('meta')) {
      const name = item.match(/(?:property|name)="([^"]+)"/)?.[1];
      const metaMatch = name && html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'));
      if (metaMatch) return makeElement('', { content: metaMatch[1] });
    }
    if (match) return makeElement(match[2] || match[1]);
  }
  return null;
}

function makeDocument(html) {
  return {
    body: { innerText: stripTags(html) },
    title: stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
    querySelector(selector) {
      return findElement(html, selector);
    },
    querySelectorAll(selector) {
      if (selector === 'script[type="application/ld+json"]') {
        return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => ({ textContent: match[1] }));
      }
      return [];
    },
  };
}

function extractFromFixture(name, url) {
  const html = readFileSync(join(__dirname, '../fixtures', name), 'utf8');
  let fetchCalled = false;
  const location = new URL(url);
  const context = {
    console,
    document: makeDocument(html),
    location: { href: location.href, hostname: location.hostname },
    window: {},
    fetch() {
      fetchCalled = true;
      throw new Error('External API calls are not allowed in extractors');
    },
  };
  vm.createContext(context);
  vm.runInContext(extractorSource, context);
  const job = context.window.JobClipExtractors.extract();
  return { job, fetchCalled };
}

test('LinkedIn parser extracts core visible job fields', () => {
  const { job, fetchCalled } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(fetchCalled, false);
  assert.equal(job.company, 'Acme Robotics');
  assert.equal(job.role_title, 'Senior Frontend Engineer');
  assert.equal(job.location, 'San Francisco, CA (Hybrid)');
  assert.equal(job.source_platform, 'LinkedIn');
  assert.match(job.job_description, /Build accessible interfaces/);
});

test('generic JSON-LD parser extracts JobPosting fields', () => {
  const { job } = extractFromFixture('generic-job-jsonld.html', 'https://jobs.example.com/platform-engineer');
  assert.equal(job.company, 'ExampleCo');
  assert.equal(job.role_title, 'Platform Engineer');
  assert.equal(job.remote_hybrid, 'Remote');
  assert.equal(job.employment_type, 'FULL_TIME');
  assert.equal(job.posted_date, '2026-05-01');
  assert.equal(job.salary, '155000');
  assert.equal(job.source_url, 'https://jobs.example.com/platform-engineer');
  assert.match(job.job_description, /cloud infrastructure/);
});

test('generic fallback extracts title, raw text, source URL, remote, salary, and visa clues', () => {
  const { job, fetchCalled } = extractFromFixture('generic-job-basic.html', 'https://careers.example.org/jobs/data-analyst');
  assert.equal(fetchCalled, false);
  assert.equal(job.company, 'BrightData Labs');
  assert.equal(job.role_title, 'Data Analyst');
  assert.equal(job.location, 'Austin, TX or Remote');
  assert.equal(job.remote_hybrid, 'Remote');
  assert.match(job.salary, /\$95,000 - \$120,000 per year/);
  assert.match(job.visa_sponsorship_clue, /visa sponsorship is not available/i);
  assert.equal(job.source_url, 'https://careers.example.org/jobs/data-analyst');
  assert.match(job.raw_text, /Analyze product usage data/);
});
