import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Pause, Play } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const DURATION = 7000;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function HeroSlider({ slides }) {
  const { t, loc, fmtDate } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(reducedMotion);
  const [hover, setHover] = useState(false);
  const running = !paused && !hover && slides.length > 1;

  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), DURATION);
    return () => clearTimeout(id);
  }, [running, index, slides.length]);

  if (!slides.length) return null;
  const go = (i) => setIndex((i + slides.length) % slides.length);
  const s = slides[index];
  const ctl = 'rounded-sm border border-line p-2 text-ink transition-colors hover:border-ink hover:bg-surface-2 active:bg-well';

  return (
    <section aria-roledescription="carousel" aria-label="Highlights"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      className="relative isolate flex min-h-[460px] items-end overflow-hidden rounded-2xl bg-well p-4 sm:min-h-[540px] sm:p-6 lg:items-stretch lg:justify-end">
      {slides.map((slide, i) => (
        <img key={slide.id} src={slide.image_url || ''} alt=""
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            i === index ? 'opacity-100' : 'opacity-0'}`} />
      ))}

      <div className="flex w-full flex-col rounded-xl bg-surface/85 p-6 sm:p-8 lg:w-[27rem]" aria-live="polite">
        <p className="text-muted">{t(`cat_${s.category}`)}</p>
        <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[2.4rem]">
          {loc(s, 'title')}
        </h2>
        <p className="mt-3 max-w-[48ch] text-[1.0625rem] text-ink-2">{loc(s, 'summary')}</p>
        {s.event_date && (
          <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-t border-line pt-3 text-ink-2">
            <dt className="text-muted"><CalendarDays size={16} aria-label={t('date')} className="mt-1" /></dt>
            <dd className="font-mono text-[0.9375rem]">{fmtDate(s.event_date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd>
            {s.event_location && <><dt className="text-muted"><MapPin size={16} aria-label={t('location')} className="mt-1" /></dt><dd>{s.event_location}</dd></>}
          </dl>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
          <Link to={`/articles/${s.id}`}
            className="inline-flex min-h-10 items-center rounded-sm border border-brand bg-brand px-5 py-2 font-display text-[0.9375rem] font-medium text-brand-ink transition-colors hover:bg-brand-strong">
            {t('read_more')}
          </Link>
          {slides.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="mr-1 font-mono text-sm text-muted">{index + 1}/{slides.length}</span>
              <button type="button" onClick={() => go(index - 1)} aria-label={t('slide_prev')} className={ctl}><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t('slide_play') : t('slide_pause')} className={ctl}>
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label={t('slide_next')} className={ctl}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
        {slides.length > 1 && (
          <ol className="mt-4 flex gap-1">
            {slides.map((slide, i) => (
              <li key={slide.id} className="flex-1">
                <button type="button" onClick={() => go(i)} aria-current={i === index} aria-label={loc(slide, 'title')} className="block w-full py-2">
                  <span className="block h-[2px] overflow-hidden bg-line">
                    {i === index && (
                      <span key={`${index}-${running}`} className={`block h-full bg-ink ${running ? 'slide-progress' : ''}`}
                        style={{ animationDuration: `${DURATION}ms`, transform: running ? undefined : 'scaleX(1)' }} />
                    )}
                    {i < index && <span className="block h-full bg-rule-strong" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
