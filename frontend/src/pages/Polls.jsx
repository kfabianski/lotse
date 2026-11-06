import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Lock, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { Button, Empty, Field, Modal, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const optionText = (o, lang) => (lang === 'en' && o.en) || o.de;

/** One poll: answer form while open and not yet voted, otherwise the result bars. */
export function PollCard({ poll, onChange, onEdit, compact = false }) {
  const { t, lang, loc, fmtDate } = useI18n();
  const { user, has } = useAuth();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(poll.my_choices || []);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const voted = poll.my_choices !== null && poll.my_choices !== undefined;
  const asking = poll.open && user && (!voted || changing);
  const total = (poll.counts || []).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...(poll.counts || [0]));

  const toggle = (i) => setPicked((p) => (poll.multiple ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i]));
  const send = async (method) => {
    setBusy(true); setError('');
    try {
      const next = await api(`/polls/${poll.id}/vote`, method === 'DELETE' ? { method } : { method: 'POST', body: { choices: picked } });
      setChanging(false);
      setPicked(next.my_choices || []);
      onChange?.(next);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <article className={`card flex flex-col ${compact ? 'p-5' : 'p-6'}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        {poll.open
          ? <span className="rounded-full bg-safe/10 px-2 py-0.5 text-safe">{t('poll_open')}</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-muted"><Lock size={11} />{t('poll_closed')}</span>}
        {poll.multiple && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{t('poll_multiple')}</span>}
        {poll.open && poll.closes_at && <span className="text-muted">{t('poll_until', { d: fmtDate(poll.closes_at, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) })}</span>}
        {onEdit && has('polls') && (
          <button type="button" onClick={() => onEdit(poll)} className="ml-auto inline-flex items-center gap-1 text-muted hover:text-brand"><Pencil size={13} />{t('edit')}</button>
        )}
      </div>
      <h3 className={`mt-2 font-display font-semibold leading-snug ${compact ? 'text-lg' : 'text-xl'}`}>{loc(poll, 'question')}</h3>
      {loc(poll, 'description') && <p className="mt-1 whitespace-pre-line text-muted">{loc(poll, 'description')}</p>}

      {asking ? (
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">{loc(poll, 'question')}</legend>
          {poll.options.map((o, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 ${picked.includes(i) ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2'}`}>
              <input type={poll.multiple ? 'checkbox' : 'radio'} name={`poll-${poll.id}`} checked={picked.includes(i)} onChange={() => toggle(i)}
                className="h-4 w-4 accent-[var(--brand)]" />
              <span>{optionText(o, lang)}</span>
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={() => send('POST')} disabled={busy || !picked.length}>{t(voted ? 'poll_save' : 'poll_vote')}</Button>
            {changing && <Button variant="ghost" onClick={() => { setChanging(false); setPicked(poll.my_choices || []); }}>{t('cancel')}</Button>}
            {changing && <Button variant="danger" onClick={() => send('DELETE')} disabled={busy}>{t('poll_withdraw')}</Button>}
          </div>
        </fieldset>
      ) : (
        <div className="mt-4 space-y-2.5">
          {poll.counts ? poll.options.map((o, i) => {
            const n = poll.counts[i];
            const pct = total ? Math.round((n / (poll.multiple ? poll.voters || 1 : total)) * 100) : 0;
            const mine = poll.my_choices?.includes(i);
            return (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={`inline-flex items-center gap-1.5 ${mine ? 'font-semibold' : ''}`}>{mine && <CheckCircle2 size={14} className="text-brand" />}{optionText(o, lang)}</span>
                  <span className="shrink-0 tabular-nums text-muted">{pct} % · {n}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${n === max && n > 0 ? 'bg-brand' : 'bg-brand/45'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          }) : (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
              {voted ? t('poll_thanks_hidden') : t(poll.results === 'after_vote' ? 'poll_results_own' : 'poll_results_later')}
            </p>
          )}
          {!user && poll.open && (
            <Button variant="outline" onClick={() => navigate(`/login?next=${encodeURIComponent('/polls')}`)}>{t('poll_login')}</Button>
          )}
          {user && voted && poll.open && <button type="button" onClick={() => setChanging(true)} className="text-sm font-medium text-brand hover:underline">{t('poll_change')}</button>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-alert">{error}</p>}
      <p className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm text-muted"><Users size={14} />{t('poll_voters', { n: poll.voters })} · {t('poll_anonymous')}</p>
    </article>
  );
}

const EMPTY = { question_de: '', question_en: '', description_de: '', description_en: '', options: [{ de: '', en: '' }, { de: '', en: '' }],
  multiple: false, results: 'after_vote', closes_at: '', closed: false };

const toLocalInput = (v) => (v ? String(v).slice(0, 16) : '');

function PollEditor({ initial, onClose, onSaved }) {
  const { t } = useI18n();
  const [f, setF] = useState(() => (initial ? { ...initial, closes_at: toLocalInput(initial.closes_at) } : EMPTY));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = Boolean(initial?.voters); // with votes: rename answers only
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setOpt = (i, k, v) => set('options', f.options.map((o, j) => (j === i ? { ...o, [k]: v } : o)));

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    const body = {
      question_de: f.question_de, question_en: f.question_en, description_de: f.description_de, description_en: f.description_en,
      options: f.options.filter((o) => o.de.trim()), multiple: f.multiple, results: f.results,
      closes_at: f.closes_at || null, closed: f.closed,
    };
    try {
      await api(initial ? `/polls/${initial.id}` : '/polls', { method: initial ? 'PUT' : 'POST', body });
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(t('poll_delete_confirm'))) return;
    await api(`/polls/${initial.id}`, { method: 'DELETE' });
    onSaved();
  };

  return (
    <Modal title={initial ? t('poll_edit') : t('poll_new')} onClose={onClose} size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label={t('poll_question')}><input required minLength={3} maxLength={200} value={f.question_de} onChange={(e) => set('question_de', e.target.value)} className={inputClass} placeholder={t('poll_question_ph')} /></Field>
        <Field label={`${t('poll_question')} (EN)`} hint={t('optional')}><input maxLength={200} value={f.question_en} onChange={(e) => set('question_en', e.target.value)} className={inputClass} /></Field>
        <Field label={t('poll_description')} hint={t('optional')}><textarea rows={2} maxLength={2000} value={f.description_de} onChange={(e) => set('description_de', e.target.value)} className={inputClass} /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t('poll_options')}</p>
          {locked && <p className="mb-2 text-xs text-muted">{t('poll_options_locked')}</p>}
          <ul className="space-y-2">
            {f.options.map((o, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-sm text-muted">{i + 1}.</span>
                <input required={i < 2} maxLength={120} value={o.de} onChange={(e) => setOpt(i, 'de', e.target.value)} placeholder={t('poll_option_ph')} className={`${inputClass} py-1.5`} />
                <input maxLength={120} value={o.en} onChange={(e) => setOpt(i, 'en', e.target.value)} placeholder="EN" className={`${inputClass} w-2/5 py-1.5`} />
                {!locked && f.options.length > 2 && (
                  <button type="button" onClick={() => set('options', f.options.filter((_, j) => j !== i))} aria-label={t('delete')} className="rounded-md p-1.5 text-muted hover:text-alert"><X size={16} /></button>
                )}
              </li>
            ))}
          </ul>
          {!locked && f.options.length < 12 && (
            <Button variant="ghost" className="mt-1.5 px-2 py-1 text-sm" onClick={() => set('options', [...f.options, { de: '', en: '' }])}><Plus size={15} />{t('poll_add_option')}</Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('poll_results')}>
            <select value={f.results} onChange={(e) => set('results', e.target.value)} className={inputClass}>
              {['after_vote', 'always', 'after_close'].map((k) => <option key={k} value={k}>{t(`poll_results_${k}`)}</option>)}
            </select>
          </Field>
          <Field label={t('poll_closes')} hint={t('optional')}>
            <input type="datetime-local" value={f.closes_at} onChange={(e) => set('closes_at', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.multiple} disabled={locked} onChange={(e) => set('multiple', e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />{t('poll_multiple_label')}</label>
        {initial && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.closed} onChange={(e) => set('closed', e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />{t('poll_close_now')}</label>}
        {error && <p role="alert" className="text-sm text-alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button type="submit" disabled={busy}>{t('save')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          {initial && <Button variant="danger" className="ml-auto" onClick={remove}><Trash2 size={16} />{t('delete')}</Button>}
        </div>
      </form>
    </Modal>
  );
}

export default function Polls() {
  const { t } = useI18n();
  const { has } = useAuth();
  const { data, reload } = useFetch('/polls');
  const [patched, setPatched] = useState({});
  const [editing, setEditing] = useState(null); // null | 'new' | poll
  const polls = (data || []).map((p) => patched[p.id] || p);
  const open = polls.filter((p) => p.open);
  const closed = polls.filter((p) => !p.open);
  const update = (p) => setPatched((x) => ({ ...x, [p.id]: p }));
  const card = (p) => <PollCard key={`${p.id}-${p.my_choices?.join(',')}`} poll={p} onChange={update} onEdit={setEditing} />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('polls_title')}</h1>
          <p className="mt-1 max-w-2xl text-muted">{t('polls_intro')}</p>
        </div>
        {has('polls') && <Button onClick={() => setEditing('new')}><Plus size={18} />{t('poll_new')}</Button>}
      </div>
      {data && !polls.length && <div className="mt-8"><Empty>{t('polls_empty')}</Empty></div>}
      {open.length > 0 && <div className="mt-8 grid gap-5 lg:grid-cols-2">{open.map(card)}</div>}
      {closed.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-xl font-semibold"><BarChart3 size={20} className="text-brand" />{t('polls_closed')}</h2>
          <div className="grid gap-5 lg:grid-cols-2">{closed.map(card)}</div>
        </section>
      )}
      {editing && (
        <PollEditor initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setPatched({}); reload(); }} />
      )}
    </div>
  );
}
