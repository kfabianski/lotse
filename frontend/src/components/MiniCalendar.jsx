import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Compact month calendar for the home page: dots mark event days, a click lists that day's events. */
export default function MiniCalendar() {
  const { t, lang, loc, fmtDate } = useI18n();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(null);
  const first = month;
  const offset = (first.getDay() + 6) % 7;
  const weeks = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
  const range = { from: iso(days[0]), to: iso(new Date(days[days.length - 1].getTime() + 86400000)) };
  const { data } = useFetch('/events', { params: range }, range.from);
  const byDay = useMemo(() => {
    const m = {};
    (data || []).forEach((e) => { (m[iso(new Date(e.event_date))] ||= []).push(e); });
    return m;
  }, [data]);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
  const go = (d) => { setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1)); setSelected(null); };
  const list = selected
    ? byDay[selected] || []
    : (data || []).filter((e) => new Date(e.event_date) >= new Date(today.toDateString()) && new Date(e.event_date).getMonth() === month.getMonth()).slice(0, 3);

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold capitalize tracking-tight">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</p>
        <span className="flex">
          <button type="button" onClick={() => go(-1)} aria-label={t('prev_month')} className="rounded-lg p-1.5 text-muted hover:bg-surface-2"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => go(1)} aria-label={t('next_month')} className="rounded-lg p-1.5 text-muted hover:bg-surface-2"><ChevronRight size={18} /></button>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {weekdays.map((w, i) => <span key={i} className="py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
        {days.map((d) => {
          const key = iso(d);
          const has = Boolean(byDay[key]);
          const isToday = key === iso(today);
          const isSel = key === selected;
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <button key={key} type="button" disabled={!has} onClick={() => setSelected(isSel ? null : key)}
              aria-label={`${fmtDate(d)}${has ? `, ${byDay[key].length}` : ''}`} aria-pressed={isSel}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isSel ? 'bg-ink text-surface' : isToday ? 'bg-brand font-semibold text-white dark:text-[#0d0f13]' : has ? 'font-semibold hover:bg-surface-2' : ''} ${
                inMonth ? '' : 'opacity-35'} disabled:cursor-default`}>
              {d.getDate()}
              {has && !isSel && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isToday ? 'bg-white' : 'bg-brand'}`} />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex-1 border-t border-line pt-3">
        <p className="mb-2 text-xs font-medium text-muted">
          {selected ? fmtDate(`${selected}T12:00`, { weekday: 'long', day: 'numeric', month: 'long' }) : t('events_next_in_month')}
        </p>
        {list.length ? (
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.id}>
                <Link to={`/articles/${e.id}`} className="group flex items-baseline gap-2 text-sm">
                  <span className="w-12 shrink-0 tabular-nums text-muted">{fmtDate(e.event_date, { day: '2-digit', month: '2-digit' })}</span>
                  <span className="min-w-0 truncate font-medium group-hover:text-brand">{loc(e, 'title')}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">{t('no_events_day')}</p>}
      </div>

      <Link to="/calendar?view=calendar" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        {t('open_calendar')}<ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
