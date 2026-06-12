(function () {
  function text(selector, root) {
    root = root || document;
    var el = root.querySelector(selector);
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function meta(name) {
    var el = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '').trim() : '';
  }

  function firstText(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var value = text(selectors[i]);
      if (value) return value;
    }
    return '';
  }

  function bodyText() {
    return (document.body && document.body.innerText
      ? document.body.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 50000)
      : '');
  }

  function detectRemote(value) {
    var haystack = value.toLowerCase();
    if (haystack.includes('remote')) return 'Remote';
    if (haystack.includes('hybrid')) return 'Hybrid';
    if (haystack.includes('on-site') || haystack.includes('onsite')) return 'On-site';
    return '';
  }

  function detectEmploymentType(value) {
    var types = ['Full-time', 'Part-time', 'Contract', 'Contractor', 'Temporary', 'Internship', 'Freelance'];
    for (var i = 0; i < types.length; i++) {
      if (value.toLowerCase().includes(types[i].toLowerCase())) return types[i];
    }
    return '';
  }

  function detectSalary(value) {
    var match = value.match(
      /(?:CAD\s*\$|CA\$|USD\s*\$|\$|USD\s)\s*\d[\d,.]*\s*(?:[-–]\s*(?:CAD\s*\$|CA\$|USD\s*\$|\$|USD\s)?\s*\d[\d,.]*)?(?:\s*(?:K|k))?\s*(?:\/\s*(?:yr|year|hr|hour|month|mo)|a year|per year|per hour|an hour|hourly|yearly)?/i,
    );
    return match ? match[0].replace(/\s+/g, ' ').trim() : '';
  }

  function detectVisa(value) {
    var lines = value.split('\n').filter(function (line) {
      return /visa|sponsor|sponsorship|work authorization/i.test(line);
    });
    return lines.slice(0, 3).join('\n').slice(0, 1000);
  }

  function sourcePlatform() {
    var host = location.hostname.replace(/^www\./, '');
    if (host.includes('linkedin.')) return 'LinkedIn';
    if (host.includes('greenhouse.io')) return 'Greenhouse';
    if (host.includes('lever.co')) return 'Lever';
    if (host.includes('workday') || host.includes('myworkdayjobs')) return 'Workday';
    if (host.includes('indeed.com')) return 'Indeed';
    if (host.includes('glassdoor.com')) return 'Glassdoor';
    return host;
  }

  // Strip LinkedIn noise from a company candidate string.
  function cleanCompany(raw, roleTitle) {
    if (!raw) return '';
    var c = raw
      .replace(/Company\s+logo/gi, '')
      .replace(/View\s+company\s+(?:page)?/gi, '')
      .replace(/\d[\d,.]*\s*(?:followers|employees|connections)[^a-z]*/gi, '')
      .replace(/\bPromoted\b/gi, '')
      .replace(/\bActively\s+recruiting\b/gi, '')
      .replace(/\bEasy\s+Apply\b/gi, '')
      .replace(/\bApply\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!c) return '';
    if (c.length > 80) return '';
    if (roleTitle && c.toLowerCase() === roleTitle.toLowerCase()) return '';
    // Reject if it looks like a workplace/remote label
    if (/^(remote|hybrid|on-site|onsite|full-time|part-time|contract|temporary|internship|freelance)$/i.test(c)) return '';
    // Reject sentence-like text (more than 8 words)
    if (c.split(/\s+/).length > 8) return '';
    return c;
  }

  // Clean a job title — strip LinkedIn suffixes and action words.
  function cleanTitle(raw) {
    if (!raw) return '';
    return raw
      .replace(/\s*\|\s*LinkedIn\s*$/i, '')
      .replace(/\s*-\s*Easy\s+Apply\s*$/i, '')
      .replace(/\s*\(with\s+verification\)\s*$/i, '')
      .replace(/\bApply\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalize a raw posted-date phrase (keep as-is, just clean whitespace).
  function cleanPostedDate(raw) {
    if (!raw) return '';
    var c = raw.replace(/\s+/g, ' ').trim();
    // Only keep if it matches an expected relative-date or date phrase pattern
    if (/(?:posted|reposted|just\s+now|today|yesterday|\d+\s+(?:day|week|month|hour|minute)s?\s+ago)/i.test(c)) {
      return c;
    }
    return c; // return as-is even if pattern doesn't match — better than losing it
  }

  function parseJsonLdJobPosting() {
    var scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (var i = 0; i < scripts.length; i++) {
      try {
        var parsed = JSON.parse(scripts[i].textContent || '{}');
        var items = Array.isArray(parsed) ? parsed : [parsed].concat(parsed['@graph'] || []);
        var job = items.find(function (item) {
          return item && (item['@type'] === 'JobPosting' || (item['@type'] && item['@type'].includes && item['@type'].includes('JobPosting')));
        });
        if (job) {
          var locationValue = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
          return {
            company: (job.hiringOrganization && job.hiringOrganization.name) || '',
            role_title: job.title || '',
            job_description: (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            location: (locationValue && locationValue.address && (locationValue.address.addressLocality || locationValue.address.addressRegion)) ||
                      (job.applicantLocationRequirements && job.applicantLocationRequirements.name) || '',
            remote_hybrid: job.jobLocationType === 'TELECOMMUTE' ? 'Remote' : '',
            employment_type: Array.isArray(job.employmentType) ? job.employmentType.join(', ') : (job.employmentType || ''),
            posted_date: job.datePosted || '',
            salary: job.baseSalary && job.baseSalary.value && job.baseSalary.value.value
              ? String(job.baseSalary.value.value)
              : '',
          };
        }
      } catch (error) {
        console.debug('JobClip ignored invalid JSON-LD', error);
      }
    }
    return null;
  }

  function parseLinkedIn() {
    var raw = bodyText();

    // --- Title ---
    var rawTitle = firstText([
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.top-card-layout__title',
      'h1',
    ]);
    var title = cleanTitle(rawTitle) || cleanTitle(document.title.split('|')[0]) || '';

    // --- Company ---
    var company = '';
    var companySelectors = [
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
    for (var ci = 0; ci < companySelectors.length; ci++) {
      var candidate = cleanCompany(text(companySelectors[ci]), title);
      if (candidate) {
        company = candidate;
        break;
      }
    }

    // --- Location ---
    // Use the specific bullet selector first; fall back to broader metadata span.
    var location = firstText([
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
    ]);
    // If what we got looks like a workplace type, don't use it as location
    if (location && /^(remote|hybrid|on-site|onsite)$/i.test(location.trim())) {
      location = '';
    }

    // --- Remote / Hybrid ---
    var remoteHybrid = detectRemote(firstText([
      '.job-details-jobs-unified-top-card__workplace-type',
      '.jobs-unified-top-card__workplace-type',
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.jobs-unified-top-card__primary-description-container',
    ]));

    // --- Posted date ---
    var postedDate = cleanPostedDate(firstText([
      '.job-details-jobs-unified-top-card__posted-date',
      '.jobs-unified-top-card__posted-date',
      '.posted-time-ago__text',
      '.topcard__flavor--metadata .posted-time-ago__text',
    ]));

    // --- Employment type ---
    var employmentType = detectEmploymentType(firstText([
      '.job-details-jobs-unified-top-card__job-insight span',
      '.jobs-unified-top-card__job-insight span',
      '.job-details-jobs-unified-top-card__job-insight',
      '.jobs-unified-top-card__job-insight',
    ]));

    // --- Job description (do NOT fall back to raw body text for LinkedIn) ---
    // Prefer specific description container selectors; never dump the full page.
    var description = firstText([
      '#job-details',
      '.jobs-box__html-content',
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '[data-test-job-description]',
      '.job-details-jobs-unified-top-card__job-description',
    ]);

    return normalizeJob({
      company: company,
      role_title: title,
      job_description: description, // intentionally empty string if no selector matches
      location: location,
      remote_hybrid: remoteHybrid,
      employment_type: employmentType,
      posted_date: postedDate,
      raw_text: raw,
    }, { allowRawFallback: false });
  }

  function parseGeneric() {
    var raw = bodyText();
    var jsonLd = parseJsonLdJobPosting();

    var common = {
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
      ]),

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

    return normalizeJob(Object.assign({}, jsonLd || common, { raw_text: raw }));
  }

  function normalizeJob(job, options) {
    options = options || {};
    var raw = job.raw_text || bodyText();
    // For LinkedIn: never fall back to raw body text as job_description.
    // For generic: raw is acceptable when no targeted selector found.
    var description = job.job_description || (options.allowRawFallback === false ? '' : raw);
    var combined = (job.role_title || '') + '\n' + (job.company || '') + '\n' + (job.location || '') + '\n' + description + '\n' + raw;
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
    extract: function () {
      if (location.hostname.includes('linkedin.')) return parseLinkedIn();
      return parseGeneric();
    },
  };
})();
