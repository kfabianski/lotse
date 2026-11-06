import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Locate, Mail, Maximize2, Minus, Phone, Plus, Search, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Avatar } from './ui';

/* Stable colour per department (legend, seat rings). */
const DEPT_COLORS = ['#3557f5', '#13995b', '#d97706', '#8b5cf6', '#e0484d', '#0891b2', '#db2777', '#65a30d', '#7c3aed', '#0d9488'];
export function useDeptColors(locations) {
  return useMemo(() => {
    const names = [...new Set(locations.flatMap((l) => l.seats.map((s) => s.occupant?.department).filter(Boolean)))].sort();
    return Object.fromEntries(names.map((n, i) => [n, DEPT_COLORS[i % DEPT_COLORS.length]]));
  }, [locations]);
}

const MIN = 1;
const MAX = 4;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Building cross-section: office floors stacked, warehouse halls beside them. Also used by FloorPlanV2. */
export function BuildingNav({ locations, active, onSelect, highlight }) {
  const { t, lang } = useI18n();
  const floors = locations.filter((l) => l.kind === 'floor').sort((a, b) => b.sort - a.sort);
  const halls = locations.filter((l) => l.kind === 'warehouse').sort((a, b) => a.sort - b.sort);

  const Slab = ({ loc, hall }) => {
    const taken = loc.seats.filter((s) => s.occupant).length;
    const free = loc.seats.length - taken;
    const hits = highlight ? loc.seats.filter((s) => s.occupant && highlight(s.occupant)).length : 0;
    const isActive = loc.id === active.id;
    return (
      <button type="button" onClick={() => onSelect(loc.id)} aria-pressed={isActive}
        title={`${lang === 'en' ? loc.name_en : loc.name_de}: ${t('people_count', { n: taken })}, ${t('free_count', { n: free })}`}
        className={`group relative flex w-full items-center justify-between gap-2 border-2 px-3 text-left transition-all ${
          hall ? 'h-14 rounded-t-2xl rounded-b-md' : 'h-12 rounded-lg'} ${
          isActive ? 'z-10 border-brand bg-brand text-white shadow-lg shadow-brand/25 dark:text-[#0d0f13]'
            : 'border-line bg-surface hover:-translate-y-0.5 hover:border-brand/60'}`}>
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-sm font-semibold leading-tight">{loc.code}</span>
          <span className={`block truncate text-xs ${isActive ? 'opacity-80' : 'text-muted'}`}>{lang === 'en' ? loc.name_en : loc.name_de}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {highlight && hits > 0 && <span className="rounded-full bg-signal px-1.5 text-xs font-semibold text-[#15171c]">{hits}</span>}
          <span className={`text-xs font-medium tabular-nums ${isActive ? '' : 'text-muted'}`}>{taken}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="card p-4">
      <p className="mb-3 text-sm font-medium text-muted">{t('building')}</p>
      <div className="space-y-1.5">
        <div aria-hidden className="mx-4 h-2 rounded-t-md bg-line" />
        {floors.map((loc) => <Slab key={loc.id} loc={loc} />)}
      </div>
      {halls.length > 0 && (
        <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(halls.length, 2)}, minmax(0, 1fr))` }}>
          {halls.map((loc) => <Slab key={loc.id} loc={loc} hall />)}
        </div>
      )}
      <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-line" />
    </div>
  );
}

function PersonCard({ seat, color, onClose }) {
  const { t } = useI18n();
  const p = seat.occupant;
  return (
    <div className="card relative p-5">
      <button type="button" onClick={onClose} aria-label={t('close')} className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-surface-2"><X size={16} /></button>
      {p ? (
        <>
          <div className="flex items-center gap-3 pr-6">
            <span className="rounded-full p-0.5" style={{ boxShadow: `0 0 0 2px ${color}` }}><Avatar person={p} size={52} /></span>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">{p.full_name}</p>
              <p className="text-sm leading-tight text-muted">{p.position}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">{t('department')}</dt>
            <dd className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{p.department}</dd>
            <dt className="text-muted">{t('seat')}</dt><dd>{seat.label}</dd>
          </dl>
          <div className="mt-4 grid gap-2">
            {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium hover:text-brand"><Mail size={16} /><span className="truncate">{p.email}</span></a>}
            {p.phone_ext && <a href={`tel:${p.phone_ext}`} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium hover:text-brand"><Phone size={16} />{t('extension')} {p.phone_ext}</a>}
          </div>
        </>
      ) : (
        <p className="pr-6"><span className="font-medium">{t('free_seat')}</span><span className="block text-sm text-muted">{seat.label}</span></p>
      )}
    </div>
  );
}

/**
 * Interactive floor/warehouse plan with zoom & pan.
 *  - `highlight(person) => bool` dims everyone else (search / department filter from the parent).
 *  - Admin mode: `onPlanClick(x, y)` on empty plan area, `onSeatClick(seat)` on a desk,
 *    `onSeatMove(seat, x, y)` after a desk was dragged (may return a promise; a rejection snaps it back).
 */
export default function FloorPlan({ locations, activeId, onActiveChange, focusPersonId, highlight, onPlanClick, onSeatClick, onSeatMove, deptColors }) {
  const { t, lang } = useI18n();
  const active = locations.find((l) => l.id === activeId) || locations[0];
  const fallback = useDeptColors(locations);
  const colors = useMemo(() => ({ ...fallback, ...(deptColors || {}) }), [fallback, deptColors]);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState(null); // seat id
  const [hovered, setHovered] = useState(null); // seat id
  const [dept, setDept] = useState(null);
  const [q, setQ] = useState('');
  const viewport = useRef(null);
  const drag = useRef(null);
  const admin = Boolean(onPlanClick || onSeatClick || onSeatMove);
  const seatDrag = useRef(null);
  const justDragged = useRef(false);
  const [moving, setMoving] = useState(null); // { id, x, y } while a desk is dragged or being saved
  useEffect(() => setMoving(null), [locations]); // fresh data from the server replaces the local position

  const combined = useCallback((person) => {
    if (dept && person.department !== dept) return false;
    return highlight ? highlight(person) : true;
  }, [dept, highlight]);
  const filtering = Boolean(dept || highlight);

  /** Zoom so that the seat (percent coords) sits in the middle of the viewport. */
  const focusSeat = useCallback((seat, scale = 1.8) => {
    const el = viewport.current;
    const plan = el?.querySelector('[data-plan]');
    if (!el || !plan) return;
    const { width, height } = el.getBoundingClientRect();
    // Plan-local point u maps to viewport position: padding + translate + u * scale.
    const ux = (seat.x / 100) * plan.offsetWidth;
    const uy = (seat.y / 100) * plan.offsetHeight;
    // Keep the plan filling the viewport: no empty strip beside or below it.
    const minX = width - 2 * plan.offsetLeft - plan.offsetWidth * scale;
    const minY = height - plan.offsetTop - 20 - plan.offsetHeight * scale;
    setView({
      scale,
      x: clamp(width / 2 - plan.offsetLeft - ux * scale, Math.min(0, minX), 0),
      y: clamp(height / 2 - plan.offsetTop - uy * scale, Math.min(0, minY), 0),
    });
  }, [active]);

  // New floor: reset view and selection. Declared before the focus effect so focus wins.
  useEffect(() => { setView({ scale: 1, x: 0, y: 0 }); setSelected(null); }, [activeId]);

  useEffect(() => {
    if (!focusPersonId || !active) return undefined;
    const seat = active.seats.find((s) => s.occupant?.id === focusPersonId);
    if (!seat) return undefined;
    setSelected(seat.id);
    const id = requestAnimationFrame(() => focusSeat(seat));
    return () => cancelAnimationFrame(id);
  }, [focusPersonId, active, focusSeat]);

  const zoomAt = (factor, cx, cy) => setView((v) => {
    const scale = clamp(v.scale * factor, MIN, MAX);
    const k = scale / v.scale;
    return scale === 1 ? { scale: 1, x: 0, y: 0 } : { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
  });

  /** Pointer position relative to the (untransformed) plan origin inside the viewport. */
  const local = (clientX, clientY) => {
    const el = viewport.current;
    const plan = el.querySelector('[data-plan]');
    const r = el.getBoundingClientRect();
    return [clientX - r.left - plan.offsetLeft, clientY - r.top - plan.offsetTop];
  };

  // Wheel zoom around the cursor (non-passive so the page doesn't scroll while zooming the plan).
  useEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, ...local(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('[data-seat]')) return;
    drag.current = { sx: e.clientX, sy: e.clientY, x: view.x, y: view.y, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    if (view.scale > 1) setView((v) => ({ ...v, x: d.x + dx, y: d.y + dy }));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    if (onPlanClick) {
      const r = e.currentTarget.querySelector('[data-plan]').getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) onPlanClick(+x.toFixed(2), +y.toFixed(2));
    } else {
      setSelected(null);
    }
  };

  /** Pointer position in plan percent (works at any zoom level because it uses the transformed rect). */
  const planPercent = (e) => {
    const r = viewport.current.querySelector('[data-plan]').getBoundingClientRect();
    return [clamp(((e.clientX - r.left) / r.width) * 100, 0, 100), clamp(((e.clientY - r.top) / r.height) * 100, 0, 100)];
  };
  const onSeatDown = (e, seat) => {
    justDragged.current = false;
    if (!onSeatMove || e.button !== 0) return;
    seatDrag.current = { id: seat.id, sx: e.clientX, sy: e.clientY, moved: false };
  };
  const onSeatDrag = (e) => {
    const d = seatDrag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
      // Capture only once it is a real drag: a captured pointer would retarget a plain click away from the button.
      e.currentTarget.setPointerCapture(e.pointerId);
      d.moved = true;
    }
    const [x, y] = planPercent(e);
    setMoving({ id: d.id, x, y });
  };
  const onSeatUp = (e, seat) => {
    const d = seatDrag.current;
    seatDrag.current = null;
    if (!d?.moved) return;
    justDragged.current = true; // swallow the click that follows the drop
    const [x, y] = planPercent(e).map((v) => +v.toFixed(2));
    setMoving({ id: seat.id, x, y });
    Promise.resolve(onSeatMove(seat, x, y)).catch(() => setMoving(null));
  };

  const center = () => {
    const r = viewport.current.getBoundingClientRect();
    return local(r.left + r.width / 2, r.top + r.height / 2);
  };

  const people = active.seats.filter((s) => s.occupant)
    .filter((s) => !q.trim() || `${s.occupant.full_name} ${s.occupant.department} ${s.occupant.position} ${s.label}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.occupant.full_name.localeCompare(b.occupant.full_name));
  const selectedSeat = active.seats.find((s) => s.id === selected);
  const freeSeats = active.seats.filter((s) => !s.occupant).length;
  const floorDepts = [...new Set(active.seats.map((s) => s.occupant?.department).filter(Boolean))].sort();
  const inv = 1 / Math.sqrt(view.scale); // markers grow slower than the plan

  const ctrl = 'flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-surface-2';

  const deptChips = !admin && floorDepts.length > 0 && (
    <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label={t('departments_here')}>
      {floorDepts.map((d) => (
        <button key={d} type="button" onClick={() => setDept(dept === d ? null : d)} aria-pressed={dept === d}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
            dept === d ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-muted'}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: colors[d] }} />{d}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {deptChips}
        <div className="card relative overflow-hidden">
          <div className="pointer-events-none absolute left-4 top-3 z-20">
            <p className="text-lg font-semibold tracking-tight">{lang === 'en' ? active.name_en : active.name_de}</p>
            <p className="text-sm text-muted">{t('people_count', { n: active.seats.length - freeSeats })}, {t('free_count', { n: freeSeats })}</p>
          </div>
          <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-sm backdrop-blur">
            <button type="button" className={ctrl} aria-label={t('zoom_in')} title={t('zoom_in')} onClick={() => zoomAt(1.4, ...center())}><Plus size={17} /></button>
            <button type="button" className={ctrl} aria-label={t('zoom_out')} title={t('zoom_out')} onClick={() => zoomAt(1 / 1.4, ...center())}><Minus size={17} /></button>
            <button type="button" className={ctrl} aria-label={t('zoom_fit')} title={t('zoom_fit')} onClick={() => setView({ scale: 1, x: 0, y: 0 })}><Maximize2 size={16} /></button>
          </div>

          <div ref={viewport}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => { drag.current = null; }}
            className={`relative touch-none select-none overflow-hidden px-3 pb-3 pt-16 sm:px-5 sm:pb-5 ${onPlanClick ? 'cursor-crosshair' : view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}>
            <div className="origin-top-left transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
              <div data-plan className="relative w-full" style={{ aspectRatio: `1 / ${active.plan_ratio}` }}>
                {active.plan_url
                  ? <img src={active.plan_url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full dark:opacity-80 dark:invert dark:hue-rotate-180" />
                  : <div className="absolute inset-0 rounded-xl border-2 border-dashed border-line" />}

                {active.seats.map((seat) => {
                  const p = seat.occupant;
                  const isSel = selected === seat.id;
                  const isHover = hovered === seat.id;
                  const dim = filtering && !(p && combined(p));
                  const color = p ? colors[p.department] || 'var(--muted)' : null;
                  const at = moving?.id === seat.id ? moving : seat;
                  return (
                    <div key={seat.id} data-seat className={`absolute ${onSeatMove ? 'cursor-move' : ''}`}
                      onPointerDown={(e) => onSeatDown(e, seat)} onPointerMove={onSeatDrag} onPointerUp={(e) => onSeatUp(e, seat)}
                      onPointerCancel={() => { seatDrag.current = null; setMoving(null); }}
                      style={{ left: `${at.x}%`, top: `${at.y}%`, zIndex: isSel || isHover ? 30 : p ? 10 : 5, transform: `translate(-50%, -50%) scale(${inv})` }}>
                      {isSel && <span aria-hidden className="absolute -inset-2.5 animate-ping rounded-full bg-brand/30 motion-reduce:animate-none" />}
                      <button type="button"
                        onClick={() => {
                          if (justDragged.current) { justDragged.current = false; return; }
                          if (onSeatClick) onSeatClick(seat); else setSelected(isSel ? null : seat.id);
                        }}
                        onMouseEnter={() => setHovered(seat.id)} onMouseLeave={() => setHovered(null)}
                        aria-label={p ? `${p.full_name}, ${seat.label}` : `${t('free_seat')} ${seat.label}`}
                        className={`relative block rounded-full transition-[opacity,transform] duration-200 ${dim ? 'opacity-20' : ''} ${isSel || isHover ? 'scale-125' : ''}`}>
                        {p ? (
                          <span className="block rounded-full bg-surface p-[2px]" style={{ boxShadow: `0 0 0 2.5px ${color}` }}>
                            <Avatar person={p} size={30} />
                          </span>
                        ) : (
                          <span className={`block h-4 w-4 rounded-md border-2 border-dashed ${admin ? 'border-brand bg-brand-soft' : 'border-safe/70 bg-surface'}`} />
                        )}
                      </button>
                      {isHover && !isSel && (
                        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-surface shadow-lg">
                          {p ? p.full_name : `${t('free_seat')} ${seat.label}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {!admin && <p className="border-t border-line px-4 py-2 text-xs text-muted">{t('plan_help')}</p>}
        </div>

      </div>

      <aside className="order-first space-y-4 xl:order-none">
        <BuildingNav locations={locations} active={active} onSelect={onActiveChange} highlight={filtering ? combined : null} />
        {!admin && selectedSeat && <PersonCard seat={selectedSeat} color={colors[selectedSeat.occupant?.department]} onClose={() => setSelected(null)} />}
        {!admin && (
          <div className="card p-4">
            <label className="relative block">
              <span className="sr-only">{t('search')}</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_floor')}
                className="h-9 w-full rounded-lg border border-line bg-bg pl-9 pr-3 text-sm focus:border-brand focus:outline-none" />
            </label>
            <ul className="mt-3 max-h-[440px] space-y-0.5 overflow-y-auto">
              {people.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => { setSelected(s.id); focusSeat(s); }}
                    onMouseEnter={() => setHovered(s.id)} onMouseLeave={() => setHovered(null)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${selected === s.id ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
                    <Avatar person={s.occupant} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.occupant.full_name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[s.occupant.department] }} />{s.occupant.department}</span>
                    </span>
                    <Locate size={15} className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
              {!people.length && <li className="px-2 py-3 text-sm text-muted">{t('no_results')}</li>}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
