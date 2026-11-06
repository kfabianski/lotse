import { useState } from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Button, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';

/** Niederlassungen: articles and events can be limited to some of them. */
export default function AdminBranches() {
  const { t } = useI18n();
  const { data, reload } = useFetch('/branches', undefined, 'admin-branches');
  const [names, setNames] = useState({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const list = data || [];

  const guard = async (fn) => {
    setError('');
    try { await fn(); setNames({}); reload(); } catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-3xl">
      <p className="text-muted">{t('br_intro')}</p>
      <ul className="card mt-5 divide-y divide-line">
        {!list.length && <li className="px-4 py-6 text-center text-muted">{t('br_empty')}</li>}
        {list.map((b, i) => {
          const value = names[b.id] ?? b.name;
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Building2 size={18} className="text-muted" />
              <input value={value} onChange={(e) => setNames({ ...names, [b.id]: e.target.value })} aria-label={t('br_name')}
                className={`${inputClass} max-w-xs py-1.5`} />
              <span className="text-sm text-muted">{t('br_people', { n: b.people })}{b.source === 'ldap' ? ' · LDAP' : ''}</span>
              <span className="ml-auto flex gap-1">
                {value !== b.name && <Button className="px-3 py-1.5 text-sm" onClick={() => guard(() => api(`/branches/${b.id}`, { method: 'PUT', body: { name: value, sort: i } }))}>{t('save')}</Button>}
                <Button variant="danger" className="px-2.5 py-1.5" aria-label={t('delete')} onClick={() => {
                  if (window.confirm(t('br_delete_confirm', { name: b.name }))) guard(() => api(`/branches/${b.id}`, { method: 'DELETE' }));
                }}><Trash2 size={16} /></Button>
              </span>
            </li>
          );
        })}
      </ul>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); guard(async () => { await api('/branches', { method: 'POST', body: { name, sort: list.length } }); setName(''); }); }}>
        <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('br_new_ph')} className={`${inputClass} max-w-xs`} />
        <Button type="submit"><Plus size={17} />{t('br_add')}</Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      <p className="mt-6 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{t('br_rules')}</p>
    </div>
  );
}
