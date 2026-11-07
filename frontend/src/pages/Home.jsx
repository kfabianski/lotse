import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Images, Pin } from 'lucide-react';
import HeroSlider from '../components/HeroSlider';
import { Avatar, CategoryTag, Empty, SectionHeading, relativeDay } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { useViewer } from '../lib/viewer';
import { UpcomingCard } from './Events';
import MiniCalendar from '../components/MiniCalendar';
import QuickLinks from '../components/QuickLinks';
import Greeting from '../components/Greeting';
import { PollCard } from './Polls';
import { ArticleCover } from './Articles';

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

/** Teaser with a small picture, for the right-hand column of the news block. */
function NewsTeaser({ a }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <Link to={`/articles/${a.id}`} className="group flex gap-4">
      <span className="block h-20 w-28 shrink-0 overflow-hidden rounded-xl [&_span]:hidden"><ArticleCover article={a} className="h-full" /></span>
      <span className="min-w-0">
        <span className="flex items-center gap-2"><CategoryTag category={a.category} />
          {a.pinned_now && <span className="inline-flex items-center gap-1 rounded-md bg-signal/25 px-1.5 text-xs font-medium"><Pin size={11} />{t('pinned_badge')}</span>}</span>
        <span className="mt-0.5 line-clamp-2 block font-semibold leading-snug group-hover:text-brand">{loc(a, 'title')}</span>
        <span className="mt-0.5 block text-sm text-muted" title={fmtDate(a.published_at)}>{relativeDay(t, a.published_at)}</span>
      </span>
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


function NewsBlock({ news, half }) {
  const { t } = useI18n();
  const lead = news.find((a) => !a.pinned_now && a.image_url) || news.find((a) => !a.pinned_now) || news[0];
  const rest = news.filter((a) => a !== lead);
  return (
    <section>
      <SectionHeading action={<ShowAll to="/news" />}>{t('latest_news')}</SectionHeading>
      <div className={`grid gap-8 ${half ? '' : 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'}`}>
        <NewsItem a={lead} large />
        {rest.length > 0 && (
          <div className={`space-y-5 ${half ? 'border-t border-line pt-5' : 'md:border-l md:border-line md:pl-8'}`}>
            {rest.slice(0, half ? 3 : 5).map((a) => <NewsTeaser key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </section>
  );
}

/** New colleagues as photo cards instead of a list. */
function PeopleBlock({ people, half }) {
  const { t, fmtDate } = useI18n();
  const shown = people.slice(0, 6); // one tidy row (two rows of three when half)
  return (
    <section>
      <SectionHeading action={<ShowAll to="/people" />}>{t('new_colleagues')}</SectionHeading>
      <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${half ? '' : 'lg:grid-cols-6'}`}>
        {shown.map((p) => (
          <li key={p.id}>
            <Link to={`/people?focus=${p.id}`} className="group flex h-full flex-col items-center rounded-2xl border border-line bg-surface px-3 pb-4 pt-5 text-center hover:border-brand">
              <Avatar person={p} size={72} />
              <span className="mt-3 block font-semibold leading-tight group-hover:text-brand">{p.full_name}</span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{p.position}</span>
              {p.start_date && <span className="mt-auto pt-2 text-xs text-muted">{t('since_date', { d: fmtDate(p.start_date, { day: 'numeric', month: 'short' }) })}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UpcomingBlock({ events, half, onChange }) {
  const { t } = useI18n();
  return (
    <section>
      <SectionHeading action={<ShowAll to="/calendar" label={t('events_all')} />}>{t('events_home')}</SectionHeading>
      <div className={`grid gap-5 ${half ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {events.length
          ? events.slice(0, half ? 1 : 2).map((e) => <ul key={e.id} className="contents"><UpcomingCard event={e} onChange={onChange} /></ul>)
          : <div className={half ? '' : 'md:col-span-1 xl:col-span-2'}><Empty>{t('no_events')}</Empty></div>}
        {!half && <div className="md:col-span-2 xl:col-span-1"><MiniCalendar /></div>}
      </div>
    </section>
  );
}

function RecentBlock({ items }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <section>
      <SectionHeading>{t('recent_articles')}</SectionHeading>
      <ul className="card divide-y divide-line">
        {items.map((a) => (
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
  );
}

function BoardBlock({ items, half }) {
  const { t } = useI18n();
  return (
    <section>
      <SectionHeading action={<ShowAll to="/board" />}>{t('board_latest')}</SectionHeading>
      <ul className={`grid gap-3 ${half ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
        {items.map((c) => (
          <li key={c.id}>
            <Link to={`/board#notice-${c.id}`} className="flex h-full flex-col card px-4 py-3 hover:border-brand">
              <span className="text-sm text-muted">{t(`kind_${c.kind}`)}{c.price && ` · ${c.price}`}</span>
              <span className="font-medium leading-snug">{c.title}</span>
              <span className="mt-auto pt-1 text-sm text-muted">{c.author.full_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PollBlock({ poll, onChange }) {
  const { t } = useI18n();
  return (
    <section>
      <SectionHeading action={<ShowAll to="/polls" label={t('polls_all')} />}>{t('home_poll')}</SectionHeading>
      <PollCard key={`${poll.id}-${poll.my_choices?.join(',')}`} poll={poll} onChange={onChange} compact />
    </section>
  );
}

/** Puts the visible blocks in rows: two "half" blocks next to each other share a row, a single half block
 * gets the full width - so the page never ends in one narrow column. */
export function layoutRows(blocks) {
  const rows = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (b.width === 'half' && next?.width === 'half') {
      rows.push([b, next]);
      i += 1;
    } else rows.push([b]);
  }
  return rows;
}

export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, error, loading } = useFetch('/home');
  const polls = useFetch('/polls', { params: { state: 'open', limit: 1 } }, 'home-poll');
  const [rsvps, setRsvps] = useState({});
  const [poll, setPoll] = useState(null);

  if (loading && !data) return <p className="py-20 text-center text-muted">{t('loading')}</p>;
  if (error) return <Empty>{t('error_generic', { msg: error.message })}</Empty>;
  const events = data.events.map((e) => rsvps[e.id] || e);
  const currentPoll = poll || polls.data?.[0];

  const has = {
    greeting: Boolean(user), slider: data.slides.length > 0, quicklinks: true,
    upcoming: true, news: data.news.length > 0, people: data.new_people.length > 0, photos: (data.photos || []).length > 0,
    recent: data.recent.length > 0, poll: Boolean(currentPoll), board: data.classifieds.length > 0,
  };
  const blocks = (data.layout || []).filter((b) => b.show && has[b.id]);

  const render = (b, half) => {
    switch (b.id) {
      case 'greeting': return <Greeting />;
      case 'slider': return <HeroSlider slides={data.slides} />;
      case 'quicklinks': return <QuickLinks />;
      case 'upcoming': return <UpcomingBlock events={events} half={half} onChange={(ev) => setRsvps((r) => ({ ...r, [ev.id]: ev }))} />;
      case 'news': return <NewsBlock news={data.news} half={half} />;
      case 'people': return <PeopleBlock people={data.new_people} half={half} />;
      case 'photos': return <PhotoWall photos={data.photos} />;
      case 'recent': return <RecentBlock items={data.recent} />;
      case 'poll': return <PollBlock poll={currentPoll} onChange={setPoll} />;
      case 'board': return <BoardBlock items={data.classifieds} half={half} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-12">
      {layoutRows(blocks).map((row) => (
        row.length === 2
          ? <div key={row[0].id} className="grid gap-12 lg:grid-cols-2 lg:gap-10">{row.map((b) => <div key={b.id} className="min-w-0">{render(b, true)}</div>)}</div>
          : <div key={row[0].id}>{render(row[0], false)}</div>
      ))}
    </div>
  );
}
