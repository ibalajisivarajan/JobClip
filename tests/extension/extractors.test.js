'use strict';

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
  return new RegExp(
    '<([a-z0-9-]+)[^>]*' + attr + '=["\'][^"\']*' + expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/\\1>',
    'i',
  );
}

function exactAttrRegex(attr, expected) {
  return new RegExp(
    '<([a-z0-9-]+)[^>]*' + attr + '=["\']' + expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([\\s\\S]*?)<\\/\\1>',
    'i',
  );
}

function makeElement(html, attrs) {
  attrs = attrs || {};
  return {
    textContent: stripTags(html),
    innerText: stripTags(html),
    getAttribute(name) {
      return attrs[name] || null;
    },
  };
}

function findSingle(html, item) {
  // compound selector: e.g. ".foo h1", ".foo a", ".foo span" — find outer then child tag
  const compoundMatch = item.match(/^([.#\[][^\s]+)\s+([a-z0-9]+)$/i);
  if (compoundMatch) {
    const outerClass = compoundMatch[1].startsWith('.') ? compoundMatch[1].slice(1) : null;
    if (outerClass) {
      const outerRe = new RegExp(
        '<([a-z0-9-]+)[^>]*class=["\'][^"\']*' + outerClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/\\1>',
        'i',
      );
      const outerBlock = html.match(outerRe);
      if (outerBlock) {
        const childTag = compoundMatch[2].toLowerCase();
        const childRe = new RegExp('<' + childTag + '[^>]*>([\\s\\S]*?)<\\/' + childTag + '>', 'i');
        const childMatch = outerBlock[2].match(childRe);
        if (childMatch) return makeElement(childMatch[1]);
      }
    }
    // fall through to simple match on outer
    return findSingle(html, compoundMatch[1]);
  }

  let match;
  if (item === 'h1') match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  else if (item === 'main') match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  else if (item.startsWith('#')) match = html.match(exactAttrRegex('id', item.slice(1)));
  else if (item.startsWith('[data-tracking-control-name=')) {
    const val = item.match(/data-tracking-control-name="([^"]+)"/)?.[1];
    if (val) match = html.match(new RegExp('<([a-z0-9-]+)[^>]*data-tracking-control-name=["\']' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([\\s\\S]*?)<\\/\\1>', 'i'));
  }
  else if (item.startsWith('[data-test-job-description')) match = html.match(attrRegex('data-test-job-description', ''));
  else if (item.startsWith('[data-testid*="')) match = html.match(attrRegex('data-testid', item.match(/\*="([^"]+)/)[1]));
  else if (item.startsWith('[class*="')) match = html.match(attrRegex('class', item.match(/\*="([^"]+)/)[1]));
  else if (item.startsWith('[data-qa=')) {
    const val = item.match(/data-qa="([^"]+)"/)?.[1];
    if (val) match = html.match(new RegExp('<([a-z0-9-]+)[^>]*data-qa=["\']' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([\\s\\S]*?)<\\/\\1>', 'i'));
  }
  else if (item.startsWith('[data-automation-id=')) {
    const val = item.match(/data-automation-id="([^"]+)"/)?.[1];
    if (val) match = html.match(new RegExp('<([a-z0-9-]+)[^>]*data-automation-id=["\']' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>([\\s\\S]*?)<\\/\\1>', 'i'));
  }
  else if (item.startsWith('[href*=')) {
    const val = item.match(/\*="([^"]+)"/)?.[1];
    if (val) match = html.match(new RegExp('<a[^>]*href=["\'][^"\']*' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/a>', 'i'));
  }
  else if (item.startsWith('meta')) {
    const name = item.match(/(?:property|name)="([^"]+)"/)?.[1];
    const metaMatch = name && html.match(new RegExp('<meta[^>]*(?:property|name)=["\']' + name + '["\'][^>]*content=["\']([^"\']*)["\'][^>]*>', 'i'));
    if (metaMatch) return makeElement('', { content: metaMatch[1] });
  }
  else if (item.startsWith('.')) {
    match = html.match(attrRegex('class', item.slice(1)));
  }
  if (match) return makeElement(match[2] || match[1]);
  return null;
}

function findElement(html, selector) {
  const selectors = selector.split(',').map((s) => s.trim());
  for (const item of selectors) {
    const el = findSingle(html, item);
    if (el) return el;
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
        return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => ({ textContent: m[1] }));
      }
      return [];
    },
  };
}

function extractFromFixture(name, url) {
  const html = readFileSync(join(__dirname, '../fixtures', name), 'utf8');
  let fetchCalled = false;
  const loc = new URL(url);
  const context = {
    console,
    document: makeDocument(html),
    location: { href: loc.href, hostname: loc.hostname },
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

// ─── LinkedIn tests ─────────────────────────────────────────────────────────

test('LinkedIn: does not call fetch', () => {
  const { fetchCalled } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(fetchCalled, false);
});

test('LinkedIn: extracts company from top card (not Unknown)', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.company, 'Acme Robotics');
  assert.notEqual(job.company, '');
  assert.notEqual(job.company, 'Unknown');
});

test('LinkedIn: extracts clean role title', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.role_title, 'Senior Frontend Engineer');
  assert.doesNotMatch(job.role_title, /LinkedIn/i);
  assert.doesNotMatch(job.role_title, /Easy Apply/i);
});

test('LinkedIn: extracts location', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.location, 'San Francisco, CA');
});

test('LinkedIn: extracts Remote/Hybrid/On-site', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.remote_hybrid, 'Hybrid');
});

test('LinkedIn: extracts posted_date phrase not today\'s date', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.match(job.posted_date, /Posted 2 days ago/i);
  // must not be a full ISO date or today
  assert.doesNotMatch(job.posted_date, /^\d{4}-\d{2}-\d{2}T/);
});

test('LinkedIn: extracts salary when present in description', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.match(job.salary, /\$140,000/);
});

test('LinkedIn: job_description is clean and focused — no noise sections', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.match(job.job_description, /Build accessible interfaces/);
  assert.doesNotMatch(job.job_description, /Similar jobs/i);
  assert.doesNotMatch(job.job_description, /People also viewed/i);
  assert.doesNotMatch(job.job_description, /LinkedIn Premium/i);
  assert.doesNotMatch(job.job_description, /LinkedIn Corporation/i);
});

test('LinkedIn: raw_text is preserved separately and contains full page text', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  // raw_text should contain everything including the noise sections
  assert.match(job.raw_text, /Build accessible interfaces/);
  // raw_text is a non-empty string
  assert.ok(job.raw_text.length > 0);
});

test('LinkedIn: source_platform is LinkedIn', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.source_platform, 'LinkedIn');
});

test('LinkedIn: captured_at is an ISO timestamp', () => {
  const { job } = extractFromFixture('linkedin-job.html', 'https://www.linkedin.com/jobs/view/123');
  assert.match(job.captured_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

// ─── Generic JSON-LD test ────────────────────────────────────────────────────

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

// ─── Generic fallback test ───────────────────────────────────────────────────

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
