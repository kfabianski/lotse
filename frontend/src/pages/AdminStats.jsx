/** Einstellungen → Statistik: what is read, what is searched for without a hit. Counts only, never people. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Eye, Search as SearchIcon } from 'lucide-react';
import { CategoryTag, Empty } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

const PERIODS = [7, 30, 90, 365];

function Tile({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><Icon size={20} /></span>
      <span>
        <span className="block font-mono text-[1.75rem] leading-none text-ink">{value}</span>
        <span className="mt-1 block text-sm text-muted">{label}</span>
      </span>
    </div>
  );
}

function TermTable({ rows, count, hits = false }) {
  const { t, fmtDate } = useI18n();
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">{t('st_query')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('st_count')}</th>
            {hits && <th className="px-3 py-2 text-right font-medium">{t('st_hits')}</th>}
            <th className="px-3 py-2 text-right font-medium">{t('st_last')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.query}>
              <td className="px-4 py-2"><Link to={`/search?q=${encodeURIComponent(r.query)}`} className="font-medium hover:text-brand-text">{r.query}</Link></td>
              <td className="px-3 py-2 text-right font-mono">{r[count]}</td>
              {hits && <td className={`px-3 py-2 text-right font-mono ${r.last_hits ? 'text-muted' : 'text-alert'}`}>{r.last_hits}</td>}
              <td className="px-3 py-2 text-right text-muted">{fmtDate(r.last_at, { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminStats() {
  const { t, loc, fmtDate, lang } = useI18n();
  const [days, setDays] = useState(30);
  const { data } = useFetch('/stats/overview', { params: { days } }, `stats-${days}`);
  if (!data) return <p className="text-muted">{t('loading')}</p>;
  const num = (n) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');
  // One bar per day of the period, quiet days included, so the chart reads as a calendar and not as one wide block.
  const counts = Object.fromEntries(data.by_day.map((d) => [d.day, d.count]));
  const start = new Date(`${data.since}T12:00`);
  const series = Array.from({ length: data.days }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { day: key, count: counts[key] || 0 };
  });
  const max = Math.max(1, ...series.map((d) => d.count));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-muted">{t('st_intro')}</p>
        <div role="group" aria-label={t('st_period')} className="inline-flex rounded-xl border border-line bg-surface p-1">
          {PERIODS.map((n) => (
            <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium ${days === n ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
              {t('st_days', { n })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile icon={Eye} label={t('st_views_period')} value={num(data.views_period)} />
        <Tile icon={BarChart3} label={t('st_views_total')} value={num(data.views_total)} />
        <Tile icon={SearchIcon} label={t('st_searches')} value={num(data.searches_total)} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t('st_by_day')}</h2>
        <ul className={`card flex h-32 items-end p-3 ${data.days > 120 ? 'gap-px' : 'gap-[2px]'}`} aria-label={t('st_by_day')}>
          {series.map((d) => (
            <li key={d.day} className={`max-w-10 flex-1 rounded-t-sm ${d.count ? 'bg-brand/70' : 'bg-line'}`}
              style={{ height: `${d.count ? Math.max(4, (d.count / max) * 100) : 2}%` }}
              title={`${fmtDate(`${d.day}T12:00`, { day: '2-digit', month: '2-digit' })}: ${d.count}`} />
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t('st_articles')}</h2>
          {data.articles.length ? (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-muted">
                  <tr><th className="px-4 py-2 font-medium">{t('title')}</th><th className="px-3 py-2 text-right font-medium">{t('st_views')}</th><th className="px-3 py-2 text-right font-medium">{t('st_total')}</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.articles.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2">
                        <Link to={`/articles/${a.id}`} className="font-medium hover:text-brand-text">{loc(a, 'title')}</Link>
                        <span className="block"><CategoryTag category={a.category} className="!text-xs" /></span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{a.views_period}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted">{a.views_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>{t('st_empty')}</Empty>}
        </section>
        <div className="space-y-8">
          <section>
            <h2 className="mb-1 font-display text-lg font-semibold">{t('st_misses')}</h2>
            <p className="mb-3 text-sm text-muted">{t('st_misses_hint')}</p>
            {data.misses.length ? <TermTable rows={data.misses} count="misses" /> : <Empty>{t('st_empty')}</Empty>}
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">{t('st_top_searches')}</h2>
            {data.top_searches.length ? <TermTable rows={data.top_searches} count="searches" hits /> : <Empty>{t('st_empty')}</Empty>}
          </section>
        </div>
      </div>
    </div>
  );
}
