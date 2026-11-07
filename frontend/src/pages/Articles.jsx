import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, HardHat, Lightbulb, Newspaper, Package, PenLine, Scale, ShieldCheck, Users } from 'lucide-react';
import { CATEGORY_COLOR, CategoryTag, Empty, StatusBadge, relativeDay } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';

const CATEGORY_ICON = {
  news: Newspaper, events: CalendarDays, people: Users, products: Package,
  rules: Scale, safety: HardHat, cyber: ShieldCheck, knowhow: Lightbulb,
};

/** Same-size cover for every article: its picture, or a panel in the section colour with the section icon. */
export function ArticleCover({ article, className = '' }) {
  const { t } = useI18n();
  if (article.image_url) return <img src={article.image_url} alt="" className={`w-full object-cover ${className}`} />;
  const Icon = CATEGORY_ICON[article.category] || Newspaper;
  const color = CATEGORY_COLOR[article.category];
  return (
    <div aria-hidden className={`relative flex w-full items-end overflow-hidden p-5 text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #0d0f13))` }}>
      <Icon size={110} strokeWidth={1.25} className="absolute -right-3 -top-3 opacity-20" />
      <span className="text-sm font-medium text-white/90">{t(`cat_${article.category}`)}</span>
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
          <h2 className="mt-1.5 line-clamp-2 text-[1.1rem] font-semibold leading-snug tracking-tight group-hover:text-brand">{loc(a, 'title')}</h2>
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
        <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-tight group-hover:text-brand">{loc(a, 'title')}</h2>
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
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-strong dark:text-[#0e151e]">
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
              className={`rounded-full border px-4 py-1.5 font-medium transition-colors ${
                active ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'}`}>
              {cat ? <CategoryTag category={cat} className={active ? '!text-surface' : ''} /> : t('all')}
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
