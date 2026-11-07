/**
 * Basic rich-text editor (TipTap) for descriptions: headings H1–H4, bold, italic, underline, strike, colour,
 * lists, quote, link, undo/redo. Stores HTML. <RichText> shows such HTML safely (or Markdown for older texts).
 */
import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import DOMPurify from 'dompurify';
import {
  Bold, Eraser, Italic, Link2, List, ListOrdered, Minus, Palette, Quote, Redo2, Strikethrough, Underline, Undo2,
} from 'lucide-react';
import { Markdown } from './ui';
import { useI18n } from '../lib/i18n';

export const TEXT_COLORS = ['#15171c', '#e0484d', '#d97706', '#13995b', '#3557f5', '#8b5cf6', '#db2777', '#687080'];

/* ---------- display ---------- */

const looksLikeHtml = (s) => /^\s*<(p|h[1-6]|ul|ol|blockquote|div|hr)[\s>]/i.test(s || '');

let hooked = false;
function sanitize(html) {
  if (!hooked) {
    // Keep only a text colour from inline styles (what the editor writes); drop everything else.
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      if (data.attrName !== 'style') return;
      const m = /(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))\s*(?:;|$)/i.exec(data.attrValue || '');
      if (m) data.attrValue = `color: ${m[1]}`; else data.keepAttr = false;
    });
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'ul', 'ol', 'li',
      'blockquote', 'a', 'hr', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'style', 'target', 'rel'],
  });
}

/** Shows a description: editor HTML (sanitised) or, for older texts, Markdown. */
export function RichText({ source }) {
  if (!source) return null;
  if (!looksLikeHtml(source)) return <Markdown source={source} />;
  // eslint-disable-next-line react/no-danger
  return <div className="prose-lotse rich" dangerouslySetInnerHTML={{ __html: sanitize(source) }} />;
}

/* ---------- editor ---------- */

const L = {
  de: { paragraph: 'Normaler Text', bold: 'Fett', italic: 'Kursiv', underline: 'Unterstrichen', strike: 'Durchgestrichen',
    color: 'Textfarbe', bullet: 'Aufzählung', ordered: 'Nummerierte Liste', quote: 'Zitat', rule: 'Trennlinie', link: 'Link',
    linkPrompt: 'Adresse (https://… oder /…)', clear: 'Formatierung entfernen', undo: 'Rückgängig', redo: 'Wiederholen', noColor: 'Standard' },
  en: { paragraph: 'Normal text', bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strikethrough',
    color: 'Text colour', bullet: 'Bullet list', ordered: 'Numbered list', quote: 'Quote', rule: 'Divider', link: 'Link',
    linkPrompt: 'Address (https://… or /…)', clear: 'Clear formatting', undo: 'Undo', redo: 'Redo', noColor: 'Default' },
};

