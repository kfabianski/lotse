/** Stellenangebote: internal job postings. Everybody reads the open ones; people with the "jobs" permission
 * (HR, admins) add, edit, close and delete them right here. Applying happens by mail or phone with the contact. */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, Mail, PenLine, Phone, Plus, Trash2 } from 'lucide-react';
import { Avatar, Button, Empty, Field, Modal, inputClass } from '../components/ui';
import RichTextEditor, { RichText } from '../components/RichText';
import { PersonPicker } from './AdminJubilees';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';
import { JOB_TYPES, jobFacts, jobTitle } from '../lib/jobs';

const EMPTY = { title_de: '', title_en: '', department: '', branch_id: null, employment: 'full', hours: '', start: '',
  description_de: '', description_en: '', contact_id: null, apply_until: '', active: true };

/** Status chip for the people who manage postings: draft/filled, expired, open. */
function JobState({ job }) {
  const { t } = useI18n();
  if (!job.active) return <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{t('job_inactive')}</span>;
  if (!job.open) return <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs font-medium text-alert">{t('job_expired')}</span>;
  return <span className="rounded-sm bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-text">{t('job_open')}</span>;
}

function Deadline({ job }) {
  const { t, fmtDate } = useI18n();
  if (!job.apply_until) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarClock size={14} aria-hidden />{t('job_until', { d: fmtDate(`${job.apply_until}T12:00`, { day: '2-digit', month: '2-digit', year: 'numeric' }) })}
    </span>
  );
}

