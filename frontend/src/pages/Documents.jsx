import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { CategoryTag, Empty, inputClass } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { useViewer } from '../lib/viewer';

export const fileSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const docTitle = (name) => name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');

/** The document as a printed sheet: its title set in the head face, the format in figures. Same size for every tile. */
function DocCover({ doc }) {
  return (
    <div className="flex aspect-[4/3] flex-col justify-between bg-well p-5">
      <p className="line-clamp-4 font-display text-[1.25rem] font-semibold leading-tight text-ink">{docTitle(doc.name)}</p>
      <span className="font-mono text-sm text-muted">PDF{doc.size ? `, ${fileSize(doc.size)}` : ''}</span>
    </div>
  );
}

/** Company document library: every PDF attached to a published article, opened in the in-app viewer. */
export default function Documents() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const { data } = useFetch('/documents', { params: { q } }, q);
  const { open } = useViewer();
  const docs = data || [];
  const items = docs.map((x) => ({ url: x.url, name: x.name, kind: 'pdf' }));

  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight">{t('docs_title')}</h1>
      <p className="mt-1 text-muted">{t('docs_intro')}</p>
      <label className="relative mt-6 block max-w-xl">
        <span className="sr-only">{t('search')}</span>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('docs_search')} className={`${inputClass} h-11 pl-11`} />
      </label>

      <div className="mt-8">
        {data && !docs.length && <Empty>{t('no_results')}</Empty>}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {docs.map((d, i) => (
            <li key={d.id} className="card card-hover group flex h-full flex-col overflow-hidden">
              <button type="button" onClick={() => open(items, i)} className="flex flex-1 flex-col text-left" aria-label={`${t('open')}: ${d.name}`}>
                <DocCover doc={d} />
                <span className="flex flex-1 flex-col p-5">
                  <CategoryTag category={d.category} />
                  <span className="mt-1.5 line-clamp-2 font-semibold leading-snug tracking-tight group-hover:text-brand-text">{docTitle(d.name)}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-3 text-sm text-muted"><FileText size={14} />PDF, {fileSize(d.size)}</span>
                </span>
              </button>
              <Link to={`/articles/${d.article_id}`} className="truncate border-t border-line px-5 py-3 text-sm text-muted hover:text-brand-text">
                {t('docs_from_article')}: {lang === 'en' && d.article_title_en ? d.article_title_en : d.article_title_de}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
