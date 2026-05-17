/**
 * Matches Classified.tsx / CompilationService: grade annual defaults + additive
 * override from `required` table → per-semester regulatory volume in minutes
 * (same units as weighted CM/TD/TP totals).
 */

const GRADE_ABBR: Record<string, string> = {
  ASSISTANT: "A",
  ATTACHE_UNIVERSITAIRE: "AU",
  ATTACHE: "AU",
  MAITRE_ASSISTANT: "MA",
  MAITRE_CONFERENCE: "MC",
  PROFESSEUR: "P",
  PROFESSOR: "P",
  PROFESSEUR_TITULAIRE: "PT",
};

const ANNUAL_DEFAULT_HOURS: Record<string, number> = {
  A: 200,
  AU: 200,
  MA: 200,
  MC: 180,
  P: 160,
  PT: 160,
};

export const FALLBACK_ANNUAL_HOURS = 200;

function toGradeKey(grade: string | null | undefined): string | null {
  if (!grade) return null;
  const upper = grade.toUpperCase();
  if (upper.length <= 3) return upper;
  return GRADE_ABBR[upper] ?? null;
}

export function getAnnualDefaultHours(grade: string | null | undefined): number {
  const key = toGradeKey(grade);
  return key ? (ANNUAL_DEFAULT_HOURS[key] ?? FALLBACK_ANNUAL_HOURS) : FALLBACK_ANNUAL_HOURS;
}

/**
 * Regulatory volume for one semester, in minutes.
 * @param additiveAnnualHours — additive annual hours from `required` row (same as Classified).
 */
export function getSemesterRequiredMinutesFromLecturer(
  grade: string | null | undefined,
  additiveAnnualHours: number
): number {
  const annual = getAnnualDefaultHours(grade) + (additiveAnnualHours || 0);
  return Math.round((annual / 2) * 60);
}
