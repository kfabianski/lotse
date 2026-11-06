import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ImagePlus, PlugZap, RefreshCw, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { Button, Field, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { useFetch } from '../lib/useFetch';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-1">
      <span><span className="block font-medium">{label}</span>{hint && <span className="block text-sm text-muted">{hint}</span>}</span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="card grid gap-6 p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const COUNTRY_NAMES = { DE: ['Deutschland', 'Germany'], AT: ['Österreich', 'Austria'], CH: ['Schweiz', 'Switzerland'] };

/** Which public holidays the calendar shows: per country off / nationwide / one state or canton. */
function HolidaySettings({ value, onChange }) {
  const { t, lang } = useI18n();
  const { data: regions } = useFetch('/events/holiday-regions');
  const current = (country) => value.find((v) => v.split('-')[0] === country);
  const setCountry = (country, v) => onChange([...value.filter((x) => x.split('-')[0] !== country), ...(v ? [v] : [])]);
  return (
    <Section title={t('settings_holidays')} description={t('settings_holidays_hint')}>
      {Object.entries(COUNTRY_NAMES).map(([c, names]) => {
        const cur = current(c);
        return (
          <div key={c} className="grid items-center gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={Boolean(cur)} onChange={(e) => setCountry(c, e.target.checked ? c : null)} className="h-4 w-4 accent-[var(--brand)]" />
              {names[lang === 'en' ? 1 : 0]}
            </label>
            <select disabled={!cur} className={inputClass} value={cur || c} onChange={(e) => setCountry(c, e.target.value)}>
              <option value={c}>{t('settings_holidays_nationwide')}</option>
              {(regions?.[c] || []).map((r) => <option key={r.code} value={`${c}-${r.code}`}>{r.name}</option>)}
            </select>
          </div>
        );
      })}
    </Section>
  );
}

export default function AdminSettings() {
  const { t } = useI18n();
  const [form, setForm] = useState(null);
  const [password, setPassword] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [webhook, setWebhook] = useState('');
  const [mailTo, setMailTo] = useState('');
  const [notifyTest, setNotifyTest] = useState(null);
  const [status, setStatus] = useState(null); // { kind: 'ok'|'error', text }
  const [test, setTest] = useState(null);
  const [testUser, setTestUser] = useState('');
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => { api('/admin/settings').then(setForm).catch((e) => setStatus({ kind: 'error', text: e.message })); }, []);
  if (!form) return status ? <p className="text-alert">{status.text}</p> : <p className="text-muted">{t('loading')}</p>;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }));
  const setMode = (mode) => setForm((f) => ({
    ...f, ldap_mode: mode,
    // Switch to the usual port when the admin hasn't picked a custom one.
    ldap_port: [636, 389].includes(Number(f.ldap_port)) ? (mode === 'ldaps' ? 636 : 389) : f.ldap_port,
  }));

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const { ldap_bind_password_set, smtp_password_set, teams_webhook_url_set, ...rest } = form;
      const saved = await api('/admin/settings', { method: 'PUT', body: {
        ...rest, ldap_port: Number(form.ldap_port), smtp_port: Number(form.smtp_port), ldap_bind_password: password || null,
        smtp_password: smtpPassword || null, teams_webhook_url: webhook || null,
      } });
      setForm(saved);
      setPassword('');
      setSmtpPassword('');
      setWebhook('');
      setStatus({ kind: 'ok', text: t('settings_saved') });
      return true;
    } catch (err) {
      setStatus({ kind: 'error', text: err.message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTest(null);
    if (!(await save())) return;
    setBusy(true);
    try { setTest(await api('/admin/settings/ldap-test', { method: 'POST', body: { username: testUser } })); } finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const res = await api('/users/ldap-sync', { method: 'POST' });
      setStatus({ kind: 'ok', text: t('ldap_synced', { n: res.synced }) });
    } catch (err) {
      setStatus({ kind: 'error', text: err.message });
    } finally { setBusy(false); }
  };

  const attrs = ['username', 'first_name', 'last_name', 'email', 'department', 'title', 'phone', 'photo', 'manager'];

  return (
    <form onSubmit={save} className="space-y-5">
      <Section title={t('settings_general')} description={t('settings_general_hint')}>
        <Field label={t('settings_company')}><input required className={inputClass} value={form.company_name} onChange={set('company_name')} /></Field>
        <Toggle checked={form.public_read} onChange={set('public_read')} label={t('settings_public_read')} hint={t('settings_public_read_hint')} />
        <div>
          <span className="block font-medium">{t('settings_login_image')}</span>
          <span className="block text-sm text-muted">{t('settings_login_image_hint')}</span>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <img src={form.login_image_url || '/login-office.jpg'} alt="" className="h-24 w-40 rounded-xl border border-line object-cover" />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 font-medium hover:bg-surface-2">
                <ImagePlus size={17} />{t('settings_login_upload')}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('file', file);
                  try { setForm(await api('/admin/settings/login-image', { method: 'POST', form: fd })); } catch (err) { setStatus({ kind: 'error', text: err.message }); }
                }} />
              </label>
              {form.login_image_url && (
                <Button variant="ghost" onClick={async () => setForm(await api('/admin/settings/login-image', { method: 'DELETE' }))}>
                  <RotateCcw size={16} />{t('settings_login_reset')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <HolidaySettings value={form.holiday_regions || []} onChange={set('holiday_regions')} />

      <Section title={t('nt_title')} description={t('nt_hint')}>
        <Field label={t('nt_portal_url')} hint={t('nt_portal_url_hint')}>
          <input className={inputClass} placeholder="https://intranet.firma.local" value={form.portal_url || ''} onChange={set('portal_url')} />
        </Field>
        <Toggle checked={form.notify_email} onChange={set('notify_email')} label={t('nt_email')} hint={t('nt_email_hint')} />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_160px]">
          <Field label={t('nt_smtp_host')}><input className={inputClass} placeholder="smtp.office365.com" value={form.smtp_host || ''} onChange={set('smtp_host')} /></Field>
          <Field label={t('settings_ldap_port')}><input type="number" min={1} max={65535} className={inputClass} value={form.smtp_port} onChange={set('smtp_port')} /></Field>
          <Field label={t('nt_smtp_mode')}>
            <select className={inputClass} value={form.smtp_mode} onChange={set('smtp_mode')}>
              <option value="starttls">STARTTLS</option><option value="ssl">SSL/TLS</option><option value="none">{t('nt_smtp_none')}</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('nt_smtp_user')} hint={t('optional')}><input className={inputClass} autoComplete="off" value={form.smtp_user || ''} onChange={set('smtp_user')} /></Field>
          <Field label={t('nt_smtp_password')} hint={form.smtp_password_set ? t('settings_password_kept') : ''}>
            <input type="password" autoComplete="new-password" className={inputClass} placeholder={form.smtp_password_set ? '••••••••' : ''} value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
          </Field>
          <Field label={t('nt_smtp_from')}><input type="email" className={inputClass} placeholder="intranet@firma.de" value={form.smtp_from || ''} onChange={set('smtp_from')} /></Field>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('nt_test_to')} className="min-w-[16rem] flex-1"><input type="email" className={inputClass} value={mailTo} onChange={(e) => setMailTo(e.target.value)} /></Field>
          <Button variant="outline" disabled={busy || !mailTo} onClick={async () => {
            setNotifyTest(null);
            if (!(await save())) return;
            setNotifyTest(await api('/admin/settings/mail-test', { method: 'POST', body: { to: mailTo } }));
          }}>{t('nt_test_mail')}</Button>
        </div>
        <Toggle checked={form.notify_teams} onChange={set('notify_teams')} label={t('nt_teams')} hint={t('nt_teams_hint')} />
        <div className="flex flex-wrap items-end gap-2">
          <Field label={t('nt_webhook')} hint={form.teams_webhook_url_set ? t('settings_password_kept') : t('nt_webhook_hint')} className="min-w-[16rem] flex-1">
            <input type="password" autoComplete="off" className={inputClass} placeholder={form.teams_webhook_url_set ? '••••••••' : 'https://…'} value={webhook} onChange={(e) => setWebhook(e.target.value)} />
          </Field>
          <Button variant="outline" disabled={busy} onClick={async () => {
            setNotifyTest(null);
            if (!(await save())) return;
            setNotifyTest(await api('/admin/settings/teams-test', { method: 'POST' }));
          }}>{t('nt_test_teams')}</Button>
        </div>
        {notifyTest && (
          <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notifyTest.ok ? 'bg-safe/10 text-safe' : 'bg-alert/10 text-alert'}`}>
            {notifyTest.ok ? t('nt_test_ok') : `${t('nt_test_failed')}: ${notifyTest.error}`}
          </p>
        )}
      </Section>

      <Section title={t('sso_title')} description={t('sso_hint')}>
        <Toggle checked={form.sso_enabled} onChange={set('sso_enabled')} label={t('sso_enabled')} hint={t('sso_enabled_hint')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sso_header')} hint={t('sso_header_hint')}>
            <input className={inputClass} value={form.sso_header || ''} onChange={set('sso_header')} />
          </Field>
          <Field label={t('sso_proxies')} hint={t('sso_proxies_hint')}>
            <input className={inputClass} value={(form.trusted_proxies || []).join(', ')}
              onChange={(e) => setForm((f) => ({ ...f, trusted_proxies: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} />
          </Field>
        </div>
      </Section>

      <Section title={t('settings_ldap')} description={t('settings_ldap_hint')}>
        <Toggle checked={form.ldap_enabled} onChange={set('ldap_enabled')} label={t('settings_ldap_enabled')} hint={t('settings_ldap_enabled_hint')} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label={t('settings_ldap_host')} hint={t('settings_ldap_host_hint')}>
            <input className={inputClass} placeholder="10.0.0.5 / dc01.firma.local" value={form.ldap_host} onChange={set('ldap_host')} />
          </Field>
          <Field label={t('settings_ldap_port')}>
            <input type="number" min={1} max={65535} className={inputClass} value={form.ldap_port} onChange={set('ldap_port')} />
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-muted">{t('settings_ldap_mode')}</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {[['ldaps', 'LDAPS (SSL)', t('settings_ldaps_hint')], ['starttls', 'STARTTLS', t('settings_starttls_hint')]].map(([mode, label, hint]) => (
              <label key={mode} className={`cursor-pointer rounded-xl border p-3 transition-colors ${form.ldap_mode === mode ? 'border-brand bg-brand-soft' : 'border-line hover:border-muted'}`}>
                <input type="radio" name="ldap_mode" className="sr-only" checked={form.ldap_mode === mode} onChange={() => setMode(mode)} />
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </div>

        <Toggle checked={form.ldap_verify_cert} onChange={set('ldap_verify_cert')} label={t('settings_verify_cert')} hint={t('settings_verify_cert_hint')} />
        {!form.ldap_verify_cert && (
          <p className="flex items-start gap-2 rounded-xl bg-alert/10 px-3 py-2 text-sm text-alert"><ShieldAlert size={17} className="mt-0.5 shrink-0" />{t('settings_verify_off_warning')}</p>
        )}
        <Field label={t('settings_ca')} hint={t('settings_ca_hint')}>
          <textarea rows={4} className={`${inputClass} font-mono text-xs`} placeholder="-----BEGIN CERTIFICATE-----" value={form.ldap_ca_pem} onChange={set('ldap_ca_pem')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings_bind_dn')} hint={t('settings_bind_dn_hint')}>
            <input className={inputClass} placeholder="CN=svc-intranet,OU=Service,DC=firma,DC=local" value={form.ldap_bind_dn} onChange={set('ldap_bind_dn')} />
          </Field>
          <Field label={t('settings_bind_password')} hint={form.ldap_bind_password_set ? t('settings_password_kept') : ''}>
            <input type="password" autoComplete="new-password" className={inputClass} placeholder={form.ldap_bind_password_set ? '••••••••' : ''} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        <Field label={t('settings_base_dn')} hint={t('settings_base_dn_hint')}>
          <input className={inputClass} placeholder="OU=Mitarbeiter,DC=firma,DC=local" value={form.ldap_base_dn} onChange={set('ldap_base_dn')} />
        </Field>
        <Toggle checked={form.ldap_departments_auto} onChange={set('ldap_departments_auto')}
          label={t('settings_ldap_departments')} hint={t('settings_ldap_departments_hint')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings_admin_group')}><input className={inputClass} placeholder="CN=Intranet-Admins,OU=Gruppen,…" value={form.ldap_admin_group} onChange={set('ldap_admin_group')} /></Field>
          <Field label={t('settings_editor_group')}><input className={inputClass} placeholder="CN=Intranet-Redaktion,OU=Gruppen,…" value={form.ldap_editor_group} onChange={set('ldap_editor_group')} /></Field>
        </div>

        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          <ChevronDown size={16} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />{t('settings_advanced')}
        </button>
        {advanced && (
          <div className="space-y-4 rounded-xl bg-surface-2/60 p-4">
            <Field label={t('settings_user_filter')} hint={t('settings_user_filter_hint')}><input className={`${inputClass} font-mono text-sm`} value={form.ldap_user_filter} onChange={set('ldap_user_filter')} /></Field>
            <Field label={t('settings_sync_filter')}><input className={`${inputClass} font-mono text-sm`} value={form.ldap_sync_filter} onChange={set('ldap_sync_filter')} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {attrs.map((a) => (
                <Field key={a} label={`${t('settings_attr')}: ${t(`settings_attr_${a}`)}`}>
                  <input className={`${inputClass} font-mono text-sm`} value={form[`ldap_attr_${a}`]} onChange={set(`ldap_attr_${a}`)} />
                </Field>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-line p-4">
          <p className="font-medium">{t('settings_test_title')}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label={t('settings_test_user')} className="min-w-[200px] flex-1">
              <input className={inputClass} placeholder="max.mustermann" value={testUser} onChange={(e) => setTestUser(e.target.value)} />
            </Field>
            <Button variant="outline" onClick={runTest} disabled={busy || !form.ldap_host}><PlugZap size={17} />{t('settings_test')}</Button>
            <Button variant="outline" onClick={sync} disabled={busy || !form.ldap_enabled}><RefreshCw size={17} />{t('ldap_sync')}</Button>
          </div>
          {test && (
            <div role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${test.ok ? 'bg-safe/10 text-safe' : 'bg-alert/10 text-alert'}`}>
              <p className="flex items-center gap-2 font-medium">{test.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {test.ok ? t('settings_test_ok', { server: test.server }) : test.error}</p>
              {test.ok && test.users_found !== undefined && <p className="mt-1">{t('settings_test_users', { n: test.users_found })}</p>}
              {test.ok && 'user' in test && (
                <p className="mt-1">{test.user ? `${test.user.name}, ${test.user.email || ''} (${t(`role_${test.user.role}`)})` : t('settings_test_user_missing')}</p>
              )}
            </div>
          )}
        </div>
      </Section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {status && <p role="status" className={`rounded-xl bg-surface px-3 py-2 text-sm shadow ${status.kind === 'ok' ? 'text-safe' : 'text-alert'}`}>{status.text}</p>}
        <Button type="submit" disabled={busy} className="shadow-lg">{t('save')}</Button>
      </div>
    </form>
  );
}
