export type RoleType = 'tpm' | 'pm' | 'scrum_master' | 'general';

/** @deprecated Use RoleType */
export type RoleCategory = RoleType;

const TPM_PATTERN =
  /\b(technical\s+program\s+manag|tpm\b|sr\.?\s+tpm\b|senior\s+tpm\b|staff\s+tpm\b|principal\s+tpm\b|engineering\s+program\s+manag|epm\b|technical\s+project\s+manag|platform\s+program\s+manag|infrastructure\s+program\s+manag|technology\s+program\s+manag|it\s+program\s+manag|software\s+program\s+manag)/i;

const SCRUM_PATTERN =
  /\b(scrum\s+master|senior\s+scrum\s+master|agile\s+coach|release\s+train\s+engineer|rte\b|safe\b|agile\s+delivery\s+lead|agile\s+lead|kanban\s+coach|iteration\s+manag|sprint\s+master)/i;

const PM_PATTERN =
  /\b(project\s+manag|program\s+manag|sr\.?\s+pm\b|senior\s+project\s+manag|senior\s+program\s+manag|delivery\s+manag|engagement\s+manag|it\s+project\s+manag|digital\s+project\s+manag|implementation\s+manag|pmo\s+(lead|manag)|portfolio\s+manag)/i;

export function detectRoleType(roleTitle: string, jobDescription = ''): RoleType {
  if (TPM_PATTERN.test(roleTitle)) return 'tpm';
  if (SCRUM_PATTERN.test(roleTitle)) return 'scrum_master';
  if (PM_PATTERN.test(roleTitle)) return 'pm';
  const desc = jobDescription.slice(0, 1000);
  if (TPM_PATTERN.test(desc)) return 'tpm';
  if (SCRUM_PATTERN.test(desc)) return 'scrum_master';
  if (PM_PATTERN.test(desc)) return 'pm';
  return 'general';
}

export const detectRoleCategory = detectRoleType;
