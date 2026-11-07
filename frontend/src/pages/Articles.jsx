import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, LayoutGrid, Newspaper, PenLine } from 'lucide-react';
import { CATEGORY_ICON, CategoryTag, Empty, StatusBadge, relativeDay } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';

/** Same-size cover for every article: its picture, or a soft panel with the section icon, the section and the date. */
export function ArticleCover({ article, className = '' }) {
  const { t, fmtDate } = useI18n();
  if (article.image_url) return <img src={article.image_url} alt="" className={`w-full object-cover ${className}`} />;
  const when = article.event_date || article.published_at;
  const Icon = CATEGORY_ICON[article.category] || Newspaper;
  return (
    <div aria-hidden className={`flex w-full items-end justify-between gap-4 bg-brand-soft px-5 py-4 ${className}`}>
      <span>
        {when && <span className="block capitalize text-muted">{fmtDate(when, { weekday: 'long' })}</span>}
        {when && <span className="block font-display text-[1.5rem] font-semibold leading-tight text-ink">{fmtDate(when, { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
      </span>
      <Icon size={40} strokeWidth={1.5} className="shrink-0 text-brand-text" />
    </div>
  );
}

function ArticleMeta({ a }) {
  const { t, fmtDate } = useI18n();
  if (a.event_date) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-ink">
        <CalendarDays size={15} />{fmtDate(a.event_date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  return a.scheduled ? null : relativeDay(t, a.published_at);
}

function ArticleTile({ a }) {
  const { loc } = useI18n();
  return (
    <li>
      <Link to={`/articles/${a.id}`} className="card card-hover group flex h-full flex-col overflow-hidden">
        <ArticleCover article={a} className="aspect-[16/9]" />
        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <CategoryTag category={a.category} />
            <StatusBadge article={a} />
          </div>
          <h2 className="mt-1.5 line-clamp-2 min-h-[2.75em] text-[1.1rem] font-semibold leading-snug tracking-tight text-ink group-hover:text-brand-text">{loc(a, 'title')}</h2>
          <p className="mt-1.5 line-clamp-3 text-muted">{loc(a, 'summary')}</p>
          <p className="mt-auto pt-4 text-sm text-muted"><ArticleMeta a={a} /></p>
        </div>
      </Link>
    </li>
  );
}

/** The newest article as a wide card above the grid. */
function LeadArticle({ a }) {
  const { loc } = useI18n();
  return (
    <Link to={`/articles/${a.id}`} className="card card-hover group grid overflow-hidden md:grid-cols-2">
      <ArticleCover article={a} className="aspect-[16/9] h-full md:aspect-auto md:min-h-[300px]" />
      <div className="flex flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CategoryTag category={a.category} />
          <StatusBadge article={a} />
        </div>
        <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight group-hover:text-brand-text">{loc(a, 'title')}</h2>
        <p className="mt-3 line-clamp-4 text-[1.05rem] text-muted">{loc(a, 'summary')}</p>
        <p className="mt-auto pt-6 text-sm text-muted"><ArticleMeta a={a} /></p>
      </div>
    </Link>
  );
}

export function ArticleGrid({ articles, lead = false }) {
  const [first, ...rest] = articles;
  const tiles = lead ? rest : articles;
  return (
    <div className="space-y-6">
      {lead && first && <LeadArticle a={first} />}
      {tiles.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((a) => <ArticleTile key={a.id} a={a} />)}
        </ul>
      )}
    </div>
  );
}

export default function Articles({ group, titleKey }) {
  const { t } = useI18n();
  const { has } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = params.get('category');
  const categories = selected && group.includes(selected) ? [selected] : group;
  const withPinned = titleKey === 'nav_news' && !selected; // Aktuelles: pinned posts of any category on top
  const { data, loading, error } = useFetch('/articles', { params: { category: categories, with_pinned: withPinned } }, `${categories.join()}-${withPinned}`);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[2rem] font-semibold leading-tight">{t(titleKey)}</h1>
        {has('content_own', 'content_all') && (
          <Link to={`/articles/new?category=${selected || group[0]}`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong">
            <PenLine size={17} />{t('new_article')}
          </Link>
        )}
      </div>
      <div role="tablist" className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">
        {[null, ...group].map((cat) => {
          const active = (cat || null) === (selected && group.includes(selected) ? selected : null);
          return (
            <button key={cat || 'all'} type="button" role="tab" aria-selected={active}
              onClick={() => setParams(cat ? { category: cat } : {})}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 py-1.5 font-medium transition-colors ${
                active ? 'border-ink bg-ink text-surface' : 'border-rule-strong bg-surface text-ink hover:border-ink'}`}>
              {cat
                ? <CategoryTag category={cat} className={`!text-[0.9375rem] ${active ? '!text-surface' : '!text-ink'}`} iconClass={active ? 'text-surface' : 'text-brand-text'} />
                : <span className="inline-flex items-center gap-1.5 text-[0.9375rem]"><LayoutGrid size={14} aria-hidden className={active ? 'text-surface' : 'text-brand-text'} />{t('all')}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-8">
        {loading && !data && <p className="text-muted">{t('loading')}</p>}
        {error && <Empty>{t('error_generic', { msg: error.message })}</Empty>}
        {data && (data.length ? <ArticleGrid articles={data} lead /> : <Empty>{t('no_articles')}</Empty>)}
      </div>
    </div>
  );
}
