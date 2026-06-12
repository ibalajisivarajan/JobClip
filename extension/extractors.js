(function () {
  const MAX_RAW_TEXT = 50000;
  const MAX_DESCRIPTION = 30000;

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function cleanInline(value) {
    return cleanText(value).replace(/\s+/g, ' ').trim();
  }

  function text(selector, root = document) {
    try {
      return cleanInline(root.querySelector(selector)?.textContent || '');
    } catch {
      return '';
    }
  }

  function allText(selector, root = document) {
    try {
      return [...root.querySelectorAll(selector)]
        .map((node) => cleanInline(node.textContent || ''))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function meta(name) {
    return (
      document
        .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
        ?.getAttribute('content')
        ?.trim() || ''
    );
  }

  function firstText(selectors, root = document) {
    for (const selector of selectors) {
      const value = text(selector, root);
      if (value) return value;
    }
    return '';
  }

  function bodyText() {
    return cleanText(document.body?.innerText || '').slice(0, MAX_RAW_TEXT);
  }

  function sourcePlatform() {
    const host = location.hostname.replace(/^www\./, '');
    if (host.includes('linkedin.')) return 'LinkedIn';
    if (host.includes('greenhouse.io')) return 'Greenhouse';
    if (host.includes('lever.co')) return 'Lever';
    if (host.includes('workday') || host.includes('myworkdayjobs')) return 'Workday';
    if (host.includes('ashbyhq.com')) return 'Ashby';
    if (host.includes('indeed.com')) return 'Indeed';
    if (host.includes('glassdoor.com')) return 'Glassdoor';
    return host;
  }

  function unique(values) {
    return [...new Set(values.map(cleanInline).filter(Boolean))];
  }

  function rejectNoise(value) {
    const v = cleanInline(value);
    if (!v) return '';

    return v
      .replace(/\bCompany logo\b/gi, '')
      .replace(/\bView company page\b/gi, '')
      .replace(/\bView company\b/gi, '')
      .replace(/\bCompany page\b/gi, '')
      .replace(/\bVerified\b/gi, '')
      .replace(/\bPromoted\b/gi, '')
      .replace(/\bActively recruiting\b/gi, '')
      .replace(/\bBe an early applicant\b/gi, '')
      .replace(/\bEasy Apply\b/gi, '')
      .replace(/\bApply\b/gi, '')
      .replace(/\bFollow\b/gi, '')
      .replace(/\b\d[\d,.\s]* followers?\b/gi, '')
      .replace(/\b\d[\d,.\s]* employees?\b/gi, '')
      .replace(/\s*[·•|]\s*$/, '')
      .replace(/^\s*[·•|]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSentenceLike(value) {
    const v = cleanInline(value);
    return v.length > 90 || /[.!?].+[.!?]/.test(v) || v.split(' ').length > 12;
  }

  function looksLikeLocation(value) {
    const v = cleanInline(value);
    if (!v) return false;
    return (
      /\b(remote|hybrid|on-site|onsite)\b/i.test(v) ||
      /\b(united states|canada|india|uk|u\.s\.|usa)\b/i.test(v) ||
      /,\s*[A-Z]{2}\b/.test(v) ||
      /,\s*(United States|Canada|India|United Kingdom)\b/i.test(v) ||
      /\b(toronto|vancouver|seattle|new york|san francisco|austin|dallas|boston|chicago|atlanta|los angeles|redmond|bellevue|mountain view|sunnyvale|remote)\b/i.test(v)
    );
  }

  function isValidCompany(value, title = '') {
    const v = rejectNoise(value);
    if (!v) return false;
    if (v.length < 2 || v.length > 80) return false;
    if (title && v.toLowerCase() === cleanInline(title).toLowerCase()) return false;
    if (isSentenceLike(v)) return false;
    if (/^(remote|hybrid|on-site|onsite|full-time|part-time|contract|temporary|internship)$/i.test(v)) return false;
    if (/^(jobs|job|careers|career|hiring|recruiting|applicants?|posted|reposted)$/i.test(v)) return false;
    if (/linkedin/i.test(v) && !/linkedin/i.test(location.hostname) && v.toLowerCase() !== 'linkedin') return false;
    if (looksLikeLocation(v) && !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(v)) return false;
    return true;
  }

  function cleanCompany(value, title = '') {
    const cleaned = rejectNoise(value)
      .replace(/\s*[·•|]\s*(Remote|Hybrid|On-site|Onsite).*$/i, '')
      .replace(/\s*[·•|]\s*(United States|Canada|India|Toronto|Vancouver|Seattle|New York|San Francisco).*$/i, '')
      .replace(/\s+-\s+.*$/, '')
      .trim();

    return isValidCompany(cleaned, title) ? cleaned : '';
  }

  function cleanTitle(value) {
    return cleanInline(value)
      .replace(/\s*\|\s*LinkedIn.*$/i, '')
      .replace(/\s*-\s*LinkedIn.*$/i, '')
      .replace(/\s+with verification.*$/i, '')
      .replace(/\s+Easy Apply.*$/i, '')
      .replace(/\s+Apply.*$/i, '')
      .trim();
  }

  function detectRemote(value) {
    const haystack = String(value || '').toLowerCase();
    if (/\bhybrid\b/.test(haystack)) return 'Hybrid';
    if (/\bremote\b/.test(haystack)) return 'Remote';
    if (/\bon[-\s]?site\b|\bonsite\b/.test(haystack)) return 'On-site';
    return '';
  }

  function detectEmploymentType(value) {
    const haystack = String(value || '').toLowerCase();
    const mapping = [
      ['Full-time', /\bfull[-\s]?time\b/],
      ['Part-time', /\bpart[-\s]?time\b/],
      ['Contract', /\bcontract\b|\bcontractor\b|\bc2c\b|\bw2\b/],
      ['Temporary', /\btemporary\b|\btemp\b/],
      ['Internship', /\binternship\b|\bintern\b/],
      ['Freelance', /\bfreelance\b/],
    ];

    return mapping.find(([, regex]) => regex.test(haystack))?.[0] || '';
  }

  function detectSalary(value) {
    const textValue = cleanInline(value);
    const patterns = [
      /(?:US\$|USD\s*|\$)\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:-|–|to)\s?(?:US\$|USD\s*|\$)?\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:\/?\s?(?:year|yr|hour|hr|month|mo)|per\s+(?:year|hour|month)|annually|hourly)?/i,
      /(?:CA\$|CAD\s*)\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:-|–|to)\s?(?:CA\$|CAD\s*)?\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:\/?\s?(?:year|yr|hour|hr|month|mo)|per\s+(?:year|hour|month)|annually|hourly)?/i,
      /(?:US\$|USD\s*|\$)\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:\/?\s?(?:year|yr|hour|hr|month|mo)|per\s+(?:year|hour|month)|annually|hourly)/i,
      /(?:CA\$|CAD\s*)\s?\d{2,3}(?:,\d{3})?(?:\.\d+)?\s?(?:k|K)?\s?(?:\/?\s?(?:year|yr|hour|hr|month|mo)|per\s+(?:year|hour|month)|annually|hourly)/i,
    ];

    for (const pattern of patterns) {
      const match = textValue.match(pattern);
      if (match?.[0]) return cleanInline(match[0]);
    }

    return '';
  }

  function detectVisa(value) {
    const lines = cleanText(value)
      .split('\n')
      .map(cleanInline)
      .filter((line) => /visa|sponsor|sponsorship|work authorization|authorized to work/i.test(line));

    return unique(lines).slice(0, 3).join('\n').slice(0, 1000);
  }

  function extractPostedDate(value) {
    const textValue = cleanInline(value);
    const patterns = [
      /\b(?:Posted|Reposted)\s+(?:just now|today|yesterday|\d+\s+(?:minute|hour|day|week|month)s?\s+ago)\b/i,
      /\b(?:just now|today|yesterday|\d+\s+(?:minute|hour|day|week|month)s?\s+ago)\b/i,
    ];

    for (const pattern of patterns) {
      const match = textValue.match(pattern);
      if (match?.[0]) return cleanInline(match[0]);
    }

    return '';
  }

  function parseJsonLdJobPosting() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];

    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const candidates = [];
        const stack = Array.isArray(parsed) ? [...parsed] : [parsed];

        while (stack.length) {
          const item = stack.shift();
          if (!item || typeof item !== 'object') continue;
          candidates.push(item);
          if (Array.isArray(item['@graph'])) stack.push(...item['@graph']);
        }

        const job = candidates.find((item) => {
          const type = item?.['@type'];
          return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
        });

        if (!job) continue;

        const locationValue = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
        const address = locationValue?.address || {};
        const cityRegion = [address.addressLocality, address.addressRegion, address.addressCountry]
          .filter(Boolean)
          .join(', ');

        const salaryValue =
          job.baseSalary?.value?.value ||
          job.baseSalary?.value?.minValue ||
          job.baseSalary?.value?.maxValue ||
          '';

        return {
          company: job.hiringOrganization?.name || '',
          role_title: job.title || '',
          job_description: cleanText(String(job.description || '').replace(/<[^>]*>/g, ' ')),
          location: cityRegion || job.applicantLocationRequirements?.name || '',
          remote_hybrid: job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '',
          employment_type: Array.isArray(job.employmentType) ? job.employmentType.join(', ') : job.employmentType || '',
          posted_date: job.datePosted || '',
          salary: salaryValue ? String(salaryValue) : '',
        };
      } catch (error) {
        console.debug('JobClip ignored invalid JSON-LD', error);
      }
    }

    return null;
  }

  function topCardText() {
    const selectors = [
      '.job-details-jobs-unified-top-card',
      '.jobs-unified-top-card',
      '.jobs-details-top-card',
      '.top-card-layout',
      'main',
    ];

    for (const selector of selectors) {
      const value = cleanText(document.querySelector(selector)?.innerText || '');
      if (value) return value;
    }

    return '';
  }

  function extractLinkedInTitle(raw) {
    const title =
      firstText([
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title h1',
        '.jobs-unified-top-card__job-title',
        '.top-card-layout__title',
        'h1',
      ]) ||
      cleanInline(document.title.split('|')[0] || document.title.split(' - ')[0] || '');

    return cleanTitle(title || raw.split('\n')[0] || '');
  }

  function extractLinkedInCompany(title, raw) {
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      '.jobs-details-top-card__company-url',
      '.topcard__org-name-link',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      'a[href*="/company/"]',
    ];

    const candidates = [];

    for (const selector of selectors) {
      candidates.push(...allText(selector));
    }

    const top = topCardText();
    const topLines = top
      .split('\n')
      .map(cleanInline)
      .filter(Boolean);

    for (let index = 0; index < topLines.length; index += 1) {
      const line = topLines[index];
      if (title && line.toLowerCase().includes(title.toLowerCase())) {
        candidates.push(topLines[index + 1] || '');
        candidates.push(topLines[index + 2] || '');
      }
    }

    const rawLines = cleanText(raw)
      .split('\n')
      .map(cleanInline)
      .filter(Boolean);

    for (let index = 0; index < Math.min(rawLines.length, 25); index += 1) {
      const line = rawLines[index];
      if (title && line.toLowerCase().includes(title.toLowerCase())) {
        candidates.push(rawLines[index + 1] || '');
        candidates.push(rawLines[index + 2] || '');
      }
    }

    for (const candidate of unique(candidates)) {
      const cleaned = cleanCompany(candidate, title);
      if (cleaned) return cleaned;
    }

    return '';
  }

  function extractLinkedInLocation(title, company, raw) {
    const candidates = [];

    const selectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__primary-description-container span',
      '.jobs-unified-top-card__subtitle-primary-grouping span',
      '.topcard__flavor--bullet',
      '.topcard__flavor',
    ];

    for (const selector of selectors) {
      candidates.push(...allText(selector));
    }

    const topLines = topCardText()
      .split('\n')
      .map(cleanInline)
      .filter(Boolean);

    candidates.push(...topLines.slice(0, 12));

    for (const candidate of unique(candidates)) {
      let value = rejectNoise(candidate);

      if (!value) continue;
      if (title && value.toLowerCase().includes(title.toLowerCase())) continue;
      if (company && value.toLowerCase() === company.toLowerCase()) continue;
      if (/followers?|employees?|applicants?|posted|reposted|promoted|actively recruiting/i.test(value)) continue;

      value = value
        .replace(/\b(Remote|Hybrid|On-site|Onsite)\b/gi, '')
        .replace(/\s*[·•|]\s*/g, ', ')
        .replace(/,\s*,/g, ',')
        .replace(/^,\s*|\s*,$/g, '')
        .trim();

      if (looksLikeLocation(value)) {
        return value;
      }
    }

    const rawMatch = cleanText(raw).match(
      /\b([A-Z][A-Za-z .'-]+,\s*(?:[A-Z]{2}|Ontario|British Columbia|California|Washington|New York|Texas|Canada|United States|USA|India)(?:,\s*(?:Canada|United States|USA|India))?)\b/
    );

    return rawMatch?.[1] ? cleanInline(rawMatch[1]) : '';
  }

  function extractLinkedInDescription(raw) {
    const selectors = [
      '#job-details',
      '.jobs-description__content .jobs-box__html-content',
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.show-more-less-html__markup',
      '[data-test-job-description]',
    ];

    let description = firstText(selectors);

    if (!description) {
      const rawLines = cleanText(raw).split('\n');
      const startIndex = rawLines.findIndex((line) => /^about the job$/i.test(cleanInline(line)) || /^job description$/i.test(cleanInline(line)));
      if (startIndex >= 0) {
        description = rawLines.slice(startIndex + 1).join('\n');
      }
    }

    if (!description) return '';

    const stopPhrases = [
      'Similar jobs',
      'People also viewed',
      'Recommended jobs',
      'More jobs',
      'LinkedIn Premium',
      'Set alert',
      'Job alert',
      'About the company',
      'Company size',
      'Show more jobs',
      'See who',
      'Sign in to create job alert',
    ];

    let cleaned = cleanText(description);

    for (const phrase of stopPhrases) {
      const index = cleaned.toLowerCase().indexOf(phrase.toLowerCase());
      if (index > 300) {
        cleaned = cleaned.slice(0, index);
      }
    }

    cleaned = cleaned
      .split('\n')
      .map(cleanInline)
      .filter((line) => {
        if (!line) return false;
        if (/^(apply|easy apply|save|share|follow|show more|show less)$/i.test(line)) return false;
        if (/^\d+\s+applicants?$/i.test(line)) return false;
        if (/^Posted|^Reposted/i.test(line)) return false;
        return true;
      })
      .join('\n');

    return cleanText(cleaned);
  }

  function extractLinkedInPostedDate(raw) {
    const values = [
      ...allText('.job-details-jobs-unified-top-card__primary-description-container *'),
      ...allText('.jobs-unified-top-card *'),
      topCardText(),
      raw,
    ];

    for (const value of values) {
      const posted = extractPostedDate(value);
      if (posted) return posted;
    }

    return '';
  }

  function extractLinkedInSalary(raw) {
    const values = [
      ...allText('.job-details-jobs-unified-top-card__job-insight *'),
      ...allText('.jobs-unified-top-card__job-insight *'),
      ...allText('[class*="salary"]'),
      ...allText('[class*="compensation"]'),
      raw,
    ];

    for (const value of values) {
      const salary = detectSalary(value);
      if (salary) return salary;
    }

    return '';
  }

  function parseLinkedIn() {
    const raw = bodyText();
    const top = topCardText();

    const title = extractLinkedInTitle(raw);
    const company = extractLinkedInCompany(title, raw);
    const locationValue = extractLinkedInLocation(title, company, raw);
    const description = extractLinkedInDescription(raw) || raw;
    const combined = `${top}\n${description}\n${raw}`;

    return normalizeJob({
      company,
      role_title: title,
      job_description: description,
      location: locationValue,
      remote_hybrid: detectRemote(top) || detectRemote(combined),
      employment_type: detectEmploymentType(top) || detectEmploymentType(combined),
      posted_date: extractLinkedInPostedDate(raw),
      salary: extractLinkedInSalary(raw),
      raw_text: raw,
    });
  }

  function parseGeneric() {
    const raw = bodyText();
    const jsonLd = parseJsonLdJobPosting();

    const common = {
      company:
        firstText([
          '[data-testid*="company"]',
          '[class*="company-name"]',
          '[class*="companyName"]',
          '[class*="employer"]',
          '[data-qa="job-company"]',
          '[data-automation-id="jobPostingHeader"] h4',
          '.main-header-company',
          '.company-name',
          '.company',
          '[class*="company"]',
        ]) || meta('og:site_name'),

      role_title:
        firstText([
          '[data-testid*="job-title"]',
          '[data-testid*="title"]',
          '[class*="job-title"]',
          '[class*="jobTitle"]',
          '[data-qa="job-title"]',
          '[data-automation-id="jobPostingHeader"] h2',
          '.posting-headline h2',
          'h1',
        ]) ||
        meta('og:title') ||
        document.title,

      job_description:
        firstText([
          '[data-testid*="description"]',
          '[class*="job-description"]',
          '[class*="jobDescription"]',
          '#job-description',
          '[data-qa="job-description"]',
          '[data-automation-id="jobPostingDescription"]',
          '.posting-description',
          '.posting-page-content',
          '#content',
          'main',
        ]) || raw,

      location: firstText([
        '[data-testid*="location"]',
        '[class*="job-location"]',
        '[data-qa="job-location"]',
        '[data-automation-id="locations"]',
        '.posting-categories .location',
        '.job-location',
        '.location',
        '[class*="location"]',
      ]),

      remote_hybrid: '',
      employment_type: '',
      posted_date: '',
      salary: '',
    };

    return normalizeJob({ ...(jsonLd || common), raw_text: raw });
  }

  function normalizeJob(job) {
    const raw = job.raw_text || bodyText();
    const description = cleanText(job.job_description || raw);
    const combined = `${job.role_title || ''}\n${job.company || ''}\n${job.location || ''}\n${description}\n${raw}`;

    return {
      company: cleanCompany(job.company || '', job.role_title || '') || '',
      role_title: cleanTitle(job.role_title || ''),
      job_description: description.slice(0, MAX_DESCRIPTION),
      location: cleanInline(job.location || ''),
      remote_hybrid: job.remote_hybrid || detectRemote(combined),
      employment_type: job.employment_type || detectEmploymentType(combined),
      posted_date: cleanInline(job.posted_date || extractPostedDate(combined)),
      salary: cleanInline(job.salary || detectSalary(combined)),
      visa_sponsorship_clue: job.visa_sponsorship_clue || detectVisa(combined),
      source_url: location.href,
      source_platform: sourcePlatform(),
      raw_text: raw,
      captured_at: new Date().toISOString(),
    };
  }

  window.JobClipExtractors = {
    extract() {
      if (location.hostname.includes('linkedin.')) return parseLinkedIn();
      return parseGeneric();
    },
  };
})();
