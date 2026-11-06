import { Link, useSearchParams } from 'react-router-dom';
import { Avatar, Empty } from '../components/ui';
import { ArticleGrid } from './Articles';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { t } = useI18n();
  const articles = useFetch('/articles', { params: { q } }, `a:${q}`);
  const people = useFetch('/users', { params: { q } }, `u:${q}`);
  const none = articles.data?.length === 0 && people.data?.length === 0;

  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight">„{q}“</h1>
      {none && <div className="mt-8"><Empty>{t('no_results')}</Empty></div>}
      {people.data?.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-semibold">{t('nav_people')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.data.map((p) => (
              <li key={p.id}>
                <Link to={`/people?focus=${p.id}`} className="flex items-center gap-3 card p-3 hover:border-brand">
                  <Avatar person={p} size={44} />
                  <span className="min-w-0">
                    <span className="block font-medium">{p.full_name}</span>
                    <span className="block truncate text-sm text-muted">{p.department}{p.phone_ext && `, ${t('extension')} ${p.phone_ext}`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {articles.data?.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold">{t('nav_news')}</h2>
          <ArticleGrid articles={articles.data} />
        </section>
      )}
    </div>
  );
}
