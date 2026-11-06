/**
 * Admin room editor: draw rooms on a floor plan, move and resize them, edit their properties.
 * Coordinates are plan units (1000 x 1000*ratio) while editing and percentages in the API.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Grid3x3, ImageIcon, MousePointerSquareDashed, Trash2 } from 'lucide-react';
import { Button, Field, inputClass } from './ui';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { DEPT_TYPES, PLAN_W, ROOM_FILL, ROOM_TYPES, STRUCTURE, planHeight, toPercent, toUnits } from '../lib/rooms';

const L = {
  de: {
    help: 'Auf freier Fläche ziehen: neuer Raum · Raum ziehen: verschieben · Griffe: Größe ändern · Pfeiltasten: feinjustieren (Umschalt = größer) · Entf: löschen · Alt: ohne Raster',
    rooms: 'Räume dieser Ebene', none: 'Noch keine Räume. Ziehen Sie auf dem Plan ein Rechteck auf.',
    nameDe: 'Name (Deutsch)', nameEn: 'Name (Englisch)', type: 'Art', dept: 'Abteilung', noDept: '– keine –',
    deptHint: 'Färbt den Raum in der Abteilungsfarbe.', capacity: 'Plätze', eqDe: 'Ausstattung (Deutsch)', eqEn: 'Ausstattung (Englisch)',
    mail: 'Raum-E-Mail für Outlook-Einladungen', pos: 'Position und Größe (% des Plans)', save: 'Speichern', saved: 'Gespeichert',
    remove: 'Löschen', duplicate: 'Duplizieren', confirm: 'Raum „{n}“ löschen?', newRoom: 'Neuer Raum', select: 'Raum auswählen oder neu aufziehen.',
    grid: 'Raster', background: 'Grundriss im Hintergrund', desks: 'Plätze', unsaved: 'Nicht gespeicherte Änderungen',
  },
  en: {
    help: 'Drag on empty space: new room · drag a room: move · handles: resize · arrow keys: nudge (Shift = more) · Del: delete · Alt: no grid',
    rooms: 'Rooms on this level', none: 'No rooms yet. Drag a rectangle on the plan.',
    nameDe: 'Name (German)', nameEn: 'Name (English)', type: 'Type', dept: 'Department', noDept: '– none –',
    deptHint: 'Colours the room in the department colour.', capacity: 'Seats', eqDe: 'Equipment (German)', eqEn: 'Equipment (English)',
    mail: 'Room email for Outlook invitations', pos: 'Position and size (% of plan)', save: 'Save', saved: 'Saved',
    remove: 'Delete', duplicate: 'Duplicate', confirm: 'Delete room "{n}"?', newRoom: 'New room', select: 'Select a room or drag a new one.',
    grid: 'Grid', background: 'Plan in background', desks: 'Desks', unsaved: 'Unsaved changes',
  },
};

const GRID = 5; // plan units (= 0.5 % of the width)
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

/** API room -> editable record in plan units (keeps every API field so it can be saved back). */
const fromApi = (room, H) => {
  const u = toUnits(room, H);
  return { ...room, x: u.x, y: u.y, w: u.w, h: u.h };
};
const toApi = (r, H) => ({
  type: r.type, name_de: r.name_de || '', name_en: r.name_en || '', department: DEPT_TYPES.includes(r.type) ? r.department || null : null,
  sort: r.sort || 0, capacity: r.type === 'meeting' && r.capacity ? Number(r.capacity) : null,
  equipment_de: r.equipment_de || '', equipment_en: r.equipment_en || '', email: r.email || '',
  ...toPercent(r, H),
});

