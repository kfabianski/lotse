/** Admin: trainings (Schulungen) – create, add materials, assign to people/departments/groups, see who confirmed. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3, CheckCircle2, Download, FileDown, FileText, GraduationCap, Image as ImageIcon, Link2, PenLine, PlayCircle, Plus,
  RotateCcw, Search, Trash2, Upload, Users, X, Eye, Clock3, Mail,
} from 'lucide-react';
import RichTextEditor from '../components/RichText';
import { Avatar, Button, Field, Modal, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api, downloadFile } from '../lib/api';
import { fileSize } from './Documents';

const KIND_ICON = { pdf: FileText, video: PlayCircle, image: ImageIcon, link: Link2 };
const EMPTY = { title_de: '', title_en: '', description_de: '', description_en: '', due_date: '', active: true, open_to_all: false, targets: [{ kind: 'all', value: '' }] };

function Chip({ active, onClick, children, color }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1 text-sm ${active ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-muted'}`}>
      {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}{children}
    </button>
  );
}

/** Who must do the training: everyone, departments, groups, job titles, single people. */
function TargetPicker({ value, onChange, departments, groups, people, positions = [] }) {
  const { t } = useI18n();
  const branchList = useFetch('/branches', undefined, 'branches');
  const [q, setQ] = useState('');
  const [pq, setPq] = useState('');
  const has = (kind, v = '') => value.some((x) => x.kind === kind && x.value === String(v));
  const toggle = (kind, v = '') => onChange(has(kind, v) ? value.filter((x) => !(x.kind === kind && x.value === String(v))) : [...value, { kind, value: String(v) }]);
  const chosen = people.filter((p) => has('user', p.id));
  const hits = q.trim() ? people.filter((p) => !has('user', p.id) && `${p.full_name} ${p.department} ${p.position}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={has('all')} onChange={() => toggle('all')} className="h-4 w-4 accent-[var(--brand)]" />{t('tr_assign_all')}</label>
      <label className="flex items-start gap-2"><input type="checkbox" checked={has('newcomers')} onChange={() => toggle('newcomers')} className="mt-1 h-4 w-4 accent-[var(--brand)]" />
        <span><span className="block font-medium">{t('tr_assign_newcomers')}</span><span className="block text-sm text-muted">{t('tr_assign_newcomers_hint')}</span></span></label>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('tr_assign_depts')}</p>
        <div className="flex flex-wrap gap-1.5">{departments.map((d) => <Chip key={d.id} color={d.color} active={has('department', d.name)} onClick={() => toggle('department', d.name)}>{d.name}</Chip>)}</div>
      </div>
      {(branchList.data || []).length > 0 && (
        <div>
          <p className="mb-1.5 text-sm text-muted">{t('tr_assign_branches')}</p>
          <div className="flex flex-wrap gap-1.5">{branchList.data.map((b) => <Chip key={b.id} active={has('branch', b.id)} onClick={() => toggle('branch', b.id)}>{b.name}</Chip>)}</div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('tr_assign_groups')}</p>
        <div className="flex flex-wrap gap-1.5">{groups.map((g) => <Chip key={g.id} active={has('group', g.id)} onClick={() => toggle('group', g.id)}><Users size={13} />{g.name}</Chip>)}</div>
      </div>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('tr_assign_positions')}</p>
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.filter((x) => x.kind === 'position').map((x) => (
            <span key={x.value} className="inline-flex items-center gap-1.5 rounded-sm bg-brand-soft px-2.5 py-0.5 text-sm text-brand-text">
              {x.value}<button type="button" onClick={() => toggle('position', x.value)} aria-label={t('delete')}><X size={13} /></button>
            </span>
          ))}
        </div>
        <input list="tr-positions" value={pq} onChange={(e) => setPq(e.target.value)} placeholder={t('tr_position_ph')}
          onKeyDown={(e) => { if (e.key === 'Enter' && pq.trim()) { e.preventDefault(); if (!has('position', pq.trim())) toggle('position', pq.trim()); setPq(''); } }}
          onBlur={() => { if (positions.includes(pq.trim()) && !has('position', pq.trim())) { toggle('position', pq.trim()); setPq(''); } }}
          className={`${inputClass} py-1.5 text-sm`} />
        <datalist id="tr-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
      </div>
      <div>
        <p className="mb-1.5 text-sm text-muted">{t('tr_assign_people')}</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chosen.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-sm bg-brand-soft py-0.5 pl-1 pr-2 text-sm text-brand-text">
              <Avatar person={p} size={20} />{p.full_name}
              <button type="button" onClick={() => toggle('user', p.id)} aria-label={t('delete')}><X size={13} /></button>
            </span>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tr_search_person')} className={`${inputClass} pl-9 py-1.5 text-sm`} />
          {hits.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
              {hits.map((p) => (
                <li key={p.id}><button type="button" onClick={() => { toggle('user', p.id); setQ(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2">
                  <Avatar person={p} size={24} /><span className="font-medium">{p.full_name}</span><span className="text-muted">{p.department}</span></button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Materials of a training. Before the first save, files and links are queued (``pending``) and uploaded on save. */
function Materials({ training, pending, setPending, onChanged }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [link, setLink] = useState({ name: '', url: '' });
  const [error, setError] = useState('');
  const saved = Boolean(training.id);
  const guard = async (fn) => { setError(''); try { await fn(); await onChanged(); } catch (e) { setError(e.message); } };
  const addFiles = (files) => {
    if (!files.length) return;
    if (!saved) { setPending((p) => ({ ...p, files: [...p.files, ...files] })); return; }
    guard(async () => {
      setBusy(true);
      try {
        for (const file of files) {
          const form = new FormData();
          form.append('file', file);
          await api(`/trainings/${training.id}/materials`, { method: 'POST', form });
        }
      } finally { setBusy(false); }
    });
  };
  const addLink = () => {
    if (!saved) { setPending((p) => ({ ...p, links: [...p.links, link] })); setLink({ name: '', url: '' }); return; }
    guard(async () => { await api(`/trainings/${training.id}/links`, { method: 'POST', body: link }); setLink({ name: '', url: '' }); });
  };
  const kindOf = (f) => (f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : 'pdf');
  const rows = [
    ...training.materials.map((m) => ({ key: `m${m.id}`, kind: m.kind, name: m.name, meta: m.kind === 'link' ? m.url : fileSize(m.size),
      remove: () => guard(() => api(`/trainings/materials/${m.id}`, { method: 'DELETE' })) })),
    ...pending.files.map((f, i) => ({ key: `f${i}`, kind: kindOf(f), name: f.name, meta: `${fileSize(f.size)} · ${t('tr_pending')}`, pending: true,
      remove: () => setPending((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) })) })),
    ...pending.links.map((l, i) => ({ key: `l${i}`, kind: 'link', name: l.name, meta: `${l.url} · ${t('tr_pending')}`, pending: true,
      remove: () => setPending((p) => ({ ...p, links: p.links.filter((_, j) => j !== i) })) })),
  ];
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="card divide-y divide-line">
          {rows.map((r) => {
            const Icon = KIND_ICON[r.kind] || FileText;
            return (
              <li key={r.key} className={`flex items-center gap-3 px-3 py-2 text-sm ${r.pending ? 'bg-signal/5' : ''}`}>
                {r.pending ? <Clock3 size={16} className="shrink-0 text-signal" /> : <Icon size={17} className="shrink-0 text-muted" />}
                <span className="min-w-0 flex-1"><span className="block truncate">{r.name}</span><span className="block truncate text-xs text-muted">{r.meta}</span></span>
                <button type="button" onClick={r.remove} aria-label={t('delete')} className="rounded p-1 text-muted hover:text-alert"><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles([...e.dataTransfer.files]); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-5 text-center text-sm hover:border-brand hover:text-brand-text ${drag ? 'border-brand bg-brand-soft text-brand-text' : 'border-line text-muted'} ${busy ? 'opacity-60' : ''}`}>
        <Upload size={20} /><span className="font-medium">{busy ? t('tr_uploading') : t('tr_drop')}</span>
        <span className="text-sm">PDF, MP4/WebM, JPG/PNG</span>
        <input type="file" multiple disabled={busy} accept="application/pdf,video/mp4,video/webm,image/jpeg,image/png,image/webp" className="sr-only"
          onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
      </label>
      <div className="grid gap-2">
        <input value={link.name} onChange={(e) => setLink({ ...link, name: e.target.value })} placeholder={t('tr_link_name')} className={`${inputClass} py-1.5 text-sm`} />
        <div className="flex gap-2">
          <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder={t('tr_link_url')} className={`${inputClass} flex-1 py-1.5 text-sm`} />
          <Button variant="outline" className="py-1.5 text-sm" disabled={!link.name || !link.url} onClick={addLink}><Link2 size={15} />{t('tr_add_link')}</Button>
        </div>
      </div>
      {error && <p className="text-sm text-alert">{t('error_generic', { msg: error })}</p>}
    </div>
  );
}

