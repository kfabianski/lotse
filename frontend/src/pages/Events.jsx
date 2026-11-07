import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Link2, MapPin, PartyPopper } from 'lucide-react';
import { Button, Empty } from '../components/ui';
import { CountryBadges, useHolidays } from '../lib/holidays';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function DateBlock({ date, large }) {
  const { fmtDate } = useI18n();
  const d = new Date(date);
  return (
    <span className={`flex shrink-0 flex-col border-t border-line pt-1 ${large ? 'w-16' : 'w-12'}`}>
      <span className={`font-mono leading-none text-ink ${large ? 'text-[1.9rem]' : 'text-[1.4rem]'}`}>{String(d.getDate()).padStart(2, '0')}</span>
      <span className="mt-1 text-sm text-muted">{fmtDate(d, { month: 'short' })}</span>
    </span>
  );
}

/** Same-height cover on every card: the event photo, or the weekday and date set as type on a soft panel. */
function EventCover({ event }) {
  const { fmtDate } = useI18n();
  if (event.image_url) return <img src={event.image_url} alt="" className="aspect-[16/7] w-full object-cover" />;
  return (
    <div aria-hidden className="flex aspect-[16/7] w-full items-end justify-between bg-brand-soft px-5 py-4">
      <span>
        <span className="block capitalize text-muted">{fmtDate(event.event_date, { weekday: 'long' })}</span>
        <span className="block font-display text-[1.6rem] font-semibold leading-tight text-ink">{fmtDate(event.event_date, { day: 'numeric', month: 'long' })}</span>
      </span>
      <CalendarDays size={40} strokeWidth={1.5} className="text-brand-text" />
    </div>
  );
}

