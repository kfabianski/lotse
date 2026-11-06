import { useMemo } from 'react';
import { useFetch } from './useFetch';

export const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Country part of a region code ("DE-NI" -> "DE"); shown as small badges. */
export const countriesOf = (h) => [...new Set(h.regions.map((r) => r.split('-')[0]))];

/** Public holidays (DE/AT/CH as configured by the admin) between two Date objects, keyed by ISO day. */
export function useHolidays(from, to) {
  const range = { from: isoDay(from), to: isoDay(to) };
  const { data } = useFetch('/events/holidays', { params: range }, `holidays-${range.from}-${range.to}`);
  return useMemo(() => {
    const byDay = {};
    (data || []).forEach((h) => { (byDay[h.date] ||= []).push(h); });
    return { list: data || [], byDay };
  }, [data]);
}

/** Small country badges, e.g. DE AT CH. */
export function CountryBadges({ holiday, className = '' }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`}>
      {countriesOf(holiday).map((c) => (
        <span key={c} className="rounded bg-alert/10 px-1 text-[10px] font-semibold leading-4 text-alert">{c}</span>
      ))}
    </span>
  );
}
