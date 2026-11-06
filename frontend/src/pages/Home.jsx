import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Images } from 'lucide-react';
import HeroSlider from '../components/HeroSlider';
import { Avatar, CategoryTag, Empty, SectionHeading, relativeDay } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useViewer } from '../lib/viewer';
import { UpcomingCard } from './Events';
import MiniCalendar from '../components/MiniCalendar';

function ShowAll({ to, label }) {
  const { t } = useI18n();
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
      {label || t('show_all')}<ArrowUpRight size={15} />
    </Link>
  );
}

function NewsItem({ a, large }) {
  const { loc } = useI18n();
  return (
    <Link to={`/articles/${a.id}`} className="group block">
      {large && a.image_url && (
        <img src={a.image_url} alt="" className="mb-3 aspect-[16/8] w-full rounded-2xl object-cover" />
      )}
      <CategoryTag category={a.category} />
      <h3 className={`mt-1 font-display font-semibold leading-tight group-hover:text-brand ${large ? 'text-[1.4rem]' : 'text-[1.05rem]'}`}>
        {loc(a, 'title')}
      </h3>
      <p className="mt-1 line-clamp-2 text-muted">{loc(a, 'summary')}</p>
    </Link>
  );
}

/** Photo wall: one large picture plus up to four smaller ones; every tile opens the in-app viewer. */
function PhotoWall({ photos }) {
  const { t, lang } = useI18n();
  const { open } = useViewer();
  if (!photos.length) return null;
  const items = photos.map((p) => ({ url: p.url, kind: 'image', name: `${lang === 'en' && p.article_title_en ? p.article_title_en : p.article_title_de}: ${p.name}` }));
  const shown = photos.slice(0, 5);
  const rest = photos.length - shown.length;
  return (
    <section>
      <SectionHeading action={<ShowAll to="/calendar?view=past" label={t('photos_all')} />}>
        <span className="inline-flex items-center gap-2"><Camera size={22} className="text-brand" />{t('photos_title')}</span>
      </SectionHeading>
      <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4">
        {shown.map((p, i) => {
          const title = lang === 'en' && p.article_title_en ? p.article_title_en : p.article_title_de;
          const last = i === shown.length - 1 && rest > 0;
          return (
            <li key={p.id} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
              <button type="button" onClick={() => open(items, i)}
                className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-2xl bg-surface-2">
                <img src={p.url} alt={p.name} loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-left text-white sm:p-4">
                  <span className={`block font-semibold leading-tight ${i === 0 ? 'text-lg sm:text-xl' : 'text-sm'}`}>{title}</span>
                  {i === 0 && <span className="mt-0.5 block text-sm text-white/80">{p.name}</span>}
                </span>
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white">
                    <span className="inline-flex items-center gap-2 text-lg font-semibold"><Images size={20} />+{rest}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Home() {
  const { t, loc, fmtDate } = useI18n();
  const { data, error, loading } = useFetch('/home');
  const [rsvps, setRsvps] = useState({});

  if (loading && !data) return <p className="py-20 text-center text-muted">{t('loading')}</p>;
  if (error) return <Empty>{t('error_generic', { msg: error.message })}</Empty>;
  const [lead, ...moreNews] = data.news;
  const events = data.events.map((e) => rsvps[e.id] || e);

  return (
    <div className="space-y-14">
      <HeroSlider slides={data.slides} />

      {/* Coming up: the most visible block after the slider. */}
      <section>
        <SectionHeading action={<ShowAll to="/calendar" label={t('events_all')} />}>{t('events_home')}</SectionHeading>
        {/* Two event cards and the month calendar share one row with equal heights. */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.length
            ? events.slice(0, 2).map((e) => <ul key={e.id} className="contents"><UpcomingCard event={e} onChange={(ev) => setRsvps((r) => ({ ...r, [ev.id]: ev }))} /></ul>)
            : <div className="md:col-span-1 xl:col-span-2"><Empty>{t('no_events')}</Empty></div>}
          <div className="md:col-span-2 xl:col-span-1"><MiniCalendar /></div>
        </div>
      </section>

      <PhotoWall photos={data.photos || []} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <SectionHeading action={<ShowAll to="/news" />}>{t('latest_news')}</SectionHeading>
          {lead ? (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <NewsItem a={lead} large />
              <div className="space-y-6 md:border-l md:border-line md:pl-8">
                {moreNews.map((a) => <NewsItem key={a.id} a={a} />)}
              </div>
            </div>
          ) : <Empty>{t('no_articles')}</Empty>}
        </section>

        <section>
          <SectionHeading action={<ShowAll to="/people" />}>{t('new_colleagues')}</SectionHeading>
          <ul className="card divide-y divide-line">
            {data.new_people.map((p) => (
              <li key={p.id}>
                <Link to={`/people?focus=${p.id}`} className="group flex items-center gap-3 px-4 py-3">
                  <Avatar person={p} size={44} />
                  <span className="min-w-0">
                    <span className="block font-medium leading-tight group-hover:text-brand">{p.full_name}</span>
                    <span className="block truncate text-sm text-muted">{p.position}, {p.department}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <SectionHeading>{t('recent_articles')}</SectionHeading>
          <ul className="card divide-y divide-line">
            {data.recent.map((a) => (
              <li key={a.id}>
                <Link to={`/articles/${a.id}`} className="group flex items-center gap-4 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-brand">{loc(a, 'title')}</span>
                    <CategoryTag category={a.category} className="mt-0.5" />
                  </span>
                  <span className="shrink-0 text-sm text-muted" title={fmtDate(a.published_at)}>{relativeDay(t, a.published_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading action={<ShowAll to="/board" />}>{t('board_latest')}</SectionHeading>
          <ul className="space-y-3">
            {data.classifieds.map((c) => (
              <li key={c.id} className="card px-4 py-3">
                <p className="text-sm text-muted">{t(`kind_${c.kind}`)}{c.price && `, ${c.price}`}</p>
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-muted">{c.author.full_name}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
