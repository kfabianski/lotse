import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { Logo } from '../components/Header';
import { Button, Field, inputClass } from '../components/ui';

export default function Login({ config }) {
  const { login, ssoLogin } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.username, form.password);
      // Only follow same-site relative paths after sign-in.
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (err) {
      if (err.status === 429) setError(t('login_locked', { s: (/(\d+)/.exec(err.message) || [0, 30])[1] }));
      else setError(err.status === 401 ? t('login_failed') : t('error_generic', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  // Default: photo by Vitaly Gariev on Unsplash (see docs/CREDITS.md); admins can upload their own team photo.
  const image = config?.login_image_url || '/login-office.jpg';
  const ownPhoto = Boolean(config?.login_image_url);

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12 xl:px-20">
        <div className="flex items-center justify-between">
          <Logo company={config?.company_name} />
          <div role="group" aria-label={t('language')} className="flex rounded-xl border border-line p-0.5 text-sm">
            {['de', 'en'].map((code) => (
              <button key={code} type="button" onClick={() => setLang(code)} aria-pressed={lang === code}
                className={`rounded-[10px] px-2.5 py-1 font-medium ${lang === code ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="my-auto w-full max-w-sm py-12">
          {config?.public_read && (
            <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} />{t('back_to_portal')}</Link>
          )}
          <h1 className="font-display text-[2.25rem] font-semibold leading-[1.1]">{t('login_title')}</h1>
          <p className="mt-3 text-muted">{config?.ldap_enabled ? t('login_hint_ldap') : t('login_hint_local')}</p>
          <div className="mt-8 space-y-4">
            <Field label={t('username')}>
              <input className={`${inputClass} h-11`} autoComplete="username" required autoFocus value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <Field label={t('password')}>
              <input className={`${inputClass} h-11`} type="password" autoComplete="current-password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
          <Button type="submit" disabled={busy} className="mt-6 h-11 w-full rounded-xl">{t('sign_in')}</Button>
          {config?.sso_enabled && (
            <Button variant="outline" disabled={busy} className="mt-3 h-11 w-full rounded-xl" onClick={async () => {
              setError('');
              try { await ssoLogin(); navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true }); }
              catch { setError(t('sso_failed')); }
            }}>{t('sso_button')}</Button>
          )}
          {config?.public_read && <p className="mt-6 text-sm text-muted">{t('login_why')}</p>}
        </form>

        <p className="text-xs text-muted">{config?.company_name}</p>
      </div>

      {/* Picture side: the company's own team photo if an admin uploaded one, otherwise the bundled sample photo. */}
      <div className="relative hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden bg-well">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: ownPhoto ? 'center' : '64% center' }} />
          <div className="absolute inset-x-0 bottom-0 border-t border-line bg-surface px-6 py-5 text-ink">
            <p className="font-display text-xl font-semibold">{t('login_tagline')}</p>
            <p className="mt-1 text-muted">{t('login_tagline_sub')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
