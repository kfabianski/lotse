/** "Meine Schulungen": only the trainings assigned to the signed-in person, with confirmation. */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock, ExternalLink, FileText, GraduationCap, Image as ImageIcon,
  Link2, PlayCircle, RotateCcw,
} from 'lucide-react';
import { Button, Empty } from '../components/ui';
import { RichText } from '../components/RichText';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { Plus, Settings2 } from 'lucide-react';
import { api } from '../lib/api';
import { useViewer } from '../lib/viewer';
import { fileSize } from './Documents';

const KIND_ICON = { pdf: FileText, video: PlayCircle, image: ImageIcon, link: Link2 };

function Status({ tr }) {
  const { t, fmtDate } = useI18n();
  if (tr.completed_at) {
    return <span className="inline-flex items-center gap-1.5 text-sm font-medium text-safe"><CheckCircle2 size={15} />{t('tr_completed', { d: fmtDate(tr.completed_at) })}</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {tr.optional && <span className="rounded-sm bg-safe/10 px-2 py-0.5 text-xs font-medium text-safe">{t('tr_voluntary_badge')}</span>}
      {tr.renewed && <span className="inline-flex items-center gap-1.5 font-medium text-brand-text"><RotateCcw size={14} />{t('tr_renewed')}</span>}
      {tr.due_date && (tr.overdue
        ? <span className="inline-flex items-center gap-1.5 font-medium text-alert"><AlertTriangle size={14} />{t('tr_overdue', { d: fmtDate(tr.due_date) })}</span>
        : <span className="inline-flex items-center gap-1.5 text-muted"><Clock size={14} />{t('tr_due', { d: fmtDate(tr.due_date) })}</span>)}
    </span>
  );
}

