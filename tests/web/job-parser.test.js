const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../../web/lib/job-parser.ts'), 'utf8')
  .replace(/export type CaptureMethod[\s\S]*?;\n\n/, '')
  .replace(/type JsonLdNode[\s\S]*?export type ParsedJob/, 'export type ParsedJob')
  .replace(/export type ParsedJob[\s\S]*?};\n\n/, '')
  .replace(/export type ParseResult[\s\S]*?};\n\n/, '')
  .replace(/export /g, '')
  .replace(/: ParsedJob/g, '')
  .replace(/: ParseResult/g, '')
  .replace(/: Partial<ParsedJob> \| null/g, '')
  .replace(/: Partial<ParsedJob>/g, '')
  .replace(/: CaptureMethod/g, '')
  .replace(/ as JsonLdNode \| JsonLdNode\[\]/g, '')
  .replace(/: RegExp\[\]/g, '')
  .replace(/: Array<\(\) => string>/g, '')
  .replace(/: any\[\]/g, '')
  .replace(/: any/g, '')
  .replace(/: string/g, '')
  .replace(/item: any/g, 'item')
  .concat(`\nmodule.exports = { parseJobHtml, parseManualText, detectSourcePlatform, mergeUrlAndText };`);

function loadParser() {
  const context = { module: { exports: {} }, exports: {}, URL, console };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.module.exports;
}

const parser = loadParser();

test('detects supported job URL platforms', () => {
  assert.equal(parser.detectSourcePlatform('https://www.linkedin.com/jobs/view/123'), 'LinkedIn');
  assert.equal(parser.detectSourcePlatform('https://acme.myworkdayjobs.com/jobs/role'), 'Workday');
  assert.equal(parser.detectSourcePlatform('https://boards.greenhouse.io/acme/jobs/123'), 'Greenhouse');
  assert.equal(parser.detectSourcePlatform('https://jobs.lever.co/acme/123'), 'Lever');
  assert.equal(parser.detectSourcePlatform('https://jobs.ashbyhq.com/acme/123'), 'Ashby');
  assert.equal(parser.detectSourcePlatform('https://careers.example.com/jobs/123'), 'careers.example.com');
});

test('parses LinkedIn HTML without external services', () => {
  const html = readFileSync(join(__dirname, '../fixtures/linkedin-job.html'), 'utf8');
  const { job } = parser.parseJobHtml(html, 'https://www.linkedin.com/jobs/view/123');
  assert.equal(job.source_platform, 'LinkedIn');
  assert.equal(job.capture_method, 'manual_url');
  assert.equal(job.company, 'Acme Robotics');
  assert.equal(job.role_title, 'Senior Frontend Engineer');
  assert.equal(job.location, 'San Francisco, CA (Hybrid)');
});

test('parses Workday-style JSON-LD JobPosting', () => {
  const html = readFileSync(join(__dirname, '../fixtures/generic-job-jsonld.html'), 'utf8');
  const { job } = parser.parseJobHtml(html, 'https://acme.myworkdayjobs.com/jobs/platform-engineer');
  assert.equal(job.source_platform, 'Workday');
  assert.equal(job.company, 'ExampleCo');
  assert.equal(job.role_title, 'Platform Engineer');
  assert.equal(job.remote_hybrid, 'Remote');
});

test('parses Greenhouse, Lever, Ashby, and generic URLs', () => {
  const html = readFileSync(join(__dirname, '../fixtures/generic-job-basic.html'), 'utf8');
  const greenhouse = parser.parseJobHtml(html, 'https://boards.greenhouse.io/acme/jobs/123').job;
  const lever = parser.parseJobHtml(html, 'https://jobs.lever.co/acme/123').job;
  const ashby = parser.parseJobHtml(html, 'https://jobs.ashbyhq.com/acme/123').job;
  const generic = parser.parseJobHtml(html, 'https://careers.example.org/jobs/data-analyst').job;

  assert.equal(greenhouse.source_platform, 'Greenhouse');
  assert.equal(lever.source_platform, 'Lever');
  assert.equal(ashby.source_platform, 'Ashby');
  assert.equal(generic.source_platform, 'careers.example.org');
  assert.equal(generic.role_title, 'Data Analyst');
});

test('manual text parser extracts role, location, salary, remote, and visa fields', () => {
  const text = `Company: Example Labs\nRole: Staff Backend Engineer\nLocation: Remote - US\nSalary: $170,000 - $210,000 per year\nVisa: Sponsorship available\n\nBuild APIs for internal platforms.`;
  const job = parser.parseManualText(text, 'https://jobs.example.com/staff-backend');
  assert.equal(job.company, 'Example Labs');
  assert.equal(job.role_title, 'Staff Backend Engineer');
  assert.equal(job.location, 'Remote - US');
  assert.equal(job.remote_hybrid, 'Remote');
  assert.equal(job.salary, '$170,000 - $210,000 per year');
  assert.equal(job.visa_sponsorship_clue, 'Sponsorship available');
  assert.equal(job.raw_text, text);
});

test('URL plus description prefers manual description and stores URL metadata', () => {
  const urlJob = parser.parseJobHtml('<title>Old title</title><body>Old body</body>', 'https://jobs.example.com/old').job;
  const merged = parser.mergeUrlAndText(urlJob, 'Title: New Title\nLocation: Hybrid NYC\nSalary: $80/hr', 'https://jobs.example.com/new');
  assert.equal(merged.role_title, 'New Title');
  assert.equal(merged.remote_hybrid, 'Hybrid');
  assert.equal(merged.source_url, 'https://jobs.example.com/new');
  assert.equal(merged.capture_method, 'manual_url');
});
