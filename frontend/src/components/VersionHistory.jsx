/** Version history of an article: who changed what and when, with a comparison to the previous version. */
import { useState } from 'react';
import { FileMinus, FilePlus, History, RotateCcw } from 'lucide-react';
import { Button, Modal } from './ui';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';

/** Line diff (longest common subsequence) – small texts only, which articles are. */
function diffLines(a, b) {
  const x = (a || '').split('\n');
  const y = (b || '').split('\n');
  const n = x.length;
  const m = y.length;
  if (n * m > 400000) return [...x.map((l) => ['-', l]), ...y.map((l) => ['+', l])];
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push(['=', x[i]]); i += 1; j += 1; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', x[i]]); i += 1; } else { out.push(['+', y[j]]); j += 1; }
  }
  while (i < n) { out.push(['-', x[i]]); i += 1; }
  while (j < m) { out.push(['+', y[j]]); j += 1; }
  return out;
}

function TextDiff({ label, before, after }) {
  if ((before || '') === (after || '')) return null;
  const rows = diffLines(before, after);
  // Show changed lines with one line of context around them.
  const keep = rows.map((r, i) => r[0] !== '=' || rows[i - 1]?.[0] !== '=' && rows[i - 1] || rows[i + 1]?.[0] !== '=' && rows[i + 1]);
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <pre className="thin-scroll max-h-80 overflow-auto rounded-lg border border-line bg-bg p-3 text-[0.8rem] leading-relaxed whitespace-pre-wrap">
        {rows.map((r, i) => (keep[i] ? (
          <div key={i} className={r[0] === '+' ? 'bg-safe/15 text-ink' : r[0] === '-' ? 'bg-alert/15 text-muted line-through' : 'text-muted'}>
            <span className="mr-2 select-none opacity-60">{r[0] === '=' ? ' ' : r[0]}</span>{r[1] || ' '}
          </div>
        ) : (rows[i - 1] && keep[i - 1] ? <div key={i} className="select-none text-muted">…</div> : null)))}
      </pre>
    </div>
  );
}

function Compare({ articleId, number, canRestore, onClose, onRestored }) {
  const { t, fmtDate, lang } = useI18n();
  const now = useFetch(`/articles/${articleId}/revisions/${number}`);
  const prev = useFetch(number > 1 ? `/articles/${articleId}/revisions/${number - 1}` : null, undefined, `rev-${articleId}-${number - 1}`);
  const [error, setError] = useState('');
  const a = now.data;
  const b = number > 1 ? prev.data : null;
  const restore = async () => {
    if (!window.confirm(t('rev_restore_confirm', { n: number }))) return;
    try { await api(`/articles/${articleId}/revisions/${number}/restore`, { method: 'POST' }); onRestored(); } catch (e) { setError(e.message); }
  };
  const docs = (r) => (r?.attachments || []).filter((x) => x.kind === 'pdf');
  const added = a && b ? docs(a).filter((d) => !docs(b).some((o) => o.url === d.url)) : [];
  const removed = a && b ? docs(b).filter((d) => !docs(a).some((o) => o.url === d.url)) : [];
  const fields = [['title', t('rev_field_title')], ['summary', t('rev_field_summary')], ['body', t('rev_field_body')]];
  const langs = lang === 'en' ? ['en', 'de'] : ['de', 'en'];
  const changed = a && b && (added.length || removed.length || a.category !== b.category
    || fields.some(([f]) => langs.some((l) => a[`${f}_${l}`] !== b[`${f}_${l}`])));

  return (
    <Modal title={t('rev_version', { n: number })} size="xl" onClose={onClose}>
      {!a || (number > 1 && !b) ? <p className="text-muted">{t('loading')}</p> : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {fmtDate(a.created_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {a.editor_name && ` · ${a.editor_name}`}{a.note && ` · „${a.note}“`}
          </p>
          {number === 1 && <p className="text-sm">{t('rev_first')}</p>}
          {b && <p className="text-sm font-medium">{t('rev_compare_to', { n: number - 1 })}</p>}
          {b && !changed && <p className="text-sm text-muted">{t('rev_no_changes')}</p>}
          {b && a.category !== b.category && <p className="text-sm">{t('rev_field_category')}: <s className="text-muted">{t(`cat_${b.category}`)}</s> → {t(`cat_${a.category}`)}</p>}
          {b && langs.map((l) => fields.map(([f, label]) => (
            <TextDiff key={`${f}_${l}`} label={`${label} (${l.toUpperCase()})`} before={b[`${f}_${l}`]} after={a[`${f}_${l}`]} />
          )))}
          {(added.length > 0 || removed.length > 0) && (
            <ul className="space-y-1 text-sm">
              {added.map((d) => <li key={d.url} className="flex items-center gap-2 text-safe"><FilePlus size={15} />{t('rev_docs_added')}: {d.name}</li>)}
              {removed.map((d) => <li key={d.url} className="flex items-center gap-2 text-alert"><FileMinus size={15} />{t('rev_docs_removed')}: {d.name}</li>)}
            </ul>
          )}
          {error && <p className="text-sm text-alert">{error}</p>}
          {canRestore && (
            <div className="flex justify-end border-t border-line pt-4">
              <Button variant="outline" onClick={restore}><RotateCcw size={16} />{t('rev_restore')}</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function VersionHistory({ articleId, canRestore = false, onRestored }) {
  const { t, fmtDate } = useI18n();
  const { data, reload } = useFetch(`/articles/${articleId}/revisions`, undefined, `revs-${articleId}`);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  if (!data?.length) return null;
  const shown = all ? data : data.slice(0, 5);
  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight"><History size={19} />{t('rev_title')}<span className="text-sm font-normal text-muted">{data.length}</span></h2>
      <ol className="card divide-y divide-line">
        {shown.map((r, i) => (
          <li key={r.number}>
            <button type="button" onClick={() => setOpen(r.number)} className="group flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-left text-sm">
              <span className="font-semibold">{t('rev_version', { n: r.number })}</span>
              {i === 0 && <span className="rounded-sm bg-brand-soft px-2 text-xs font-medium text-brand-text">{t('rev_current')}</span>}
              <span className="text-muted">{fmtDate(r.created_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {r.editor_name && <span className="text-muted">· {r.editor_name}</span>}
              {r.note && <span className="w-full truncate text-muted sm:w-auto sm:flex-1">„{r.note}“</span>}
              <span className="ml-auto text-xs font-medium text-brand-text opacity-0 group-hover:opacity-100">{t('rev_compare')}</span>
            </button>
          </li>
        ))}
      </ol>
      {data.length > 5 && !all && <button type="button" onClick={() => setAll(true)} className="mt-2 text-sm font-medium text-brand-text hover:underline">{t('show_all')}</button>}
      {open && <Compare articleId={articleId} number={open} canRestore={canRestore} onClose={() => setOpen(null)} onRestored={() => { setOpen(null); reload(); onRestored(); }} />}
    </section>
  );
}
