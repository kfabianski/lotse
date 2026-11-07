import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { CalendarDays, HardHat, Lightbulb, MapPin, Newspaper, Package, Pin, Scale, ShieldCheck, Users, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { isImage, isPdf, useViewer } from '../lib/viewer';

/* Sections are told apart by their name, not by colour: one accent on the whole page. */
export const CATEGORY_COLOR = {
  news: 'var(--ink)', events: 'var(--ink)', people: 'var(--ink)', products: 'var(--ink)',
  rules: 'var(--ink)', safety: 'var(--ink)', cyber: 'var(--ink)', knowhow: 'var(--ink)',
};

/* One icon per section, so a section is found at a glance. */
export const CATEGORY_ICON = {
  news: Newspaper, events: CalendarDays, people: Users, products: Package,
  rules: Scale, safety: HardHat, cyber: ShieldCheck, knowhow: Lightbulb,
};

export function CategoryTag({ category, className = '', iconClass = 'text-brand-text' }) {
  const { t } = useI18n();
  const Icon = CATEGORY_ICON[category] || Newspaper;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium text-muted ${className}`}>
      <Icon size={14} strokeWidth={2} aria-hidden className={`shrink-0 ${iconClass}`} />
      {t(`cat_${category}`)}
    </span>
  );
}

export function Avatar({ person, size = 40, className = '' }) {
  const name = person?.full_name || person?.username || '?';
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-display font-semibold text-ink ${className}`}>
      {initials}
    </span>
  );
}

export function Markdown({ source }) {
  const { open } = useViewer();
  const html = DOMPurify.sanitize(marked.parse(source || '', { gfm: true, breaks: false }));
  // Links to PDFs or images open in the portal's viewer; other links behave normally.
  const onClick = (e) => {
    const a = e.target.closest('a');
    const href = a?.getAttribute('href') || '';
    if (!a || !(isPdf(href) || isImage(href)) || /^https?:/i.test(href) && !href.startsWith(window.location.origin)) return;
    e.preventDefault();
    open([{ url: href, name: a.textContent || href.split('/').pop(), kind: isPdf(href) ? 'pdf' : 'image' }]);
  };
  // eslint-disable-next-line react/no-danger, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  return <div className="prose-lotse" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'border border-brand bg-brand text-brand-ink hover:border-brand-strong hover:bg-brand-strong active:bg-brand-strong',
    ghost: 'border border-transparent text-ink hover:bg-surface-2 active:bg-well',
    outline: 'border border-rule-strong bg-surface text-ink hover:bg-surface-2 active:bg-well',
    danger: 'border border-transparent text-alert hover:bg-surface-2 active:bg-well',
  };
  return (
    <button type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 font-display text-[0.9375rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props} />
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass = 'min-h-10 w-full rounded-sm border border-muted bg-surface px-3 py-2 text-ink placeholder:text-muted focus:border-ink disabled:cursor-not-allowed disabled:opacity-60';

/** Dialog: one scroll area (the body) – the header stays put and the <dialog> itself never scrolls.
 *  size: 'md' (default), 'lg', 'xl' or 'full'; `wide` is kept as an alias for 'xl'. */
export function Modal({ title, onClose, children, wide = false, size = wide ? 'xl' : 'md' }) {
  const ref = useRef(null);
  const { t } = useI18n();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }}
      className={`m-auto w-[calc(100%-2rem)] ${{ md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', full: 'max-w-6xl' }[size]} card max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 text-ink backdrop:bg-scrim/50 open:flex`}>
      <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-sm p-1 text-muted hover:bg-surface-2 hover:text-ink">
          <X size={20} />
        </button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-muted">
      <p>{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHeading({ children, action }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <h2 className="font-display text-[1.44rem] font-semibold leading-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** "Draft" or "Scheduled for …" marker for editors. */
export function StatusBadge({ article }) {
  const { t, fmtDate } = useI18n();
  let state = null;
  if (!article.published) state = <span className="rounded-sm border border-ink px-1.5 text-sm font-medium text-ink">{t('draft')}</span>;
  else if (article.scheduled) {
    state = (
      <span className="rounded-sm bg-brand-soft px-1.5 text-sm font-medium text-ink">
        {t('scheduled_for', { date: fmtDate(article.published_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
      </span>
    );
  }
  const branches = article.branches || [];
  return (
    <>
      {state}
      {article.pinned_now && <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-text"><Pin size={13} aria-hidden />{t('pinned_badge')}</span>}
      {branches.length > 0 && (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-muted">
          <MapPin size={13} aria-hidden />{t('br_only', { names: branches.map((b) => b.name).join(', ') })}
        </span>
      )}
    </>
  );
}

export function relativeDay(t, value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  return t('days_ago', { n: days });
}
