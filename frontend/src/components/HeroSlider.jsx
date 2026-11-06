import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Pause, Play } from 'lucide-react';
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
  const glass = 'rounded-full bg-white/15 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-white/25';

  return (
    <section aria-roledescription="carousel" aria-label="Highlights"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#0d0f13]">
      {slides.map((slide, i) => (
        <img key={slide.id} src={slide.image_url || ''} alt=""
          className={`absolute inset-0 -z-10 h-full w-full object-cover transition-[opacity,transform] duration-[1200ms] ease-out ${
            i === index ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`} />
      ))}
      {/* Readability gradient: strongest bottom-left where the text sits. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-tr from-black/80 via-black/35 to-transparent" />

      <div className="flex min-h-[380px] flex-col justify-end p-6 sm:min-h-[460px] sm:p-10" aria-live="polite">
        <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
          {t(`cat_${s.category}`)}
        </span>
        <h1 className="mt-4 max-w-[18ch] font-display text-[2.25rem] font-semibold leading-[1.05] text-white sm:text-[3.5rem]">
          {loc(s, 'title')}
        </h1>
        <p className="mt-3 max-w-[56ch] text-[1.05rem] text-white/80">{loc(s, 'summary')}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to={`/articles/${s.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#15171c] transition-transform hover:scale-[1.03]">
            {t('read_more')}<ArrowUpRight size={16} />
          </Link>
          {s.event_date && (
            <span className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} />
                {fmtDate(s.event_date, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              {s.event_location && <span className="inline-flex items-center gap-1.5"><MapPin size={16} />{s.event_location}</span>}
            </span>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 hidden items-center gap-2 sm:flex">
          <button type="button" onClick={() => go(index - 1)} aria-label={t('slide_prev')} className={glass}><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t('slide_play') : t('slide_pause')} className={glass}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label={t('slide_next')} className={glass}><ChevronRight size={18} /></button>
        </div>
      )}

      {slides.length > 1 && (
        <ol className="absolute inset-x-6 top-5 flex gap-1.5 sm:inset-x-10 sm:top-7">
          {slides.map((slide, i) => (
            <li key={slide.id} className="flex-1">
              <button type="button" onClick={() => go(i)} aria-current={i === index} aria-label={loc(slide, 'title')}
                className="block w-full py-2">
                <span className="block h-[3px] overflow-hidden rounded-full bg-white/25">
                  {i === index && (
                    <span key={`${index}-${running}`} className={`block h-full rounded-full bg-white ${running ? 'slide-progress' : ''}`}
                      style={{ animationDuration: `${DURATION}ms`, transform: running ? undefined : 'scaleX(1)' }} />
                  )}
                  {i < index && <span className="block h-full bg-white/70" />}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
