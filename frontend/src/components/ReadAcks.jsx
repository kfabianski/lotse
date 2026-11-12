/** Lesebestätigung: the reader confirms an article that asks for it ("read and understood"); editors see who did. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, Download } from 'lucide-react';
import { Avatar, Button, Modal } from './ui';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useBriefing } from '../lib/briefing';
import { useFetch } from '../lib/useFetch';
import { api, downloadFile } from '../lib/api';

function AckReport({ article, onClose }) {
  const { t, fmtDate } = useI18n();
  const { data } = useFetch(`/articles/${article.id}/acks`, undefined, `acks-${article.id}`);
  const [error, setError] = useState('');
  const total = data ? data.done.length + data.open.length : 0;
  const csv = () => downloadFile(`/articles/${article.id}/acks.csv`, `lesebestaetigung-${article.id}.csv`).catch((e) => setError(e.message));
  return (
    <Modal title={t('ack_report')} size="lg" onClose={onClose}>
      {!data ? <p className="text-muted">{t('loading')}</p> : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{t('ack_progress', { d: data.done.length, n: total })}</span>
              <Button variant="outline" className="py-1 text-sm" onClick={csv}><Download size={15} />{t('ack_csv')}</Button>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-sm bg-surface-2"><div className="h-full rounded-sm bg-safe" style={{ width: `${total ? (data.done.length / total) * 100 : 0}%` }} /></div>
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            {[['open', t('ack_open_people')], ['done', t('ack_done_people')]].map(([k, label]) => (
              <div key={k}>
                <p className="mb-2 text-sm font-medium">{label} <span className="text-muted">{data[k].length}</span></p>
                <ul className="thin-scroll max-h-80 space-y-1 overflow-y-auto">
                  {data[k].map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                      <Avatar person={p} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.full_name}</span>
                        <span className="block truncate text-xs text-muted">
                          {k === 'done' ? fmtDate(p.acked_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : p.department}
                        </span>
                      </span>
                      {k === 'done' && <CheckCircle2 size={15} className="text-safe" />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ReadAcks({ article, canReport = false }) {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const { reload } = useBriefing();
  const [ack, setAck] = useState(article.my_ack);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(false);
  if (!article.ack_required) return null;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api(`/articles/${article.id}/ack`, { method: 'POST' });
      setAck(r.acked_at);
      reload();
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <section aria-label={t('ack_title')} className={`mt-10 rounded-2xl border-2 p-5 ${ack ? 'border-safe/40 bg-safe/5' : 'border-brand/40 bg-brand-soft/40'}`}>
      <p className="flex items-center gap-2 font-display font-semibold"><BookOpenCheck size={18} className="text-brand-text" />{t('ack_title')}</p>
      {ack ? (
        <p className="mt-2 flex items-center gap-2 font-medium text-safe">
          <CheckCircle2 size={18} />{t('ack_done', { d: fmtDate(ack, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}
        </p>
      ) : user ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">{t('ack_hint')}</p>
          <Button onClick={confirm} disabled={busy}><CheckCircle2 size={18} />{t('ack_confirm')}</Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          <Link to={`/login?next=${encodeURIComponent(`/articles/${article.id}`)}`} className="link">{t('ack_login')}</Link>
        </p>
      )}
      {error && <p className="mt-2 text-sm text-alert">{t('error_generic', { msg: error })}</p>}
      {canReport && (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" onClick={() => setReport(true)} className="text-sm font-medium text-brand-text hover:underline">{t('ack_report')} …</button>
        </div>
      )}
      {report && <AckReport article={article} onClose={() => setReport(false)} />}
    </section>
  );
}
