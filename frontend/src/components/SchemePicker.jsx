import { useI18n } from '../lib/i18n';

export const SCHEMES = ['hafen', 'signal', 'meer', 'indigo', 'nordsee', 'fjord', 'azur', 'marine'];

function Swatch({ id }) {
  return (
    <span className="flex h-9 overflow-hidden rounded-lg border border-line">
      {[0, 1, 2, 3].map((i) => <span key={i} className="flex-1" style={{ background: `var(--swatch-${id}-${i})` }} />)}
    </span>
  );
}

/** Colour scheme cards. `companyDefault` adds a first card "company standard" (value '') showing the admin's scheme. */
export default function SchemePicker({ value, onChange, companyDefault }) {
  const { t } = useI18n();
  const options = companyDefault ? ['', ...SCHEMES] : SCHEMES;
  return (
    <div role="radiogroup" aria-label={t('cs_title')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((id) => {
        const active = (value || '') === id;
        const shown = id || companyDefault;
        return (
          <button key={id || 'default'} type="button" role="radio" aria-checked={active} onClick={() => onChange(id)}
            className={`rounded-xl border bg-surface p-3 text-left transition-colors hover:border-rule-strong ${active ? 'border-ink ring-1 ring-ink' : 'border-line'}`}>
            <Swatch id={shown} />
            <span className="mt-2 block font-display font-semibold text-ink">{id ? t(`cs_${id}`) : t('cs_company')}</span>
            <span className="block text-sm text-muted">{id ? t(`cs_${id}_hint`) : t('cs_company_hint', { name: t(`cs_${companyDefault}`) })}</span>
          </button>
        );
      })}
    </div>
  );
}