function JobForm({ initial, people, onClose, onSaved }) {
  const { t } = useI18n();
  const departments = useFetch('/departments', undefined, 'departments');
  const branches = useFetch('/branches', undefined, 'branches');
  const [f, setF] = useState(() => ({ ...EMPTY, ...initial, apply_until: initial?.apply_until || '' }));
  const [tab, setTab] = useState('de');
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const save = async (e) => {
    e.preventDefault();
    const body = { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k]])),
      branch_id: f.branch_id ? Number(f.branch_id) : null, apply_until: f.apply_until || null };
    try {
      await api(initial?.id ? `/jobs/${initial.id}` : '/jobs', { method: initial?.id ? 'PUT' : 'POST', body });
      onSaved();
    } catch (err) { setError(err.message); }
  };
  const remove = async () => {
    if (!window.confirm(t('job_delete_confirm'))) return;
    await api(`/jobs/${initial.id}`, { method: 'DELETE' });
    onSaved();
  };
  return (
    <Modal title={initial?.id ? t('job_edit') : t('job_new')} size="xl" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('job_title')}><input required minLength={3} maxLength={160} className={inputClass} value={f.title_de} onChange={set('title_de')} placeholder={t('job_title_ph')} /></Field>
        <Field label={t('job_title_en')}><input maxLength={160} className={inputClass} value={f.title_en} onChange={set('title_en')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('job_type')}>
            <select className={inputClass} value={f.employment} onChange={set('employment')}>
              {JOB_TYPES.map((k) => <option key={k} value={k}>{t(`job_type_${k}`)}</option>)}
            </select>
          </Field>
          <Field label={t('job_hours')}><input maxLength={60} className={inputClass} value={f.hours} onChange={set('hours')} placeholder={t('job_hours_ph')} /></Field>
          <Field label={t('job_start')}><input maxLength={60} className={inputClass} value={f.start} onChange={set('start')} placeholder={t('job_start_ph')} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('job_department')}>
            <select className={inputClass} value={f.department} onChange={set('department')}>
              <option value="">—</option>
              {(departments.data || []).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label={t('job_branch')}>
            <select className={inputClass} value={f.branch_id || ''} onChange={set('branch_id')}>
              <option value="">—</option>
              {(branches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label={t('job_apply_until')} hint={t('job_apply_until_hint')}><input type="date" className={inputClass} value={f.apply_until} onChange={set('apply_until')} /></Field>
        </div>
        <Field label={t('job_contact')} hint={t('job_contact_hint')}>
          <PersonPicker people={people} value={f.contact_id} onChange={(id) => setF((x) => ({ ...x, contact_id: id }))} />
        </Field>
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-muted">{t('job_description')}</span>
            {['de', 'en'].map((l) => (
              <button key={l} type="button" onClick={() => setTab(l)} aria-pressed={tab === l}
                className={`rounded-sm border px-2 py-0.5 text-xs font-medium uppercase ${tab === l ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{l}</button>
            ))}
          </div>
          <RichTextEditor key={tab} value={f[`description_${tab}`]} onChange={(v) => setF((x) => ({ ...x, [`description_${tab}`]: v }))} minHeight={220} maxHeight="min(45vh, 440px)" />
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={f.active} onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))} />
          <span><span className="block font-medium">{t('job_active')}</span><span className="block text-sm text-muted">{t('job_active_hint')}</span></span>
        </label>
        {error && <p role="alert" className="text-sm text-alert">{t('error_generic', { msg: error })}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button type="submit">{t('save')}</Button>
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          {initial?.id && <Button variant="danger" className="ml-auto" onClick={remove}><Trash2 size={16} />{t('delete')}</Button>}
        </div>
      </form>
    </Modal>
  );
}

/** One posting in full: facts, text, contact with mail (subject prefilled) and phone. */
function JobDetail({ job, onClose, onEdit }) {
  const { t, lang } = useI18n();
  const title = jobTitle(job, lang);
  const text = (lang === 'en' && job.description_en) || job.description_de;
  const c = job.contact;
  const mail = c?.email ? `mailto:${c.email}?subject=${encodeURIComponent(t('job_mail_subject', { title }))}` : null;
  return (
    <Modal title={title} size="xl" onClose={onClose}>
      <div className="space-y-5">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>{jobFacts(t, job)}</span>
          {job.start && <span>{t('job_start')}: {job.start}</span>}
          <Deadline job={job} />
        </p>
        {text ? <RichText source={text} /> : <p className="text-muted">{t('job_no_text')}</p>}
        <div className="rounded-xl border border-line p-4">
          <h3 className="mb-3 font-display font-semibold">{t('job_how_to_apply')}</h3>
          {c ? (
            <div className="flex flex-wrap items-center gap-4">
              <Avatar person={c} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{c.full_name}</span>
                <span className="block text-sm text-muted">{[c.position, c.department].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {mail && <a href={mail} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90"><Mail size={16} />{t('job_apply_mail')}</a>}
                {c.phone_ext && <a href={`tel:${c.phone_ext}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 font-medium hover:bg-surface-2"><Phone size={16} />{c.phone_ext}</a>}
              </span>
            </div>
          ) : <p className="text-sm text-muted">{t('job_no_contact')}</p>}
          <p className="mt-3 text-sm text-muted">{t('job_apply_note')}</p>
        </div>
        {onEdit && <div className="flex justify-end border-t border-line pt-4"><Button variant="ghost" onClick={onEdit}><PenLine size={15} />{t('edit')}</Button></div>}
      </div>
    </Modal>
  );
}

export default function Jobs() {
  const { t, lang } = useI18n();
  const { has } = useAuth();
  const manage = has('jobs');
  const [params, setParams] = useSearchParams();
  const list = useFetch('/jobs', manage ? { params: { all: 1 } } : undefined, `jobs-${manage ? 'all' : 'open'}`);
  const users = useFetch(manage ? '/users' : null, undefined, 'jobs-users');
  const people = useMemo(() => users.data || [], [users.data]);
  const [edit, setEdit] = useState(null);
  const items = list.data || [];
  const openId = Number(params.get('open')) || null;
  const shown = openId ? items.find((j) => j.id === openId) : null;
  const close = () => setParams((p) => { p.delete('open'); return p; }, { replace: true });
  const open = items.filter((j) => j.open);
  const closed = items.filter((j) => !j.open);

  const card = (j) => (
    <li key={j.id}>
      <button type="button" onClick={() => setParams({ open: j.id })}
        className="card flex h-full w-full flex-col gap-2 p-5 text-left transition-colors hover:border-ink">
        <span className="flex items-start justify-between gap-3">
          <span className="font-display text-lg font-semibold leading-snug text-ink">{jobTitle(j, lang)}</span>
          {manage && <JobState job={j} />}
        </span>
        <span className="text-sm text-muted">{jobFacts(t, j)}</span>
        <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted">
          {j.start && <span>{t('job_start')}: {j.start}</span>}
          <Deadline job={j} />
        </span>
      </button>
    </li>
  );

  if (list.error) return <Empty>{t('error_generic', { msg: list.error.message })}</Empty>;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('jobs_title')}</h1>
          <p className="mt-1 max-w-3xl text-muted">{t('jobs_intro')}</p>
        </div>
        {manage && <Button onClick={() => setEdit({})}><Plus size={17} />{t('job_new')}</Button>}
      </div>
      {list.data && !open.length && (
        <div className="mt-8"><Empty>{t('jobs_empty')}</Empty></div>
      )}
      {open.length > 0 && <ul className="mt-8 grid gap-4 md:grid-cols-2">{open.map(card)}</ul>}
      {manage && closed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-muted">{t('jobs_closed')} <span className="text-sm font-normal">{closed.length}</span></h2>
          <ul className="grid gap-4 opacity-80 md:grid-cols-2">{closed.map(card)}</ul>
        </section>
      )}
      {shown && !edit && (
        <JobDetail job={shown} onClose={close} onEdit={manage ? () => setEdit(shown) : null} />
      )}
      {edit && (
        <JobForm key={edit.id || 'new'} initial={edit} people={people} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); close(); list.reload(); }} />
      )}
    </div>
  );
}
