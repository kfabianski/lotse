/** Jubiläen: kinds and the short label shown on the home page and in the admin list. */
export const JUBILEE_KINDS = ['service', 'birthday', 'retirement', 'other'];

/** "10 Jahre im Unternehmen", "50. Geburtstag", "Ruhestand" ... */
export function jubileeLabel(t, j) {
  if (j.kind === 'service' && j.years) return t('jb_service', { n: j.years });
  if (j.kind === 'birthday') return j.years ? t('jb_birthday_n', { n: j.years }) : t('jb_kind_birthday');
  return t(`jb_kind_${j.kind}`);
}
