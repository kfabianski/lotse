import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck, ChevronRight, GraduationCap, Lightbulb, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

function greetingKey(hour) {
  if (hour < 11) return 'greet_morning';
  if (hour < 18) return 'greet_day';
  return 'greet_evening';
}

/** One reminder tile: icon, headline, up to two lines of detail, link. */
function Reminder({ to, icon: Icon, tone, title, lines }) {
  const tones = { alert: 'bg-alert/10 text-alert', brand: 'bg-brand-soft text-brand', safe: 'bg-safe/10 text-safe' };
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:border-brand">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{title}</span>
        {lines.slice(0, 2).map((l) => <span key={l} className="block truncate text-sm text-muted">{l}</span>)}
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted group-hover:text-brand" />
    </Link>
  );
}

/** Personal start: "Guten Morgen, Mehmet" plus what is due for this person today. */
export default function Greeting() {
  const { user } = useAuth();
  const { t, lang, loc } = useI18n();
  const { data } = useFetch(user ? '/me/briefing' : null, undefined, `brief-${user?.id}`);
  if (!user) return null;
  const now = new Date();
  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const time = (v) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(v));
  const ev = data?.events_today || [];
  const tr = data?.trainings_open || [];
  const ideas = data?.idea_news || [];
  const polls = data?.polls_open || [];
  const overdue = tr.some((x) => x.overdue);
  const plural = (key, n) => t(n === 1 ? `${key}_one` : key, { n });
  const nothing = data && !ev.length && !tr.length && !ideas.length && !polls.length;

  return (
    <section aria-label={t('greet_label')} className="card overflow-hidden p-5 sm:p-6">
      <p className="text-sm font-medium capitalize text-muted">{today}</p>
      <h1 className="mt-0.5 font-display text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
        {t(greetingKey(now.getHours()), { name: user.first_name || user.full_name })}
      </h1>
      {nothing && <p className="mt-2 inline-flex items-center gap-2 text-muted"><Sparkles size={16} className="text-brand" />{t('greet_nothing')}</p>}
      {data && !nothing && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ev.length > 0 && (
            <Reminder to={ev.length === 1 ? `/articles/${ev[0].id}` : '/calendar'} icon={CalendarCheck} tone="brand"
              title={plural('greet_events', ev.length)}
              lines={ev.map((e) => `${time(e.event_date)} ${loc(e, 'title')}${e.event_location ? `, ${e.event_location}` : ''}`)} />
          )}
          {tr.length > 0 && (
            <Reminder to={tr.length === 1 ? `/trainings/${tr[0].id}` : '/trainings'} icon={GraduationCap} tone={overdue ? 'alert' : 'brand'}
              title={plural(overdue ? 'greet_trainings_overdue' : 'greet_trainings', tr.length)} lines={tr.map((x) => loc(x, 'title'))} />
          )}
          {ideas.length > 0 && (
            <Reminder to={ideas.length === 1 ? `/ideas#idea-${ideas[0].id}` : '/ideas'} icon={Lightbulb} tone="safe"
              title={plural('greet_ideas', ideas.length)}
              lines={ideas.map((i) => `${i.title} – ${t(`idea_status_${i.status}`)}`)} />
          )}
          {polls.length > 0 && (
            <Reminder to="/polls" icon={BarChart3} tone="brand" title={plural('greet_polls', polls.length)} lines={polls.map((p) => loc(p, 'question'))} />
          )}
        </div>
      )}
    </section>
  );
}
