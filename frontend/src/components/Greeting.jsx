import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck, ChevronRight, GraduationCap, Lightbulb } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

function greetingKey(hour) {
  if (hour < 11) return 'greet_morning';
  if (hour < 18) return 'greet_day';
  return 'greet_evening';
}

/** How many things concern the person (one per item: event, training, idea answer, poll). */
export function briefingCount(data) {
  if (!data) return 0;
  return (data.events_today || []).length + (data.trainings_open || []).length + (data.idea_news || []).length + (data.polls_open || []).length;
}

/** One reminder row: what is due, a line of detail, link. Overdue items carry the alert colour. */
function Reminder({ to, icon: Icon, tone, title, lines }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link to={to} className="group flex items-start gap-3 py-3 pr-1 hover:bg-surface-2">
        <Icon size={18} strokeWidth={1.75} aria-hidden className={`mt-0.5 shrink-0 ${tone === 'alert' ? 'text-alert' : 'text-brand-text'}`} />
        <span className="min-w-0 flex-1">
          <span className={`block font-display font-medium leading-snug ${tone === 'alert' ? 'text-alert' : 'text-ink'}`}>{title}</span>
          {lines.slice(0, 3).map((l) => <span key={l} className="block truncate text-sm text-muted">{l}</span>)}
        </span>
        <ChevronRight size={16} aria-hidden className="mt-1 shrink-0 text-muted group-hover:text-ink" />
      </Link>
    </li>
  );
}

/** What concerns the person today: shown in the bell next to the avatar. */
export function BriefingList({ data }) {
  const { t, lang, loc } = useI18n();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const time = (v) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(v));
  const ev = data?.events_today || [];
  const tr = data?.trainings_open || [];
  const ideas = data?.idea_news || [];
  const polls = data?.polls_open || [];
  const overdue = tr.some((x) => x.overdue);
  const plural = (key, n) => t(n === 1 ? `${key}_one` : key, { n });
  return (
    <ul>
      {tr.length > 0 && (
        <Reminder to={tr.length === 1 ? `/trainings/${tr[0].id}` : '/trainings'} icon={GraduationCap} tone={overdue ? 'alert' : 'brand'}
          title={plural(overdue ? 'greet_trainings_overdue' : 'greet_trainings', tr.length)} lines={tr.map((x) => loc(x, 'title'))} />
      )}
      {polls.length > 0 && (
        <Reminder to="/polls" icon={BarChart3} tone="brand" title={plural('greet_polls', polls.length)} lines={polls.map((p) => loc(p, 'question'))} />
      )}
      {ideas.length > 0 && (
        <Reminder to={ideas.length === 1 ? `/ideas#idea-${ideas[0].id}` : '/ideas'} icon={Lightbulb} tone="brand"
          title={plural('greet_ideas', ideas.length)} lines={ideas.map((i) => `${i.title}: ${t(`idea_status_${i.status}`)}`)} />
      )}
      {ev.length > 0 && (
        <Reminder to={ev.length === 1 ? `/articles/${ev[0].id}` : '/calendar'} icon={CalendarCheck} tone="brand"
          title={plural('greet_events', ev.length)}
          lines={ev.map((e) => `${time(e.event_date)} ${loc(e, 'title')}${e.event_location ? `, ${e.event_location}` : ''}`)} />
      )}
    </ul>
  );
}

/** Top bar, left: today's date and "Guten Morgen, Mehmet" (visitors: date and company). */
export default function Greeting({ company }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const now = new Date();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate text-sm capitalize text-muted"><time dateTime={now.toISOString().slice(0, 10)}>{today}</time></p>
      <p className="truncate font-display text-[1.2rem] font-semibold text-ink sm:text-[1.35rem]">
        {user ? t(greetingKey(now.getHours()), { name: user.first_name || user.full_name }) : company}
      </p>
    </div>
  );
}
