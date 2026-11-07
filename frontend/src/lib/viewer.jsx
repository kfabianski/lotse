import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import { useI18n } from './i18n';

/**
 * In-app viewer for photos and PDFs. Files open over the portal instead of a new browser window.
 * useViewer().open(items, index) – items: [{ url, name, kind: 'image' | 'pdf' }]
 */
const ViewerContext = createContext({ open: () => {} });
export const useViewer = () => useContext(ViewerContext);

export const isPdf = (url = '') => /\.pdf($|[?#])/i.test(url);
export const isImage = (url = '') => /\.(png|jpe?g|gif|webp|svg)($|[?#])/i.test(url);

function Viewer({ items, start, onClose }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(start);
  const ref = useRef(null);
  const item = items[index];
  const images = items.filter((i) => i.kind === 'image');
  const multi = items.length > 1;
  const go = useCallback((d) => setIndex((i) => (i + d + items.length) % items.length), [items.length]);

  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const key = (e) => {
      if (e.key === 'ArrowRight' && multi) go(1);
      if (e.key === 'ArrowLeft' && multi) go(-1);
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); el?.close(); };
  }, [go, multi]);

  const nav = 'absolute top-1/2 z-10 -translate-y-1/2 rounded-sm bg-on-photo/10 p-3 text-on-photo  hover:bg-on-photo/20';

  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-label={item.name}
      className="m-0 h-full max-h-none w-full max-w-none bg-scrim/[0.97] p-0 backdrop:bg-scrim/60">
      <div className="flex h-full flex-col text-on-photo">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          {item.kind === 'pdf' && <FileText size={18} className="shrink-0 opacity-70" />}
          <p className="min-w-0 flex-1 truncate font-medium">{item.name}</p>
          {multi && <span className="text-sm tabular-nums text-on-photo/60">{index + 1} / {items.length}</span>}
          <a href={item.url} download={item.name || true} className="inline-flex items-center gap-2 rounded-xl bg-on-photo/10 px-3 py-2 text-sm font-medium hover:bg-on-photo/20">
            <Download size={16} /><span className="hidden sm:inline">{t('download')}</span>
          </a>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-xl bg-on-photo/10 p-2 hover:bg-on-photo/20"><X size={20} /></button>
        </div>

        <div className="relative min-h-0 flex-1 px-4 pb-4 sm:px-16" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          {item.kind === 'pdf' ? (
            <iframe key={item.url} src={`${item.url}#view=FitH`} title={item.name} className="h-full w-full rounded-xl bg-on-photo" />
          ) : (
            <img key={item.url} src={item.url} alt={item.name} className="mx-auto h-full w-full object-contain" />
          )}
          {multi && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={t('previous')} className={`${nav} left-3`}><ChevronLeft size={22} /></button>
              <button type="button" onClick={() => go(1)} aria-label={t('next')} className={`${nav} right-3`}><ChevronRight size={22} /></button>
            </>
          )}
        </div>

        {images.length > 1 && item.kind === 'image' && (
          <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-4">
            {items.map((it, i) => it.kind === 'image' && (
              <button key={it.url} type="button" onClick={() => setIndex(i)} aria-label={it.name} aria-current={i === index}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition-opacity ${i === index ? 'ring-on-photo' : 'opacity-50 ring-transparent hover:opacity-80'}`}>
                <img src={it.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

export function ViewerProvider({ children }) {
  const [state, setState] = useState(null);
  const open = useCallback((items, index = 0) => setState({ items, index }), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <ViewerContext.Provider value={value}>
      {children}
      {state && <Viewer items={state.items} start={state.index} onClose={() => setState(null)} />}
    </ViewerContext.Provider>
  );
}
