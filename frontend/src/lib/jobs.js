/** Stellenangebote: employment types (must match JOB_TYPES in backend/app/models.py) and small helpers. */
export const JOB_TYPES = ['full', 'part', 'mini', 'apprentice', 'intern', 'other'];

/** Title in the reader's language (German is the fallback). */
export const jobTitle = (j, lang) => (lang === 'en' && j.title_en) || j.title_de;

/** "Vollzeit · Versand · Hamburg" - the facts line under a title. */
export function jobFacts(t, j) {
  return [t(`job_type_${j.employment}`), j.hours, j.department, j.branch].filter(Boolean).join(' · ');
}