export function UpcomingCard({ event }) {
  const { t, loc, fmtDate } = useI18n();
  return (
    <li className="card flex h-full flex-col overflow-hidden">
      <EventCover event={event} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex gap-4">
          <DateBlock date={event.event_date} large />
          <div className="min-w-0">
            <Link to={`/articles/${event.id}`} className="font-display text-[1.2rem] font-semibold leading-snug text-ink hover:underline hover:decoration-brand-text">{loc(event, 'title')}</Link>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Clock size={14} />{fmtDate(event.event_date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {event.event_location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{event.event_location}</span>}
            </p>
          </div>
        </div>
        {loc(event, 'summary') && <p className="mt-3 line-clamp-3 text-muted">{loc(event, 'summary')}</p>}
      </div>
    </li>
  );
}

function MonthGrid({ month, setMonth, events }) {
  const { t, lang, loc, fmtDate } = useI18n();
  const [selected, setSelected] = useState(null);
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // weeks start on Monday
  const days = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - startOffset + i));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));
  const today = new Date();
  const byDay = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[iso(new Date(e.event_date))] ||= []).push(e); });
    return m;
  }, [events]);
  const holidays = useHolidays(days[0], new Date(days[41].getTime() + 86400000));
  const hName = (h) => (lang === 'en' ? h.name_en : h.name_de);
  const monthEvents = events.filter((e) => new Date(e.event_date).getMonth() === month.getMonth());
  const shown = selected ? (byDay[selected] || []) : monthEvents;
  const shownHolidays = selected ? (holidays.byDay[selected] || [])
    : holidays.list.filter((h) => new Date(`${h.date}T12:00`).getMonth() === month.getMonth());

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold capitalize">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" className="px-3 py-1.5 text-sm" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(null); }}>{t('today')}</Button>
            <button type="button" aria-label={t('prev_month')} onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSelected(null); }} className="rounded-xl p-2 text-muted hover:bg-surface-2"><ChevronLeft size={18} /></button>
            <button type="button" aria-label={t('next_month')} onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSelected(null); }} className="rounded-xl p-2 text-muted hover:bg-surface-2"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted">
          {weekdays.map((w) => <div key={w} className="pb-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = iso(d);
            const list = byDay[key] || [];
            const hol = holidays.byDay[key] || [];
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = sameDay(d, today);
            const isSel = selected === key;
            return (
              <button key={key} type="button" onClick={() => setSelected(isSel ? null : key)} aria-pressed={isSel}
                aria-label={`${fmtDate(d)}${hol.length ? `, ${hol.map(hName).join(', ')}` : ''}${list.length ? `, ${list.length}` : ''}`}
                title={hol.map((h) => `${hName(h)} (${h.regions.join(', ')})`).join('\n') || undefined}
                className={`flex min-h-[4.25rem] flex-col items-stretch rounded-xl p-1.5 text-left transition-colors sm:min-h-[5.5rem] ${
                  isSel ? 'bg-brand-soft ring-1 ring-brand' : hol.length ? 'bg-alert/[0.06] hover:bg-alert/10' : 'hover:bg-surface-2'} ${inMonth ? '' : 'opacity-40'}`}>
                <span className={`mb-1 flex h-6 w-6 items-center justify-center self-start rounded-sm text-sm ${isToday ? 'bg-brand font-semibold text-brand-ink' : hol.length ? 'font-semibold text-alert' : ''}`}>{d.getDate()}</span>
                {hol.length > 0 && <span className="hidden truncate px-0.5 text-[11px] font-medium leading-tight text-alert sm:block">{hName(hol[0])}{hol.length > 1 ? ` +${hol.length - 1}` : ''}</span>}
                <span className="hidden space-y-0.5 sm:block">
                  {list.slice(0, 2).map((e) => (
                    <span key={e.id} className="block truncate rounded-md bg-brand/12 px-1.5 py-0.5 text-[11px] font-medium text-brand-text">{loc(e, 'title')}</span>
                  ))}
                  {list.length > 2 && <span className="block px-1.5 text-[11px] text-muted">+{list.length - 2}</span>}
                </span>
                {list.length > 0 && <span className="mx-auto mt-auto h-1.5 w-1.5 rounded-sm bg-brand sm:hidden" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-medium text-muted">{selected ? fmtDate(`${selected}T12:00`, { weekday: 'long', day: 'numeric', month: 'long' }) : t('events_this_month')}</h3>
        {shownHolidays.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {shownHolidays.map((h) => (
              <li key={`${h.date}-${h.name_en}`} className="flex items-center gap-3 rounded-xl border border-alert/20 bg-alert/[0.05] px-3 py-2 text-sm">
                <span className="w-12 shrink-0 tabular-nums font-semibold text-alert">{fmtDate(`${h.date}T12:00`, { day: '2-digit', month: '2-digit' })}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{hName(h)}</span>
                <CountryBadges holiday={h} />
              </li>
            ))}
          </ul>
        )}
        {shown.length ? (
          <ul className="space-y-2">
            {shown.map((e) => (
              <li key={e.id}>
                <Link to={`/articles/${e.id}`} className="card card-hover flex gap-3 p-3">
                  <DateBlock date={e.event_date} />
                  <span className="min-w-0">
                    <span className="block font-medium leading-snug">{loc(e, 'title')}</span>
                    <span className="block text-sm text-muted">{fmtDate(e.event_date, { hour: '2-digit', minute: '2-digit' })}{e.event_location && `, ${e.event_location}`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : !shownHolidays.length && <p className="text-muted">{t('no_events_day')}</p>}
        <p className="mt-4 text-xs text-muted">{t('holidays_note')}</p>
      </div>
    </div>
  );
}

export default function Events() {
  const { t, lang, loc, fmtDate } = useI18n();
  const { has } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'upcoming';
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const range = view === 'calendar'
    ? { from: iso(new Date(month.getFullYear(), month.getMonth() - 1, 20)), to: iso(new Date(month.getFullYear(), month.getMonth() + 1, 15)) }
    : view === 'past'
      ? { from: iso(new Date(now.getFullYear() - 2, now.getMonth(), 1)), to: iso(now), order: 'desc' }
      : { from: iso(new Date(now.getTime() - 12 * 3600 * 1000)), to: iso(new Date(now.getFullYear() + 1, now.getMonth() + 1, 1)) };
  const { data, loading } = useFetch('/events', { params: range }, `${view}:${range.from}`);
  const events = data || [];

  const icsUrl = `${window.location.origin}/api/events.ics?lang=${lang}`;
  const copyIcs = async () => {
    try { await navigator.clipboard.writeText(icsUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { window.open(icsUrl); }
  };

  const tabs = [['upcoming', t('events_upcoming')], ['calendar', t('events_calendar')], ['past', t('events_past')]];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('events_title')}</h1>
          <p className="mt-1 text-muted">{t('events_intro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyIcs} title={icsUrl}>
            {copied ? <Check size={17} /> : <Link2 size={17} />}{copied ? t('ics_copied') : t('ics_subscribe')}
          </Button>
          {has('content_own', 'content_all') && (
            <Link to="/articles/new?category=events" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong">
              <CalendarPlus size={17} />{t('event_new')}
            </Link>
          )}
        </div>
      </div>

      <div role="tablist" className="mt-6 inline-flex rounded-xl border border-line bg-surface p-1">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setParams(key === 'upcoming' ? {} : { view: key })}
            className={`rounded-[10px] px-4 py-1.5 text-sm font-medium transition-colors ${view === key ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading && !data && <p className="text-muted">{t('loading')}</p>}
        {view === 'calendar' && data && <MonthGrid month={month} setMonth={setMonth} events={events} />}
        {view === 'upcoming' && data && (events.length ? (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {events.map((e) => <UpcomingCard key={e.id} event={e} />)}
          </ul>
        ) : <Empty>{t('no_events')}</Empty>)}
        {view === 'past' && data && (events.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link to={`/articles/${e.id}`} className="card card-hover flex gap-4 overflow-hidden p-3">
                  {e.image_url
                    ? <img src={e.image_url} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                    : <span className="flex h-24 w-32 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted"><PartyPopper size={26} /></span>}
                  <span className="min-w-0 py-1">
                    <span className="block text-sm text-muted">{fmtDate(e.event_date)}</span>
                    <span className="block font-medium leading-snug">{loc(e, 'title')}</span>
                    {e.photo_count > 0 && <span className="mt-1 block text-sm text-muted">{t('photos_count', { n: e.photo_count })}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Empty>{t('no_past_events')}</Empty>)}
      </div>
    </div>
  );
}
