import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, PenLine, Trash2 } from 'lucide-react';
import { Avatar, Button, CategoryTag, Empty, Markdown, StatusBadge } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useState, useEffect } from 'react';
import { Attendees, RsvpButton } from './Events';
import { useViewer } from '../lib/viewer';
import { fileSize } from './Documents';
import { FileText, Images } from 'lucide-react';

export default function ArticleView() {
  const { id } = useParams();
  const { t, loc, fmtDate } = useI18n();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { data: a, error, loading } = useFetch(`/articles/${id}`);
  const [event, setEvent] = useState(null);
  const { open } = useViewer();
  useEffect(() => {
    setEvent(null);
    if (a?.category === 'events' && a.event_date && a.published) api(`/events/${a.id}`).then(setEvent).catch(() => {});
  }, [a]);

  if (loading && !a) return <p className="text-muted">{t('loading')}</p>;
  if (error) return <Empty>{error.status === 404 ? t('not_found') : t('error_generic', { msg: error.message })}</Empty>;

  const photos = (a.attachments || []).filter((x) => x.kind === 'image');
  const docs = (a.attachments || []).filter((x) => x.kind === 'pdf');

  const remove = async () => {
    if (!window.confirm(t('confirm_delete'))) return;
    await api(`/articles/${a.id}`, { method: 'DELETE' });
    navigate(-1);
  };

  return (
    <article className="mx-auto max-w-[920px]">
      <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-muted hover:text-ink">
        <ArrowLeft size={17} />{t('back')}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CategoryTag category={a.category} />
          <StatusBadge article={a} />
        </div>
        {can('editor') && (
          <div className="flex gap-1">
            <Link to={`/articles/${a.id}/edit`} className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium hover:bg-surface-2">
              <PenLine size={16} />{t('edit')}
            </Link>
            <Button variant="danger" onClick={remove} className="px-3 py-1.5"><Trash2 size={16} />{t('delete')}</Button>
          </div>
        )}
      </div>
      <h1 className="mt-3 max-w-[22ch] font-display text-[2.1rem] font-semibold leading-[1.1] sm:text-[2.75rem]">
        {loc(a, 'title')}
      </h1>
      {loc(a, 'summary') && <p className="mt-4 max-w-[60ch] text-xl leading-relaxed text-muted">{loc(a, 'summary')}</p>}

      {a.event_date && (
        <div className="card mt-6 flex flex-wrap gap-x-8 gap-y-3 px-5 py-4 font-medium">
          <span className="inline-flex items-center gap-2"><CalendarDays size={18} />
            {fmtDate(a.event_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {a.event_location && <span className="inline-flex items-center gap-2"><MapPin size={18} />{a.event_location}</span>}
          {event && <span className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-line pt-3 font-normal"><Attendees event={event} /><RsvpButton event={event} onChange={setEvent} /></span>}
        </div>
      )}

      {a.image_url && (
        <button type="button" onClick={() => open([{ url: a.image_url, name: loc(a, 'title'), kind: 'image' }])} className="mt-8 block w-full cursor-zoom-in">
          <img src={a.image_url} alt="" className="aspect-[16/7] w-full rounded-2xl object-cover" />
        </button>
      )}

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0">
          <Markdown source={loc(a, 'body')} />
          {photos.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><Images size={19} />{t('gallery')}<span className="text-sm font-normal text-muted">{photos.length}</span></h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => open(photos, i)} className="group block w-full cursor-zoom-in overflow-hidden rounded-xl">
                      <img src={p.url} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {docs.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><FileText size={19} />{t('documents')}</h2>
              <ul className="card divide-y divide-line">
                {docs.map((d, i) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => open(docs, i)} className="group flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alert/10 text-alert"><FileText size={18} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate font-medium group-hover:text-brand">{d.name}</span>
                        <span className="block text-sm text-muted">PDF, {fileSize(d.size)}</span></span>
                      <span className="text-sm font-medium text-brand">{t('open')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="order-first text-sm text-muted md:order-last">
          {a.author && (
            <div className="flex items-center gap-3">
              <Avatar person={a.author} size={40} />
              <div>
                <p className="font-medium text-ink">{a.author.full_name}</p>
                <p>{a.author.department}</p>
              </div>
            </div>
          )}
          <p className="mt-4">{fmtDate(a.published_at)}</p>
          {a.updated_at && new Date(a.updated_at) - new Date(a.published_at) > 60000 && new Date(a.updated_at) > new Date(a.published_at) && (
            <p>{t('updated')} {fmtDate(a.updated_at)}</p>
          )}
        </aside>
      </div>
    </article>
  );
}