export default function RoomEditor({ location, onChanged }) {
  const { lang } = useI18n();
  const s = L[lang] || L.de;
  const H = planHeight(location);
  const departments = useFetch('/departments');
  const deptColors = useMemo(() => Object.fromEntries((departments.data || []).map((d) => [d.name, d.color])), [departments.data]);

  const [rooms, setRooms] = useState(() => (location.rooms || []).map((r) => fromApi(r, H)));
  const [selId, setSelId] = useState(null);
  const [dirty, setDirty] = useState(false); // form edits not yet saved
  const [draft, setDraft] = useState(null); // rectangle being drawn
  const [snap, setSnap] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const svgRef = useRef(null);
  const op = useRef(null); // current pointer operation
  const nudgeTimer = useRef(0);

  // Fresh data from the server (other floor, reload after save) – but never in the middle of a drag.
  useEffect(() => {
    if (op.current) return;
    setRooms((location.rooms || []).map((r) => fromApi(r, H)));
    setDirty(false);
  }, [location, H]);
  useEffect(() => { setSelId(null); }, [location.id]);

  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const sel = rooms.find((r) => r.id === selId) || null;
  const patchSel = (patch) => { setRooms((rs) => rs.map((r) => (r.id === selId ? { ...r, ...patch } : r))); setDirty(true); };

  const guard = async (fn) => {
    setError('');
    try { await fn(); } catch (err) { setError(err.message); }
  };
  const save = useCallback((room) => guard(async () => {
    await api(`/locations/rooms/${room.id}`, { method: 'PUT', body: toApi(room, H) });
    setDirty(false);
    setFlash(s.saved);
    setTimeout(() => setFlash(''), 1200);
    onChanged();
  }), [H, onChanged, s.saved]);

  const create = (rect, base = {}) => guard(async () => {
    const isWarehouse = location.kind === 'warehouse';
    const room = {
      type: base.type || (isWarehouse ? 'rack' : 'office'), name_de: base.name_de || L.de.newRoom, name_en: base.name_en || L.en.newRoom,
      department: base.department || null, capacity: base.capacity || null, equipment_de: base.equipment_de || '',
      equipment_en: base.equipment_en || '', email: '', sort: rooms.length, ...rect,
    };
    const created = await api(`/locations/${location.id}/rooms`, { method: 'POST', body: toApi(room, H) });
    setRooms((rs) => [...rs, fromApi(created, H)]);
    setSelId(created.id);
    onChanged();
  });

  const remove = (room) => {
    if (!window.confirm(s.confirm.replace('{n}', room.name_de || room.name_en))) return;
    guard(async () => {
      await api(`/locations/rooms/${room.id}`, { method: 'DELETE' });
      setRooms((rs) => rs.filter((r) => r.id !== room.id));
      setSelId(null);
      onChanged();
    });
  };

  /* ---------- pointer handling ---------- */
  const toPlan = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * PLAN_W, ((e.clientY - r.top) / r.height) * H];
  };
  const snapV = (v, e) => (snap && !e.altKey ? Math.round(v / GRID) * GRID : Math.round(v * 10) / 10);

  const startDraw = (e) => {
    if (e.button !== 0) return;
    const [x, y] = toPlan(e);
    op.current = { kind: 'draw', x0: snapV(x, e), y0: snapV(y, e) };
    svgRef.current.setPointerCapture(e.pointerId);
    setSelId(null);
  };
  const startMove = (e, room) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (dirty && sel && sel.id !== room.id) save(sel);
    setSelId(room.id);
    const [x, y] = toPlan(e);
    op.current = { kind: 'move', id: room.id, sx: x, sy: y, orig: { ...room }, moved: false };
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const startResize = (e, room, handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const [x, y] = toPlan(e);
    op.current = { kind: 'resize', id: room.id, handle, sx: x, sy: y, orig: { ...room }, moved: false };
    svgRef.current.setPointerCapture(e.pointerId);
  };

  const onMove = (e) => {
    const o = op.current;
    if (!o) return;
    const [x, y] = toPlan(e);
    if (o.kind === 'draw') {
      const x1 = snapV(x, e);
      const y1 = snapV(y, e);
      setDraft({ x: Math.min(o.x0, x1), y: Math.min(o.y0, y1), w: Math.abs(x1 - o.x0), h: Math.abs(y1 - o.y0) });
      return;
    }
    const dx = x - o.sx;
    const dy = y - o.sy;
    if (!o.moved && Math.hypot(dx, dy) < 2) return;
    o.moved = true;
    const r = o.orig;
    let next;
    if (o.kind === 'move') {
      next = { x: snapV(r.x + dx, e), y: snapV(r.y + dy, e) };
    } else {
      let { x: nx, y: ny, w: nw, h: nh } = r;
      const right = r.x + r.w;
      const bottom = r.y + r.h;
      if (o.handle.includes('w')) { nx = Math.min(snapV(r.x + dx, e), right - GRID); nw = right - nx; }
      if (o.handle.includes('e')) { nw = Math.max(GRID, snapV(right + dx, e) - r.x); }
      if (o.handle.includes('n')) { ny = Math.min(snapV(r.y + dy, e), bottom - GRID); nh = bottom - ny; }
      if (o.handle.includes('s')) { nh = Math.max(GRID, snapV(bottom + dy, e) - r.y); }
      next = { x: nx, y: ny, w: nw, h: nh };
    }
    setRooms((rs) => rs.map((rm) => (rm.id === o.id ? { ...rm, ...next } : rm)));
  };

  const onUp = () => {
    const o = op.current;
    op.current = null;
    if (!o) return;
    if (o.kind === 'draw') {
      const d = draft;
      setDraft(null);
      if (d && d.w >= 15 && d.h >= 15) create(d);
      return;
    }
    if (o.moved) {
      const room = roomsRef.current.find((r) => r.id === o.id);
      if (room) save(room);
    }
  };

  /* ---------- keyboard: nudge and delete ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (!sel || e.target.closest('input, textarea, select')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(sel); return; }
      const step = e.shiftKey ? GRID * 4 : (snap ? GRID : 1);
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      const moved = { ...sel, x: sel.x + d[0], y: sel.y + d[1] };
      setRooms((rs) => rs.map((r) => (r.id === sel.id ? moved : r)));
      clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => save(moved), 450);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------- drawing ---------- */
  const colorOf = (r) => (DEPT_TYPES.includes(r.type) && r.department && deptColors[r.department]) || ROOM_FILL[r.type] || 'var(--muted)';
  const label = (r) => (lang === 'en' ? r.name_en || r.name_de : r.name_de || r.name_en) || ROOM_TYPES[r.type]?.[lang];
  const ordered = [...rooms].sort((a, b) => Number(!STRUCTURE.includes(a.type)) - Number(!STRUCTURE.includes(b.type)));
  const hs = 9; // handle size in plan units

  const handlePos = (r, h) => ({
    x: h.includes('w') ? r.x : h.includes('e') ? r.x + r.w : r.x + r.w / 2,
    y: h.includes('n') ? r.y : h.includes('s') ? r.y + r.h : r.y + r.h / 2,
  });

  const pct = sel ? toPercent(sel, H) : null;
  const setPct = (key, v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    patchSel({ [key]: key === 'x' || key === 'w' ? (n / 100) * PLAN_W : (n / 100) * H });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={() => setSnap(!snap)} aria-pressed={snap}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${snap ? 'border-ink bg-ink text-surface' : 'border-line'}`}><Grid3x3 size={15} />{s.grid}</button>
          {location.plan_url && (
            <button type="button" onClick={() => setShowPlan(!showPlan)} aria-pressed={showPlan}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${showPlan ? 'border-ink bg-ink text-surface' : 'border-line'}`}><ImageIcon size={15} />{s.background}</button>
          )}
          {flash && <span className="text-safe">{flash}</span>}
          {error && <span className="text-alert">{error}</span>}
        </div>
        <div className="card overflow-hidden p-3 sm:p-4">
          <svg ref={svgRef} viewBox={`0 0 ${PLAN_W} ${H}`} className="block w-full touch-none select-none" style={{ aspectRatio: `${PLAN_W} / ${H}`, cursor: 'crosshair' }}
            onPointerDown={startDraw} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <defs>
              <pattern id="re-grid" width={GRID * 4} height={GRID * 4} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID * 4} 0 L 0 0 0 ${GRID * 4}`} fill="none" stroke="var(--line)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={PLAN_W} height={H} fill="var(--surface)" />
            {snap && <rect width={PLAN_W} height={H} fill="url(#re-grid)" />}
            {showPlan && location.plan_url && <image href={location.plan_url} width={PLAN_W} height={H} opacity=".35" pointerEvents="none" />}
            <rect x="1" y="1" width={PLAN_W - 2} height={H - 2} fill="none" stroke="var(--muted)" strokeOpacity=".4" strokeWidth="2" pointerEvents="none" />

            {ordered.map((r) => {
              const c = colorOf(r);
              const isSel = r.id === selId;
              return (
                <g key={r.id} onPointerDown={(e) => startMove(e, r)} style={{ cursor: 'move' }}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={STRUCTURE.includes(r.type) ? 2 : 8}
                    fill={r.type === 'corridor' ? 'var(--surface-2)' : c} fillOpacity={r.type === 'corridor' ? 1 : isSel ? 0.3 : 0.16}
                    stroke={isSel ? 'var(--brand)' : c} strokeOpacity={isSel ? 1 : 0.6} strokeWidth={isSel ? 3 : 2}
                    strokeDasharray={STRUCTURE.includes(r.type) && !isSel ? '6 4' : undefined} />
                  {r.w > 40 && r.h > 22 && (
                    <text x={r.x + 8} y={r.y + 20} fontSize={Math.min(16, Math.max(10, r.w / 9))} fontWeight="600" fill="var(--ink)" pointerEvents="none">{label(r)}</text>
                  )}
                  {r.w > 90 && r.h > 44 && (() => {
                    const parts = [ROOM_TYPES[r.type]?.[lang], DEPT_TYPES.includes(r.type) && r.department]
                      .filter((v) => v && v !== label(r));
                    return parts.length > 0 && (
                      <text x={r.x + 8} y={r.y + 37} fontSize="11" fill="var(--muted)" pointerEvents="none">{parts.join(' · ')}</text>
                    );
                  })()}
                </g>
              );
            })}

            {/* desks for orientation (read-only here) */}
            {location.seats.map((st) => (
              <circle key={st.id} cx={(st.x / 100) * PLAN_W} cy={(st.y / 100) * H} r="7" pointerEvents="none"
                fill={st.occupant ? 'var(--ink)' : 'var(--surface)'} fillOpacity={st.occupant ? 0.55 : 1} stroke="var(--safe)" strokeWidth="2" />
            ))}

            {sel && HANDLES.map((h) => {
              const p = handlePos(sel, h);
              return (
                <rect key={h} x={p.x - hs / 2} y={p.y - hs / 2} width={hs} height={hs} rx="2" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2"
                  style={{ cursor: CURSOR[h] }} onPointerDown={(e) => startResize(e, sel, h)} />
              );
            })}

            {draft && <rect x={draft.x} y={draft.y} width={draft.w} height={draft.h} rx="8" fill="var(--brand)" fillOpacity=".12" stroke="var(--brand)" strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />}
          </svg>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted"><MousePointerSquareDashed size={14} className="mt-0.5 shrink-0" />{s.help}</p>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          {!sel && <p className="text-sm text-muted">{s.select}</p>}
          {sel && (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(sel); }}>
              <Field label={s.type}>
                <select className={inputClass} value={sel.type} onChange={(e) => patchSel({ type: e.target.value })}>
                  {Object.entries(ROOM_TYPES).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
                </select>
              </Field>
              <Field label={s.nameDe}><input className={inputClass} value={sel.name_de || ''} maxLength={80} onChange={(e) => patchSel({ name_de: e.target.value })} /></Field>
              <Field label={s.nameEn}><input className={inputClass} value={sel.name_en || ''} maxLength={80} onChange={(e) => patchSel({ name_en: e.target.value })} /></Field>
              {DEPT_TYPES.includes(sel.type) && (
                <Field label={s.dept} hint={s.deptHint}>
                  <select className={inputClass} value={sel.department || ''} onChange={(e) => patchSel({ department: e.target.value || null })}>
                    <option value="">{s.noDept}</option>
                    {(departments.data || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </Field>
              )}
              {sel.type === 'meeting' && (
                <>
                  <Field label={s.capacity}><input type="number" min={1} max={500} className={inputClass} value={sel.capacity || ''} onChange={(e) => patchSel({ capacity: e.target.value })} /></Field>
                  <Field label={s.eqDe}><input className={inputClass} value={sel.equipment_de || ''} maxLength={200} onChange={(e) => patchSel({ equipment_de: e.target.value })} /></Field>
                  <Field label={s.eqEn}><input className={inputClass} value={sel.equipment_en || ''} maxLength={200} onChange={(e) => patchSel({ equipment_en: e.target.value })} /></Field>
                  <Field label={s.mail}><input type="email" className={inputClass} value={sel.email || ''} maxLength={120} placeholder="raum.name@firma.de" onChange={(e) => patchSel({ email: e.target.value })} /></Field>
                </>
              )}
              <fieldset>
                <legend className="mb-1 text-sm font-medium">{s.pos}</legend>
                <div className="grid grid-cols-4 gap-2">
                  {['x', 'y', 'w', 'h'].map((k) => (
                    <label key={k} className="text-xs text-muted">{k.toUpperCase()}
                      <input type="number" step="0.5" className={`${inputClass} mt-0.5 px-2 py-1 text-sm`} value={pct[k]} onChange={(e) => setPct(k, e.target.value)} />
                    </label>
                  ))}
                </div>
              </fieldset>
              {dirty && <p className="text-xs text-signal">{s.unsaved}</p>}
              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <div className="flex gap-1">
                  <Button variant="danger" onClick={() => remove(sel)}><Trash2 size={16} />{s.remove}</Button>
                  <Button variant="ghost" onClick={() => create({ x: sel.x + 20, y: sel.y + 20, w: sel.w, h: sel.h }, sel)} title={s.duplicate}><Copy size={16} /></Button>
                </div>
                <Button type="submit">{s.save}</Button>
              </div>
            </form>
          )}
        </div>

        <div className="card p-4">
          <p className="mb-2 text-sm font-medium text-muted">{s.rooms} ({rooms.length})</p>
          {!rooms.length && <p className="text-sm text-muted">{s.none}</p>}
          <ul className="thin-scroll max-h-80 space-y-0.5 overflow-y-auto">
            {rooms.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => { if (dirty && sel && sel.id !== r.id) save(sel); setSelId(r.id); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm ${r.id === selId ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: colorOf(r), opacity: 0.7 }} />
                  <span className="min-w-0 flex-1 truncate">{label(r)}</span>
                  <span className="shrink-0 text-xs text-muted">{ROOM_TYPES[r.type]?.[lang]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
