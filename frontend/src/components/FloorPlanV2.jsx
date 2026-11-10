/**
 * Interactive floor plan (Lageplan) for everyone; the admin desk editor still uses FloorPlan.jsx.
 * Drawn as SVG from the rooms stored per location (drawn by admins in the room editor) instead of a picture with dots:
 * rooms are real objects, zoom/pan is animated, people show a hover card, search flies to a desk.
 * Floors without room data (e.g. created by an admin) fall back to their uploaded plan image.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarCheck, Coffee, DoorOpen, Mail, Maximize2, Minus, Monitor, Phone, Plus, Search, Users, X,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Avatar } from './ui';
import { BuildingNav } from './FloorPlan';
import { PLAN_W, ROOM_FILL, ROOM_TYPES, STRUCTURE, planHeight, toUnits } from '../lib/rooms';

const L = {
  de: {
    search: 'Person, Abteilung oder Raum suchen …', free: 'frei', freeSeat: 'Freier Platz', seats: 'Plätze',
    people: 'Personen', building: 'Gebäude', rooms: 'Besprechungsräume', depts: 'Abteilungen auf dieser Etage',
    capacity: 'bis {n} Personen', equipment: 'Ausstattung', book: 'So buchen Sie den Raum', bookMail: 'Einladung an',
    inRoom: 'In diesem Raum', nobody: 'Hier sitzt niemand fest.', desk: 'Platz', room: 'Raum', fit: 'Ganze Etage',
    zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', back: 'Übersicht', directory: 'Im Verzeichnis zeigen',
    hint: 'Ziehen zum Verschieben · Mausrad zum Zoomen · Doppelklick auf einen Raum zoomt hinein',
    noResults: 'Nichts gefunden', allDepts: 'Alle',
  },
  en: {
    search: 'Search person, department or room …', free: 'free', freeSeat: 'Free desk', seats: 'desks',
    people: 'people', building: 'Building', rooms: 'Meeting rooms', depts: 'Departments on this floor',
    capacity: 'up to {n} people', equipment: 'Equipment', book: 'How to book this room', bookMail: 'Invite',
    inRoom: 'In this room', nobody: 'Nobody has a fixed desk here.', desk: 'Desk', room: 'Room', fit: 'Whole floor',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', back: 'Overview', directory: 'Show in directory',
    hint: 'Drag to move · scroll to zoom · double-click a room to zoom in',
    noResults: 'Nothing found', allDepts: 'All',
  },
};

const TONES = ['#1f4fd1', '#1e8a5b', '#c08a2c', '#8a5cc7', '#c23a28', '#1595a3'];
const tone = (name) => TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const typeLabel = (type, lang) => ROOM_TYPES[type]?.[lang] || '';
const ROOM_ICON = { meeting: Users, kitchen: Coffee, reception: DoorOpen, dock: DoorOpen };

function useLayout(loc) {
  return useMemo(() => {
    const W = PLAN_W;
    const H = planHeight(loc);
    const rooms = (loc.rooms || []).map((r) => toUnits(r, H));
    const seats = loc.seats.map((s) => {
      const px = (s.x / 100) * W;
      const py = (s.y / 100) * H;
      const room = rooms.find((r) => !STRUCTURE.includes(r.type)
        && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
      return { ...s, px, py, roomId: room?.id };
    });
    return { W, H, rooms, seats, hasRooms: rooms.length > 0 };
  }, [loc]);
}

/* ---------- side panel cards ---------- */

function PersonCard({ seat, room, color, onBack, s }) {
  const p = seat.occupant;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} />{s.back}</button>
      <div className="flex items-center gap-4">
        <Avatar person={p} size={64} />
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight">{p.full_name}</p>
          <p className="text-sm text-muted">{p.position}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{p.department}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {p.phone_ext && <><dt className="text-muted">Tel.</dt><dd><a href={`tel:${p.phone_ext}`} className="inline-flex items-center gap-1.5 font-medium hover:text-brand-text"><Phone size={14} />{p.phone_ext}</a></dd></>}
        {p.email && <><dt className="text-muted">E-Mail</dt><dd className="min-w-0"><a href={`mailto:${p.email}`} className="inline-flex max-w-full items-center gap-1.5 hover:text-brand-text"><Mail size={14} className="shrink-0" /><span className="truncate">{p.email}</span></a></dd></>}
        <dt className="text-muted">{s.desk}</dt><dd>{seat.label}</dd>
        {room && <><dt className="text-muted">{s.room}</dt><dd>{room}</dd></>}
      </dl>
      <Link to={`/people?focus=${p.id}`} className="inline-flex text-sm font-medium text-brand-text hover:underline">{s.directory}</Link>
    </div>
  );
}

