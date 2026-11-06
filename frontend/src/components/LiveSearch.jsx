import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DoorOpen, FileText, GraduationCap, Lightbulb, Link2, Loader2, Newspaper, Search, StickyNote } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useViewer } from '../lib/viewer';
import { Avatar } from './ui';
import { QUICK_ICONS } from './QuickLinks';

const MIN = 2; // characters before searching
const DELAY = 220; // ms after the last key press
const PER_GROUP = 4;

/** Turns the /api/search answer into one flat, keyboard-navigable list. */
function flatten(data, t, pick, open) {
  if (!data) return [];
  const docs = data.documents.map((x) => ({ url: x.url, name: x.name, kind: 'pdf' }));
  const groups = [
    ['nav_people', data.people, (p) => ({ person: p, label: p.full_name, sub: [p.position, p.department, p.phone_ext && `${t('extension')} ${p.phone_ext}`].filter(Boolean).join(' · '), to: `/people?focus=${p.id}` })],
    ['quick_title', data.links, (x) => ({ icon: QUICK_ICONS[x.icon] || Link2, color: x.color, label: pick(x, 'title'), sub: pick(x, 'subtitle'), href: x.url })],
    ['nav_trainings', data.trainings, (x) => ({ icon: GraduationCap, label: pick(x, 'title'), to: `/trainings/${x.id}` })],
    ['nav_documents', data.documents, (x, i) => ({ icon: FileText, color: '#dc2626', label: x.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '), sub: pick(x, 'article_title'), run: () => open(docs, i) })],
    ['search_rooms', data.rooms, (x) => ({ icon: DoorOpen, color: '#0f766e', label: pick(x, 'name'), sub: pick(x, 'location'), to: `/people?view=plan&loc=${x.location_id}` })],
    ['search_articles', data.articles, (x) => ({ icon: Newspaper, label: pick(x, 'title'), sub: x.snippet || pick(x, 'summary'), to: `/articles/${x.id}` })],
    ['nav_board', data.classifieds, (x) => ({ icon: StickyNote, color: '#d97706', label: x.title, sub: [x.price, x.author].filter(Boolean).join(' · '), to: `/board#notice-${x.id}` })],
    ['nav_ideas', data.ideas, (x) => ({ icon: Lightbulb, color: '#7c3aed', label: x.title, sub: t(`idea_status_${x.status}`), to: `/ideas#idea-${x.id}` })],
  ];
  const out = [];
  for (const [title, list, make] of groups) {
    list.slice(0, PER_GROUP).forEach((x, i) => out.push({ key: `${title}-${i}`, group: i === 0 ? t(title) : null, more: i === 0 ? list.length : 0, ...make(x, i) }));
  }
  return out;
}

/** Header search: results appear while typing; Enter on nothing selected opens the full results page. */
export default function LiveSearch({ inputRef }) {
  const { t, lang } = useI18n();
  const { open: openViewer } = useViewer();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);
  const seq = useRef(0);
  const listId = useId();
  const pick = (x, k) => (lang === 'en' && x[`${k}_en`]) || x[`${k}_de`];
  const term = q.trim();

  useEffect(() => {
    if (term.length < MIN) { setData(null); setLoading(false); return undefined; }
    setLoading(true);
    const id = ++seq.current;
    const timer = setTimeout(() => {
      api('/search', { params: { q: term } })
        .then((d) => { if (id === seq.current) { setData(d); setActive(-1); } })
        .catch(() => { if (id === seq.current) setData(null); })
        .finally(() => { if (id === seq.current) setLoading(false); });
    }, DELAY);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const items = flatten(data, t, pick, openViewer);
  const total = data ? Object.values(data).reduce((n, v) => n + v.length, 0) : 0;

  const done = () => { setOpen(false); setActive(-1); inputRef?.current?.blur(); };
  const showAll = () => { if (term) { navigate(`/search?q=${encodeURIComponent(term)}`); done(); } };
  const choose = (item) => {
    if (item.run) item.run();
    else if (item.href) {
      if (/^https?:/.test(item.href)) window.open(item.href, '_blank', 'noopener');
      else window.location.href = item.href;
    } else navigate(item.to);
    done();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && items[active]) choose(items[active]); else showAll();
    }
  };

  const show = open && term.length >= MIN;

  return (
    <div ref={box} role="search" className="relative min-w-0 max-w-md flex-1">
      <label className="relative block">
        <span className="sr-only">{t('search')}</span>
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input ref={inputRef} value={q} placeholder={t('search_placeholder')} autoComplete="off"
          role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-14 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none" />
        {loading
          ? <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />
          : <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted sm:block">Ctrl K</kbd>}
      </label>

      {show && (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:right-auto sm:w-[34rem] sm:max-w-[calc(100vw-2rem)]">
          <ul id={listId} role="listbox" className="thin-scroll max-h-[65vh] overflow-y-auto py-1.5">
            {data && !items.length && !loading && <li className="px-4 py-6 text-center text-sm text-muted">{t('no_results')}</li>}
            {!data && loading && <li className="px-4 py-6 text-center text-sm text-muted">{t('search_searching')}</li>}
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.key} role="presentation">
                  {item.group && (
                    <p className="flex items-baseline justify-between px-4 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      {item.group}{item.more > PER_GROUP && <span className="font-normal normal-case tracking-normal">{t('search_more', { n: item.more - PER_GROUP })}</span>}
                    </p>
                  )}
                  <div id={`${listId}-${i}`} role="option" aria-selected={i === active} tabIndex={-1}
                    onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}
                    className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${i === active ? 'bg-brand-soft' : ''}`}>
                    {item.person
                      ? <Avatar person={item.person} size={32} />
                      : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: item.color || 'var(--brand)' }}><Icon size={15} /></span>}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.sub && <span className="block truncate text-xs text-muted">{item.sub}</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {total > 0 && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={showAll}
              className="flex w-full items-center justify-between border-t border-line px-4 py-2.5 text-sm font-medium text-brand hover:bg-surface-2">
              {t('search_show_all', { n: total })}<ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