/** Large dialog: content with a rich-text editor (DE/EN) on the left, settings, assignment and materials on the right. */
function TrainingEditor({ initial, departments, groups, people, onClose, onSaved }) {
  const { t } = useI18n();
  const { data: positions } = useFetch('/trainings/positions/all', undefined, 'tr-positions');
  const [edit, setEdit] = useState(initial);
  const [pending, setPending] = useState({ files: [], links: [] });
  const [tab, setTab] = useState('de');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));

  const refresh = async (id) => {
    const rows = await api('/trainings');
    const row = rows.find((r) => r.id === id);
    if (row) setEdit((e) => ({ ...e, id: row.id, materials: row.materials }));
    onSaved();
  };

  const save = async (e) => {
    e.preventDefault();
    if (!edit.title_de.trim()) { setTab('de'); setError(t('tr_title_required')); return; }
    setBusy(true);
    setError('');
    try {
      const body = { ...edit, due_date: edit.due_date || null };
      const saved = await api(edit.id ? `/trainings/${edit.id}` : '/trainings', { method: edit.id ? 'PUT' : 'POST', body });
      for (const file of pending.files) {
        const form = new FormData();
        form.append('file', file);
        await api(`/trainings/${saved.id}/materials`, { method: 'POST', form });
      }
      for (const l of pending.links) await api(`/trainings/${saved.id}/links`, { method: 'POST', body: l });
      setPending({ files: [], links: [] });
      await refresh(saved.id);
      setFlash(t('tr_saved'));
      setTimeout(() => setFlash(''), 1800);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <Modal title={edit.id ? t('tr_edit') : t('tr_new')} size="full" onClose={onClose}>
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between border-b border-line">
            <div role="tablist" className="flex gap-6">
              {[['de', t('german')], ['en', t('english')]].map(([code, label]) => (
                <button key={code} type="button" role="tab" aria-selected={tab === code} onClick={() => setTab(code)}
                  className={`-mb-px border-b-[3px] pb-2 font-medium ${tab === code ? 'border-signal text-ink' : 'border-transparent text-muted'}`}>{label}</button>
              ))}
            </div>
            <span className="pb-2 text-sm font-medium text-muted">{t('tr_content')}</span>
          </div>
          <Field label={tab === 'de' ? t('tr_title_de') : t('tr_title_en')}>
            <input maxLength={200} className={`${inputClass} text-lg font-semibold`} value={edit[`title_${tab}`]} onChange={(e) => set(`title_${tab}`, e.target.value)} />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-muted">{tab === 'de' ? t('tr_desc_de').replace(', Markdown', '') : t('tr_desc_en')}</span>
            <RichTextEditor key={tab} value={edit[`description_${tab}`]} onChange={(v) => set(`description_${tab}`, v)} minHeight={320} maxHeight="min(52vh, 520px)" />
          </div>
        </div>

        <aside className="space-y-5">
          <section className="space-y-3 rounded-xl bg-bg p-4">
            <p className="text-sm font-semibold">{t('tr_basics')}</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />{t('tr_active')}</label>
            <Field label={t('tr_due_date')}><input type="date" className={inputClass} value={edit.due_date || ''} onChange={(e) => set('due_date', e.target.value)} /></Field>
          </section>
          <section>
            <p className="mb-1.5 text-sm font-semibold">{t('tr_assign')}</p>
            <label className="mb-2 flex items-start gap-2 rounded-xl border border-line bg-bg p-3 text-sm">
              <input type="checkbox" checked={Boolean(edit.open_to_all)} onChange={(e) => set('open_to_all', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
              <span><span className="font-medium">{t('tr_open_to_all')}</span><span className="block text-xs text-muted">{t('tr_open_to_all_hint')}</span></span>
            </label>
            <p className="mb-1 text-xs text-muted">{t('tr_mandatory_for')}</p>
            <TargetPicker value={edit.targets} onChange={(targets) => set('targets', targets)} departments={departments} groups={groups} people={people} positions={positions || []} />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted"><Mail size={13} className="mt-0.5 shrink-0" aria-hidden />{t('tr_mail_hint')}</p>
          </section>
          <section>
            <p className="mb-1.5 text-sm font-semibold">{t('tr_materials')}</p>
            <Materials training={edit} pending={pending} setPending={setPending} onChanged={() => refresh(edit.id)} />
          </section>
        </aside>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4 lg:col-span-2">
          {error && <p className="mr-auto text-sm text-alert">{t('error_generic', { msg: error })}</p>}
          {flash && <p className="mr-auto text-sm text-safe">{flash}</p>}
          {edit.id && <Link to={`/trainings/${edit.id}`} target="_blank" className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"><Eye size={15} />{t('tr_preview')}</Link>}
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy ? t('tr_uploading') : edit.id ? t('save') : t('tr_create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Report({ training, onClose, onRenewed }) {
  const { t, fmtDate } = useI18n();
  const { data, reload } = useFetch(`/trainings/${training.id}/report`, undefined, `report-${training.id}-${training.version}`);
  const [error, setError] = useState('');
  const renew = async () => {
    if (!window.confirm(t('tr_renew_confirm'))) return;
    try { await api(`/trainings/${training.id}/renew`, { method: 'POST' }); await onRenewed(); reload(); } catch (e) { setError(e.message); }
  };
  const csv = () => downloadFile(`/trainings/${training.id}/report.csv`, `schulung-${training.id}.csv`).catch((e) => setError(e.message));
  const total = data ? data.done.length + data.open.length : 0;
  return (
    <Modal title={training.title_de} size="lg" onClose={onClose}>
      {!data ? <p className="text-muted">{t('loading')}</p> : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{t('tr_progress', { d: data.done.length, n: total })} · {t('tr_round', { n: data.version })}</span>
              <span className="flex gap-1">
                <Button variant="outline" className="py-1 text-sm" onClick={csv}><Download size={15} />{t('tr_csv')}</Button>
                <Button variant="outline" className="py-1 text-sm" onClick={renew}><RotateCcw size={15} />{t('tr_renew')}</Button>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-sm bg-surface-2"><div className="h-full rounded-sm bg-safe" style={{ width: `${total ? (data.done.length / total) * 100 : 0}%` }} /></div>
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {[['open', t('tr_open_people')], ['done', t('tr_done_people')], ...(data.voluntary?.length ? [['voluntary', t('tr_voluntary_people')]] : [])].map(([k, label]) => (
              <div key={k}>
                <p className="mb-2 text-sm font-medium">{label} <span className="text-muted">{data[k].length}</span></p>
                <ul className="thin-scroll max-h-80 space-y-1 overflow-y-auto">
                  {data[k].map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                      <Avatar person={p} size={28} />
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.full_name}</span>
                        <span className="block truncate text-xs text-muted">{k !== 'open' ? fmtDate(p.completed_at) : `${p.department}${p.earlier_round ? ` · ${t('tr_earlier')}` : ''}`}</span></span>
                      {k !== 'open' && <CheckCircle2 size={15} className="text-safe" />}
                      {k !== 'open' && (
                        <button type="button" aria-label={t('tr_certificate')} title={t('tr_certificate')} className="rounded p-1 text-muted hover:text-brand-text"
                          onClick={() => downloadFile(`/trainings/${training.id}/certificate.pdf?user_id=${p.id}`, `schulungsnachweis-${training.id}-${p.id}.pdf`).catch((e) => setError(e.message))}>
                          <FileDown size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Groups({ groups, people, reload }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(edit.id ? `/trainings/groups/${edit.id}` : '/trainings/groups', { method: edit.id ? 'PUT' : 'POST', body: { name: edit.name, member_ids: edit.member_ids } });
      setEdit(null); reload();
    } catch (err) { setError(err.message); }
  };
  const remove = async (g) => { if (window.confirm(t('confirm_delete'))) { await api(`/trainings/groups/${g.id}`, { method: 'DELETE' }); reload(); } };
  const shown = people.filter((p) => !q.trim() || `${p.full_name} ${p.department}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold tracking-tight">{t('tr_groups')}</h2><p className="text-sm text-muted">{t('tr_groups_hint')}</p></div>
        <Button variant="outline" onClick={() => { setError(''); setEdit({ name: '', member_ids: [] }); }}><Plus size={16} />{t('tr_new_group')}</Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <li key={g.id} className="card flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-sm">
            <Users size={15} className="text-muted" /><span className="font-medium">{g.name}</span><span className="text-muted">{g.member_ids.length}</span>
            <button type="button" onClick={() => { setError(''); setEdit(g); }} aria-label={t('edit')} className="rounded p-1 text-muted hover:text-ink"><PenLine size={14} /></button>
            <button type="button" onClick={() => remove(g)} aria-label={t('delete')} className="rounded p-1 text-muted hover:text-alert"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
      {edit && (
        <Modal title={edit.id ? edit.name : t('tr_new_group')} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label={t('tr_group_name')}><input required maxLength={80} className={inputClass} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('tr_members')} <span className="text-muted">{edit.member_ids.length}</span></p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tr_search_person')} className={`${inputClass} mb-2 py-1.5 text-sm`} />
              <ul className="thin-scroll max-h-72 space-y-0.5 overflow-y-auto">
                {shown.map((p) => {
                  const on = edit.member_ids.includes(p.id);
                  return (
                    <li key={p.id}><label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                      <input type="checkbox" checked={on} className="h-4 w-4 accent-[var(--brand)]"
                        onChange={() => setEdit({ ...edit, member_ids: on ? edit.member_ids.filter((x) => x !== p.id) : [...edit.member_ids, p.id] })} />
                      <Avatar person={p} size={24} /><span className="font-medium">{p.full_name}</span><span className="text-muted">{p.department}</span>
                    </label></li>
                  );
                })}
              </ul>
            </div>
            {error && <p className="text-sm text-alert">{error}</p>}
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>{t('cancel')}</Button><Button type="submit">{t('save')}</Button></div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default function AdminTrainings() {
  const { t, fmtDate } = useI18n();
  const list = useFetch('/trainings', undefined, 'admin-trainings');
  const groups = useFetch('/trainings/groups/all', undefined, 'admin-tr-groups');
  const departments = useFetch('/departments');
  const users = useFetch('/users', undefined, 'admin-tr-users');
  const [edit, setEdit] = useState(null);
  const [report, setReport] = useState(null);
  const [params, setParams] = useSearchParams();
  const people = useMemo(() => users.data || [], [users.data]);
  useEffect(() => {  // "Neue Schulung" from the trainings page or the user menu
    if (params.get('new') === '1') {
      setEdit({ ...EMPTY, materials: [] });
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);
  const trainings = list.data || [];

  const branchNames = useFetch('/branches', undefined, 'branches');
  const names = (targets) => targets.map((x) => {
    if (x.kind === 'all') return t('tr_assign_all');
    if (x.kind === 'newcomers') return t('tr_assign_newcomers');
    if (x.kind === 'department') return x.value;
    if (x.kind === 'group') return (groups.data || []).find((g) => String(g.id) === x.value)?.name || '?';
    if (x.kind === 'position') return `${t('tr_position_short')}: ${x.value}`;
    if (x.kind === 'branch') return `${t('branch')}: ${(branchNames.data || []).find((b) => String(b.id) === x.value)?.name || '?'}`;
    return people.find((p) => String(p.id) === x.value)?.full_name || '?';
  }).join(', ');

  const remove = async (tr) => {
    if (!window.confirm(t('confirm_delete'))) return;
    await api(`/trainings/${tr.id}`, { method: 'DELETE' });
    list.reload();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdit({ ...EMPTY, materials: [] })}><Plus size={17} />{t('tr_new')}</Button>
      </div>
      {list.data && !trainings.length && <p className="text-muted">{t('tr_empty_admin')}</p>}
      <ul className="space-y-3">
        {trainings.map((tr) => (
          <li key={tr.id} className={`card flex flex-wrap items-center gap-4 px-5 py-4 ${tr.active ? '' : 'opacity-60'}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><GraduationCap size={21} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{tr.title_de}{!tr.active && <span className="ml-2 text-xs font-normal text-muted">{t('tr_inactive')}</span>}</p>
              <p className="truncate text-sm text-muted">{names(tr.targets)}{tr.due_date ? ` · ${t('tr_due', { d: fmtDate(tr.due_date) })}` : ''} · {t('tr_round', { n: tr.version })}</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 w-40 overflow-hidden rounded-sm bg-surface-2"><div className="h-full rounded-sm bg-safe" style={{ width: `${tr.assigned ? (tr.done / tr.assigned) * 100 : 0}%` }} /></div>
                <span className="text-xs text-muted">{t('tr_progress', { d: tr.done, n: tr.assigned })}{tr.voluntary ? ` · ${t('tr_voluntary_count', { n: tr.voluntary })}` : ''}</span>
                {tr.open_to_all && <span className="rounded-sm bg-safe/10 px-2 py-0.5 text-xs font-medium text-safe">{t('tr_open_badge')}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" className="py-1.5 text-sm" onClick={() => setReport(tr)}><BarChart3 size={15} />{t('tr_report')}</Button>
              <Button variant="ghost" className="py-1.5 text-sm" onClick={() => setEdit({ ...tr, due_date: tr.due_date || '' })}><PenLine size={15} />{t('edit')}</Button>
              <Button variant="danger" className="px-2 py-1.5" onClick={() => remove(tr)} aria-label={t('delete')}><Trash2 size={15} /></Button>
            </div>
          </li>
        ))}
      </ul>

      <Groups groups={groups.data || []} people={people} reload={groups.reload} />

      {edit && (
        <TrainingEditor key={edit.id || 'new'} initial={edit} departments={departments.data || []} groups={groups.data || []} people={people}
          onClose={() => setEdit(null)} onSaved={list.reload} />
      )}
      {report && <Report training={report} onClose={() => setReport(null)} onRenewed={async () => { list.reload(); const rows = await api('/trainings'); setReport(rows.find((r) => r.id === report.id) || null); }} />}
    </div>
  );
}
