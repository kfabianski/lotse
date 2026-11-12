import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper, Pin } from 'lucide-react';
import HeroSlider from '../components/HeroSlider';
import { Avatar, CategoryTag, Empty, SectionHeading, relativeDay } from '../components/ui';
import { briefingItems } from '../components/Greeting';
import { useAuth } from '../lib/auth';
import { useBriefing } from '../lib/briefing';
import { isoDay } from '../lib/holidays';
import { useI18n } from '../lib/i18n';
import { jubileeLabel } from '../lib/jubilees';
import { useFetch } from '../lib/useFetch';
import { useViewer } from '../lib/viewer';
import MiniCalendar from '../components/MiniCalendar';
import QuickLinks from '../components/QuickLinks';
import { PollCard } from './Polls';
import { SocialBlock, socialLinks } from '../components/Social';

function ShowAll({ to, label }) {
  const { t } = useI18n();
  return <Link to={to} className="link whitespace-nowrap font-display text-sm font-medium">{label || t('show_all')}</Link>;
}

/** The lead story: its photograph in a hairline frame, the head, two lines. */
function NewsLead({ a }) {
  const { loc } = useI18n();
  return (
    <Link to={`/articles/${a.id}`} className="group block">
      {a.image_url && (
        <img src={a.image_url} alt="" className="mb-4 aspect-[16/9] w-full object-cover rounded-xl" />
      )}
      <CategoryTag category={a.category} />
      <h3 className="mt-1 font-display text-[1.6rem] font-semibold leading-[1.1] text-ink group-hover:underline group-hover:decoration-brand-text group-hover:decoration-2 group-hover:underline-offset-[0.12em]">
        {loc(a, 'title')}
      </h3>
      <p className="mt-2 line-clamp-2 text-[1.0625rem] text-ink-2">{loc(a, 'summary')}</p>
    </Link>
  );
}

/** One ruled row in the news column: section, head, date; the picture only when the story has one. */
function NewsRow({ a }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <li className="border-b border-line">
      <Link to={`/articles/${a.id}`} className="group flex gap-4 py-3.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3"><CategoryTag category={a.category} />
            {a.pinned_now && <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-text"><Pin size={13} aria-hidden />{t('pinned_badge')}</span>}</span>
          <span className="mt-0.5 line-clamp-2 block font-display text-[1.0625rem] font-semibold leading-snug text-ink">{loc(a, 'title')}</span>
          <span className="mt-0.5 block text-sm text-muted" title={fmtDate(a.published_at)}>{relativeDay(t, a.published_at)}</span>
        </span>
        {a.image_url && <img src={a.image_url} alt="" loading="lazy" className="h-[4.5rem] w-24 shrink-0 object-cover" />}
      </Link>
    </li>
  );
}

