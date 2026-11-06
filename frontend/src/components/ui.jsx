import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { isImage, isPdf, useViewer } from '../lib/viewer';

/* Colour code per section, like the coloured zones of a building guidance system. */
export const CATEGORY_COLOR = {
  news: 'var(--brand)', events: 'var(--signal)', people: '#8a9fe0', products: '#c08a2c',
  rules: 'var(--muted)', safety: 'var(--safe)', cyber: 'var(--alert)', knowhow: '#1595a3',
};

export function CategoryTag({ category, className = '' }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium text-muted ${className}`}>
      <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CATEGORY_COLOR[category] }} />
      {t(`cat_${category}`)}
    </span>
  );
}

const AVATAR_TONES = ['#1f4fd1', '#1e8a5b', '#c08a2c', '#8a5cc7', '#c23a28', '#1595a3'];

export function Avatar({ person, size = 40, className = '' }) {
  const name = person?.full_name || person?.username || '?';
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden style={{ ...style, background: tone }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${className}`}>
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
    primary: 'bg-brand text-white hover:bg-brand-strong dark:text-[#0e151e]',
    ghost: 'text-ink hover:bg-surface-2',
    outline: 'border border-line text-ink hover:bg-surface-2',
    danger: 'text-alert hover:bg-surface-2',
  };
  return (
    <button type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
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

export const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none';

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
      className={`m-auto w-[calc(100%-2rem)] ${{ md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', full: 'max-w-6xl' }[size]} card max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 text-ink shadow-2xl backdrop:bg-black/40 open:flex`}>
      <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-md p-1 text-muted hover:bg-surface-2">
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
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[1.25rem] font-semibold leading-tight">{children}</h2>
      {action}
    </div>
  );
}

/** "Draft" or "Scheduled for …" marker for editors. */
export function StatusBadge({ article }) {
  const { t, fmtDate } = useI18n();
  if (!article.published) return <span className="rounded-md bg-signal px-1.5 text-sm font-medium text-[#15171c]">{t('draft')}</span>;
  if (article.scheduled) {
    return (
      <span className="rounded-md bg-brand-soft px-1.5 text-sm font-medium text-brand">
        {t('scheduled_for', { date: fmtDate(article.published_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
      </span>
    );
  }
  return null;
}

export function relativeDay(t, value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  return t('days_ago', { n: days });
}
