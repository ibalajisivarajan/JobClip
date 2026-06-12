(function () {
  function text(selector, root = document) {
    return root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function meta(name) {
    return document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute('content')?.trim() || '';
  }

  function firstText(selectors) {
    for (const selector of selectors) {
      const value = text(selector);
      if (value) return value;
    }
    return '';
  }

  function bodyText() {
    return document.body?.innerText?.replace(/\n{3,}/g, '\n\n').trim().slice(0, 50000) || '';
  }

  function detectRemote(value) {
    const haystack = value.toLowerCase();
    if (haystack.includes('remote')) return 'Remote';
    if (haystack.includes('hybrid')) return 'Hybrid';
    if (haystack.includes('on-site') || haystack.includes('onsite')) return 'On-site';
    return '';
  }

  function detectEmploymentType(value) {
    const types = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'];
    return types.find((type) => value.toLowerCase().includes(type.toLowerCase())) || '';
  }

  function detectSalary(value) {
    const match = value.match(/(?:\$|USD\s?)\d[\d,.]*(?:\s?-\s?(?:\$|USD\s?)?\d[\d,.]*)?(?:\s?(?:a year|per year|\/year|hourly|\/hr|per hour|an hour))?/i);
    return match?.[0] || '';
  }

  function detectVisa(value) {
    const lines = value.split('\n').filter((line) => /visa|sponsor|sponsorship|work authorization/i.test(line));
    return lines.slice(0, 3).join('\n').slice(0, 1000);
  }

  function sourcePlatform() {
    const host = location.hostname.replace(/^www\./, '');
    if (host.includes('linkedin.')) return 'LinkedIn';
    if (host.includes('greenhouse.io')) return 'Greenhouse';
    if (host.includes('lever.co')) return 'Lever';
    if (host.includes('workday') || host.includes('myworkdayjobs')) return 'Workday';
    if (host.includes('indeed.com')) return 'Indeed';
    if (host.includes('glassdoor.com')) return 'Glassdoor';
    return host;
  }

  function parseJsonLdJobPosting() {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])];
        const job = items.find((item) => item?.['@type'] === 'JobPosting' || item?.['@type']?.includes?.('JobPosting'));
        if (job) {
          const locationValue = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
          return {
            company: job.hiringOrganization?.name || '',
            role_title: job.title || '',
            job_description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            location: locationValue?.address?.addressLocality || locationValue?.address?.addressRegion || job.applicantLocationRequirements?.name || '',
            remote_hybrid: job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '',
            employment_type: Array.isArray(job.employmentType) ? job.employmentType.join(', ') : job.employmentType || '',
            posted_date: job.datePosted || '',
            salary: job.baseSalary?.value?.value ? String(job.baseSalary.value.value) : '',
          };
        }
      } catch (error) {
        console.debug('JobClip ignored invalid JSON-LD', error);
      }
    }
    return null;
  }

  function parseLinkedIn() {
    const raw = bodyText();

    const title = firstText([
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.top-card-layout__title',
      'h1',
    ]);

    const company = firstText([
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '[data-tracking-control-name="public_jobs_topcard-org-name"]',
      '.top-card-layout__card .topcard__flavor--bullet',
    ]);

    const location = firstText([
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
      '.jobs-unified-top-card__primary-description-container span',
    ]);

    const description = firstText([
      '.jobs-description__content .jobs-box__html-content',
      '.job-details-jobs-unified-top-card__job-description',
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '#job-details',
    ]) || raw;

    return normalizeJob({
      company,
      role_title: title || document.title.split('|')[0]?.trim() || '',
      job_description: description,
      location,
      raw_text: raw,
    });
  }

  function parseGeneric() {
    const raw = bodyText();
    const jsonLd = parseJsonLdJobPosting();

    const common = {
      company: firstText([
        '[data-testid*="company"]',
        '[class*="company-name"]',
        '[class*="companyName"]',
        '[class*="employer"]',
        '.company',
        '.company-name',
        '[class*="company"]',
        '[data-qa="job-company"]',
        '.main-header-company',
        '[data-automation-id="jobPostingHeader"] h4',
      ]) || meta('og:site_name'),

      role_title: firstText([
        '[data-testid*="job-title"]',
        '[data-testid*="title"]',
        '[class*="job-title"]',
        '[class*="jobTitle"]',
        '.posting-headline h2',
        '[data-qa="job-title"]',
        '[data-automation-id="jobPostingHeader"] h2',
        'h1',
      ]) || meta('og:title') || document.title,

      job_description: firstText([
        '[data-testid*="description"]',
        '[class*="job-description"]',
        '[class*="jobDescription"]',
        '#job-description',
        '.posting-description',
        '#content',
        '[data-qa="job-description"]',
        '.posting-page-content',
        '[data-automation-id="jobPostingDescription"]',
        'main',
      ]) || raw,

      location: firstText([
        '[data-testid*="location"]',
        '[class*="location"]',
        '[class*="job-location"]',
        '[data-qa="job-location"]',
        '.posting-categories .location',
        '[data-automation-id="locations"]',
        '.location',
        '.job-location',
      ]),
    };

    return normalizeJob({ ...(jsonLd || common), raw_text: raw });
  }

  function normalizeJob(job) {
    const raw = job.raw_text || bodyText();
    const description = job.job_description || raw;
    const combined = `${job.role_title || ''}\n${job.company || ''}\n${job.location || ''}\n${description}\n${raw}`;
    return {
      company: job.company || '',
      role_title: job.role_title || '',
      job_description: description.slice(0, 30000),
      location: job.location || '',
      remote_hybrid: job.remote_hybrid || detectRemote(combined),
      employment_type: job.employment_type || detectEmploymentType(combined),
      posted_date: job.posted_date || '',
      salary: job.salary || detectSalary(combined),
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
