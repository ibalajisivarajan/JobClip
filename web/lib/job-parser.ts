export type CaptureMethod = 'chrome_extension' | 'manual_url' | 'manual_text';

export type ParsedJob = {
  company: string;
  role_title: string;
  job_description: string;
  location: string;
  remote_hybrid: string;
  employment_type: string;
  posted_date: string;
  salary: string;
  visa_sponsorship_clue: string;
  source_url: string;
  source_platform: string;
  raw_text: string;
  captured_at: string;
  capture_method: CaptureMethod;
};

export type ParseResult = {
  job: ParsedJob;
  error?: string;
};

export const EMPTY_JOB: ParsedJob = {
  company: '',
  role_title: '',
  job_description: '',
  location: '',
  remote_hybrid: '',
  employment_type: '',
  posted_date: '',
  salary: '',
  visa_sponsorship_clue: '',
  source_url: '',
  source_platform: '',
  raw_text: '',
  captured_at: '',
  capture_method: 'manual_text',
};

export function detectSourcePlatform(sourceUrl = ''): string {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('linkedin.')) return 'LinkedIn';
    if (host.includes('myworkdayjobs.com')) return 'Workday';
    if (host.includes('boards.greenhouse.io')) return 'Greenhouse';
    if (host.includes('jobs.lever.co')) return 'Lever';
    if (host.includes('ashbyhq.com')) return 'Ashby';
    return host || 'Manual';
  } catch {
    return sourceUrl ? 'Generic Career Page' : 'Manual';
  }
}