function RoomCard({ room, seats, colors, lang, s, onBack, onPerson }) {
  const Icon = ROOM_ICON[room.type] || Monitor;
  const people = seats.filter((x) => x.roomId === room.id && x.occupant);
  const free = seats.filter((x) => x.roomId === room.id && !x.occupant).length;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft size={15} />{s.back}</button>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><Icon size={20} /></span>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">{room.label[lang]}</p>
          <p className="text-sm text-muted">{typeLabel(room.type, lang)}</p>
        </div>
      </div>
      {room.info && (
        <div className="space-y-3 rounded-xl border border-line p-4 text-sm">
          <p className="flex items-center gap-2"><Users size={15} className="text-muted" />{s.capacity.replace('{n}', room.info.seats)}</p>
          <p className="flex items-center gap-2"><Monitor size={15} className="text-muted" />{room.info.equipment[lang]}</p>
          <p className="flex items-center gap-2"><Mail size={15} className="text-muted" /><span className="text-muted">{s.bookMail}</span>
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{room.info.mail}</code></p>
          <Link to="/search?q=Besprechungsraum" className="inline-flex items-center gap-1.5 font-medium text-brand-text hover:underline"><CalendarCheck size={15} />{s.book}</Link>
        </div>
      )}
      {(people.length > 0 || free > 0) && (
        <div>
          <p className="mb-2 text-sm font-medium">{s.inRoom}
            <span className="font-normal text-muted"> · {people.length} {s.people}{free ? `, ${free} ${s.free}` : ''}</span></p>
          <ul className="space-y-1">
            {people.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onPerson(x)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                  <Avatar person={x.occupant} size={30} />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{x.occupant.full_name}</span>
                    <span className="block truncate text-xs text-muted">{x.occupant.position}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!room.info && !people.length && !free && <p className="text-sm text-muted">{s.nobody}</p>}
    </div>
  );
}

/* ---------- main component ---------- */

/** Location and seat of a person (for "show on plan" links). */
function findPerson(locations, personId) {
  if (!personId) return null;
  for (const loc of locations) {
    const seat = loc.seats.find((x) => x.occupant?.id === personId);
    if (seat) return { loc, seat };
  }
  return null;
}

export default function FloorPlanV2({ locations, deptColors = {}, focusPersonId = null, focusLocationId = null }) {
  const { lang } = useI18n();
  const s = L[lang] || L.de;
  const ordered = useMemo(() => [...locations].sort((a, b) => a.sort - b.sort), [locations]);
  const initialFocus = useMemo(() => findPerson(ordered, focusPersonId), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeId, setActiveId] = useState(initialFocus?.loc.id || (ordered.some((l) => l.id === focusLocationId) ? focusLocationId : ordered[0]?.id));
  const active = ordered.find((l) => l.id === activeId) || ordered[0];
  const { W, H, rooms, seats, hasRooms } = useLayout(active);
  const full = useMemo(() => ({ x: 0, y: 0, w: W, h: H }), [W, H]);

  const [vb, setVb] = useState(full);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const anim = useRef(0);
  const svgRef = useRef(null);
  const pan = useRef(null);
  const [hoverRoom, setHoverRoom] = useState(null);
  const [hoverSeat, setHoverSeat] = useState(null); // { seat, x, y } in container px
  const [selected, setSelected] = useState(null); // { kind: 'room'|'person', id }
  const [dept, setDept] = useState(null);
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const pendingFocus = useRef(initialFocus?.seat.id || null);
  const colorOf = (p) => (p && (deptColors[p.department] || 'var(--muted)')) || 'var(--line)';

  const fit = useCallback((v) => {
    const w = clamp(v.w, W / 6, W);
    const h = (w * H) / W;
    if (w >= W) return { w, h, x: 0, y: 0 };
    // A small margin lets desks at the outer wall still be centred.
    const mx = W * 0.06;
    const my = H * 0.06;
    return { w, h, x: clamp(v.x, -mx, W - w + mx), y: clamp(v.y, -my, H - h + my) };
  }, [W, H]);

  const animateTo = useCallback((target, ms = 520) => {
    cancelAnimationFrame(anim.current);
    const to = fit(target);
    if (reducedMotion()) { setVb(to); return; }
    const from = vbRef.current;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      setVb({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [fit]);

  const flyToRect = useCallback((r, pad = 1.35) => {
    const w = Math.max(r.w, (r.h * W) / H) * pad;
    animateTo({ x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - (w * H) / W / 2, w, h: (w * H) / W });
  }, [animateTo, W, H]);

  const flyToSeat = useCallback((seat) => {
    const w = W / 1.9;
    animateTo({ x: seat.px - w / 2, y: seat.py - (w * H) / W / 2, w, h: (w * H) / W });
  }, [animateTo, W, H]);

  // Floor change: reset the view; then fly to a person picked in the search, if any.
  useEffect(() => {
    cancelAnimationFrame(anim.current);
    setVb(full);
    setHoverSeat(null);
    const id = pendingFocus.current;
    pendingFocus.current = null;
    if (!id) { setSelected(null); return undefined; }
    const seat = seats.find((x) => x.id === id);
    setSelected({ kind: 'person', id });
    const t = setTimeout(() => seat && flyToSeat(seat), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  // A new "show on plan" target while the plan is already open.
  const firstFocus = useRef(true);
  useEffect(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    const hit = findPerson(ordered, focusPersonId);
    if (!hit) return;
    if (hit.loc.id !== active.id) { pendingFocus.current = hit.seat.id; setActiveId(hit.loc.id); return; }
    const seat = seats.find((x) => x.id === hit.seat.id);
    setSelected({ kind: 'person', id: seat.id });
    flyToSeat(seat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPersonId]);

  /* pointer → plan coordinates */
  const toPlan = (clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    const v = vbRef.current;
    return [v.x + ((clientX - r.left) / r.width) * v.w, v.y + ((clientY - r.top) / r.height) * v.h, r];
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const [px, py, r] = toPlan(e.clientX, e.clientY);
      const v = vbRef.current;
      const w = clamp(v.w * (e.deltaY < 0 ? 1 / 1.15 : 1.15), W / 6, W);
      const h = (w * H) / W;
      setVb(fit({ w, h, x: px - ((e.clientX - r.left) / r.width) * w, y: py - ((e.clientY - r.top) / r.height) * h }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, fit, active.id]); // the <svg> is re-created per floor

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(anim.current);
    pan.current = { sx: e.clientX, sy: e.clientY, v: vbRef.current, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e) => {
    const d = pan.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      svgRef.current.setPointerCapture(d.id);
      setHoverSeat(null);
    }
    const r = svgRef.current.getBoundingClientRect();
    setVb(fit({ ...d.v, x: d.v.x - (dx / r.width) * d.v.w, y: d.v.y - (dy / r.height) * d.v.h }));
  };
  const wasPan = useRef(false);
  const onPointerUp = () => { wasPan.current = Boolean(pan.current?.moved); pan.current = null; };
  const guardClick = (fn) => (e) => { e.stopPropagation(); if (wasPan.current) { wasPan.current = false; return; } fn(e); };

  const zoomBy = (f) => {
    const v = vbRef.current;
    const w = v.w * f;
    animateTo({ x: v.x + v.w / 2 - w / 2, y: v.y + v.h / 2 - (w * H) / W / 2, w, h: (w * H) / W }, 300);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'Escape') { setSelected(null); animateTo(full); }
      if (e.key === '+') zoomBy(1 / 1.4);
      if (e.key === '-') zoomBy(1.4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* search across all locations */
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out = [];
    for (const loc of ordered) {
      for (const seat of loc.seats) {
        const p = seat.occupant;
        if (p && `${p.full_name} ${p.department} ${p.position} ${p.phone_ext}`.toLowerCase().includes(needle)) out.push({ kind: 'person', loc, seat, p });
      }
      for (const r of (loc.rooms || []).map((x) => toUnits(x, planHeight(loc)))) {
        if (!STRUCTURE.includes(r.type) && `${r.label.de} ${r.label.en}`.toLowerCase().includes(needle)) out.push({ kind: 'room', loc, room: r });
      }
    }
    return out.slice(0, 8);
  }, [q, ordered, lang]);

  const pick = (res) => {
    setQ('');
    setSearchOpen(false);
    if (res.kind === 'person') {
      if (res.loc.id === active.id) {
        const seat = seats.find((x) => x.id === res.seat.id);
        setSelected({ kind: 'person', id: seat.id });
        flyToSeat(seat);
      } else {
        pendingFocus.current = res.seat.id;
        setActiveId(res.loc.id);
      }
    } else {
      if (res.loc.id !== active.id) setActiveId(res.loc.id);
      setTimeout(() => { setSelected({ kind: 'room', id: res.room.id }); flyToRect(res.room); }, res.loc.id !== active.id ? 150 : 0);
    }
  };

  const selSeat = selected?.kind === 'person' ? seats.find((x) => x.id === selected.id) : null;
  const selRoom = selected?.kind === 'room' ? rooms.find((r) => r.id === selected.id) : null;
  const zoom = W / vb.w;
  const floorDepts = [...new Set(seats.map((x) => x.occupant?.department).filter(Boolean))].sort();
  const dim = (p) => dept && (!p || p.department !== dept);
  const roomCounts = (id) => {
    const inRoom = seats.filter((x) => x.roomId === id);
    return [inRoom.filter((x) => x.occupant).length, inRoom.length];
  };

  /* ---------- drawing ---------- */
  const drawRoom = (r) => {
    if (r.type === 'corridor') return <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--surface-2)" />;
    if (r.type === 'stairs') {
      return (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="var(--line)" />
          {Array.from({ length: Math.max(1, Math.floor((r.w - 10) / 12)) }, (_, i) => i).map((i) => <line key={i} x1={r.x + 8 + i * 12} y1={r.y + 6} x2={r.x + 8 + i * 12} y2={r.y + r.h - 6} stroke="var(--muted)" strokeOpacity=".35" strokeWidth="2" />)}
        </g>
      );
    }
    if (r.type === 'lane') {
      return (
        <g key={r.id} pointerEvents="none">
          <rect x={r.x} y={r.y} width={r.w} height={10} fill="var(--signal)" />
          <rect x={r.x} y={r.y + r.h - 10} width={r.w} height={10} fill="var(--signal)" />
          <text x={r.x + 10} y={r.y + r.h + 20} fontSize="13" fill="var(--muted)">{r.label[lang]} →</text>
        </g>
      );
    }
    const color = r.dept ? deptColors[r.dept] || 'var(--muted)' : ROOM_FILL[r.type] || 'var(--muted)';
    const isHover = hoverRoom === r.id;
    const isSel = selRoom?.id === r.id;
    const faded = dept && r.dept && r.dept !== dept;
    const [taken, total] = roomCounts(r.id);
    const Icon = ROOM_ICON[r.type];
    const big = r.w > 150;
    return (
      <g key={r.id} className="cursor-pointer" opacity={faded ? 0.35 : 1}
        onMouseEnter={() => setHoverRoom(r.id)} onMouseLeave={() => setHoverRoom(null)}
        onClick={guardClick(() => { setSelected({ kind: 'room', id: r.id }); })}
        onDoubleClick={(e) => { e.stopPropagation(); flyToRect(r); }}>
        <rect x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} rx="10"
          fill={color} fillOpacity={isSel ? 0.22 : isHover ? 0.16 : r.type === 'rack' ? 0.14 : 0.08}
          stroke={isSel || isHover ? color : 'var(--line)'} strokeWidth={isSel ? 4 : isHover ? 3 : 2.5}
          style={{ transition: 'fill-opacity .2s, stroke .2s' }} />
        {r.type === 'rack' && [1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={r.x + 6} x2={r.x + r.w - 6} y1={r.y + (r.h / 6) * i} y2={r.y + (r.h / 6) * i} stroke="var(--muted)" strokeOpacity=".25" strokeWidth="2" pointerEvents="none" />
        ))}
        {r.type === 'meeting' && (
          <g pointerEvents="none" opacity=".9">
            <rect x={r.x + r.w * 0.22} y={r.y + r.h * 0.4} width={r.w * 0.56} height={r.h * 0.3} rx="18" fill="var(--surface)" stroke={color} strokeOpacity=".5" strokeWidth="2" />
            {Array.from({ length: Math.min(10, r.info?.seats || 6) }).map((_, i, arr) => {
              const half = Math.ceil(arr.length / 2);
              const top = i < half;
              const k = (top ? i : i - half) + 0.5;
              const n = top ? half : arr.length - half;
              return <circle key={i} cx={r.x + r.w * 0.22 + (r.w * 0.56 * k) / n} cy={top ? r.y + r.h * 0.4 - 14 : r.y + r.h * 0.7 + 14} r="8" fill={color} fillOpacity=".25" />;
            })}
          </g>
        )}
        {r.type === 'kitchen' && (
          <g pointerEvents="none">
            <rect x={r.x + 16} y={r.y + r.h - 46} width={r.w - 32} height="28" rx="6" fill={color} fillOpacity=".18" />
            <circle cx={r.x + r.w / 2} cy={r.y + r.h * 0.45} r="34" fill="var(--surface)" stroke={color} strokeOpacity=".4" strokeWidth="2" />
          </g>
        )}
        <g pointerEvents="none">
          {Icon && big && <Icon x={r.x + 15} y={r.y + 15} size={20} color={color === 'var(--muted)' ? 'var(--muted)' : color} />}
          {r.type === 'rack' || r.type === 'dock'
            ? <text x={r.x + r.w / 2} y={r.type === 'rack' ? r.y - 10 : r.y + r.h / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--ink)">{r.label[lang]}</text>
            : <text x={r.x + (Icon && big ? 42 : 14)} y={r.y + 31} fontSize="17" fontWeight="600" fill="var(--ink)">{r.label[lang]}</text>}
          {total > 0 && big && (
            <text x={r.x + (Icon ? 42 : 14)} y={r.y + 50} fontSize="13" fill="var(--muted)">{taken}/{total} {s.seats}</text>
          )}
          {r.info && big && <text x={r.x + 42} y={r.y + 50} fontSize="13" fill="var(--muted)">{s.capacity.replace('{n}', r.info.seats)}</text>}
        </g>
      </g>
    );
  };

  const drawSeat = (seat) => {
    const p = seat.occupant;
    const color = colorOf(p);
    const isSel = selSeat?.id === seat.id;
    const faded = dim(p);
    const showName = zoom > 1.6 && p;
    return (
      <g key={seat.id} transform={`translate(${seat.px} ${seat.py})`} className="cursor-pointer" opacity={faded ? 0.18 : 1}
        style={{ transition: 'opacity .25s' }}
        onMouseEnter={(e) => {
          const box = svgRef.current.parentElement.getBoundingClientRect();
          const r = e.currentTarget.getBoundingClientRect();
          setHoverSeat({ seat, x: r.left + r.width / 2 - box.left, y: r.top - box.top });
        }}
        onMouseLeave={() => setHoverSeat(null)}
        onClick={guardClick(() => { if (p) { setSelected({ kind: 'person', id: seat.id }); flyToSeat(seat); } })}>
        <rect x="-27" y="2" width="54" height="22" rx="5" fill="var(--surface)" stroke={p ? color : 'var(--safe)'} strokeOpacity={p ? 0.35 : 0.8}
          strokeWidth="2" strokeDasharray={p ? undefined : '5 4'} />
        {isSel && (
          <circle r="22" fill="none" stroke="var(--brand)" strokeWidth="3">
            <animate attributeName="r" values="20;30;20" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
        {p ? (
          <g>
            {p.avatar_url
              ? <image href={p.avatar_url} x="-14" y="-14" width="28" height="28" clipPath="url(#lp2-avatar)" preserveAspectRatio="xMidYMid slice" />
              : <><circle r="14" fill={tone(p.full_name)} /><text y="4.5" textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">{initials(p.full_name)}</text></>}
          </g>
        ) : (
          <text y="18" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--safe)">{s.free}</text>
        )}
        {showName && (
          <text y="40" textAnchor="middle" fontSize={22 / Math.sqrt(zoom)} fontWeight="600" fill="var(--ink)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
            {p.full_name.split(' ')[0]}
          </text>
        )}
      </g>
    );
  };

  /* minimap */
  const onMini = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    const v = vbRef.current;
    animateTo({ ...v, x: px - v.w / 2, y: py - v.h / 2 }, 350);
  };

  const ctrl = 'flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-surface-2';

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        {/* search */}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0]); if (e.key === 'Escape') setQ(''); }}
            placeholder={s.search} className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-10 outline-none focus:border-brand" />
          {q && <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Clear"><X size={16} /></button>}
          {searchOpen && q.trim() && (
            <ul className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">{s.noResults}</li>}
              {results.map((res) => (
                <li key={res.kind === 'person' ? `p${res.seat.id}` : `r${res.loc.id}${res.room.id}`}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(res)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                    {res.kind === 'person'
                      ? <Avatar person={res.p} size={30} />
                      : <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand-soft text-brand-text"><Users size={15} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{res.kind === 'person' ? res.p.full_name : res.room.label[lang]}</span>
                      <span className="block truncate text-xs text-muted">{res.kind === 'person' ? `${res.p.department} · ${res.seat.label}` : typeLabel(res.room.type, lang)}</span>
                    </span>
                    <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{res.loc.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* department filter */}
        {floorDepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setDept(null)} aria-pressed={!dept}
              className={`rounded-sm border px-3 py-1 text-sm ${!dept ? 'border-ink bg-ink text-surface' : 'border-line hover:border-muted'}`}>{s.allDepts}</button>
            {floorDepts.map((d) => (
              <button key={d} type="button" onClick={() => setDept(dept === d ? null : d)} aria-pressed={dept === d}
                className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1 text-sm transition-colors ${dept === d ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-muted'}`}>
                <span className="h-2 w-2 rounded-sm" style={{ background: deptColors[d] || 'var(--muted)' }} />{d}
              </button>
            ))}
          </div>
        )}

        {/* plan */}
        <div className="card relative overflow-hidden">
          <div className="pointer-events-none absolute left-4 top-3 z-20">
            <p className="text-lg font-semibold tracking-tight">{lang === 'en' ? active.name_en : active.name_de}</p>
            <p className="text-sm text-muted">{seats.filter((x) => x.occupant).length} {s.people} · {seats.filter((x) => !x.occupant).length} {s.free}</p>
          </div>
          <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-1 shadow-sm ">
            <button type="button" className={ctrl} title={s.zoomIn} aria-label={s.zoomIn} onClick={() => zoomBy(1 / 1.4)}><Plus size={17} /></button>
            <button type="button" className={ctrl} title={s.zoomOut} aria-label={s.zoomOut} onClick={() => zoomBy(1.4)}><Minus size={17} /></button>
            <button type="button" className={ctrl} title={s.fit} aria-label={s.fit} onClick={() => { animateTo(full); }}><Maximize2 size={16} /></button>
          </div>

          <div className="relative px-3 pb-3 pt-16 sm:px-5 sm:pb-5">
            <svg ref={svgRef} key={active.id} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              className="lp2-enter block w-full touch-none select-none" style={{ aspectRatio: `${W} / ${H}`, cursor: pan.current?.moved ? 'grabbing' : 'grab' }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              onClick={guardClick(() => setSelected(null))} role="img" aria-label={lang === 'en' ? active.name_en : active.name_de}>
              <defs><clipPath id="lp2-avatar"><circle r="14" /></clipPath></defs>
              <rect x="4" y="4" width={W - 8} height={H - 8} rx="14" fill="var(--surface)" stroke="var(--muted)" strokeOpacity=".45" strokeWidth="6" />
              {!hasRooms && active.plan_url && <image href={active.plan_url} x="0" y="0" width={W} height={H} opacity=".9" />}
              {rooms.map(drawRoom)}
              {seats.map(drawSeat)}
            </svg>

            {/* hover card */}
            {hoverSeat && (
              <div className="pointer-events-none absolute z-30 w-60 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface p-3 shadow-xl"
                style={{ left: hoverSeat.x, top: hoverSeat.y - 8 }}>
                {hoverSeat.seat.occupant ? (
                  <div className="flex items-center gap-3">
                    <Avatar person={hoverSeat.seat.occupant} size={44} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight">{hoverSeat.seat.occupant.full_name}</p>
                      <p className="truncate text-xs text-muted">{hoverSeat.seat.occupant.position}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-sm" style={{ background: colorOf(hoverSeat.seat.occupant) }} />{hoverSeat.seat.occupant.department}
                        {hoverSeat.seat.occupant.phone_ext && <span className="inline-flex items-center gap-1 text-muted"><Phone size={12} aria-hidden />{hoverSeat.seat.occupant.phone_ext}</span>}
                      </p>
                    </div>
                  </div>
                ) : <p className="text-sm"><span className="font-medium text-safe">{s.freeSeat}</span> · {hoverSeat.seat.label}</p>}
              </div>
            )}

            {/* minimap: sits in the header strip above the plan so it never covers a desk */}
            {zoom > 1.15 && (
              <svg viewBox={`0 0 ${W} ${H}`} onClick={onMini} aria-label="Minimap"
                className="absolute right-[9.5rem] top-2.5 z-20 hidden w-24 cursor-pointer rounded-md border border-line bg-surface shadow-sm sm:block">
                {rooms.filter((r) => !STRUCTURE.includes(r.type)).map((r) => (
                  <rect key={r.id} x={r.x + 4} y={r.y + 4} width={r.w - 8} height={r.h - 8} rx="8"
                    fill={r.dept ? deptColors[r.dept] || 'var(--muted)' : ROOM_FILL[r.type] || 'var(--muted)'} fillOpacity=".25" />
                ))}
                <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="var(--brand)" fillOpacity=".3" stroke="var(--brand)" strokeWidth="22" rx="8" />
              </svg>
            )}
          </div>
          <p className="border-t border-line px-4 py-2 text-xs text-muted">{s.hint}</p>
        </div>
      </div>

      {/* side panel: floor picker always on top, details of the selection below */}
      <aside className="order-first space-y-4 xl:order-none">
        <BuildingNav locations={ordered} active={active} onSelect={setActiveId}
          highlight={dept ? (p) => p.department === dept : null} />
        {selSeat?.occupant && (
          <div className="card p-5">
            <PersonCard seat={selSeat} s={s} color={colorOf(selSeat.occupant)}
              room={rooms.find((r) => r.id === selSeat.roomId)?.label[lang]} onBack={() => { setSelected(null); animateTo(full); }} />
          </div>
        )}
        {selRoom && (
          <div className="card p-5">
            <RoomCard room={selRoom} seats={seats} colors={deptColors} lang={lang} s={s}
              onBack={() => { setSelected(null); animateTo(full); }}
              onPerson={(x) => { setSelected({ kind: 'person', id: x.id }); flyToSeat(x); }} />
          </div>
        )}
        {!selSeat && !selRoom && rooms.some((r) => r.type === 'meeting') && (
          <div className="card p-4">
            <p className="mb-2 text-sm font-medium text-muted">{s.rooms}</p>
            <ul className="space-y-1">
              {rooms.filter((r) => r.type === 'meeting').map((r) => (
                <li key={r.id}>
                  <button type="button" onMouseEnter={() => setHoverRoom(r.id)} onMouseLeave={() => setHoverRoom(null)}
                    onClick={() => { setSelected({ kind: 'room', id: r.id }); flyToRect(r); }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text"><Users size={15} /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{r.label[lang]}</span>
                      <span className="block text-xs text-muted">{s.capacity.replace('{n}', r.info.seats)} · {r.info.equipment[lang]}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
