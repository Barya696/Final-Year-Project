/** Mirrors backend SecuritySettings password rules so the UI can validate while typing */

export interface PasswordPolicyDTO {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
}

export interface PasswordRuleCheck {
  id: string;
  label: string;
  satisfied: boolean;
}

/** Uppercase: align with Java Character.isUpperCase for typical passwords */
function hasUppercase(pw: string): boolean {
  return [...pw].some((ch) => ch !== ch.toLowerCase() && ch === ch.toUpperCase() && /\p{L}/u.test(ch));
}

function hasDigit(pw: string): boolean {
  return /\p{N}/u.test(pw);
}

/** Not letter nor digit — same idea as Java !Character.isLetterOrDigit(ch) */
function hasSpecial(pw: string): boolean {
  return /[^\p{L}\p{N}]/u.test(pw);
}

export function evaluatePasswordAgainstPolicy(pw: string, policy: PasswordPolicyDTO): PasswordRuleCheck[] {
  const min = Math.max(0, Number(policy.minPasswordLength) || 0);
  const checks: PasswordRuleCheck[] = [
    {
      id: "length",
      label: min <= 1 ? `At least ${min} character` : `At least ${min} characters`,
      satisfied: pw.length >= min,
    },
  ];

  if (policy.requireUppercase) {
    checks.push({
      id: "uppercase",
      label: "At least one uppercase letter",
      satisfied: hasUppercase(pw),
    });
  }

  if (policy.requireNumbers) {
    checks.push({
      id: "number",
      label: "At least one number",
      satisfied: hasDigit(pw),
    });
  }

  if (policy.requireSpecialCharacters) {
    checks.push({
      id: "special",
      label: "At least one symbol (not a letter or number)",
      satisfied: hasSpecial(pw),
    });
  }

  return checks;
}

export function isPasswordAllowedByPolicy(pw: string, policy: PasswordPolicyDTO | null): boolean {
  if (!policy) return false;
  return evaluatePasswordAgainstPolicy(pw, policy).every((c) => c.satisfied);
}

/** True when server policy was loaded and the password satisfies every rule */
export function passwordMeetsPolicy(password: string, policy: PasswordPolicyDTO | null): boolean {
  return policy != null && isPasswordAllowedByPolicy(password, policy);
}

/** Outline classes for inputs while typing (green = valid / matching, red = not) */
export function newPasswordFieldOutlineClass(pw: string, passesPolicy: boolean): string {
  if (pw.length === 0) {
    return "focus:ring-slate-400 focus:border-slate-400";
  }
  if (passesPolicy) {
    return "ring-2 ring-green-600/70 border-green-700/40 focus:ring-green-600";
  }
  return "ring-2 ring-red-600/55 border-red-600/35 focus:ring-red-500";
}

export function confirmPasswordFieldOutlineClass(confirmPw: string, matches: boolean): string {
  if (confirmPw.length === 0) {
    return "border-slate-300 focus:ring-slate-400 focus:border-slate-400";
  }
  if (matches) {
    return "ring-2 ring-green-600/70 border-green-700/40 focus:ring-green-600";
  }
  return "ring-2 ring-red-600/55 border-red-600/35 focus:ring-red-500";
}
