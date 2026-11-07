import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Mail, Map as MapIcon, Network, Phone, Search } from 'lucide-react';
import OrgChart from '../components/OrgChart';
import FloorPlanV2 from '../components/FloorPlanV2';
import { Avatar, Empty, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

function PersonTile({ p, color, onShowOnPlan }) {
  const { t, fmtDate } = useI18n();
  return (
    <li className="card flex gap-4 p-4">
      <span className="h-fit rounded-sm p-0.5" style={{ boxShadow: `0 0 0 2px ${color}` }}><Avatar person={p} size={56} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold leading-tight text-ink">{p.full_name}</p>
        <p className="text-sm text-muted">{p.position}</p>
        <div className="mt-3 space-y-1 text-sm">
          {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-2 truncate text-ink underline decoration-line underline-offset-[0.15em] hover:decoration-brand-text"><Mail size={15} aria-hidden className="shrink-0 text-muted" />{p.email}</a>}
          {p.phone_ext && <a href={`tel:${p.phone_ext}`} className="flex items-center gap-2 text-ink underline decoration-line underline-offset-[0.15em] hover:decoration-brand-text"><Phone size={15} aria-hidden className="text-muted" />{t('extension')} <span className="font-mono">{p.phone_ext}</span></a>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {p.seat
            ? <button type="button" onClick={() => onShowOnPlan(p)} className="inline-flex items-center gap-1.5 font-medium hover:text-brand-text">
                <span className="bg-well px-1.5 font-mono text-sm">{p.seat.location_code}</span>{t('show_on_plan')}
              </button>
            : <span className="text-muted">{t('no_seat')}</span>}
          {p.start_date && <span className="text-muted">{t('started')} {fmtDate(p.start_date, { month: 'short', year: 'numeric' })}</span>}
        </div>
      </div>
    </li>
  );
}

export default function People() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const focus = Number(params.get('focus')) || null;
  const raw = params.get('view') || (focus ? 'plan' : 'list');
  const view = raw === 'plan2' ? 'plan' : raw; // old prototype links
  const dept = params.get('dept') || '';
  const [q, setQ] = useState('');
  const users = useFetch('/users');
  const locations = useFetch('/locations');
  const departments = useFetch('/departments');

  const people = users.data || [];
  const depts = departments.data || [];
  const colors = useMemo(() => Object.fromEntries(depts.map((d) => [d.name, d.color])), [depts]);
  const needle = q.trim().toLowerCase();
  const matchesText = (p) => !needle || [p.full_name, p.department, p.position, p.email, p.phone_ext]
    .some((v) => v?.toLowerCase().includes(needle));
  const matches = (p) => (!dept || p.department === dept) && matchesText(p);
  const filtered = people.filter(matches);

  // Group the list by the official department order; unknown/empty departments go last.
  const groups = useMemo(() => {
    const order = [...depts.map((d) => d.name), ...new Set(filtered.map((p) => p.department).filter((n) => !colors[n]))];
    return order.map((name) => ({ name, people: filtered.filter((p) => (p.department || '') === name) }))
      .filter((g) => g.people.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.map((p) => p.id).join(), depts]);

  const update = (patch) => {
    const next = { view, ...(focus ? { focus: String(focus) } : {}), ...(dept ? { dept } : {}), ...patch };
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    setParams(next);
  };
  const showOnPlan = (p) => update({ view: 'plan', focus: String(p.id) });
  const counts = Object.fromEntries(depts.map((d) => [d.name, people.filter((p) => p.department === d.name && matchesText(p)).length]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('people_title')}</h1>
          <p className="mt-1 text-muted">{t('people_count', { n: filtered.length })}{dept && `, ${dept}`}</p>
        </div>
        <div role="tablist" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {[['list', LayoutGrid, t('view_list')], ['org', Network, t('view_org')], ['plan', MapIcon, t('view_plan')]].map(([v, Icon, label]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => update({ view: v })}
              className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-1.5 text-sm font-medium ${view === v ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>
      </div>

      {view !== 'plan' && (<>
      <label className="relative mt-6 block">
        <span className="sr-only">{t('search')}</span>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('people_search')} className={`${inputClass} h-11 pl-11`} />
      </label>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t('department')}>
        <button type="button" onClick={() => update({ dept: '' })} aria-pressed={!dept}
          className={`rounded-sm border px-3.5 py-1.5 text-sm font-medium transition-colors ${!dept ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-muted hover:text-ink'}`}>
          {t('all_departments')}
        </button>
        {depts.map((d) => (
          <button key={d.id} type="button" onClick={() => update({ dept: dept === d.name ? '' : d.name })} aria-pressed={dept === d.name}
            className={`inline-flex items-center gap-2 rounded-sm border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              dept === d.name ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-muted'}`}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />{d.name}
            <span className={dept === d.name ? 'opacity-70' : 'text-muted'}>{counts[d.name] ?? 0}</span>
          </button>
        ))}
      </div>
      </>)}

      <div className="mt-8">
        {(users.loading || locations.loading) && !users.data && <p className="text-muted">{t('loading')}</p>}
        {view === 'plan' && locations.data && <FloorPlanV2 locations={locations.data} deptColors={colors} focusPersonId={focus} focusLocationId={Number(params.get('loc')) || null} />}
        {view === 'org' && users.data && <OrgChart people={people} colors={colors} isMatch={matches} filtering={Boolean(needle || dept)} />}
        {view === 'list' && users.data && (groups.length ? (
          <div className="space-y-10">
            {groups.map((g) => (
              <section key={g.name || 'none'} aria-labelledby={`dept-${g.name}`}>
                <h2 id={`dept-${g.name}`} className="mb-4 flex items-center gap-3 border-b border-line pb-2 font-display text-[1.25rem] font-semibold text-ink">
                  <span className="h-3 w-3 rounded-sm" style={{ background: colors[g.name] || 'var(--muted)' }} />
                  {g.name || t('no_department')}
                  <span className="text-sm font-normal text-muted">{t('people_count', { n: g.people.length })}</span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {g.people.map((p) => <PersonTile key={p.id} p={p} color={colors[p.department] || 'var(--line)'} onShowOnPlan={showOnPlan} />)}
                </ul>
              </section>
            ))}
          </div>
        ) : <Empty>{t('no_results')}</Empty>)}
      </div>
    </div>
  );
}
