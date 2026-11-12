import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, DoorOpen, FileText, GraduationCap, Lightbulb, Link2, StickyNote } from 'lucide-react';
import { Avatar, CategoryTag, Empty } from '../components/ui';
import { QUICK_ICONS } from '../components/QuickLinks';
import { ArticleGrid } from './Articles';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';
import { useViewer } from '../lib/viewer';
import { ROOM_TYPES } from '../lib/rooms';

const docTitle = (name) => name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');

function Section({ title, count, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-baseline gap-2 font-display text-xl font-semibold">
        {title}<span className="text-sm font-normal text-muted">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/** One result row: icon, title, small grey line, optional snippet. */
function Row({ to, href, onClick, icon: Icon, color, title, meta, snippet }) {
  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-on-photo" style={{ background: color || 'var(--brand)' }}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block font-medium leading-snug">{title}</span>
        {meta && <span className="block truncate text-sm text-muted">{meta}</span>}
        {snippet && <span className="mt-1 line-clamp-2 block text-sm text-muted">{snippet}</span>}
      </span>
    </>
  );
  const cls = 'flex h-full items-start gap-3 card p-3 text-left hover:border-brand';
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (href) return <a href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noreferrer" className={cls}>{body}</a>;
  return <button type="button" onClick={onClick} className={`${cls} w-full`}>{body}</button>;
}

const grid = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { t, lang } = useI18n();
  const { open } = useViewer();
  const { data, loading } = useFetch('/search', { params: { q } }, `s:${q}`);
  const pick = (x, k) => (lang === 'en' && x[`${k}_en`]) || x[`${k}_de`];
  const total = data ? Object.values(data).reduce((n, v) => n + v.length, 0) : 0;
  const docs = data?.documents || [];
  useEffect(() => {  // statistics for the editors: which terms are searched for, and which find nothing
    if (data && q.trim().length >= 3) api('/search/log', { method: 'POST', body: { q: q.trim(), hits: total } }).catch(() => {});
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p className="text-sm text-muted">{t('search_results')}</p>
      <h1 className="font-display text-[2rem] font-semibold leading-tight">„{q}“</h1>
      {data && <p className="mt-1 text-sm text-muted">{t('search_count', { n: total })}</p>}
      {data && !total && !loading && <div className="mt-8"><Empty>{t('no_results')}</Empty></div>}

      {data?.people.length > 0 && (
        <Section title={t('nav_people')} count={data.people.length}>
          <ul className={grid}>
            {data.people.map((p) => (
              <li key={p.id}>
                <Link to={`/people?focus=${p.id}`} className="flex items-center gap-3 card p-3 hover:border-brand">
                  <Avatar person={p} size={44} />
                  <span className="min-w-0">
                    <span className="block font-medium">{p.full_name}</span>
                    <span className="block truncate text-sm text-muted">
                      {[p.position, p.department, p.phone_ext && `${t('extension')} ${p.phone_ext}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data?.links.length > 0 && (
        <Section title={t('quick_title')} count={data.links.length}>
          <ul className={grid}>
            {data.links.map((x) => (
              <li key={x.id}><Row href={x.url} icon={QUICK_ICONS[x.icon] || Link2} color={x.color} title={pick(x, 'title')} meta={pick(x, 'subtitle')} /></li>
            ))}
          </ul>
        </Section>
      )}

      {data?.trainings.length > 0 && (
        <Section title={t('nav_trainings')} count={data.trainings.length}>
          <ul className={grid}>
            {data.trainings.map((x) => (
              <li key={x.id}><Row to={`/trainings/${x.id}`} icon={GraduationCap} title={pick(x, 'title')} snippet={x.snippet} /></li>
            ))}
          </ul>
        </Section>
      )}

      {docs.length > 0 && (
        <Section title={t('nav_documents')} count={docs.length}>
          <ul className={grid}>
            {docs.map((d, i) => (
              <li key={d.id}>
                <Row onClick={() => open(docs.map((x) => ({ url: x.url, name: x.name, kind: 'pdf' })), i)} icon={FileText} color="#dc2626"
                  title={docTitle(d.name)} meta={<><CategoryTag category={d.category} className="mr-1.5" />{pick(d, 'article_title')}</>} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data?.rooms.length > 0 && (
        <Section title={t('search_rooms')} count={data.rooms.length}>
          <ul className={grid}>
            {data.rooms.map((r) => (
              <li key={r.id}>
                <Row to={`/people?view=plan&loc=${r.location_id}`} icon={DoorOpen} color="#0f766e" title={pick(r, 'name')}
                  meta={[ROOM_TYPES[r.type]?.[lang] || ROOM_TYPES[r.type]?.de, pick(r, 'location')].filter((x, i, a) => x && x !== pick(r, 'name') && a.indexOf(x) === i).concat([r.capacity && t('search_seats', { n: r.capacity }), r.email]).filter(Boolean).join(' · ')} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data?.classifieds.length > 0 && (
        <Section title={t('nav_board')} count={data.classifieds.length}>
          <ul className={grid}>
            {data.classifieds.map((c) => (
              <li key={c.id}><Row to={`/board#notice-${c.id}`} icon={StickyNote} color="#d97706" title={c.title}
                meta={[c.price, c.author].filter(Boolean).join(' · ')} snippet={c.snippet} /></li>
            ))}
          </ul>
        </Section>
      )}

      {data?.polls?.length > 0 && (
        <Section title={t('nav_polls')} count={data.polls.length}>
          <ul className={grid}>
            {data.polls.map((x) => (
              <li key={x.id}><Row to="/polls" icon={BarChart3} color="#2563eb" title={pick(x, 'question')} meta={t(x.open ? 'poll_open' : 'poll_closed')} /></li>
            ))}
          </ul>
        </Section>
      )}

      {data?.ideas.length > 0 && (
        <Section title={t('nav_ideas')} count={data.ideas.length}>
          <ul className={grid}>
            {data.ideas.map((x) => (
              <li key={x.id}><Row to={`/ideas#idea-${x.id}`} icon={Lightbulb} color="#7c3aed" title={x.title}
                meta={[t(`idea_status_${x.status}`), x.author || t('search_anonymous')].join(' · ')} snippet={x.snippet} /></li>
            ))}
          </ul>
        </Section>
      )}
      {data?.articles.length > 0 && (
        <Section title={t('search_articles')} count={data.articles.length}>
          <ArticleGrid articles={data.articles} />
        </Section>
      )}

    </div>
  );
}