/** Banner for the home page: how many trainings are still open. */
export default function Trainings() {
  const { t, lang } = useI18n();
  const { has } = useAuth();
  const { data, loading } = useFetch('/trainings/mine');
  const [tab, setTab] = useState('open');
  const pick = { open: (x) => !x.completed_at && !x.optional, voluntary: (x) => !x.completed_at && x.optional, done: (x) => x.completed_at };
  const list = (data || []).filter(pick[tab]);
  const counts = Object.fromEntries(Object.entries(pick).map(([k, f]) => [k, (data || []).filter(f).length]));
  return (
    <div className="mx-auto max-w-[920px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('tr_title')}</h1>
          <p className="mt-2 max-w-2xl text-muted">{t('tr_intro')}</p>
        </div>
        {has('trainings') && (
          <div className="flex gap-2">
            <Link to="/admin?tab=trainings" className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 font-medium hover:bg-surface-2"><Settings2 size={17} />{t('tr_manage')}</Link>
            <Link to="/admin?tab=trainings&new=1" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong"><Plus size={17} />{t('tr_new')}</Link>
          </div>
        )}
      </div>
      <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
        {['open', 'voluntary', 'done'].filter((k) => k !== 'voluntary' || counts.voluntary).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px border-b-[3px] pb-2.5 font-medium ${tab === k ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t(`tr_${k}`)} <span className="text-muted">{counts[k]}</span>
          </button>
        ))}
      </div>
      {loading && !data && <p className="mt-6 text-muted">{t('loading')}</p>}
      {data && !list.length && <div className="mt-6"><Empty>{tab === 'done' ? t('tr_none_done') : t('tr_none_open')}</Empty></div>}
      <ul className="mt-6 space-y-3">
        {list.map((tr) => (
          <li key={tr.id}>
            <Link to={`/trainings/${tr.id}`} className="card card-hover flex items-center gap-4 px-5 py-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tr.completed_at ? 'bg-safe/10 text-safe' : tr.overdue ? 'bg-alert/10 text-alert' : 'bg-brand-soft text-brand-text'}`}>
                {tr.completed_at ? <CheckCircle2 size={21} /> : <GraduationCap size={21} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{(lang === 'en' && tr.title_en) || tr.title_de}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Status tr={tr} />
                  <span className="inline-flex items-center gap-2 text-muted">
                    {tr.materials.map((m, i) => { const I = KIND_ICON[m.kind] || FileText; return <I key={i} size={15} />; })}
                  </span>
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrainingView() {
  const { id } = useParams();
  const { t, lang, fmtDate } = useI18n();
  const navigate = useNavigate();
  const { open } = useViewer();
  const { data: loaded, error, loading } = useFetch(`/trainings/${id}`);
  const [patched, setPatched] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const tr = patched || loaded;
  if (loading && !tr) return <p className="text-muted">{t('loading')}</p>;
  if (error) return <Empty>{error.status === 404 ? t('not_found') : t('error_generic', { msg: error.message })}</Empty>;

  const files = tr.materials.filter((m) => m.kind === 'pdf' || m.kind === 'image');
  const confirm = async () => {
    setBusy(true);
    setErr('');
    try { setPatched(await api(`/trainings/${tr.id}/complete`, { method: 'POST' })); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <article className="mx-auto max-w-[920px]">
      <button type="button" onClick={() => navigate('/trainings')} className="mb-6 inline-flex items-center gap-2 text-muted hover:text-ink">
        <ArrowLeft size={17} />{t('tr_back')}
      </button>
      {!tr.assigned && !tr.optional && <p className="mb-4 rounded-lg bg-surface-2 px-4 py-2 text-sm text-muted">{t('tr_not_assigned')}</p>}
      <div className="flex items-center gap-2 text-sm font-medium text-muted"><GraduationCap size={16} />{t('nav_trainings')}</div>
      <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">{(lang === 'en' && tr.title_en) || tr.title_de}</h1>
      <div className="mt-3"><Status tr={tr} /></div>

      {(tr.description_de || tr.description_en) && (
        <div className="mt-6"><RichText source={(lang === 'en' && tr.description_en) || tr.description_de} /></div>
      )}

      {tr.materials.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{t('tr_materials')}</h2>
          <ul className="space-y-3">
            {tr.materials.map((m) => {
              const Icon = KIND_ICON[m.kind] || FileText;
              if (m.kind === 'video') {
                return (
                  <li key={m.id} className="card overflow-hidden">
                    <p className="flex items-center gap-2 px-4 py-3 font-medium"><PlayCircle size={18} className="text-brand-text" />{m.name}</p>
                    <video src={m.url} controls preload="metadata" className="aspect-video w-full bg-scrim" />
                  </li>
                );
              }
              const external = m.kind === 'link' && /^https?:/i.test(m.url);
              const row = (
                <>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.kind === 'pdf' ? 'bg-alert/10 text-alert' : 'bg-brand-soft text-brand-text'}`}><Icon size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium group-hover:text-brand-text">{m.name}</span>
                    <span className="block text-sm text-muted">{m.kind === 'link' ? m.url : `${m.kind.toUpperCase()}, ${fileSize(m.size)}`}</span></span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-text">{t('tr_open_link')}{external && <ExternalLink size={14} />}</span>
                </>
              );
              return (
                <li key={m.id} className="card">
                  {m.kind === 'link'
                    ? (m.url.startsWith('/')
                      ? <Link to={m.url} className="group flex items-center gap-3 px-4 py-3">{row}</Link>
                      : <a href={m.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-4 py-3">{row}</a>)
                    : <button type="button" onClick={() => open(files, files.indexOf(m))} className="group flex w-full items-center gap-3 px-4 py-3 text-left">{row}</button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(tr.assigned || tr.optional) && (
        <div className={`mt-10 rounded-2xl border-2 p-5 ${tr.completed_at ? 'border-safe/40 bg-safe/5' : 'border-brand/40 bg-brand-soft/40'}`}>
          {tr.completed_at ? (
            <p className="flex items-center gap-2 font-semibold text-safe"><CheckCircle2 size={20} />{t('tr_confirmed', { d: fmtDate(tr.completed_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">{t('tr_confirm_hint')}</p>
              <Button onClick={confirm} disabled={busy}><CheckCircle2 size={18} />{t('tr_confirm')}</Button>
            </div>
          )}
          {err && <p className="mt-2 text-sm text-alert">{t('error_generic', { msg: err })}</p>}
        </div>
      )}
    </article>
  );
}
