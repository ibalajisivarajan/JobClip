export type RoleCategory =
  | 'engineering'
  | 'product'
  | 'design'
  | 'data'
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'finance'
  | 'hr'
  | 'general';

const ROLE_PATTERNS: [RoleCategory, RegExp][] = [
  ['engineering', /\b(engineer|developer|programmer|swe|devops|platform|infrastructure|fullstack|full[- ]?stack|back[- ]?end|front[- ]?end|machine.learning|data.scien|cloud|sre|site.reliability|ml\b|ai\b)\b/i],
  ['product',     /\b(product.manag|product.owner|program.manag|technical.program)\b/i],
  ['design',      /\b(designer|ux\b|ui\b|user.experience|user.interface|product.design|visual.design)\b/i],
  ['data',        /\b(data.analyst|analytics.engineer|business.intelligence|bi.analyst|reporting.analyst)\b/i],
  ['marketing',   /\b(marketing|growth.manag|seo\b|content.strateg|demand.gen|brand.manag)\b/i],
  ['sales',       /\b(account.executive|account.manag|sales.engineer|business.development|revenue|customer.success)\b/i],
  ['operations',  /\b(operations.manag|chief.of.staff|project.manag|program.coordinator|supply.chain)\b/i],
  ['finance',     /\b(financial.analyst|accounti|controller|treasurer|cfo\b|fp&a|investment)\b/i],
  ['hr',          /\b(human.resources|recruit|talent.acquisition|people.ops|hr.business|hrbp)\b/i],
];

export function detectRoleCategory(
  roleTitle: string,
  jobDescription = '',
): RoleCategory {
  const haystack = `${roleTitle} ${jobDescription.slice(0, 2000)}`;
  for (const [category, pattern] of ROLE_PATTERNS) {
    if (pattern.test(haystack)) return category;
  }
  return 'general';
}
