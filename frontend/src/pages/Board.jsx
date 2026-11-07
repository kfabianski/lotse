import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { Avatar, Button, Empty, Field, Modal, inputClass, relativeDay } from '../components/ui';
import { ImagePicker } from './ArticleEdit';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useViewer } from '../lib/viewer';
import { useHashFocus } from '../lib/hashFocus';

const KINDS = ['offer', 'search', 'give', 'carpool', 'other'];
const KIND_COLOR = { offer: 'var(--brand)', search: '#8a5cc7', give: 'var(--safe)', carpool: 'var(--signal)', other: 'var(--muted)' };

function NoticeForm({ onDone }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ kind: 'offer', title: '', body: '', price: '', image_url: null });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/classifieds', { method: 'POST', body: form });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })} aria-pressed={form.kind === k}
            className={`rounded-sm border px-3 py-1 font-medium ${form.kind === k ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>
            {t(`kind_${k}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-4">
          <Field label={t('title')}><input required minLength={3} className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label={t('description')}><textarea rows={6} className={`${inputClass} resize-y`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Field label={t('price')}><input className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        </div>
        <ImagePicker tall value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
      </div>
      {error && <p className="text-alert">{t('error_generic', { msg: error })}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>{t('cancel')}</Button>
        <Button type="submit">{t('new_notice')}</Button>
      </div>
    </form>
  );
}

export default function Board() {
  const { t } = useI18n();
  const { user, has } = useAuth();
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { open: openViewer } = useViewer();
  // Visitors can read the board; posting asks them to sign in first.
  const startNotice = () => (user ? setOpen(true) : navigate('/login?next=/board'));
  const { data, reload } = useFetch('/classifieds', { params: { kind } }, kind);
  useHashFocus(Boolean(data));

  const remove = async (id) => {
    if (!window.confirm(t('confirm_delete'))) return;
    await api(`/classifieds/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('board_title')}</h1>
          <p className="mt-2 text-muted">{t('board_intro')}</p>
        </div>
        <Button onClick={startNotice}><Plus size={18} />{t('new_notice')}</Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-line pb-4">
        {['', ...KINDS].map((k) => (
          <button key={k || 'all'} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`rounded-sm border px-4 py-1.5 font-medium ${kind === k ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'}`}>
            {k ? t(`kind_${k}`) : t('all')}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {data && !data.length && <Empty action={<Button onClick={startNotice}>{t('new_notice')}</Button>}>{t('board_empty')}</Empty>}
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((c) => (
            <li key={c.id} id={`notice-${c.id}`} className="card flex h-full flex-col overflow-hidden">
              <div className="h-1.5" style={{ background: KIND_COLOR[c.kind] }} />
              {c.image_url && (
                <button type="button" onClick={() => openViewer([{ url: c.image_url, name: c.title, kind: 'image' }])} className="block w-full cursor-zoom-in">
                  <img src={c.image_url} alt="" className="aspect-[4/3] w-full object-cover" />
                </button>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium" style={{ color: c.kind === 'carpool' ? 'var(--ink)' : KIND_COLOR[c.kind] }}>{t(`kind_${c.kind}`)}</span>
                  <span className="text-muted">{relativeDay(t, c.created_at)}</span>
                </div>
                <h2 className="mt-1 font-display text-[1.15rem] font-semibold leading-tight">{c.title}</h2>
                {c.price && <p className="mt-1 font-semibold">{c.price}</p>}
                {c.body && <p className="mt-2 whitespace-pre-line text-muted">{c.body}</p>}
                <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
                  <Avatar person={c.author} size={34} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{c.author.full_name}</p>
                    <div className="flex gap-3 text-brand-text">
                      {c.author.email && <a href={`mailto:${c.author.email}?subject=${encodeURIComponent(c.title)}`} aria-label={t('email')}><Mail size={15} /></a>}
                      {c.author.phone_ext && <a href={`tel:${c.author.phone_ext}`} className="inline-flex items-center gap-1"><Phone size={15} />{c.author.phone_ext}</a>}
                    </div>
                  </div>
                  {user && (c.author.id === user.id || has('moderate')) && (
                    <button type="button" onClick={() => remove(c.id)} aria-label={t('delete')} className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-alert">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {open && (
        <Modal title={t('new_notice')} size="lg" onClose={() => setOpen(false)}>
          <NoticeForm onDone={() => { setOpen(false); reload(); }} />
        </Modal>
      )}
    </div>
  );
}
