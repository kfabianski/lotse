/** LDAP sync with preview: shows what would change; the admin decides what is applied. LDAP is leading. */
import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Link2, Loader2, UserMinus, UserPlus, UserRoundCheck } from 'lucide-react';
import { Button, Modal } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';

function Group({ icon: Icon, title, hint, children, count }) {
  if (!count) return null;
  return (
    <section className="rounded-xl border border-line">
      <div className="flex items-start gap-3 border-b border-line bg-bg px-4 py-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-brand" />
        <div><p className="font-semibold">{title} <span className="font-normal text-muted">{count}</span></p>{hint && <p className="text-sm text-muted">{hint}</p>}</div>
      </div>
      <ul className="thin-scroll max-h-64 divide-y divide-line overflow-y-auto">{children}</ul>
    </section>
  );
}

function Row({ checked, onChange, disabled, children, note }) {
  return (
    <li>
      <label className={`flex items-start gap-3 px-4 py-2 text-sm ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-surface-2'}`}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--brand)]" checked={checked} disabled={disabled} onChange={onChange} />
        <span className="min-w-0 flex-1">{children}{note && <span className="block text-xs text-alert">{note}</span>}</span>
      </label>
    </li>
  );
}

export default function LdapSyncDialog({ onClose, onDone }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    api('/users/ldap-sync/preview', { method: 'POST' }).then((p) => {
      setPlan(p);
      setSel({
        add: p.new.filter((x) => !x.duplicate_email).map((x) => x.username),
        link: p.link.filter((x) => !x.special).map((x) => x.user_id),  // accounts with rights: only on purpose
        update: true,
        deactivate: p.missing.map((x) => x.user_id),
        remove_departments: p.departments_other.filter((d) => d.people_left === 0).map((d) => d.id),
      });
    }).catch((e) => setError(e.message));
  }, []);

  const toggle = (key, v) => setSel((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));
  const apply = async () => {
    setBusy(true);
    setError('');
    try { setResult(await api('/users/ldap-sync/apply', { method: 'POST', body: sel })); onDone(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const nothing = plan && !plan.new.length && !plan.link.length && !plan.update.length && !plan.missing.length
    && !plan.reactivate.length && !plan.departments_new.length && !plan.departments_other.length;

  return (
    <Modal title={t('sync_title')} size="full" onClose={onClose}>
      {!plan && !error && <p className="flex items-center gap-2 text-muted"><Loader2 size={17} className="animate-spin" />{t('sync_loading')}</p>}
      {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-alert">{t('error_generic', { msg: error })}</p>}
      {result && (
        <div className="space-y-3">
          <p className="font-semibold text-safe">{t('sync_done')}</p>
          <p className="text-sm">{t('sync_result', result)}</p>
          <div className="flex justify-end"><Button onClick={onClose}>{t('close')}</Button></div>
        </div>
      )}
      {plan && sel && !result && (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('sync_intro', { n: plan.total })}</p>
          {plan.duplicate_emails.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-signal/15 px-3 py-2 text-sm"><AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {t('sync_dup')} {plan.duplicate_emails.map((d) => `${d.email} (${d.usernames.join(', ')})`).join('; ')}</p>
          )}
          {nothing && <p className="text-safe">{t('sync_nothing')}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <Group icon={UserPlus} title={t('sync_new')} hint={t('sync_new_hint')} count={plan.new.length}>
              {plan.new.map((x) => (
                <Row key={x.username} checked={sel.add.includes(x.username)} onChange={() => toggle('add', x.username)} disabled={x.duplicate_email}
                  note={x.duplicate_email ? t('sync_dup_row') : ''}>
                  <span className="font-medium">{x.name}</span> <span className="text-muted">{x.username} · {x.email || '–'} · {x.department || '–'}</span>
                </Row>
              ))}
            </Group>
            <Group icon={Link2} title={t('sync_link')} hint={t('sync_link_hint')} count={plan.link.length}>
              {plan.link.map((x) => (
                <Row key={x.user_id} checked={sel.link.includes(x.user_id)} onChange={() => toggle('link', x.user_id)}
                  note={x.special ? t('sync_link_special', { role: t(`role_${x.role}`) }) : ''}>
                  <span className="font-medium">{x.name}</span> <span className="text-muted">{x.local_username} → {x.ldap_username} ({x.matched_by === 'email' ? x.email : t('username')})</span>
                </Row>
              ))}
            </Group>
            <Group icon={UserRoundCheck} title={t('sync_update')} hint={t('sync_update_hint')} count={plan.update.length + plan.reactivate.length}>
              <Row checked={sel.update} onChange={() => setSel((s) => ({ ...s, update: !s.update }))}>
                <span className="font-medium">{t('sync_update_all')}</span>
              </Row>
              {plan.update.map((x) => (
                <li key={x.user_id} className="px-4 py-2 pl-11 text-sm">
                  <span className="font-medium">{x.name}</span>
                  <span className="block text-xs text-muted">{x.changes.map((c) => `${t(c.field === 'phone_ext' ? 'extension' : c.field)}: ${c.old || '–'} → ${c.new || '–'}`).join(' · ')}</span>
                </li>
              ))}
              {plan.reactivate.map((x) => <li key={`r${x.user_id}`} className="px-4 py-2 pl-11 text-sm">{x.name} <span className="text-muted">· {t('sync_reactivate')}</span></li>)}
            </Group>
            <Group icon={UserMinus} title={t('sync_missing')} hint={t('sync_missing_hint')} count={plan.missing.length}>
              {plan.missing.map((x) => (
                <Row key={x.user_id} checked={sel.deactivate.includes(x.user_id)} onChange={() => toggle('deactivate', x.user_id)}>
                  <span className="font-medium">{x.name}</span> <span className="text-muted">{x.username} · {x.department || '–'}</span>
                </Row>
              ))}
            </Group>
            <Group icon={Building2} title={t('sync_depts')} hint={t('sync_depts_hint')} count={plan.departments_new.length + plan.departments_other.length}>
              {plan.departments_new.map((d) => <li key={d} className="px-4 py-2 text-sm"><span className="font-medium text-safe">+ {d}</span> <span className="text-muted">· {t('sync_dept_new')}</span></li>)}
              {plan.departments_other.map((d) => (
                <Row key={d.id} checked={sel.remove_departments.includes(d.id)} onChange={() => toggle('remove_departments', d.id)} disabled={d.people_left > 0}
                  note={d.people_left > 0 ? t('sync_dept_people', { n: d.people_left }) : ''}>
                  <span className="font-medium">{d.name}</span> <span className="text-muted">· {t('sync_dept_remove')}</span>
                </Row>
              ))}
            </Group>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={apply} disabled={busy || nothing}>{busy ? t('loading') : t('sync_apply')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
