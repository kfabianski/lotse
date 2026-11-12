import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useBriefing } from '../lib/briefing';
import { useI18n } from '../lib/i18n';
import { BriefingList, briefingCount } from './Greeting';

/** Bell next to the avatar: what concerns this person (today's events, open trainings, posts to confirm, polls,
 * answers to ideas). The data is shared with the "Für Sie" block on the home page. */
export default function Notifications() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const { data, reload } = useBriefing();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { if (user) reload(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return null;
  const n = briefingCount(data);
  const label = n ? t('notif_label_n', { n }) : t('notif_label');

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) reload(); }} aria-expanded={open} aria-haspopup="dialog"
        aria-label={label} title={label}
        className="relative rounded-sm p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink active:bg-well">
        <Bell size={19} />
        {n > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[11px] font-medium leading-none text-brand-ink">
            {n > 9 ? '9+' : n}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={t('notif_title')}
          className="card absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden p-0 shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display font-semibold text-ink">{t('notif_title')}</p>
          </div>
          <div className="thin-scroll max-h-[70vh] overflow-y-auto px-4">
            {!data && <p className="py-6 text-center text-muted">{t('loading')}</p>}
            {data && n === 0 && <p className="py-6 text-center text-muted">{t('greet_nothing')}</p>}
            {data && n > 0 && <BriefingList data={data} />}
          </div>
        </div>
      )}
    </div>
  );
}
