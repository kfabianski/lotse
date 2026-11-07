import { useEffect, useRef, useState } from 'react';
import { Bold, Eye, Heading2, Italic, Link2, List, ListOrdered, RemoveFormatting, RotateCcw, Send, Underline } from 'lucide-react';
import { Button, Field, Modal, inputClass } from './ui';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';

const KINDS = ['article', 'idea'];

/** Small WYSIWYG editor (contentEditable) – bold, italic, heading, lists, links. The server cleans the HTML. */
function RichEditor({ value, onChange, editorRef, onFocus }) {
  const { t } = useI18n();
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value, editorRef]);
  const cmd = (name, arg) => {
    editorRef.current?.focus();
    document.execCommand(name, false, arg);
    onChange(editorRef.current.innerHTML);
  };
  const link = () => {
    const url = window.prompt(t('mt_link_prompt'), 'https://'); // eslint-disable-line no-alert
    if (url) cmd('createLink', url.trim());
  };
  const tools = [
    [Bold, t('mt_bold'), () => cmd('bold')], [Italic, t('mt_italic'), () => cmd('italic')],
    [Underline, t('mt_underline'), () => cmd('underline')], [Heading2, t('mt_heading'), () => cmd('formatBlock', 'h2')],
    [List, t('mt_list'), () => cmd('insertUnorderedList')], [ListOrdered, t('mt_olist'), () => cmd('insertOrderedList')],
    [Link2, t('mt_link'), link], [RemoveFormatting, t('mt_clear'), () => { cmd('removeFormat'); cmd('formatBlock', 'p'); }],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-line focus-within:border-brand">
      <div role="toolbar" className="flex flex-wrap gap-0.5 border-b border-line bg-surface-2 p-1">
        {tools.map(([Icon, label, fn]) => (
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={fn}
            className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-ink"><Icon size={16} /></button>
        ))}
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
        onFocus={onFocus} onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="mail-editor min-h-[14rem] bg-surface px-4 py-3 text-ink focus:outline-none" />
    </div>
  );
}

export default function MailTemplates({ onClose }) {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [kind, setKind] = useState('article');
  const [tpl, setTpl] = useState(null);
  const [preview, setPreview] = useState(null);
  const [to, setTo] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const editorRef = useRef(null);
  const subjectRef = useRef(null);
  const target = useRef('body'); // where a shortcode goes: last focused field

  useEffect(() => {
    api('/admin/settings/mail-templates').then((d) => {
      setData(d);
      setTpl(Object.fromEntries(KINDS.map((k) => [k, { subject: d.templates[k].subject, body: d.templates[k].body }])));
    });
  }, []);

  const cur = tpl?.[kind];
  const set = (patch) => { setTpl((x) => ({ ...x, [kind]: { ...x[kind], ...patch } })); setPreview(null); setStatus(null); };

  const insert = (code) => {
    const text = `{${code}}`;
    if (target.current === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const [a, b] = [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length];
      set({ subject: el.value.slice(0, a) + text + el.value.slice(b) });
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + text.length, a + text.length); });
      return;
    }
    const ed = editorRef.current;
    ed.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount || !ed.contains(sel.anchorNode)) { // no caret in the editor: append at the end
      const range = document.createRange();
      range.selectNodeContents(ed);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand('insertText', false, text);
    set({ body: ed.innerHTML });
  };

  const showPreview = async () => {
    setPreview(await api('/admin/settings/mail-templates/preview', { method: 'POST', body: { kind, ...cur } }));
  };
  const save = async () => {
    setBusy(true);
    try {
      const d = await api('/admin/settings/mail-templates', { method: 'PUT', body: tpl });
      setData(d);
      setTpl(Object.fromEntries(KINDS.map((k) => [k, { subject: d.templates[k].subject, body: d.templates[k].body }])));
      setStatus({ ok: true, text: t('mt_saved') });
    } catch (err) { setStatus({ ok: false, text: err.message }); } finally { setBusy(false); }
  };
  const sendTest = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/settings/mail-templates/test', { method: 'POST', body: { kind, ...cur, to } });
      setStatus(r.ok ? { ok: true, text: t('nt_test_ok') } : { ok: false, text: `${t('nt_test_failed')}: ${r.error}` });
    } catch (err) { setStatus({ ok: false, text: err.message }); } finally { setBusy(false); }
  };

  return (
    <Modal title={t('mt_title')} onClose={onClose} size="full">
      {!cur ? <p className="text-muted">{t('loading')}</p> : (
        <div className="space-y-5">
          <div role="tablist" className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setPreview(null); setStatus(null); }}
                className={`rounded-full border px-4 py-1.5 font-medium ${kind === k ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'}`}>
                {t(`mt_kind_${k}`)}{data.templates[k].custom && <span className="ml-1.5 text-xs opacity-70">· {t('mt_custom')}</span>}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted">{t(`mt_kind_${kind}_hint`)}</p>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="space-y-4">
              <Field label={t('mt_subject')}>
                <input ref={subjectRef} className={inputClass} value={cur.subject} maxLength={300}
                  onFocus={() => { target.current = 'subject'; }} onChange={(e) => set({ subject: e.target.value })} />
              </Field>
              <div>
                <span className="mb-1 block text-sm font-medium text-muted">{t('mt_body')}</span>
                <RichEditor key={kind} value={cur.body} editorRef={editorRef} onFocus={() => { target.current = 'body'; }} onChange={(body) => set({ body })} />
                <p className="mt-1 text-xs text-muted">{t('mt_footer_note')}</p>
              </div>
            </div>
            <aside>
              <p className="text-sm font-medium">{t('mt_shortcodes')}</p>
              <p className="mb-2 text-xs text-muted">{t('mt_shortcodes_hint')}</p>
              <ul className="space-y-1">
                {Object.entries(data.shortcodes[kind]).map(([code, [de, en]]) => (
                  <li key={code}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(code)}
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left hover:border-brand">
                      <code className="text-sm font-semibold text-brand">{`{${code}}`}</code>
                      <span className="block text-xs text-muted">{lang === 'en' ? en : de}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {preview && (
            <div className="rounded-2xl border border-line bg-bg p-4">
              <p className="text-sm text-muted">{t('mt_subject')}: <strong className="text-ink">{preview.subject}</strong></p>
              <iframe title={t('hl_preview')} sandbox="" srcDoc={preview.html} className="mt-3 h-80 w-full rounded-xl border border-line bg-white" />
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
            <Button onClick={save} disabled={busy}>{t('save')}</Button>
            <Button variant="outline" onClick={showPreview}><Eye size={16} />{t('hl_preview')}</Button>
            <Button variant="ghost" onClick={() => set({ ...data.defaults[kind] })}><RotateCcw size={16} />{t('mt_reset')}</Button>
            <span className="flex-1" />
            <input type="email" className={`${inputClass} w-56`} placeholder={t('nt_test_to')} value={to} onChange={(e) => setTo(e.target.value)} />
            <Button variant="outline" disabled={busy || !to} onClick={sendTest}><Send size={16} />{t('mt_send_test')}</Button>
          </div>
          {status && <p role="status" className={`text-sm ${status.ok ? 'text-safe' : 'text-alert'}`}>{status.text}</p>}
        </div>
      )}
    </Modal>
  );
}
