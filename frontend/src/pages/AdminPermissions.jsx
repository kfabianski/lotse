/** Admin only: give existing people a role and extra permissions. System settings are never grantable. */
import { useMemo, useState } from 'react';
import { Check, Lock, Search, ShieldCheck } from 'lucide-react';
import { Avatar, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export const ROLES = ['user', 'author', 'moderator', 'editor', 'admin'];
export const PERMISSIONS = ['content_own', 'content_all', 'trainings', 'moderate', 'quicklinks', 'polls', 'locations', 'people'];
export const ROLE_PERMS = {
  user: [],
  author: ['content_own'],
  moderator: ['content_own', 'trainings', 'moderate', 'quicklinks', 'polls'],
  editor: ['content_own', 'content_all', 'trainings', 'moderate', 'quicklinks', 'polls'],
  admin: PERMISSIONS,
};

function Matrix() {
  const { t } = useI18n();
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t('perm_title')}</th>
            {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center font-medium">{t(`role_${r}`)}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PERMISSIONS.map((p) => (
            <tr key={p}>
              <td className="px-4 py-2.5"><span className="font-medium">{t(`perm_${p}`)}</span><span className="block text-xs text-muted">{t(`perm_${p}_hint`)}</span></td>
              {ROLES.map((r) => (
                <td key={r} className="px-3 py-2.5 text-center">{ROLE_PERMS[r].includes(p) ? <Check size={16} className="mx-auto text-safe" /> : <span className="text-muted">–</span>}</td>
              ))}
            </tr>
          ))}
          <tr className="bg-bg">
            <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5 font-medium"><Lock size={14} />{t('perm_system')}</span><span className="block text-xs text-muted">{t('perm_system_hint')}</span></td>
            {ROLES.map((r) => <td key={r} className="px-3 py-2.5 text-center">{r === 'admin' ? <Check size={16} className="mx-auto text-safe" /> : <span className="text-muted">–</span>}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PersonRow({ person, me, onSaved }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (patch) => {
    setBusy(true);
    setError('');
    try { onSaved(await api(`/users/${person.id}`, { method: 'PATCH', body: patch })); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const fromRole = ROLE_PERMS[person.role] || [];
  const extras = person.permissions || [];
  const toggle = (p) => save({ permissions: extras.includes(p) ? extras.filter((x) => x !== p) : [...extras, p] });
  const self = person.id === me.id;
  return (
    <li className={`px-4 py-3 ${person.is_active ? '' : 'opacity-50'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar person={person} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight">{person.full_name}</p>
          <p className="truncate text-sm text-muted">{person.department || '–'}{person.position ? ` · ${person.position}` : ''} · {person.username}{person.auth_source === 'ldap' ? ' · LDAP' : ''}</p>
        </div>
        <div className="w-44 shrink-0">
          <select disabled={busy || self} value={person.role} onChange={(e) => save({ role: e.target.value })} aria-label={t('role')}
            title={self ? t('perm_self') : undefined} className={`${inputClass} py-1.5 text-sm`}>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
          </select>
        </div>
      </div>
      {person.role !== 'admin' && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
          {PERMISSIONS.map((p) => {
            const viaRole = fromRole.includes(p);
            const on = viaRole || extras.includes(p);
            return (
              <button key={p} type="button" disabled={busy || viaRole} onClick={() => toggle(p)} aria-pressed={on}
                title={viaRole ? t('perm_via_role') : t(`perm_${p}_hint`)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  on ? (viaRole ? 'border-line bg-surface-2 text-muted' : 'border-brand bg-brand-soft text-brand') : 'border-line text-muted hover:border-muted hover:text-ink'}`}>
                {on && <Check size={12} />}{t(`perm_${p}`)}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 pl-12 text-sm text-alert">{t('error_generic', { msg: error })}</p>}
    </li>
  );
}

export default function AdminPermissions() {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const { data, reload } = useFetch('/users', { params: { include_hidden: true } }, 'admin-perm-users');
  const [patched, setPatched] = useState({});
  const [q, setQ] = useState('');
  const [onlySpecial, setOnlySpecial] = useState(false);
  const people = useMemo(() => (data || []).map((u) => patched[u.id] || u), [data, patched]);
  const shown = people.filter((u) => (!onlySpecial || u.role !== 'user' || u.permissions?.length)
    && (!q.trim() || `${u.full_name} ${u.username} ${u.department} ${u.position}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" />
        <p>{t('perm_intro')}</p>
      </div>
      <Matrix />
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="relative block min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('tr_search_person')} className={`${inputClass} pl-9`} />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlySpecial} onChange={(e) => setOnlySpecial(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />{t('perm_only_special')}</label>
        </div>
        <ul className="card divide-y divide-line">
          {shown.map((u) => <PersonRow key={u.id} person={u} me={me} onSaved={(saved) => { setPatched((p) => ({ ...p, [saved.id]: saved })); if (saved.id === me.id) reload(); }} />)}
        </ul>
      </div>
    </div>
  );
}