export function normalizeWhitespace(value = ''): string {
  return String(value).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function stripHtml(html = ''): string {
  return normalizeWhitespace(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeWhitespace(match[1]);
  }
  return '';
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  return normalizeWhitespace(html.match(pattern)?.[1] || '');
}

function bySelectorClass(html: string, className: string): string {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<([a-z0-9-]+)[^>]*class=["'][^"']*${escaped}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  return stripHtml(html.match(pattern)?.[2] || '');
}

function bySelectorId(html: string, id: string): string {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<([a-z0-9-]+)[^>]*id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  return stripHtml(html.match(pattern)?.[2] || '');
}

function firstHtmlValue(html: string, readers: Array<() => string>): string {
  for (const reader of readers) {
    const value = reader();
    if (value) return value;
  }
  return '';
}

export function detectRemoteHybrid(text = ''): string {
  const haystack = text.toLowerCase();
  if (/\bremote\b/.test(haystack)) return 'Remote';
  if (/\bhybrid\b/.test(haystack)) return 'Hybrid';
  if (/\bon[- ]?site\b/.test(haystack)) return 'On-site';
  return '';
}

export function detectEmploymentType(text = ''): string {
  const value = text.toLowerCase();
  if (/\bfull[- ]time\b/.test(value)) return 'Full-time';
  if (/\bpart[- ]time\b/.test(value)) return 'Part-time';
  if (/\bcontract\b/.test(value)) return 'Contract';
  if (/\bintern(ship)?\b/.test(value)) return 'Internship';
  if (/\btemporary\b/.test(value)) return 'Temporary';
  return '';
}

export function detectSalary(text = ''): string {
  const match = text.match(/(?:salary|rate|compensation|pay)?\s*:?[\s\n]*(?:\$|USD\s?)\d[\d,.]*(?:\s?(?:-|–|to)\s?(?:\$|USD\s?)?\d[\d,.]*)?(?:\s?(?:a year|per year|\/year|yearly|hourly|\/hr|per hour|an hour))?/i);
  return normalizeWhitespace(match?.[0] || '');
}

export function detectVisaSponsorship(text = ''): string {
  return normalizeWhitespace(
    text
      .split('\n')
      .filter((line) => /visa|sponsor|sponsorship|work authorization/i.test(line))
      .slice(0, 3)
      .join('\n'),
  ).slice(0, 1000);
}

function normalizeJob(job: Partial<ParsedJob>): ParsedJob {
  const raw = normalizeWhitespace(job.raw_text || job.job_description || '');
  const combined = `${job.company || ''}\n${job.role_title || ''}\n${job.location || ''}\n${job.job_description || ''}\n${raw}`;
  return {
    ...EMPTY_JOB,
    ...job,
    company: normalizeWhitespace(job.company || ''),
    role_title: normalizeWhitespace(job.role_title || ''),
    job_description: normalizeWhitespace(job.job_description || raw),
    location: normalizeWhitespace(job.location || ''),
    remote_hybrid: normalizeWhitespace(job.remote_hybrid || detectRemoteHybrid(combined)),
    employment_type: normalizeWhitespace(job.employment_type || detectEmploymentType(combined)),
    salary: normalizeWhitespace(job.salary || detectSalary(combined)),
    visa_sponsorship_clue: normalizeWhitespace(job.visa_sponsorship_clue || detectVisaSponsorship(combined)),
    source_platform: normalizeWhitespace(job.source_platform || detectSourcePlatform(job.source_url)),
    raw_text: raw,
    captured_at: job.captured_at || new Date().toISOString(),
    capture_method: job.capture_method || EMPTY_JOB.capture_method,
  };
}

export function parseManualText(text = '', sourceUrl = ''): ParsedJob {
  const raw = normalizeWhitespace(text);
  const company = firstMatch(raw, [/^Company:\s*(.+)$/im, /^Organization:\s*(.+)$/im]);
  const role = firstMatch(raw, [/^Role:\s*(.+)$/im, /^Title:\s*(.+)$/im, /^Job Title:\s*(.+)$/im, /^Position:\s*(.+)$/im]);
  const location = firstMatch(raw, [/^Location:\s*(.+)$/im, /^Based in:\s*(.+)$/im]);
  const salary = firstMatch(raw, [/^Salary:\s*(.+)$/im, /^Rate:\s*(.+)$/im, /^Compensation:\s*(.+)$/im]) || detectSalary(raw);
  const contract = /^Contract:\s*(.+)$/im.test(raw) ? 'Contract' : '';
  const remote = /^Remote:\s*(.+)$/im.test(raw) ? 'Remote' : '';
  const hybrid = /^Hybrid:\s*(.+)$/im.test(raw) ? 'Hybrid' : '';
  const visa = firstMatch(raw, [/^Visa:\s*(.+)$/im, /^Work Authorization:\s*(.+)$/im]) || detectVisaSponsorship(raw);

  return normalizeJob({
    company,
    role_title: role || raw.split('\n')[0]?.slice(0, 140) || '',
    job_description: raw,
    location,
    remote_hybrid: remote || hybrid || detectRemoteHybrid(raw),
    employment_type: contract || detectEmploymentType(raw),
    salary,
    visa_sponsorship_clue: visa,
    source_url: sourceUrl,
    source_platform: detectSourcePlatform(sourceUrl),
    raw_text: raw,
    capture_method: sourceUrl ? 'manual_url' : 'manual_text',
  });
}

function parseJsonLdJobPosting(html: string): Partial<ParsedJob> | null {
  const scripts = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const parsed: any = JSON.parse(script[1]);
      const candidates: any[] = Array.isArray(parsed) ? parsed : [parsed, ...((parsed && parsed['@graph']) || [])];
      const job = candidates.find((item: any) => item?.['@type'] === 'JobPosting' || item?.['@type']?.includes?.('JobPosting'));
      if (!job) continue;
      const locationValue = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
      return {
        company: job.hiringOrganization?.name || '',
        role_title: job.title || '',
        job_description: stripHtml(job.description || ''),
        location: locationValue?.address?.addressLocality || locationValue?.address?.addressRegion || locationValue?.address?.addressCountry || job.applicantLocationRequirements?.name || '',
        remote_hybrid: job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '',
        employment_type: Array.isArray(job.employmentType) ? job.employmentType.join(', ') : job.employmentType || '',
        posted_date: job.datePosted || '',
        salary: job.baseSalary?.value?.value ? String(job.baseSalary.value.value) : '',
      };
    } catch {
      // Ignore invalid JSON-LD and continue with other extraction strategies.
    }
  }
  return null;
}

