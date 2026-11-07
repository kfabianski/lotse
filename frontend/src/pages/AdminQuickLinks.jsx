/** Admin: quick-access tiles on the home page (tools, shared mailboxes, phone numbers). */
import { useState } from 'react';
import { ArrowDown, ArrowUp, EyeOff, PenLine, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Modal, inputClass } from '../components/ui';
import { QUICK_ICONS, QuickLinkTile } from '../components/QuickLinks';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';

const EMPTY = { title_de: '', title_en: '', subtitle_de: '', subtitle_en: '', url: '', icon: 'link', color: '#3557f5', sort: 0, active: true };
const COLORS = ['#3557f5', '#0891b2', '#13995b', '#65a30d', '#d97706', '#e0484d', '#db2777', '#8b5cf6', '#64748b', '#15171c'];

export default function AdminQuickLinks() {
  const { t } = useI18n();
  const { data, reload } = useFetch('/quicklinks', { params: { all: true } }, 'admin-quicklinks');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const links = data || [];

  const guard = async (fn) => {
    setError('');
    try { await fn(); reload(); } catch (e) { setError(e.message); }
  };
  const save = (e) => {
    e.preventDefault();
    guard(async () => {
      const body = { ...edit, sort: Number(edit.sort) || 0 };
      await api(edit.id ? `/quicklinks/${edit.id}` : '/quicklinks', { method: edit.id ? 'PUT' : 'POST', body });
      setEdit(null);
    });
  };
  const remove = (l) => { if (window.confirm(t('confirm_delete'))) guard(() => api(`/quicklinks/${l.id}`, { method: 'DELETE' })); };
  const move = (i, d) => guard(async () => {
    const order = [...links];
    [order[i], order[i + d]] = [order[i + d], order[i]];
    await Promise.all(order.map((l, idx) => (l.sort === idx ? null : api(`/quicklinks/${l.id}`, { method: 'PUT', body: { ...l, sort: idx } }))));
  });
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">{t('ql_intro')}</p>
        <Button onClick={() => setEdit({ ...EMPTY, sort: links.length })}><Plus size={17} />{t('ql_new')}</Button>
      </div>
      {error && <p className="mb-3 text-alert">{t('error_generic', { msg: error })}</p>}
      <ul className="card divide-y divide-line">
        {links.map((l, i) => {
          const Icon = QUICK_ICONS[l.icon] || QUICK_ICONS.link;
          return (
            <li key={l.id} className={`flex items-center gap-3 px-4 py-2.5 ${l.active ? '' : 'opacity-60'}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-photo" style={{ background: l.color }}><Icon size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{l.title_de}{!l.active && <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted"><EyeOff size={12} />{t('ql_hidden')}</span>}</span>
                <span className="block truncate text-sm text-muted">{l.url}</span>
              </span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('move_up')} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp size={15} /></button>
              <button type="button" disabled={i === links.length - 1} onClick={() => move(i, 1)} aria-label={t('move_down')} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown size={15} /></button>
              <button type="button" onClick={() => setEdit(l)} aria-label={t('edit')} className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-ink"><PenLine size={16} /></button>
              <button type="button" onClick={() => remove(l)} aria-label={t('delete')} className="rounded p-1.5 text-muted hover:text-alert"><Trash2 size={16} /></button>
            </li>
          );
        })}
      </ul>

      {edit && (
        <Modal title={edit.id ? edit.title_de : t('ql_new')} size="lg" onClose={() => setEdit(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label={t('ql_title_de')}><input required maxLength={80} className={inputClass} value={edit.title_de} onChange={set('title_de')} /></Field>
            <Field label={t('ql_title_en')}><input maxLength={80} className={inputClass} value={edit.title_en} onChange={set('title_en')} /></Field>
            <Field label={t('ql_sub_de')}><input maxLength={120} className={inputClass} value={edit.subtitle_de} onChange={set('subtitle_de')} /></Field>
            <Field label={t('ql_sub_en')}><input maxLength={120} className={inputClass} value={edit.subtitle_en} onChange={set('subtitle_en')} /></Field>
            <Field label={t('ql_url')} hint={t('ql_url_hint')} className="sm:col-span-2">
              <input required maxLength={500} className={inputClass} value={edit.url} onChange={set('url')} placeholder="https://zeit.firma.de · buchhaltung@firma.de · tel:100" />
            </Field>
            <Field label={t('ql_icon')} className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(QUICK_ICONS).map(([k, Icon]) => (
                  <button key={k} type="button" onClick={() => setEdit({ ...edit, icon: k })} aria-pressed={edit.icon === k} aria-label={k} title={k}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${edit.icon === k ? 'border-brand bg-brand-soft text-brand-text' : 'border-line text-muted hover:text-ink'}`}><Icon size={17} /></button>
                ))}
              </div>
            </Field>
            <Field label={t('ql_color')}>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setEdit({ ...edit, color: c })} aria-label={c} aria-pressed={edit.color === c}
                    className={`h-7 w-7 rounded-sm ring-offset-2 ring-offset-[var(--surface)] ${edit.color === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />
                ))}
                <input type="color" value={edit.color} onChange={set('color')} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" />
              </div>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={edit.active} onChange={set('active')} className="h-4 w-4 accent-[var(--brand)]" />{t('ql_active')}</label>
            <div className="sm:col-span-2">
              <ul className="max-w-sm"><QuickLinkTile link={{ ...edit, url: edit.url || '#' }} /></ul>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => setEdit(null)}>{t('cancel')}</Button>
              <Button type="submit">{t('save')}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
