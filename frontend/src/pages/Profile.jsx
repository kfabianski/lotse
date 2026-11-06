import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Avatar, Button, Field, inputClass } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { api, uploadImage } from '../lib/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const [ext, setExt] = useState(user.phone_ext);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [msg, setMsg] = useState('');

  const run = async (fn) => {
    setMsg('');
    try {
      setUser(await fn());
      setMsg(t('saved'));
    } catch (err) {
      setMsg(t('error_generic', { msg: err.message }));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('profile_title')}</h1>
      <div className="mt-8 flex items-center gap-6 card p-6">
        <div className="relative">
          <Avatar person={user} size={96} />
          <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-brand p-2 text-white shadow hover:bg-brand-strong" title={t('change_photo')}>
            <Camera size={16} /><span className="sr-only">{t('change_photo')}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
              onChange={(e) => e.target.files?.[0] && run(() => uploadImage(e.target.files[0], '/auth/me/avatar'))} />
          </label>
        </div>
        <div>
          <p className="font-display text-xl font-semibold">{user.full_name}</p>
          <p className="text-muted">{user.position}{user.department && `, ${user.department}`}</p>
          <p className="text-muted">{user.email}</p>
          {user.seat && <p className="mt-1 text-sm">{t('seat')}: {user.seat.location_code}, {user.seat.label}</p>}
        </div>
      </div>

      <form className="mt-6 flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => api('/auth/me', { method: 'PATCH', body: { phone_ext: ext } })); }}>
        <Field label={t('extension')} className="flex-1"><input className={inputClass} value={ext} onChange={(e) => setExt(e.target.value)} /></Field>
        <Button type="submit">{t('save')}</Button>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">{t('change_password')}</h2>
        {user.auth_source === 'ldap' ? <p className="mt-2 text-muted">{t('ldap_account')}</p> : (
          <form className="mt-4 space-y-4" onSubmit={(e) => {
            e.preventDefault();
            run(() => api('/auth/me', { method: 'PATCH', body: pw })).then(() => setPw({ current_password: '', new_password: '' }));
          }}>
            <Field label={t('current_password')}><input type="password" autoComplete="current-password" required className={inputClass} value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
            <Field label={t('new_password')} hint={t('password_min')}><input type="password" autoComplete="new-password" minLength={8} required className={inputClass} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
            <Button type="submit">{t('change_password')}</Button>
          </form>
        )}
      </section>
      {msg && <p role="status" className="mt-6 font-medium">{msg}</p>}
    </div>
  );
}
