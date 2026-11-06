import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, MessageSquareReply, Star, Trash2 } from 'lucide-react';
import { Avatar, Button, Empty, Field, Modal, inputClass, relativeDay } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export const TOPICS = ['process', 'workplace', 'it', 'safety', 'sustainability', 'other'];
const STEPS = ['new', 'review', 'planned', 'done'];
const STATUSES = [...STEPS, 'declined'];

/** Where an idea is on its way: a real sequence, so it is drawn as one. */
export function StatusTrack({ status }) {
  const { t } = useI18n();
  if (status === 'declined') {
    return <span className="inline-flex rounded-full border border-alert px-2.5 py-0.5 text-sm font-medium text-alert">{t('idea_status_declined')}</span>;
  }
  const reached = STEPS.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-sm" aria-label={t('idea_status')}>
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-1.5" aria-current={i === reached ? 'step' : undefined}>
          {i > 0 && <span aria-hidden className={`h-0.5 w-4 ${i <= reached ? 'bg-safe' : 'bg-line'}`} />}
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${
            i === reached ? (status === 'done' ? 'bg-safe text-white dark:text-[#0e151e]' : 'bg-ink text-surface')
              : i < reached ? 'text-safe' : 'text-muted'}`}>
            {t(`idea_status_${step}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Single status pill (for compact places like the home page). */
export function StatusPill({ status }) {
  const { t } = useI18n();
  const tone = { new: 'bg-surface-2 text-ink', review: 'bg-brand-soft text-brand', planned: 'bg-ink text-surface',
    done: 'bg-safe text-white dark:text-[#0e151e]', declined: 'border border-alert text-alert' }[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${tone}`}>{t(`idea_status_${status}`)}</span>;
}

/** Average stars of an idea: what colleagues like best at a glance. */
export function RatingSummary({ idea }) {
  const { t, lang } = useI18n();
  const avg = idea.rating_avg;
  return (
    <div className="flex w-24 shrink-0 flex-col items-center self-start rounded-xl border-2 border-line py-2 text-center"
      aria-label={avg ? t('idea_rating_aria', { avg: avg.toLocaleString(lang), n: idea.rating_count }) : t('idea_no_ratings')}>
      <Star size={20} className={avg ? 'fill-signal text-signal' : 'text-muted'} />
      <span className="mt-0.5 font-display text-2xl font-semibold leading-none">{avg ? avg.toLocaleString(lang, { minimumFractionDigits: 1 }) : '–'}</span>
      <span className="mt-1 text-xs text-muted">{t(idea.rating_count === 1 ? 'idea_rating_one' : 'idea_ratings', { n: idea.rating_count })}</span>
    </div>
  );
}

/** Five clickable stars. Clicking your current value again takes the rating back. */
export function StarInput({ idea, onChange }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  if (idea.mine) return <span className="text-sm text-muted">{t('idea_own')}</span>;
  const current = idea.my_rating || 0;
  const shown = hover || current;
  const rate = async (n) => {
    if (!user) return navigate('/login?next=/ideas');
    setBusy(true);
    try {
      onChange(await api(`/ideas/${idea.id}/rate`, { method: 'POST', body: { stars: n === current ? 0 : n } }));
    } finally {
      setBusy(false);
    }
    return null;
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm text-muted">{user ? t('idea_your_rating') : t('idea_rate_login')}</span>
      <span role="radiogroup" aria-label={t('idea_your_rating')} className="inline-flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={current === n} disabled={busy}
            title={n === current ? t('idea_rate_remove') : t('idea_rate_n', { n })} aria-label={t('idea_rate_n', { n })}
            onClick={() => rate(n)} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)}
            className="rounded p-0.5 transition-transform hover:scale-110 disabled:opacity-60">
            <Star size={20} className={n <= shown ? 'fill-signal text-signal' : 'text-muted'} />
          </button>
        ))}
      </span>
    </span>
  );
}

function IdeaForm({ onDone }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ title: '', body: '', topic: 'process', anonymous: false });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/ideas', { method: 'POST', body: form });
      onDone(true);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('idea_topic')}>
        <select className={inputClass} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          {TOPICS.map((k) => <option key={k} value={k}>{t(`idea_topic_${k}`)}</option>)}
        </select>
      </Field>
      <Field label={t('idea_title')} hint={t('idea_title_hint')}>
        <input required minLength={5} maxLength={160} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label={t('idea_body')} hint={t('idea_body_hint')}>
        <textarea rows={5} className={inputClass} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </Field>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 accent-[var(--brand)]" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
        <span>{t('idea_anonymous')}<span className="block text-sm text-muted">{t('idea_anonymous_hint')}</span></span>
      </label>
      {error && <p className="text-alert">{t('error_generic', { msg: error })}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onDone(false)}>{t('cancel')}</Button>
        <Button type="submit">{t('idea_submit')}</Button>
      </div>
    </form>
  );
}

function StatusForm({ idea, onDone }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ status: idea.status, response: idea.response });
  const submit = async (e) => {
    e.preventDefault();
    onDone(await api(`/ideas/${idea.id}/status`, { method: 'PATCH', body: form }));
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('idea_status')}>
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`idea_status_${s}`)}</option>)}
        </select>
      </Field>
      <Field label={t('idea_response')}>
        <textarea rows={4} className={inputClass} value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onDone(null)}>{t('cancel')}</Button>
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  );
}

export default function Ideas() {
  const { t, fmtDate } = useI18n();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('top');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, reload } = useFetch('/ideas', { params: { status, sort } }, `${status}:${sort}`);
  const [patched, setPatched] = useState({});
  const ideas = (data || []).map((i) => patched[i.id] || i);
  const update = (idea) => idea && setPatched((p) => ({ ...p, [idea.id]: idea }));

  const start = () => (user ? setOpen(true) : navigate('/login?next=/ideas'));
  const remove = async (idea) => {
    if (!window.confirm(t('confirm_delete'))) return;
    await api(`/ideas/${idea.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('ideas_title')}</h1>
          <p className="mt-2 text-lg text-muted">{t('ideas_intro')}</p>
        </div>
        <Button onClick={start}><Lightbulb size={18} />{t('idea_submit')}</Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap gap-2">
          {['', ...STATUSES].map((s) => (
            <button key={s || 'all'} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
              className={`rounded-full border px-4 py-1.5 font-medium ${status === s ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'}`}>
              {s ? t(`idea_status_${s}`) : t('all')}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t('idea_sort')} className="flex rounded-full border border-line p-0.5 text-sm">
          {[['top', t('idea_sort_top')], ['new', t('idea_sort_new')]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setSort(k)} aria-pressed={sort === k}
              className={`rounded-full px-3 py-1 font-medium ${sort === k ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {data && !ideas.length && <Empty action={<Button onClick={start}>{t('idea_submit')}</Button>}>{t('ideas_empty')}</Empty>}
        <ul className="space-y-4">
          {ideas.map((idea) => (
            <li key={idea.id} className="flex gap-5 card p-5">
              <RatingSummary idea={idea} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="text-sm font-medium text-muted">{t(`idea_topic_${idea.topic}`)}</span>
                  <StatusTrack status={idea.status} />
                </div>
                <h2 className="mt-1 font-display text-[1.25rem] font-semibold leading-tight">{idea.title}</h2>
                {idea.body && <p className="mt-2 max-w-[70ch] whitespace-pre-line text-muted">{idea.body}</p>}

                {idea.response && (
                  <div className="mt-4 max-w-[70ch] rounded-lg border-l-4 border-signal bg-bg px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium"><MessageSquareReply size={15} />{t('idea_response')}
                      {idea.status_changed_at && <span className="font-normal text-muted">{fmtDate(idea.status_changed_at)}</span>}</p>
                    <p className="mt-1">{idea.response}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                  {idea.author
                    ? <span className="inline-flex items-center gap-2"><Avatar person={idea.author} size={26} />{idea.author.full_name}{idea.anonymous && ` (${t('idea_anonymous_short')})`}</span>
                    : <span>{t('idea_anonymous_short')}</span>}
                  <span>{relativeDay(t, idea.created_at)}</span>
                  <StarInput idea={idea} onChange={update} />
                  <span className="ml-auto flex gap-1">
                    {can('editor') && <Button variant="ghost" className="px-3 py-1 text-sm" onClick={() => setEditing(idea)}>{t('idea_set_status')}</Button>}
                    {user && (idea.mine || can('editor')) && (
                      <button type="button" onClick={() => remove(idea)} aria-label={t('delete')} className="rounded p-1.5 hover:bg-surface-2 hover:text-alert"><Trash2 size={16} /></button>
                    )}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <Modal title={t('idea_submit')} onClose={() => setOpen(false)}>
          <IdeaForm onDone={(saved) => { setOpen(false); if (saved) { setSort('new'); setStatus(''); reload(); } }} />
        </Modal>
      )}
      {editing && (
        <Modal title={editing.title} onClose={() => setEditing(null)}>
          <StatusForm idea={editing} onDone={(idea) => { update(idea); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
