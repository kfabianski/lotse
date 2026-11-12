import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListFilter, RefreshCw, Trash2, Upload, UserPlus, Plus } from 'lucide-react';
import FloorPlan from '../components/FloorPlan';
import RoomEditor from '../components/RoomEditor';
import AdminSettings, { MailTexts } from './AdminSettings';
import AdminDepartments from './AdminDepartments';
import AdminBranches from './AdminBranches';
import AdminHomeLayout from './AdminHomeLayout';
import AdminTrainings from './AdminTrainings';
import AdminJubilees from './AdminJubilees';
import AdminStats from './AdminStats';
import AdminQuickLinks from './AdminQuickLinks';
import AdminPermissions, { ROLES } from './AdminPermissions';
import LdapSyncDialog from './AdminLdapSync';
import { Avatar, Button, Field, Modal, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api, uploadImage } from '../lib/api';


function UserForm({ user, locations, onDone }) {
  const { t, lang } = useI18n();
  const { can } = useAuth();
  const departments = useFetch('/departments');
  const config = useFetch('/auth/config', undefined, 'auth-config');
  // LDAP is leading: these fields come from the directory and are overwritten at every sign-in/sync.
  const fromLdap = Boolean(user && user.auth_source === 'ldap' && config.data?.ldap_enabled);
  const isNew = !user;
  const [form, setForm] = useState(() => ({
    username: '', password: '', email: user?.email || '', role: user?.role || 'user',
    first_name: user?.first_name || '', last_name: user?.last_name || '', department: user?.department || '',
    position: user?.position || '', phone_ext: user?.phone_ext || '', start_date: user?.start_date || '',
    is_active: user?.is_active ?? true, show_in_directory: user?.show_in_directory ?? true, seat_id: user?.seat?.id || 0,
    manager_id: user?.manager_id || 0, branch_id: user?.branch_id || 0,
  }));
  const branches = useFetch('/branches', undefined, 'branches');
  const everyone = useFetch('/users', { params: { include_hidden: true } }, 'all-users-for-manager');
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, email: form.email || null, start_date: form.start_date || null, seat_id: Number(form.seat_id), manager_id: Number(form.manager_id), branch_id: Number(form.branch_id) };
    if (fromLdap) delete body.manager_id;
    if (!body.password) delete body.password;
    if (!can('admin')) delete body.role;  // roles and permissions: admins only
    try {
      if (isNew) {
        const { seat_id, is_active, show_in_directory, manager_id, branch_id, ...create } = body;
        const created = await api('/users', { method: 'POST', body: create });
        if (seat_id || manager_id || branch_id) await api(`/users/${created.id}`, { method: 'PATCH', body: { seat_id, manager_id, branch_id } });
      } else {
        await api(`/users/${user.id}`, { method: 'PATCH', body });
      }
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  const local = isNew || user.auth_source === 'local';
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {isNew && <Field label={t('username')}><input required pattern="[A-Za-z0-9._\-]+" className={inputClass} value={form.username} onChange={set('username')} /></Field>}
      {local && <Field label={t('password')} hint={t('password_min')}><input type="password" minLength={8} required={isNew} autoComplete="new-password" className={inputClass} value={form.password} onChange={set('password')} /></Field>}
      <Field label={t('first_name')} hint={fromLdap ? t('from_ldap') : undefined}><input disabled={fromLdap} className={inputClass} value={form.first_name} onChange={set('first_name')} /></Field>
      <Field label={t('last_name')} hint={fromLdap ? t('from_ldap') : undefined}><input disabled={fromLdap} className={inputClass} value={form.last_name} onChange={set('last_name')} /></Field>
      <Field label={t('email')} hint={fromLdap ? t('from_ldap') : t('email_unique')}><input type="email" disabled={fromLdap} className={inputClass} value={form.email} onChange={set('email')} /></Field>
      <Field label={t('extension')} hint={fromLdap ? t('from_ldap') : undefined}><input disabled={fromLdap} className={inputClass} value={form.phone_ext} onChange={set('phone_ext')} /></Field>
      <Field label={t('department')} hint={fromLdap ? t('from_ldap') : undefined}>
        <select disabled={fromLdap} className={inputClass} value={form.department} onChange={set('department')}>
          <option value="">{t('no_department')}</option>
          {(departments.data || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          {form.department && departments.data && !departments.data.some((d) => d.name === form.department) && <option value={form.department}>{form.department}</option>}
        </select>
      </Field>
      <Field label={t('position')} hint={fromLdap ? t('from_ldap') : undefined}><input disabled={fromLdap} className={inputClass} value={form.position} onChange={set('position')} /></Field>
      {(branches.data || []).length > 0 && (
        <Field label={t('branch')} hint={fromLdap && config.data?.ldap_branch_attr ? t('from_ldap') : t('branch_hint')}>
          <select disabled={fromLdap && Boolean(config.data?.ldap_branch_attr)} className={inputClass} value={form.branch_id} onChange={set('branch_id')}>
            <option value={0}>{t('branch_none')}</option>
            {branches.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('manager')} hint={fromLdap ? t('from_ldap') : t('manager_hint')}>
        <select disabled={fromLdap} className={inputClass} value={form.manager_id} onChange={set('manager_id')}>
          <option value={0}>{t('manager_none')}</option>
          {(everyone.data || []).filter((p) => p.id !== user?.id && p.is_active).sort((a, b) => a.last_name.localeCompare(b.last_name))
            .map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.position ? ` – ${p.position}` : ''}</option>)}
        </select>
      </Field>
      <Field label={t('role')} hint={can('admin') ? t('perm_role_hint') : t('perm_admin_only')}>
        <select disabled={!can('admin')} className={inputClass} value={form.role} onChange={set('role')}>
          {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
        </select>
      </Field>
      <Field label={t('start_date')}><input type="date" className={inputClass} value={form.start_date || ''} onChange={set('start_date')} /></Field>
      <Field label={t('seat')} className="sm:col-span-2">
        <select className={inputClass} value={form.seat_id} onChange={set('seat_id')}>
          <option value={0}>{t('no_seat')}</option>
          {locations.map((loc) => (
            <optgroup key={loc.id} label={lang === 'en' ? loc.name_en : loc.name_de}>
              {loc.seats.map((s) => (
                <option key={s.id} value={s.id}>{s.label}{s.occupant && s.occupant.id !== user?.id ? ` (${s.occupant.full_name})` : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      {!isNew && (
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="accent-[var(--brand)]" />{t('active')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.show_in_directory} onChange={set('show_in_directory')} className="accent-[var(--brand)]" />{t('in_directory')}</label>
        </div>
      )}
      {error && <p className="text-alert sm:col-span-2">{t('error_generic', { msg: error })}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onDone}>{t('cancel')}</Button>
        <Button type="submit">{t('save')}</Button>
      </div>
    </form>
  );
}

/** Excel-style filter in a column header: funnel next to the title, list of the column values with checkboxes. */
function ColumnFilter({ label, options, selected, onChange }) {
  const { t } = useI18n();
  const btn = useRef(null);
  const pop = useRef(null);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState(() => new Set());
  const [q, setQ] = useState('');
  const active = Boolean(selected);
  const open = () => {
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) });
    setDraft(new Set(selected || options.map((o) => o.value)));
    setQ('');
  };
  const close = () => setPos(null);
  useEffect(() => {
    if (!pos) return undefined;
    const outside = (e) => { if (!pop.current?.contains(e.target) && !btn.current?.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    const scroll = (e) => { if (!pop.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);
  const shown = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const allOn = shown.length > 0 && shown.every((o) => draft.has(o.value));
  const flip = (v) => setDraft((d) => { const n = new Set(d); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  const flipAll = () => setDraft((d) => { const n = new Set(d); shown.forEach((o) => (allOn ? n.delete(o.value) : n.add(o.value))); return n; });
  const apply = () => {
    onChange(options.every((o) => draft.has(o.value)) ? undefined : new Set(draft));
    close();
  };
  return (
    <>
      <button ref={btn} type="button" onClick={() => (pos ? close() : open())} aria-haspopup="dialog" aria-expanded={Boolean(pos)}
        className={`-mx-1.5 inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-medium hover:bg-surface-2 ${active ? 'text-brand-text' : ''}`}>
        {label}
        <ListFilter size={14} className={active ? '' : 'opacity-50'} aria-hidden />
        {active && <span className="sr-only">({t('uf_filtered')})</span>}
      </button>
      {pos && (
        <div ref={pop} role="dialog" aria-label={label} style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-64 rounded-xl border border-line bg-surface p-2 text-sm font-normal text-ink shadow-lg">
          {options.length > 6 && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} className={`${inputClass} mb-2 py-1.5`} />
          )}
          <label className="flex cursor-pointer items-center gap-2 border-b border-line px-1.5 pb-2 font-medium">
            <input type="checkbox" checked={allOn} onChange={flipAll} className="h-4 w-4 accent-[var(--brand)]" />{t('uf_select_all_values')}
          </label>
          <ul className="thin-scroll max-h-60 overflow-y-auto py-1">
            {shown.map((o) => (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-2">
                  <input type="checkbox" checked={draft.has(o.value)} onChange={() => flip(o.value)} className="h-4 w-4 accent-[var(--brand)]" />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span><span className="text-xs text-muted">{o.count}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
            <button type="button" disabled={!active} onClick={() => { onChange(undefined); close(); }} className="px-1.5 text-brand-text underline disabled:no-underline disabled:opacity-40">
              {t('uf_clear_filter')}
            </button>
            <Button className="px-3 py-1" disabled={draft.size === 0} onClick={apply}>OK</Button>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTab({ locations, reloadLocations }) {
  const { t } = useI18n();
  const { user: me, can } = useAuth();
  const { data, reload } = useFetch('/users', { params: { include_hidden: true } }, 'admin-users');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const departments = useFetch('/departments');
  const branches = useFetch('/branches', undefined, 'branches');
  // Excel-style column filters: per column the set of values that stay visible (missing key = no filter).
  const [cf, setCf] = useState({});
  const COLS = {
    department: { get: (u) => u.department || '', label: (v) => v },
    role: { get: (u) => u.role, label: (v) => t(`role_${v}`) },
    source: { get: (u) => u.auth_source, label: (v) => (v === 'ldap' ? 'LDAP' : t('local_account')) },
    branch: { get: (u) => u.branch || '', label: (v) => v },
  };
  const needle = filter.trim().toLowerCase();
  const matchesSearch = (u) => !needle || `${u.full_name} ${u.username} ${u.email || ''} ${u.department} ${u.position || ''} ${u.branch || ''}`.toLowerCase().includes(needle);
  const passes = (u, except) => Object.entries(cf).every(([k, set]) => k === except || set.has(COLS[k].get(u)));
  const rows = (data || []).filter((u) => matchesSearch(u) && passes(u));
  const optionsFor = (key) => { // like Excel: the values left after the filters of the other columns
    const counts = new Map();
    (data || []).filter((u) => matchesSearch(u) && passes(u, key)).forEach((u) => {
      const v = COLS[key].get(u);
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    return [...counts].map(([value, count]) => ({ value, count, label: value === '' ? t('uf_empty') : COLS[key].label(value) }))
      .sort((a, b) => (a.value === '') - (b.value === '') || a.label.localeCompare(b.label));
  };
  const setCol = (key) => (set) => setCf((x) => { const n = { ...x }; if (set) n[key] = set; else delete n[key]; return n; });
  const filtering = Boolean(needle || Object.keys(cf).length);
  const head = (key, label) => <ColumnFilter label={label} options={optionsFor(key)} selected={cf[key]} onChange={setCol(key)} />;

  // Several people at once: tick them, then set branch, department and/or role in one go.
  const [picked, setPicked] = useState(() => new Set());
  const [bulk, setBulk] = useState({ branch_id: '', department: '', role: '' });
  const [bulkResult, setBulkResult] = useState(null);
  const selectable = (u) => can('admin') || u.role === 'user';
  const visibleIds = rows.filter(selectable).map((u) => u.id);
  const allPicked = visibleIds.length > 0 && visibleIds.every((id) => picked.has(id));
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setPicked((s) => {
    const n = new Set(s);
    if (allPicked) visibleIds.forEach((id) => n.delete(id)); else visibleIds.forEach((id) => n.add(id));
    return n;
  });
  const applyBulk = async () => {
    const body = { ids: [...picked] };
    if (bulk.branch_id !== '') body.branch_id = Number(bulk.branch_id);
    if (bulk.department) body.department = bulk.department;
    if (bulk.role) body.role = bulk.role;
    try {
      const r = await api('/users/bulk', { method: 'POST', body });
      setBulkResult(r);
      setPicked(new Set());
      setBulk({ branch_id: '', department: '', role: '' });
      reload();
    } catch (err) {
      setBulkResult({ error: err.message });
    }
  };
  const bulkReady = bulk.branch_id !== '' || bulk.department || bulk.role;

  const done = () => { setEditing(undefined); reload(); reloadLocations(); };
  const [syncOpen, setSyncOpen] = useState(false);
  const sync = () => { setNote(''); setSyncOpen(true); };
  const avatar = async (u, file) => { await uploadImage(file, `/users/${u.id}/avatar`); reload(); };
  const remove = async (u) => {
    if (!window.confirm(t('confirm_delete'))) return;
    await api(`/users/${u.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('search')} className={`${inputClass} max-w-xs`} />
        <span className="text-sm text-muted">{t('uf_count', { n: rows.length, total: (data || []).length })}</span>
        {filtering && (
          <button type="button" className="text-sm text-brand-text underline" onClick={() => { setFilter(''); setCf({}); }}>{t('uf_reset')}</button>
        )}
        <div className="ml-auto flex gap-2">
          {can('admin') && <Button variant="outline" onClick={sync}><RefreshCw size={17} />{t('ldap_sync')}</Button>}
          <Button onClick={() => setEditing(null)}><UserPlus size={17} />{t('new_user')}</Button>
        </div>
      </div>
      {note && <p role="status" className="mt-3">{note}</p>}

      {picked.size >= 2 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand bg-brand-soft px-3 py-2 text-sm">
          <p className="mr-1 font-medium">{t('uf_selected', { n: picked.size })}</p>
          {(branches.data || []).length > 0 && (
            <select aria-label={t('branch')} className={`${inputClass} w-auto py-1.5`} value={bulk.branch_id} onChange={(e) => setBulk({ ...bulk, branch_id: e.target.value })}>
                <option value="">{t('branch')}: {t('uf_keep')}</option>
                <option value="0">{t('branch_none')}</option>
                {branches.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select aria-label={t('department')} className={`${inputClass} w-auto py-1.5`} value={bulk.department} onChange={(e) => setBulk({ ...bulk, department: e.target.value })}>
            <option value="">{t('department')}: {t('uf_keep')}</option>
            {(departments.data || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          {can('admin') && (
            <select aria-label={t('role')} className={`${inputClass} w-auto py-1.5`} value={bulk.role} onChange={(e) => setBulk({ ...bulk, role: e.target.value })}>
              <option value="">{t('role')}: {t('uf_keep')}</option>
              {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
            </select>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" className="py-1.5" onClick={() => setPicked(new Set())}>{t('uf_clear')}</Button>
            <Button className="py-1.5" disabled={!bulkReady} onClick={applyBulk}>{t('uf_apply', { n: picked.size })}</Button>
          </div>
        </div>
      )}
      {picked.size === 1 && <p className="mt-3 text-sm text-muted">{t('uf_pick_more')}</p>}
      {bulkResult && (
        <div role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${bulkResult.error ? 'bg-alert/10 text-alert' : 'bg-safe/10 text-safe'}`}>
          {bulkResult.error ? t('error_generic', { msg: bulkResult.error }) : t('uf_done', { n: bulkResult.changed })}
          {bulkResult.skipped?.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-muted">
              {bulkResult.skipped.map((s) => <li key={s.id}>{s.name}: {s.reason.split(',').map((r) => t(`uf_skip_${r}`)).join(', ')}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr><th className="w-10 py-3 pl-4"><input type="checkbox" aria-label={t('uf_select_all')} checked={allPicked} onChange={toggleAll} className="h-4 w-4 accent-[var(--brand)]" /></th>
              <th className="px-4 py-3 font-medium">{t('nav_people')}</th>
              <th className="px-4 py-3">{head('department', t('department'))}</th>
              <th className="px-4 py-3">{head('role', t('role'))}</th>
              <th className="px-4 py-3">{head('source', t('source'))}</th>
              <th className="px-4 py-3">{head('branch', t('branch'))}</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className={`${u.is_active ? '' : 'opacity-50'} ${picked.has(u.id) ? 'bg-brand-soft' : ''}`}>
                <td className="py-2.5 pl-4">
                  {selectable(u) && <input type="checkbox" aria-label={u.full_name} checked={picked.has(u.id)} onChange={() => toggle(u.id)} className="h-4 w-4 accent-[var(--brand)]" />}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer" title={`${t('change_photo')} – ${t('img_hint_avatar')}`}>
                      <Avatar person={u} size={36} />
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && avatar(u, e.target.files[0])} />
                    </label>
                    <div><p className="font-medium leading-tight">{u.full_name}</p><p className="text-sm text-muted">{u.username}</p></div>
                  </div>
                </td>
                <td className="px-4 py-2.5">{u.department}</td>
                <td className="px-4 py-2.5">{t(`role_${u.role}`)}</td>
                <td className="px-4 py-2.5 text-sm text-muted">{u.auth_source === 'ldap' ? 'LDAP' : t('local_account')}</td>
                <td className="px-4 py-2.5 text-sm">{u.branch || '–'}</td>
                <td className="px-4 py-2.5 text-right">
                  {(can('admin') || u.role === 'user') && <Button variant="ghost" className="px-3 py-1" onClick={() => setEditing(u)}>{t('edit')}</Button>}
                  {u.id !== me.id && (can('admin') || u.role === 'user') && <button type="button" onClick={() => remove(u)} aria-label={t('delete')} className="rounded p-1.5 text-muted hover:text-alert"><Trash2 size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {syncOpen && <LdapSyncDialog onClose={() => setSyncOpen(false)} onDone={() => { reload(); reloadLocations(); }} />}
      {editing !== undefined && (
        <Modal wide title={editing ? editing.full_name : t('new_user')} onClose={() => setEditing(undefined)}>
          <UserForm user={editing} locations={locations} onDone={done} />
        </Modal>
      )}
    </div>
  );
}

function LocationsTab({ locations, reload }) {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('seats'); // seats | rooms
  const [seat, setSeat] = useState(null);
  const [newLoc, setNewLoc] = useState(null);
  const [error, setError] = useState('');
  const users = useFetch('/users', { params: { include_hidden: true } }, 'admin-loc-users');
  const active = locations.find((l) => l.id === activeId) || locations[0];
  const prefix = useMemo(() => (active?.code || '').replace(/[^A-Za-z0-9]/g, ''), [active]);

  const guard = async (fn) => {
    setError('');
    try { await fn(); reload(); } catch (err) { setError(err.message); }
  };

  const addSeat = (x, y) => guard(() => api(`/locations/${active.id}/seats`, {
    method: 'POST', body: { label: `${prefix}-${String(active.seats.length + 1).padStart(2, '0')}`, x, y },
  }));

  const moveSeat = (s, x, y) => api(`/locations/seats/${s.id}`, { method: 'PUT', body: { label: s.label, x, y } })
    .then(() => { setError(''); reload(); })
    .catch((err) => { setError(err.message); throw err; });

  const uploadPlan = (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => guard(async () => {
      const form = new FormData();
      form.append('file', file);
      form.append('ratio', String(img.naturalHeight / img.naturalWidth || 0.5));
      await api(`/locations/${active.id}/plan`, { method: 'POST', form });
      URL.revokeObjectURL(url);
    });
    img.src = url;
  };

  const saveSeat = (e) => {
    e.preventDefault();
    guard(async () => {
      await api(`/locations/seats/${seat.id}`, { method: 'PUT', body: { label: seat.label, x: seat.x, y: seat.y } });
      const current = seat.occupant?.id || 0;
      if (Number(seat.assign) !== current) {
        if (current) await api(`/users/${current}`, { method: 'PATCH', body: { seat_id: 0 } });
        if (Number(seat.assign)) await api(`/users/${seat.assign}`, { method: 'PATCH', body: { seat_id: seat.id } });
      }
      setSeat(null);
      users.reload();
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {[['seats', t('mode_seats')], ['rooms', t('mode_rooms')]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`rounded-[10px] px-4 py-1.5 text-sm font-medium ${mode === k ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>{label}</button>
          ))}
        </div>
        {mode === 'seats' && <p className="text-muted">{t('add_seat_hint')}</p>}
        {active && <p className="w-full text-sm text-muted order-last">{t('upload_plan_hint')}</p>}
        <div className="ml-auto flex gap-2">
          {active && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface-2">
              <Upload size={17} />{t('upload_plan')}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadPlan(e.target.files[0])} />
            </label>
          )}
          <Button onClick={() => setNewLoc({ code: '', name_de: '', name_en: '', kind: 'floor', sort: locations.length, plan_ratio: 0.5 })}>
            <Plus size={17} />{t('new_location')}
          </Button>
        </div>
      </div>
      {error && <p className="mb-3 text-alert">{t('error_generic', { msg: error })}</p>}
      {active && mode === 'seats' && (
        <FloorPlan locations={locations} activeId={active.id} onActiveChange={setActiveId} onPlanClick={addSeat} onSeatMove={moveSeat}
          onSeatClick={(s) => setSeat({ ...s, assign: s.occupant?.id || 0 })} />
      )}
      {active && mode === 'rooms' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {locations.map((l) => (
              <button key={l.id} type="button" onClick={() => setActiveId(l.id)} aria-pressed={l.id === active.id}
                className={`rounded-sm border px-3.5 py-1.5 text-sm font-medium ${l.id === active.id ? 'border-brand bg-brand text-brand-ink' : 'border-line hover:border-muted'}`}>
                {l.code} <span className="opacity-70">· {(l.rooms || []).length}</span>
              </button>
            ))}
          </div>
          <RoomEditor key={active.id} location={active} onChanged={reload} />
        </>
      )}

      {seat && (
        <Modal title={seat.label} onClose={() => setSeat(null)}>
          <form onSubmit={saveSeat} className="space-y-4">
            <Field label={t('seat')}><input required className={inputClass} value={seat.label} onChange={(e) => setSeat({ ...seat, label: e.target.value })} /></Field>
            <Field label={t('assign_to')}>
              <select className={inputClass} value={seat.assign} onChange={(e) => setSeat({ ...seat, assign: e.target.value })}>
                <option value={0}>{t('nobody')}</option>
                {(users.data || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}{u.seat && u.seat.id !== seat.id ? ` (${u.seat.label})` : ''}</option>)}
              </select>
            </Field>
            <div className="flex justify-between gap-2">
              <Button variant="danger" onClick={() => guard(async () => { await api(`/locations/seats/${seat.id}`, { method: 'DELETE' }); setSeat(null); })}>
                <Trash2 size={16} />{t('remove_seat')}
              </Button>
              <div className="flex gap-2"><Button variant="ghost" onClick={() => setSeat(null)}>{t('cancel')}</Button><Button type="submit">{t('save')}</Button></div>
            </div>
          </form>
        </Modal>
      )}

      {newLoc && (
        <Modal title={t('new_location')} onClose={() => setNewLoc(null)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            guard(async () => { const loc = await api('/locations', { method: 'POST', body: { ...newLoc, sort: Number(newLoc.sort) } }); setActiveId(loc.id); setNewLoc(null); });
          }}>
            <Field label={t('code')}><input required maxLength={12} className={inputClass} value={newLoc.code} onChange={(e) => setNewLoc({ ...newLoc, code: e.target.value })} /></Field>
            <Field label={t('kind')}>
              <select className={inputClass} value={newLoc.kind} onChange={(e) => setNewLoc({ ...newLoc, kind: e.target.value })}>
                <option value="floor">{t('floor')}</option><option value="warehouse">{t('warehouse')}</option>
              </select>
            </Field>
            <Field label={t('name_de')}><input required className={inputClass} value={newLoc.name_de} onChange={(e) => setNewLoc({ ...newLoc, name_de: e.target.value })} /></Field>
            <Field label={t('name_en')}><input required className={inputClass} value={newLoc.name_en} onChange={(e) => setNewLoc({ ...newLoc, name_en: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setNewLoc(null)}>{t('cancel')}</Button><Button type="submit">{t('save')}</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Admin() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const { can, has } = useAuth();
  const tabs = [['settings', t('admin_settings'), can('admin')], ['notify', t('admin_notify'), can('admin') || has('mails')],
    ['users', t('admin_users'), has('people')], ['departments', t('admin_departments'), has('people')], ['branches', t('admin_branches'), has('people')],
    ['locations', t('admin_locations'), has('locations')], ['trainings', t('admin_trainings'), has('trainings')],
    ['jubilees', t('admin_jubilees'), has('jubilees')],
    ['home', t('admin_home'), has('content_all')], ['stats', t('admin_stats'), has('content_all')],
    ['quicklinks', t('admin_quicklinks'), has('quicklinks')], ['permissions', t('admin_permissions'), can('admin')],
  ].filter((x) => x[2]);
  const [wanted, setTab] = useState(() => params.get('tab') || '');
  const tab = tabs.some((x) => x[0] === wanted) ? wanted : tabs[0]?.[0];
  useEffect(() => { if (params.get('tab')) setTab(params.get('tab')); }, [params]);
  const locations = useFetch('/locations');
  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('nav_admin')}</h1>
      <div className="mt-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* Vertical menu on wide screens (sticks while the page scrolls), one scrollable row on phones. */}
      <div role="tablist" aria-orientation="vertical"
        className="thin-scroll -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2 lg:sticky lg:top-24 lg:mx-0 lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-0 lg:pb-0 lg:pr-4">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[0.9375rem] font-medium transition-colors ${
              tab === key ? 'bg-brand-soft font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6 min-w-0 lg:mt-0">
        {locations.data && tab === 'users' && <UsersTab locations={locations.data} reloadLocations={locations.reload} />}
        {locations.data && tab === 'locations' && <LocationsTab locations={locations.data} reload={locations.reload} />}
        {tab === 'settings' && <AdminSettings part="general" />}
        {tab === 'notify' && (can('admin') ? <AdminSettings part="notify" /> : <MailTexts />)}
        {tab === 'departments' && <AdminDepartments />}
        {tab === 'branches' && <AdminBranches />}
        {tab === 'home' && <AdminHomeLayout />}
        {tab === 'trainings' && <AdminTrainings />}
        {tab === 'jubilees' && <AdminJubilees />}
        {tab === 'stats' && <AdminStats />}
        {tab === 'quicklinks' && <AdminQuickLinks />}
        {tab === 'permissions' && <AdminPermissions />}
      </div>
      </div>
    </div>
  );
}