function Btn({ active, onClick, title, children, disabled }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm ${active ? 'bg-ink text-surface' : 'text-ink hover:bg-surface-2'} disabled:opacity-30`}>
      {children}
    </button>
  );
}

/** maxHeight: the text area scrolls inside instead of growing (toolbar stays visible). */
export default function RichTextEditor({ value, onChange, minHeight = 220, maxHeight = '50vh' }) {
  const { lang } = useI18n();
  const s = L[lang] || L.de;
  const [palette, setPalette] = useState(false);
  const [linkMode, setLinkMode] = useState(null); // current href while editing a link
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https',
          isAllowedUri: (url) => /^(https?:\/\/|mailto:|tel:|\/)/i.test(url) },
      }),
      TextStyle, Color,
    ],
    content: looksLikeHtml(value) ? value : (value ? `<p>${(value || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).split('\n\n').join('</p><p>').replace(/\n/g, '<br>')}</p>` : ''),
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? '' : ed.getHTML()),
    editorProps: { attributes: { class: 'prose-lotse rich focus:outline-none', style: `min-height:${minHeight}px` } },
  });
  const st = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? {
      h: [1, 2, 3, 4].find((l) => ed.isActive('heading', { level: l })) || 0,
      bold: ed.isActive('bold'), italic: ed.isActive('italic'), underline: ed.isActive('underline'), strike: ed.isActive('strike'),
      bullet: ed.isActive('bulletList'), ordered: ed.isActive('orderedList'), quote: ed.isActive('blockquote'),
      link: ed.isActive('link'), color: ed.getAttributes('textStyle').color || null,
      undo: ed.can().undo(), redo: ed.can().redo(),
    } : null),
  });
  if (!editor || !st) return null;
  const chain = () => editor.chain().focus();
  const setLink = (href) => {
    if (!href) chain().extendMarkRange('link').unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href }).run();
    setLinkMode(null);
  };

  return (
    <div className="rounded-xl border border-line bg-surface focus-within:border-brand">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <select value={st.h} aria-label={s.paragraph} onChange={(e) => {
          const l = Number(e.target.value);
          if (l) chain().toggleHeading({ level: l }).run(); else chain().setParagraph().run();
        }} className="mr-1 h-8 rounded-md border border-line bg-surface px-2 text-sm">
          <option value={0}>{s.paragraph}</option>
          {[1, 2, 3, 4].map((l) => <option key={l} value={l}>H{l}</option>)}
        </select>
        <Btn title={s.bold} active={st.bold} onClick={() => chain().toggleBold().run()}><Bold size={16} /></Btn>
        <Btn title={s.italic} active={st.italic} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></Btn>
        <Btn title={s.underline} active={st.underline} onClick={() => chain().toggleUnderline().run()}><Underline size={16} /></Btn>
        <Btn title={s.strike} active={st.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></Btn>
        <span className="relative">
          <Btn title={s.color} active={palette} onClick={() => setPalette(!palette)}>
            <Palette size={16} /><span className="ml-1 h-3 w-3 rounded-sm border border-line" style={{ background: st.color || 'var(--ink)' }} />
          </Btn>
          {palette && (
            <span className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} aria-label={c}
                  onClick={() => { chain().setColor(c).run(); setPalette(false); }}
                  className={`h-6 w-6 rounded-sm ${st.color === c ? 'ring-2 ring-brand ring-offset-1' : ''}`} style={{ background: c }} />
              ))}
              <button type="button" onMouseDown={(e) => e.preventDefault()} title={s.noColor} aria-label={s.noColor}
                onClick={() => { chain().unsetColor().run(); setPalette(false); }}
                className="flex h-6 w-6 items-center justify-center rounded-sm border border-line text-muted"><Eraser size={13} /></button>
            </span>
          )}
        </span>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn title={s.bullet} active={st.bullet} onClick={() => chain().toggleBulletList().run()}><List size={16} /></Btn>
        <Btn title={s.ordered} active={st.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
        <Btn title={s.quote} active={st.quote} onClick={() => chain().toggleBlockquote().run()}><Quote size={16} /></Btn>
        <Btn title={s.rule} onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></Btn>
        <Btn title={s.link} active={st.link || linkMode !== null} onClick={() => setLinkMode(linkMode === null ? (editor.getAttributes('link').href || '') : null)}><Link2 size={16} /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn title={s.clear} onClick={() => chain().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></Btn>
        <Btn title={s.undo} disabled={!st.undo} onClick={() => chain().undo().run()}><Undo2 size={16} /></Btn>
        <Btn title={s.redo} disabled={!st.redo} onClick={() => chain().redo().run()}><Redo2 size={16} /></Btn>
      </div>
      {linkMode !== null && (
        <div className="flex gap-2 border-b border-line px-2 py-1.5">
          <input autoFocus value={linkMode} onChange={(e) => setLinkMode(e.target.value)} placeholder={s.linkPrompt}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setLink(linkMode.trim()); } if (e.key === 'Escape') setLinkMode(null); }}
            className="h-8 flex-1 rounded-md border border-line bg-surface px-2 text-sm" />
          <button type="button" onClick={() => setLink(linkMode.trim())} className="rounded-md bg-ink px-3 text-sm text-surface">OK</button>
        </div>
      )}
      <EditorContent editor={editor} className="thin-scroll overflow-y-auto px-4 py-3" style={{ maxHeight }} />
    </div>
  );
}
