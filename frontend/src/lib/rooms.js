/**
 * Rooms on a floor plan. The API stores x/y/w/h as percentages of the plan (like desks);
 * drawing works in plan units: width 1000, height 1000 * plan_ratio.
 */

export const ROOM_TYPES = {
  office: { de: 'Büro', en: 'Office' },
  meeting: { de: 'Besprechungsraum', en: 'Meeting room' },
  lead: { de: 'Leitung', en: 'Management office' },
  project: { de: 'Projektfläche', en: 'Project area' },
  reception: { de: 'Empfang', en: 'Reception' },
  kitchen: { de: 'Küche', en: 'Kitchen' },
  wc: { de: 'WC', en: 'Restroom' },
  storage: { de: 'Lager / Archiv', en: 'Storage' },
  corridor: { de: 'Flur', en: 'Corridor' },
  stairs: { de: 'Treppe / Aufzug', en: 'Stairs / lift' },
  rack: { de: 'Regal', en: 'Rack' },
  dock: { de: 'Ladetor', en: 'Loading gate' },
  lane: { de: 'Fahrweg', en: 'Forklift lane' },
  'stock-office': { de: 'Lagerbüro', en: 'Warehouse office' },
  other: { de: 'Sonstiges', en: 'Other' },
};

/** Types that are background structure: not clickable on the public plan, never contain desks. */
export const STRUCTURE = ['corridor', 'stairs', 'lane'];
/** Types that can carry a department colour. */
export const DEPT_TYPES = ['office', 'lead', 'project', 'stock-office'];

export const ROOM_FILL = {
  meeting: 'var(--brand)', kitchen: '#d97706', reception: 'var(--muted)', project: '#0891b2', wc: '#0e7490',
  storage: '#a16207', rack: 'var(--muted)', dock: 'var(--muted)', 'stock-office': 'var(--muted)', other: 'var(--muted)',
  office: 'var(--muted)', lead: 'var(--muted)',
};

export const PLAN_W = 1000;
export const planHeight = (loc) => Math.round(PLAN_W * (loc?.plan_ratio || 0.5));

/** API room (percent) -> drawing room (plan units) in the shape the plan components use. */
export function toUnits(room, H) {
  return {
    id: room.id,
    type: room.type,
    dept: room.department || null,
    label: { de: room.name_de || room.name_en || '', en: room.name_en || room.name_de || '' },
    x: (room.x / 100) * PLAN_W,
    y: (room.y / 100) * H,
    w: (room.w / 100) * PLAN_W,
    h: (room.h / 100) * H,
    info: room.type === 'meeting' && room.capacity
      ? { seats: room.capacity, equipment: { de: room.equipment_de, en: room.equipment_en || room.equipment_de }, mail: room.email }
      : null,
    raw: room,
  };
}

/** Plan-unit rectangle -> API percentages (rounded, clamped). */
export function toPercent({ x, y, w, h }, H) {
  const r = (v) => Math.round(v * 1000) / 1000;
  return {
    x: r(Math.min(101, Math.max(-1, (x / PLAN_W) * 100))),
    y: r(Math.min(101, Math.max(-1, (y / H) * 100))),
    w: r(Math.min(102, Math.max(0.3, (w / PLAN_W) * 100))),
    h: r(Math.min(102, Math.max(0.3, (h / H) * 100))),
  };
}

export const roomColor = (room, deptColors) =>
  (room.dept && deptColors[room.dept]) || ROOM_FILL[room.type] || 'var(--muted)';
