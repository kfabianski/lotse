import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, FileText, ImagePlus, Paperclip, X } from 'lucide-react';
import { Button, Field, Markdown, inputClass } from '../components/ui';
import { CATEGORIES, useI18n } from '../lib/i18n';
import { api, uploadImage } from '../lib/api';
import { useAuth } from '../lib/auth';

const EMPTY = {
  category: 'news', title_de: '', title_en: '', summary_de: '', summary_en: '', body_de: '', body_en: '',
  image_url: null, event_date: null, event_location: '', featured: false, published: true, attachments: [], change_note: '',
};

function Attachments({ value, onChange }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async (files) => {
    setBusy(true);
    setError('');
    const added = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      try { added.push(await api('/files', { method: 'POST', form })); } catch (err) { setError(`${file.name}: ${err.message}`); }
    }
    onChange([...value, ...added]);
    setBusy(false);
  };
  const move = (i, d) => { const next = [...value]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next); };
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-muted">{t('attachments')}</span>
      {value.length > 0 && (
        <ul className="card mb-2 divide-y divide-line">
          {value.map((a, i) => (
            <li key={a.url} className="flex items-center gap-3 px-3 py-2">
              {a.kind === 'image' ? <img src={a.url} alt="" className="h-10 w-14 rounded-md object-cover" />
                : <span className="flex h-10 w-14 items-center justify-center rounded-md bg-alert/10 text-alert"><FileText size={18} /></span>}
              <input className={`${inputClass} flex-1 py-1.5 text-sm`} value={a.name} aria-label={t('name')}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('move_up')} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp size={15} /></button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={t('move_down')} className="rounded p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown size={15} /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={t('delete')} className="rounded p-1.5 text-muted hover:text-alert"><X size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-muted hover:border-brand hover:text-brand ${busy ? 'opacity-60' : ''}`}>
        <Paperclip size={18} /><span className="font-medium">{busy ? t('loading') : t('add_attachments')}</span>
        <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="sr-only" disabled={busy}
          onChange={(e) => { add([...e.target.files]); e.target.value = ''; }} />
      </label>
      <p className="mt-1 text-sm text-muted">{t('attachments_hint')}</p>
      {error && <p className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}

/** Image upload with preview. `tall`: fills a side column (square preview, tall drop zone). */
export function ImagePicker({ value, onChange, tall = false }) {
  const { t } = useI18n();
  const [error, setError] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      onChange((await uploadImage(file)).url);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className={tall ? 'flex h-full flex-col' : ''}>
      {value ? (
        <div className="relative">
          <img src={value} alt="" className={`${tall ? 'aspect-square' : 'aspect-[16/7]'} w-full rounded-xl object-cover`} />
          <button type="button" onClick={() => onChange(null)} aria-label={t('remove_image')}
            className="absolute right-2 top-2 rounded-full bg-surface p-1.5 shadow"><X size={16} /></button>
        </div>
      ) : (
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-8 text-muted hover:border-brand hover:text-brand ${tall ? 'min-h-48 flex-1' : ''}`}>
          <ImagePlus size={24} /><span className="font-medium">{t('upload_image')}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={pick} />
        </label>
      )}
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}

export default function ArticleEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t } = useI18n();
  const { has } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY, category: params.get('category') || 'news' });
  const [tab, setTab] = useState('de');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api(`/articles/${id}`).then((a) => setForm({ ...EMPTY, ...a, attachments: (a.attachments || []).map(({ url, name, kind, size }) => ({ url, name, kind, size })) }))
        .catch((e) => setError(e.message));
    }
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });

  const save = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      event_date: form.category === 'events' && form.event_date ? form.event_date : null,
      // Cleared date on an existing article means "now"; on a new one the server uses now.
      published_at: form.published_at || (id ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19) : null),
    };
    try {
      const saved = await api(id ? `/articles/${id}` : '/articles', { method: id ? 'PUT' : 'POST', body });
      navigate(`/articles/${saved.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const localDate = form.event_date ? form.event_date.slice(0, 16) : '';
  const publishAt = form.published_at ? form.published_at.slice(0, 16) : '';
  const isScheduled = form.published && publishAt && new Date(publishAt) > new Date();

  return (
    <form onSubmit={save} className="mx-auto max-w-[920px]">
      <h1 className="font-display text-[2rem] font-semibold leading-tight">{id ? t('edit') : t('new_article')}</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field label={t('category')}>
          <select className={inputClass} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat_${c}`)}</option>)}
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-2">
          {has('content_all') && <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={set('featured')} className="h-4 w-4 accent-[var(--brand)]" />{t('featured')}</label>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.published} onChange={set('published')} className="h-4 w-4 accent-[var(--brand)]" />{t('published')}</label>
        </div>
        <Field label={t('publish_at')} hint={isScheduled ? t('publish_at_scheduled') : t('publish_at_hint')}>
          <div className="flex gap-2">
            <input type="datetime-local" className={inputClass} value={publishAt}
              onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value || null }))} />
            {publishAt && (
              <Button variant="ghost" className="shrink-0 px-3" onClick={() => setForm((f) => ({ ...f, published_at: null }))}>{t('publish_now')}</Button>
            )}
          </div>
        </Field>
        {form.category === 'events' && (
          <>
            <Field label={t('event_date')}>
              <input type="datetime-local" className={inputClass} value={localDate} onChange={set('event_date')} />
            </Field>
            <Field label={t('event_location')}>
              <input className={inputClass} value={form.event_location} onChange={set('event_location')} />
            </Field>
          </>
        )}
      </div>

      <div className="mt-6"><span className="mb-1 block text-sm font-medium text-muted">{t('image')}</span>
        <ImagePicker value={form.image_url} onChange={set('image_url')} />
      </div>
      <div className="mt-6"><Attachments value={form.attachments || []} onChange={(v) => setForm((f) => ({ ...f, attachments: v }))} /></div>

      <div className="mt-8 flex items-center justify-between border-b border-line">
        <div role="tablist" className="flex gap-6">
          {[['de', t('german')], ['en', t('english')]].map(([code, label]) => (
            <button key={code} type="button" role="tab" aria-selected={tab === code} onClick={() => setTab(code)}
              className={`-mb-px border-b-[3px] pb-2 font-medium ${tab === code ? 'border-signal text-ink' : 'border-transparent text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
        <label className="mb-2 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} className="accent-[var(--brand)]" />{t('preview')}
        </label>
      </div>

      <div className="mt-5 space-y-4">
        <Field label={t('title')}>
          <input className={inputClass} required={tab === 'de'} value={form[`title_${tab}`]} onChange={set(`title_${tab}`)} />
        </Field>
        <Field label={t('summary')}>
          <textarea rows={2} className={inputClass} value={form[`summary_${tab}`]} onChange={set(`summary_${tab}`)} />
        </Field>
        <Field label={t('body')}>
          {preview
            ? <div className="min-h-[300px] rounded-lg border border-line bg-surface p-4"><Markdown source={form[`body_${tab}`]} /></div>
            : <textarea rows={14} className={`${inputClass} font-mono text-sm`} value={form[`body_${tab}`]} onChange={set(`body_${tab}`)} />}
        </Field>
      </div>

      <div className="mt-6">
        <Field label={t('rev_note')} hint={t('rev_note_hint')}>
          <input maxLength={300} className={inputClass} value={form.change_note || ''} onChange={set('change_note')} />
        </Field>
      </div>

      {error && <p role="alert" className="mt-4 text-alert">{t('error_generic', { msg: error })}</p>}
      <div className="mt-8 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate(-1)}>{t('cancel')}</Button>
        <Button type="submit">{!form.published ? t('save') : isScheduled ? t('schedule') : t('publish')}</Button>
      </div>
    </form>
  );
}
