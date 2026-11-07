import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';

/** Official department list: name, colour (used in the directory and on floor plans) and order. */
export default function AdminDepartments() {
  const { t } = useI18n();
  const { data, reload } = useFetch('/departments', undefined, 'admin-departments');
  const config = useFetch('/auth/config', undefined, 'auth-config');
  const ldapLeads = Boolean(config.data?.ldap_departments_auto);
  const [edits, setEdits] = useState({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const list = data || [];

  const guard = async (fn) => {
    setError('');
    try { await fn(); setEdits({}); reload(); } catch (err) { setError(err.message); }
  };
  const save = (d, patch = {}) => guard(() => api(`/departments/${d.id}`, { method: 'PUT', body: { name: d.name, color: d.color, sort: d.sort, ...edits[d.id], ...patch } }));
  const move = (i, dir) => guard(async () => {
    const a = list[i];
    const b = list[i + dir];
    await api(`/departments/${a.id}`, { method: 'PUT', body: { name: a.name, color: a.color, sort: i + dir } });
    await api(`/departments/${b.id}`, { method: 'PUT', body: { name: b.name, color: b.color, sort: i } });
  });

  return (
    <div className="max-w-3xl">
      {ldapLeads && <p className="mb-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm">{t('dept_ldap_leads')}</p>}
      <p className="text-muted">{t('departments_intro')}</p>
      <ul className="card mt-5 divide-y divide-line">
        {list.map((d, i) => {
          const e = { ...d, ...edits[d.id] };
          const dirty = edits[d.id] && (e.name !== d.name || e.color !== d.color);
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-sm ring-1 ring-line" title={t('color')}>
                <span className="absolute inset-0" style={{ background: e.color }} />
                <input type="color" value={e.color} className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(ev) => setEdits({ ...edits, [d.id]: { ...edits[d.id], color: ev.target.value } })} />
              </label>
              <input disabled={ldapLeads && d.source === 'ldap'} title={ldapLeads && d.source === 'ldap' ? t('dept_ldap_locked') : undefined} className={`${inputClass} min-w-[180px] flex-1`} value={e.name} aria-label={t('name')}
                onChange={(ev) => setEdits({ ...edits, [d.id]: { ...edits[d.id], name: ev.target.value } })} />
              <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${d.source === 'ldap' ? 'bg-brand-soft text-brand-text' : 'bg-surface-2 text-muted'}`}>
                {d.source === 'ldap' ? t('source_ldap') : t('source_manual')}
              </span>
              <span className="w-24 text-sm text-muted">{t('people_count', { n: d.count })}</span>
              <span className="flex items-center gap-0.5">
                {dirty && <Button className="px-3 py-1.5 text-sm" onClick={() => save(d)}>{t('save')}</Button>}
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('move_up')} className="rounded-lg p-2 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={t('move_down')} className="rounded-lg p-2 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                <button type="button" disabled={d.count > 0} title={d.count > 0 ? t('department_in_use') : t('delete')}
                  onClick={() => window.confirm(t('confirm_delete')) && guard(() => api(`/departments/${d.id}`, { method: 'DELETE' }))}
                  aria-label={t('delete')} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-alert disabled:opacity-30"><Trash2 size={16} /></button>
              </span>
            </li>
          );
        })}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(ev) => {
        ev.preventDefault();
        guard(async () => { await api('/departments', { method: 'POST', body: { name, color: '#64748b', sort: list.length } }); setName(''); });
      }}>
        <input required className={inputClass} placeholder={t('department_new')} value={name} onChange={(ev) => setName(ev.target.value)} />
        <Button type="submit"><Plus size={17} />{t('add')}</Button>
      </form>
      {error && <p className="mt-3 text-alert">{t('error_generic', { msg: error })}</p>}
      <p className="mt-4 text-sm text-muted">{t('departments_rename_hint')}</p>
    </div>
  );
}
