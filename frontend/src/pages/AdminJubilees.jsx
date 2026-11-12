/** Einstellungen → Jubiläen: anniversaries entered by HR or admins for the home page. Nothing is computed from
 * personal data - every entry is typed in by hand. */
import { useMemo, useState } from 'react';
import { PartyPopper, PenLine, Plus, Search, Trash2, X } from 'lucide-react';
import { Avatar, Button, Empty, Field, Modal, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';
import { isoDay } from '../lib/holidays';
import { JUBILEE_KINDS, jubileeLabel } from '../lib/jubilees';

const EMPTY = { user_id: null, name: '', kind: 'service', years: '', date: '', text_de: '', text_en: '' };

/** Pick a person from the directory (search as you type), or clear the choice to enter a name by hand. */
export function PersonPicker({ people, value, onChange }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const chosen = people.find((p) => p.id === value);
  const hits = q.trim() ? people.filter((p) => `${p.full_name} ${p.department}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  if (chosen) {
    return (
      <span className="inline-flex items-center gap-2 rounded-sm bg-brand-soft py-1 pl-1 pr-2 text-sm text-ink">
        <Avatar person={chosen} size={24} />{chosen.full_name}<span className="text-muted">{chosen.department}</span>
        <button type="button" onClick={() => onChange(null)} aria-label={t('delete')} className="rounded p-0.5 hover:text-alert"><X size={14} /></button>
      </span>
    );
  }
  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('jb_pick_person')} className={`${inputClass} pl-9`} />
      {hits.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onChange(p.id); setQ(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2">
                <Avatar person={p} size={24} /><span className="font-medium">{p.full_name}</span><span className="text-muted">{p.department}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JubileeForm({ initial, people, onClose, onSaved }) {
  const { t } = useI18n();
  const [f, setF] = useState(() => ({ ...EMPTY, ...initial, years: initial?.years ?? '', date: initial?.date || '' }));
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const save = async (e) => {
    e.preventDefault();
    const body = { user_id: f.user_id || null, name: f.name, kind: f.kind, years: f.years === '' ? null : Number(f.years), date: f.date,
      text_de: f.text_de, text_en: f.text_en };
    try {
      await api(initial?.id ? `/jubilees/${initial.id}` : '/jubilees', { method: initial?.id ? 'PUT' : 'POST', body });
      onSaved();
    } catch (err) { setError(err.message); }
  };
  const remove = async () => {
    if (!window.confirm(t('jb_delete_confirm'))) return;
    await api(`/jubilees/${initial.id}`, { method: 'DELETE' });
    onSaved();
  };
  return (
    <Modal title={initial?.id ? t('jb_edit') : t('jb_new')} size="lg" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label={t('jb_person')} hint={t('jb_person_hint')}>
          <PersonPicker people={people} value={f.user_id} onChange={(id) => setF((x) => ({ ...x, user_id: id }))} />
        </Field>
        {!f.user_id && <Field label={t('jb_name')}><input maxLength={160} className={inputClass} value={f.name} onChange={set('name')} /></Field>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('jb_kind')}>
            <select className={inputClass} value={f.kind} onChange={set('kind')}>
              {JUBILEE_KINDS.map((k) => <option key={k} value={k}>{t(`jb_kind_${k}`)}</option>)}
            </select>
          </Field>
          <Field label={t('jb_years')} hint={t('jb_years_hint')}><input type="number" min={1} max={99} className={inputClass} value={f.years} onChange={set('years')} /></Field>
          <Field label={t('jb_date')}><input type="date" required className={inputClass} value={f.date} onChange={set('date')} /></Field>
        </div>
        <Field label={t('jb_text')}><input maxLength={300} className={inputClass} value={f.text_de} onChange={set('text_de')} /></Field>
        <Field label={t('jb_text_en')}><input maxLength={300} className={inputClass} value={f.text_en} onChange={set('text_en')} /></Field>
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

export default function AdminJubilees() {
  const { t, fmtDate } = useI18n();
  const list = useFetch('/jubilees', { params: { all: 1 } }, 'admin-jubilees');
  const users = useFetch('/users', undefined, 'admin-jb-users');
  const [edit, setEdit] = useState(null);
  const people = useMemo(() => users.data || [], [users.data]);
  const today = isoDay(new Date());
  const items = list.data || [];
  const upcoming = [...items.filter((j) => j.date >= today)].sort((a, b) => a.date.localeCompare(b.date));
  const past = items.filter((j) => j.date < today);

  const row = (j) => (
    <li key={j.id} className="flex items-center gap-4 px-4 py-3">
      <span className="w-24 shrink-0 font-mono text-sm text-muted">{fmtDate(`${j.date}T12:00`, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      {j.person
        ? <Avatar person={j.person} size={36} />
        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text"><PartyPopper size={17} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-tight">{j.name}</span>
        <span className="block truncate text-sm text-muted">{jubileeLabel(t, j)}{j.text_de ? ` · ${j.text_de}` : ''}</span>
      </span>
      <Button variant="ghost" className="px-3 py-1 text-sm" onClick={() => setEdit(j)}><PenLine size={15} />{t('edit')}</Button>
    </li>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl text-muted">{t('jb_intro')}</p>
        <Button onClick={() => setEdit({})}><Plus size={17} />{t('jb_new')}</Button>
      </div>
      {list.data && !items.length && <div className="mt-6"><Empty>{t('jb_empty')}</Empty></div>}
      {upcoming.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-lg font-semibold">{t('jb_upcoming')} <span className="text-sm font-normal text-muted">{upcoming.length}</span></h2>
          <ul className="card divide-y divide-line">{upcoming.map(row)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-lg font-semibold text-muted">{t('jb_past')} <span className="text-sm font-normal">{past.length}</span></h2>
          <ul className="card divide-y divide-line opacity-80">{past.map(row)}</ul>
        </section>
      )}
      {edit && (
        <JubileeForm key={edit.id || 'new'} initial={edit} people={people} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); list.reload(); }} />
      )}
    </div>
  );
}
