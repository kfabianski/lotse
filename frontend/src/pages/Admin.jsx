import { useMemo, useState } from 'react';
import { RefreshCw, Trash2, Upload, UserPlus, Plus } from 'lucide-react';
import FloorPlan from '../components/FloorPlan';
import RoomEditor from '../components/RoomEditor';
import AdminSettings from './AdminSettings';
import AdminDepartments from './AdminDepartments';
import { Avatar, Button, Field, Modal, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api, uploadImage } from '../lib/api';

const ROLES = ['user', 'editor', 'admin'];

function UserForm({ user, locations, onDone }) {
  const { t, lang } = useI18n();
  const departments = useFetch('/departments');
  const isNew = !user;
  const [form, setForm] = useState(() => ({
    username: '', password: '', email: user?.email || '', role: user?.role || 'user',
    first_name: user?.first_name || '', last_name: user?.last_name || '', department: user?.department || '',
    position: user?.position || '', phone_ext: user?.phone_ext || '', start_date: user?.start_date || '',
    is_active: user?.is_active ?? true, show_in_directory: user?.show_in_directory ?? true, seat_id: user?.seat?.id || 0,
  }));
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, email: form.email || null, start_date: form.start_date || null, seat_id: Number(form.seat_id) };
    if (!body.password) delete body.password;
    try {
      if (isNew) {
        const { seat_id, is_active, show_in_directory, ...create } = body;
        const created = await api('/users', { method: 'POST', body: create });
        if (seat_id) await api(`/users/${created.id}`, { method: 'PATCH', body: { seat_id } });
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
      <Field label={t('first_name')}><input className={inputClass} value={form.first_name} onChange={set('first_name')} /></Field>
      <Field label={t('last_name')}><input className={inputClass} value={form.last_name} onChange={set('last_name')} /></Field>
      <Field label={t('email')}><input type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
      <Field label={t('extension')}><input className={inputClass} value={form.phone_ext} onChange={set('phone_ext')} /></Field>
      <Field label={t('department')}>
        <select className={inputClass} value={form.department} onChange={set('department')}>
          <option value="">{t('no_department')}</option>
          {(departments.data || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          {form.department && departments.data && !departments.data.some((d) => d.name === form.department) && <option value={form.department}>{form.department}</option>}
        </select>
      </Field>
      <Field label={t('position')}><input className={inputClass} value={form.position} onChange={set('position')} /></Field>
      <Field label={t('role')}>
        <select className={inputClass} value={form.role} onChange={set('role')}>
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

function UsersTab({ locations, reloadLocations }) {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const { data, reload } = useFetch('/users', { params: { include_hidden: true } }, 'admin-users');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('');
  const rows = (data || []).filter((u) => !filter || `${u.full_name} ${u.username} ${u.department}`.toLowerCase().includes(filter.toLowerCase()));

  const done = () => { setEditing(undefined); reload(); reloadLocations(); };
  const sync = async () => {
    setNote('');
    try {
      const res = await api('/users/ldap-sync', { method: 'POST' });
      setNote(t('ldap_synced', { n: res.synced }));
      reload();
    } catch (err) {
      setNote(t('error_generic', { msg: err.message }));
    }
  };
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
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={sync}><RefreshCw size={17} />{t('ldap_sync')}</Button>
          <Button onClick={() => setEditing(null)}><UserPlus size={17} />{t('new_user')}</Button>
        </div>
      </div>
      {note && <p role="status" className="mt-3">{note}</p>}
      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-line text-sm text-muted">
            <tr><th className="px-4 py-3 font-medium">{t('nav_people')}</th><th className="px-4 py-3 font-medium">{t('department')}</th>
              <th className="px-4 py-3 font-medium">{t('role')}</th><th className="px-4 py-3 font-medium">{t('source')}</th>
              <th className="px-4 py-3 font-medium">{t('seat')}</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer" title={t('change_photo')}>
                      <Avatar person={u} size={36} />
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && avatar(u, e.target.files[0])} />
                    </label>
                    <div><p className="font-medium leading-tight">{u.full_name}</p><p className="text-sm text-muted">{u.username}</p></div>
                  </div>
                </td>
                <td className="px-4 py-2.5">{u.department}</td>
                <td className="px-4 py-2.5">{t(`role_${u.role}`)}</td>
                <td className="px-4 py-2.5 text-sm text-muted">{u.auth_source === 'ldap' ? 'LDAP' : t('local_account')}</td>
                <td className="px-4 py-2.5 text-sm">{u.seat ? `${u.seat.location_code}, ${u.seat.label}` : '–'}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" className="px-3 py-1" onClick={() => setEditing(u)}>{t('edit')}</Button>
                  {u.id !== me.id && <button type="button" onClick={() => remove(u)} aria-label={t('delete')} className="rounded p-1.5 text-muted hover:text-alert"><Trash2 size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${l.id === active.id ? 'border-brand bg-brand text-white dark:text-[#0d0f13]' : 'border-line hover:border-muted'}`}>
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
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'users');
  const locations = useFetch('/locations');
  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('nav_admin')}</h1>
      <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
        {[['users', t('admin_users')], ['departments', t('admin_departments')], ['locations', t('admin_locations')], ['settings', t('admin_settings')]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`-mb-px border-b-[3px] pb-2.5 font-medium ${tab === key ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {locations.data && tab === 'users' && <UsersTab locations={locations.data} reloadLocations={locations.reload} />}
        {locations.data && tab === 'locations' && <LocationsTab locations={locations.data} reload={locations.reload} />}
        {tab === 'settings' && <AdminSettings />}
        {tab === 'departments' && <AdminDepartments />}
      </div>
    </div>
  );
}