function parseLinkedInHtml(html: string, sourceUrl: string): ParseResult {
  const raw = stripHtml(html);
  const role = firstHtmlValue(html, [() => bySelectorClass(html, 'jobs-unified-top-card__job-title'), () => bySelectorClass(html, 'top-card-layout__title'), () => stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')]);
  const company = firstHtmlValue(html, [() => bySelectorClass(html, 'jobs-unified-top-card__company-name'), () => bySelectorClass(html, 'topcard__org-name-link'), () => metaContent(html, 'og:site_name')]);
  const location = firstHtmlValue(html, [() => bySelectorClass(html, 'jobs-unified-top-card__bullet'), () => bySelectorClass(html, 'topcard__flavor--bullet')]);
  const description = firstHtmlValue(html, [() => bySelectorClass(html, 'jobs-description-content__text'), () => bySelectorClass(html, 'show-more-less-html__markup'), () => bySelectorId(html, 'job-details')]);

  if (!role && !company && !description) {
    return {
      error: 'LinkedIn content could not be fetched. Paste the job description manually.',
      job: normalizeJob({ source_url: sourceUrl, source_platform: 'LinkedIn', raw_text: raw, capture_method: 'manual_url' }),
    };
  }

  return { job: normalizeJob({ company, role_title: role, location, job_description: description || raw, source_url: sourceUrl, source_platform: 'LinkedIn', raw_text: raw, capture_method: 'manual_url' }) };
}

function parsePlatformHtml(html: string, sourceUrl: string, platform: string): ParseResult {
  const raw = stripHtml(html);
  const jsonLd = parseJsonLdJobPosting(html);
  if (jsonLd) return { job: normalizeJob({ ...jsonLd, source_url: sourceUrl, source_platform: platform, raw_text: raw, capture_method: 'manual_url' }) };

  const role = firstHtmlValue(html, [() => bySelectorClass(html, 'app-title'), () => bySelectorClass(html, 'posting-headline'), () => bySelectorClass(html, 'job-title'), () => metaContent(html, 'og:title'), () => stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')]);
  const company = firstHtmlValue(html, [() => bySelectorClass(html, 'company-name'), () => bySelectorClass(html, 'company'), () => metaContent(html, 'og:site_name')]);
  const location = firstHtmlValue(html, [() => bySelectorClass(html, 'location'), () => bySelectorClass(html, 'job-location'), () => bySelectorClass(html, 'posting-categories')]);
  const description = firstHtmlValue(html, [() => bySelectorClass(html, 'content'), () => bySelectorClass(html, 'job-description'), () => bySelectorId(html, 'content'), () => bySelectorId(html, 'job-description')]);

  return { job: normalizeJob({ company, role_title: role, location, job_description: description || raw, source_url: sourceUrl, source_platform: platform, raw_text: raw, capture_method: 'manual_url' }) };
}

export function parseJobHtml(html = '', sourceUrl = ''): ParseResult {
  const platform = detectSourcePlatform(sourceUrl);
  if (platform === 'LinkedIn') return parseLinkedInHtml(html, sourceUrl);
  if (['Workday', 'Greenhouse', 'Lever', 'Ashby'].includes(platform)) return parsePlatformHtml(html, sourceUrl, platform);

  const raw = stripHtml(html);
  const jsonLd = parseJsonLdJobPosting(html);
  if (jsonLd) return { job: normalizeJob({ ...jsonLd, source_url: sourceUrl, source_platform: platform, raw_text: raw, capture_method: 'manual_url' }) };

  const title = firstHtmlValue(html, [() => bySelectorClass(html, 'job-title'), () => bySelectorClass(html, 'posting-headline'), () => stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''), () => metaContent(html, 'og:title'), () => stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')]);
  const description = metaContent(html, 'og:description') || firstHtmlValue(html, [() => bySelectorClass(html, 'job-description'), () => bySelectorId(html, 'job-description'), () => bySelectorClass(html, 'description')]) || raw;

  return { job: normalizeJob({ company: metaContent(html, 'og:site_name'), role_title: title, job_description: description, location: bySelectorClass(html, 'location'), source_url: sourceUrl, source_platform: platform, raw_text: raw, capture_method: 'manual_url' }) };
}

export function mergeUrlAndText(urlJob: Partial<ParsedJob>, manualText: string, sourceUrl = ''): ParsedJob {
  const textJob = parseManualText(manualText, sourceUrl);
  return normalizeJob({
    ...urlJob,
    ...textJob,
    source_url: sourceUrl || urlJob.source_url,
    source_platform: detectSourcePlatform(sourceUrl || urlJob.source_url),
    raw_text: textJob.raw_text,
    job_description: textJob.job_description,
    capture_method: 'manual_url',
  });
}
