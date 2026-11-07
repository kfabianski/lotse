import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, MapPin, Maximize2, Minus, Network, Phone, Plus } from 'lucide-react';
import { Avatar, Empty } from './ui';
import { useI18n } from '../lib/i18n';

/** Builds the reporting tree from the directory list: roots are people whose manager is not in the list. */
function buildTree(people) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const children = new Map();
  people.forEach((p) => {
    const boss = p.manager_id && byId.has(p.manager_id) ? p.manager_id : null;
    if (!children.has(boss)) children.set(boss, []);
    children.get(boss).push(p);
  });
  const sort = (list) => [...list].sort((a, b) => (count(b) - count(a)) || a.last_name.localeCompare(b.last_name));
  const count = (p) => (children.get(p.id) || []).length;
  const roots = sort(children.get(null) || []);
  return {
    kids: (p) => sort(children.get(p.id) || []),
    teamSize: (p) => {
      let n = 0;
      const walk = (x) => (children.get(x.id) || []).forEach((c) => { n += 1; walk(c); });
      walk(p);
      return n;
    },
    trees: roots.filter((p) => count(p) > 0),
    loose: roots.filter((p) => count(p) === 0),
  };
}

function PersonCard({ p, color, dim, hit, open, onToggle, reports, big }) {
  const { t } = useI18n();
  return (
    <div className={`relative ${big ? 'w-[15rem]' : 'w-[11.75rem]'} rounded-2xl border bg-surface text-left shadow-sm transition ${hit ? 'border-brand ring-2 ring-brand/30' : 'border-line'} ${dim ? 'opacity-35' : ''}`}>
      <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ background: color || 'var(--line)' }} />
      <Link to={`/people?view=plan&focus=${p.id}`} title={t('org_show_plan')} className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-3.5 hover:text-brand-text">
        <Avatar person={p} size={big ? 48 : 36} />
        <span className="min-w-0">
          <span className="block truncate font-semibold leading-tight">{p.full_name}</span>
          <span className="block truncate text-xs text-muted">{p.position}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            {p.department && <span className="truncate">{p.department}</span>}
            {p.phone_ext && <span className="inline-flex shrink-0 items-center gap-0.5"><Phone size={10} />{p.phone_ext}</span>}
          </span>
        </span>
      </Link>
      {reports > 0 && (
        <button type="button" onClick={onToggle} aria-expanded={open}
          className="flex w-full items-center justify-center gap-1 border-t border-line py-1 text-xs font-medium text-muted hover:bg-surface-2 hover:text-ink">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{t('org_reports', { n: reports })}
        </button>
      )}
    </div>
  );
}

/** Top level: the person, then the direct reports side by side; deeper levels hang below as vertical lists. */
function Branch({ p, tree, depth, state }) {
  const kids = tree.kids(p);
  const open = !state.collapsed.has(p.id);
  const card = (
    <PersonCard p={p} color={state.colors[p.department]} dim={state.dim(p)} hit={state.hit(p)} open={open}
      onToggle={() => state.toggle(p.id)} reports={kids.length} big={depth === 0} />
  );
  if (depth === 0) {
    return (
      <div className="flex flex-col items-center">
        {card}
        {open && kids.length > 0 && (
          <>
            <span className="h-6 w-px bg-line" />
            <ul className="org-row flex items-start justify-center">
              {kids.map((k) => (
                <li key={k.id} className="org-col relative flex flex-col items-center px-1.5 pt-6">
                  <Branch p={k} tree={tree} depth={1} state={state} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      {card}
      {open && kids.length > 0 && (
        <ul className="org-list mt-2 space-y-2 border-l-2 border-line pl-3">
          {kids.map((k) => (
            <li key={k.id} className="relative"><Branch p={k} tree={tree} depth={depth + 1} state={state} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shows a wide tree scaled to the available width ("fit"), with -/+ for zooming in (then it scrolls). */
function FitBox({ children, label, deps }) {
  const { t } = useI18n();
  const outer = useRef(null);
  const inner = useRef(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(null); // null = fit to width
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const w = inner.current.offsetWidth;
      const h = inner.current.offsetHeight;
      setSize({ w, h });
      setFit(Math.max(0.45, Math.min(1, (outer.current.clientWidth - 2) / Math.max(1, w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current);
    ro.observe(inner.current);
    return () => ro.disconnect();
  }, [deps]);
  const scale = zoom ?? fit;
  const step = (d) => setZoom(Math.min(1.5, Math.max(0.4, Math.round((scale + d) * 10) / 10)));
  const btn = 'grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink';
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-muted"><Network size={16} />{label}</p>
        <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5" role="group" aria-label={t('org_zoom')}>
          <button type="button" className={btn} onClick={() => step(-0.1)} aria-label={t('org_zoom_out')}><Minus size={15} /></button>
          <span className="w-11 text-center text-xs tabular-nums text-muted">{Math.round(scale * 100)} %</span>
          <button type="button" className={btn} onClick={() => step(0.1)} aria-label={t('org_zoom_in')}><Plus size={15} /></button>
          <button type="button" className={btn} onClick={() => setZoom(null)} aria-label={t('org_zoom_fit')} title={t('org_zoom_fit')}><Maximize2 size={14} /></button>
        </div>
      </div>
      <div ref={outer} className="thin-scroll overflow-x-auto">
        <div style={{ width: size.w * scale || undefined, height: size.h * scale || undefined, margin: '0 auto' }}>
          <div ref={inner} className="w-max origin-top-left" style={{ transform: `scale(${scale})` }}>{children}</div>
        </div>
      </div>
    </>
  );
}

export default function OrgChart({ people, colors, isMatch, filtering }) {
  const { t } = useI18n();
  const tree = useMemo(() => buildTree(people), [people]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const state = {
    colors,
    collapsed,
    toggle: (id) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    hit: (p) => filtering && isMatch(p),
    dim: (p) => filtering && !isMatch(p),
  };

  if (!tree.trees.length) {
    return <Empty>{t('org_empty')}</Empty>;
  }
  return (
    <div className="space-y-10">
      {tree.trees.map((root) => (
        <section key={root.id} className="rounded-2xl border border-line bg-bg p-4 sm:p-6">
          <FitBox label={t('org_team', { n: tree.teamSize(root) + 1 })} deps={collapsed}>
            <Branch p={root} tree={tree} depth={0} state={state} />
          </FitBox>
        </section>
      ))}
      {tree.loose.length > 0 && (
        <section>
          <h2 className="mb-1 inline-flex items-center gap-2 font-display text-lg font-semibold"><MapPin size={18} className="text-muted" />{t('org_unassigned')}</h2>
          <p className="mb-3 text-sm text-muted">{t('org_unassigned_hint')}</p>
          <ul className="flex flex-wrap gap-3">
            {tree.loose.map((p) => (
              <li key={p.id}><PersonCard p={p} color={colors[p.department]} dim={state.dim(p)} hit={state.hit(p)} reports={0} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
