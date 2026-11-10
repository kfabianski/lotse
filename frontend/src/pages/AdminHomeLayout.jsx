import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { layoutRows } from './Home';

const B = (id, width = 'full', show = true) => ({ id, show, width });
const ALL = ['slider', 'quicklinks', 'upcoming', 'news', 'people', 'photos', 'recent', 'poll', 'board', 'social'];
const complete = (list) => [...list, ...ALL.filter((id) => !list.some((b) => b.id === id)).map((id) => B(id, 'full', false))];

/** Ready-made layouts – one click, then fine-tune by dragging. */
const PRESETS = {
  standard: null, // = server default
  news: complete([B('news'), B('upcoming', 'half'), B('poll', 'half'), B('quicklinks'),
    B('people'), B('photos'), B('board')]),
  events: complete([B('slider'), B('upcoming'), B('photos'), B('news'), B('people', 'half'),
    B('board', 'half'), B('quicklinks')]),
  compact: complete([B('quicklinks'), B('upcoming', 'half'), B('poll', 'half'),
    B('news', 'half'), B('board', 'half')]),
};

/** Rough block heights for the preview (in rem). */
const HEIGHT = { slider: 7, quicklinks: 3.5, upcoming: 6, news: 7, people: 5, photos: 7, recent: 5, poll: 5, board: 4 };
const TINT = { slider: '#0f766e', quicklinks: '#0891b2', upcoming: '#7c3aed',
  news: '#2563eb', people: '#db2777', photos: '#ea580c', recent: '#64748b', poll: '#16a34a', board: '#d97706', social: '#1877f2' };

export default function AdminHomeLayout() {
  const { t } = useI18n();
  const [layout, setLayout] = useState(null);
  const [fallback, setFallback] = useState([]);
  const [drag, setDrag] = useState(null);
  const [status, setStatus] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { api('/home-layout').then((d) => { setLayout(d.layout); setFallback(d.default); }); }, []);
  if (!layout) return <p className="text-muted">{t('loading')}</p>;

  const change = (next) => { setLayout(next); setDirty(true); setStatus(null); };
  const patch = (id, p) => change(layout.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const move = (from, to) => {
    if (to < 0 || to >= layout.length || from === to) return;
    const next = [...layout];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    change(next);
  };
  const save = async () => {
    try {
      const d = await api('/home-layout', { method: 'PUT', body: layout });
      setLayout(d.layout); setDirty(false); setStatus({ ok: true, text: t('hl_saved') });
    } catch (err) { setStatus({ ok: false, text: err.message }); }
  };
  const preview = layoutRows(layout.filter((b) => b.show));

  return (
    <div>
      <p className="max-w-3xl text-muted">{t('hl_intro')}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t('hl_presets')}:</span>
        {Object.keys(PRESETS).map((k) => (
          <button key={k} type="button" onClick={() => change(PRESETS[k] || fallback)}
            className="rounded-sm border border-line bg-surface px-3.5 py-1.5 text-sm font-medium hover:border-brand hover:text-brand-text">
            {t(`hl_preset_${k}`)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <ol className="space-y-2" aria-label={t('hl_blocks')}>
          {layout.map((b, i) => (
            <li key={b.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); setDrag(i); }} onDragEnd={() => setDrag(null)}
              onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setDrag(i); } }}
              className={`flex items-center gap-2 rounded-xl border bg-surface px-2.5 py-2 ${drag === i ? 'border-brand shadow-lg' : 'border-line'} ${b.show ? '' : 'opacity-55'}`}>
              <GripVertical size={18} className="shrink-0 cursor-grab text-muted" aria-hidden />
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: TINT[b.id] }} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-tight">{t(`hl_b_${b.id}`)}</span>
                <span className="block truncate text-xs text-muted">{t(`hl_d_${b.id}`)}</span>
              </span>
              <div role="group" aria-label={t('hl_width')} className="hidden shrink-0 rounded-lg border border-line p-0.5 text-xs sm:flex">
                {['full', 'half'].map((w) => (
                  <button key={w} type="button" aria-pressed={b.width === w} onClick={() => patch(b.id, { width: w })}
                    className={`rounded-md px-2 py-1 font-medium ${b.width === w ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>{t(`hl_${w}`)}</button>
                ))}
              </div>
              <button type="button" onClick={() => patch(b.id, { show: !b.show })} aria-pressed={b.show}
                aria-label={b.show ? t('hl_hide') : t('hl_show')} title={b.show ? t('hl_hide') : t('hl_show')}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink">{b.show ? <Eye size={17} /> : <EyeOff size={17} />}</button>
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t('move_up')} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === layout.length - 1} aria-label={t('move_down')} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown size={16} /></button>
            </li>
          ))}
        </ol>

        <div>
          <p className="mb-2 text-sm font-medium">{t('hl_preview')}</p>
          <div className="sticky top-24 rounded-2xl border border-line bg-bg p-4">
            <div className="space-y-2.5">
              {preview.map((row) => (
                <div key={row[0].id} className={`grid gap-2.5 ${row.length === 2 ? 'grid-cols-2' : ''}`}>
                  {row.map((b) => (
                    <div key={b.id} className="flex items-center justify-center rounded-lg px-2 text-center text-xs font-semibold text-on-photo"
                      style={{ background: TINT[b.id], height: `${HEIGHT[b.id] * (row.length === 2 ? 0.8 : 0.6)}rem` }}>
                      {t(`hl_b_${b.id}`)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">{t('hl_preview_hint')}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button onClick={save} disabled={!dirty}>{t('save')}</Button>
        <Button variant="ghost" onClick={() => change(fallback)}><RotateCcw size={16} />{t('hl_reset')}</Button>
        {status && <span role="status" className={`text-sm ${status.ok ? 'text-safe' : 'text-alert'}`}>{status.text}</span>}
      </div>
    </div>
  );
}