/** Photo wall: one large picture and up to four smaller ones, captions beneath, never on the picture. */
function PhotoWall({ photos }) {
  const { t, lang } = useI18n();
  const { open } = useViewer();
  if (!photos.length) return null;
  const items = photos.map((p) => ({ url: p.url, kind: 'image', name: `${lang === 'en' && p.article_title_en ? p.article_title_en : p.article_title_de}: ${p.name}` }));
  const shown = photos.slice(0, 5);
  const rest = photos.length - shown.length;
  return (
    <section>
      <SectionHeading action={<ShowAll to="/calendar?view=past" label={t('photos_all')} />}>{t('photos_title')}</SectionHeading>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {shown.map((p, i) => {
          const title = lang === 'en' && p.article_title_en ? p.article_title_en : p.article_title_de;
          return (
            <li key={p.id} className={i === 0 ? 'col-span-2 md:col-span-1 md:row-span-2' : ''}>
              <figure className="flex h-full flex-col">
                <button type="button" onClick={() => open(items, i)} className="block min-h-0 flex-1 cursor-zoom-in bg-well">
                  <img src={p.url} alt={p.name} loading="lazy"
                    className={`h-full w-full object-cover rounded-xl ${i === 0 ? 'aspect-[4/3] md:aspect-auto' : 'aspect-[4/3]'}`} />
                </button>
                <figcaption className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className={`line-clamp-1 ${i === 0 ? 'font-medium text-ink' : 'text-muted'}`}>{title}</span>
                  {i === shown.length - 1 && rest > 0 && (
                    <button type="button" onClick={() => open(items, i + 1)} className="link shrink-0 font-mono">+{rest}</button>
                  )}
                </figcaption>
              </figure>
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
      <div className={`grid gap-x-10 gap-y-6 ${half ? '' : 'md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]'}`}>
        <NewsLead a={lead} />
        {rest.length > 0 && (
          <ul className="border-t border-line">
            {rest.slice(0, half ? 3 : 5).map((a) => <NewsRow key={a.id} a={a} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

/** New colleagues: a ruled register of photo, name, role and first day. */
function PeopleBlock({ people, half }) {
  const { t, fmtDate } = useI18n();
  const shown = people.slice(0, 6);
  return (
    <section>
      <SectionHeading action={<ShowAll to="/people" />}>{t('new_colleagues')}</SectionHeading>
      <ul className={`grid gap-x-8 sm:grid-cols-2 ${half ? '' : 'lg:grid-cols-3'}`}>
        {shown.map((p) => (
          <li key={p.id} className="border-b border-line">
            <Link to={`/people?focus=${p.id}`} className="group flex items-center gap-4 py-3 hover:bg-surface-2">
              <Avatar person={p} size={56} />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold leading-tight text-ink">{p.full_name}</span>
                <span className="block truncate text-muted">{p.position}</span>
              </span>
              {p.start_date && (
                <span className="shrink-0 text-right text-sm text-muted">
                  {t('since_date', { d: '' }).trim()}
                  <span className="block font-mono text-ink">{fmtDate(p.start_date, { day: '2-digit', month: '2-digit' })}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The register of what comes next: date and time in figures, the event, the place, who is in. */
function UpcomingBlock({ events, half }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <section>
      <SectionHeading action={<ShowAll to="/calendar" label={t('events_all')} />}>{t('events_home')}</SectionHeading>
      <div className={`grid gap-x-10 gap-y-8 ${half ? '' : 'xl:grid-cols-[minmax(0,1fr)_20rem]'}`}>
        {events.length ? (
          <div className="self-start overflow-hidden rounded-2xl border border-line bg-surface"><table className="w-full border-collapse">
            <thead className="sr-only"><tr><th>{t('date')}</th><th>{t('events_home')}</th></tr></thead>
            <tbody>
              {events.map((e) => {
                const d = new Date(e.event_date);
                return (
                  <tr key={e.id} className="border-b border-line align-top last:border-b-0">
                    <td className="w-[8rem] py-4 pl-4 pr-2">
                      <span className="block font-mono text-[1.75rem] leading-none text-ink">{String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.</span>
                      <span className="mt-1 block text-sm capitalize text-muted">{fmtDate(d, { weekday: 'long' })}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <Link to={`/articles/${e.id}`} className="font-display text-[1.125rem] font-semibold leading-snug text-ink hover:underline hover:decoration-brand-text">{loc(e, 'title')}</Link>
                      <span className="mt-1 block text-muted">
                        <span className="font-mono text-ink-2">{fmtDate(d, { hour: '2-digit', minute: '2-digit' })}</span>
                        {e.event_location && <>, {e.event_location}</>}
                      </span>
                      {!half && loc(e, 'summary') && <span className="mt-1 line-clamp-1 block max-w-[60ch] text-muted">{loc(e, 'summary')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : <Empty>{t('no_events')}</Empty>}
        {!half && <MiniCalendar />}
      </div>
    </section>
  );
}

function RecentBlock({ items }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <section>
      <SectionHeading>{t('recent_articles')}</SectionHeading>
      <ul>
        {items.map((a) => (
          <li key={a.id} className="border-b border-line">
            <Link to={`/articles/${a.id}`} className="group flex items-baseline gap-4 py-3 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-semibold text-ink">{loc(a, 'title')}</span>
                <CategoryTag category={a.category} />
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
      <ul className={`grid gap-x-8 ${half ? '' : 'sm:grid-cols-2'}`}>
        {items.map((c) => (
          <li key={c.id} className="border-b border-line">
            <Link to={`/board#notice-${c.id}`} className="group flex items-baseline gap-4 py-3 hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted">{t(`kind_${c.kind}`)}</span>
                <span className="block font-display font-semibold leading-snug text-ink">{c.title}</span>
                <span className="block text-sm text-muted">{c.author.full_name}</span>
              </span>
              {c.price && <span className="shrink-0 font-mono text-ink">{c.price}</span>}
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

/** "Für Sie": the signed-in person's reminders, three at most, as cards above the fold. The bell holds the rest. */
function ForYouBlock({ items }) {
  const { t } = useI18n();
  const shown = items.slice(0, 3);
  const rest = items.length - shown.length;
  return (
    <section aria-label={t('foryou_title')} className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-text">{t('foryou_title')}</p>
        {rest > 0 && <span className="text-sm text-muted">{t('foryou_more', { n: rest })}</span>}
      </div>
      <ul className={`grid gap-3 ${shown.length > 1 ? 'sm:grid-cols-2' : ''} ${shown.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {shown.map(({ key, to, icon: Icon, tone, title, lines }) => (
          <li key={key}>
            <Link to={to} className="card card-hover flex h-full items-start gap-3 p-4">
              <Icon size={20} strokeWidth={1.75} aria-hidden className={`mt-0.5 shrink-0 ${tone === 'alert' ? 'text-alert' : 'text-brand-text'}`} />
              <span className="min-w-0">
                <span className={`block font-display font-semibold leading-snug ${tone === 'alert' ? 'text-alert' : 'text-ink'}`}>{title}</span>
                {lines.slice(0, 2).map((l) => <span key={l} className="block truncate text-sm text-muted">{l}</span>)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Jubiläen: a ruled register of date, face, name and occasion - entered by HR, never computed. */
function JubileesBlock({ items, half }) {
  const { t, lang, fmtDate } = useI18n();
  const { has } = useAuth();
  const today = isoDay(new Date());
  return (
    <section>
      <SectionHeading action={has('jubilees') ? <ShowAll to="/admin?tab=jubilees" label={t('jb_manage')} /> : null}>{t('jubilees_title')}</SectionHeading>
      <ul className={`grid gap-x-8 ${half ? '' : 'sm:grid-cols-2'}`}>
        {items.map((j) => {
          const d = new Date(`${j.date}T12:00`);
          const past = j.date < today;
          const isToday = j.date === today;
          const text = (lang === 'en' && j.text_en) || j.text_de;
          return (
            <li key={j.id} className="border-b border-line">
              <div className="flex items-center gap-4 py-3">
                <span className="w-[4.5rem] shrink-0">
                  <span className={`block font-mono text-[1.4rem] leading-none ${isToday ? 'text-brand-text' : past ? 'text-muted' : 'text-ink'}`}>
                    {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.
                  </span>
                  <span className="mt-1 block text-sm capitalize text-muted">{isToday ? t('today') : fmtDate(d, { weekday: 'long' })}</span>
                </span>
                {j.person
                  ? <Avatar person={j.person} size={44} />
                  : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text"><PartyPopper size={20} aria-hidden /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold leading-tight text-ink">
                    {j.person ? <Link to={`/people?focus=${j.person.id}`} className="hover:underline hover:decoration-brand-text">{j.name}</Link> : j.name}
                  </span>
                  <span className="block text-sm text-muted">{jubileeLabel(t, j)}{j.person?.department ? ` · ${j.person.department}` : ''}</span>
                  {text && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-2">{text}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
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
  const { t, loc, lang } = useI18n();
  const { user } = useAuth();
  const briefing = useBriefing();
  const { data, error, loading } = useFetch('/home');
  const polls = useFetch('/polls', { params: { state: 'open', limit: 1 } }, 'home-poll');
  const config = useFetch('/auth/config', undefined, 'auth-config');
  const [poll, setPoll] = useState(null);

  if (loading && !data) return <p className="py-20 text-center text-muted">{t('loading')}</p>;
  if (error) return <Empty>{t('error_generic', { msg: error.message })}</Empty>;
  const { events } = data;
  const currentPoll = poll || polls.data?.[0];
  const reminders = user ? briefingItems(briefing.data, t, loc, lang) : [];
  const jubilees = data.jubilees || [];

  const has = {
    foryou: reminders.length > 0,
    slider: data.slides.length > 0, quicklinks: true,
    upcoming: true, news: data.news.length > 0, people: data.new_people.length > 0, photos: (data.photos || []).length > 0,
    recent: data.recent.length > 0, poll: Boolean(currentPoll), board: data.classifieds.length > 0,
    jubilees: jubilees.length > 0,
    social: socialLinks(config.data).length > 0,
  };
  const blocks = (data.layout || []).filter((b) => b.show && has[b.id]);

  const render = (b, half) => {
    switch (b.id) {
      case 'foryou': return <ForYouBlock items={reminders} />;
      case 'jubilees': return <JubileesBlock items={jubilees} half={half} />;
      case 'slider': return <HeroSlider slides={data.slides} />;
      case 'quicklinks': return <QuickLinks />;
      case 'upcoming': return <UpcomingBlock events={events} half={half} />;
      case 'news': return <NewsBlock news={data.news} half={half} />;
      case 'people': return <PeopleBlock people={data.new_people} half={half} />;
      case 'photos': return <PhotoWall photos={data.photos} />;
      case 'recent': return <RecentBlock items={data.recent} />;
      case 'poll': return <PollBlock poll={currentPoll} onChange={setPoll} />;
      case 'board': return <BoardBlock items={data.classifieds} half={half} />;
      case 'social': return <SocialBlock config={config.data} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-14">
      {layoutRows(blocks).map((row) => (
        row.length === 2
          ? <div key={row[0].id} className="grid gap-14 lg:grid-cols-2 lg:gap-12">{row.map((b) => <div key={b.id} className="min-w-0">{render(b, true)}</div>)}</div>
          : <div key={row[0].id}>{render(row[0], false)}</div>
      ))}
    </div>
  );
}
