import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, BriefcaseBusiness, PanelLeftClose, PanelLeftOpen, Search, CalendarDays, FileText, GraduationCap, Home, Lightbulb, LogIn, LogOut, Menu, Moon, Newspaper, Settings,
  StickyNote, Sun, UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { KNOWLEDGE_GROUP, LANGUAGES, useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { Avatar } from './ui';
import LiveSearch from './LiveSearch';
import Greeting from './Greeting';
import Notifications from './Notifications';

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('lotse-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
    setDark(next);
  };
  return [dark, toggle];
}

export function Logo({ company, compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--ink)" />
        <path d="M10 8h4.5v12H22v4H10z" fill="var(--bg)" />
        <rect x="19" y="8" width="4.5" height="4.5" fill="var(--brand)" />
      </svg>
      <span className={compact ? 'sr-only' : 'leading-tight'}>
        <span className="block font-display text-[1.125rem] font-semibold tracking-tight text-ink">Lotse</span>
        {company && <span className="block text-xs text-muted">{company}</span>}
      </span>
    </Link>
  );
}

function useNavItems(hidden = [], jobs = false) {
  const { t } = useI18n();
  const { has, user } = useAuth();
  const knowledgeOff = KNOWLEDGE_GROUP.every((c) => hidden.includes(c)); // every section of the group switched off
  return [
    { to: '/', label: t('nav_home'), icon: Home, end: true },
    { to: '/news', label: t('nav_news'), icon: Newspaper },
    { to: '/calendar', label: t('nav_calendar'), icon: CalendarDays },
    ...(knowledgeOff ? [] : [{ to: '/knowledge', label: t('nav_knowledge'), icon: BookOpen }]),
    ...(user ? [{ to: '/trainings', label: t('nav_trainings'), icon: GraduationCap }] : []),
    { to: '/ideas', label: t('nav_ideas'), icon: Lightbulb },
    { to: '/polls', label: t('nav_polls'), icon: BarChart3 },
    { to: '/people', label: t('nav_people'), icon: Users },
    ...(jobs ? [{ to: '/jobs', label: t('nav_jobs'), icon: BriefcaseBusiness }] : []),
    { to: '/documents', label: t('nav_documents'), icon: FileText },
    { to: '/board', label: t('nav_board'), icon: StickyNote },
    ...(has('trainings', 'quicklinks', 'locations', 'people', 'content_all', 'jubilees', 'mails') ? [{ to: '/admin', label: t('nav_admin'), icon: Settings }] : []),
  ];
}

function NavList({ onNavigate, collapsed = false, hidden, jobs }) {
  const items = useNavItems(hidden, jobs);
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg py-2 text-[0.9375rem] font-medium transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
              isActive ? 'bg-brand-soft font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}>
            {({ isActive }) => (<><Icon size={collapsed ? 19 : 17} strokeWidth={1.75} aria-hidden className={isActive ? 'text-brand-text' : 'text-muted'} /><span className={collapsed ? 'sr-only' : ''}>{label}</span></>)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Left navigation rail (desktop) + drawer (mobile). */
export function Sidebar({ company, open, onClose, collapsed = false, onToggle, hidden = [], jobs = false }) {
  const { t } = useI18n();
  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface py-5 lg:flex ${collapsed ? 'w-[4.5rem] px-2' : 'w-60 px-3'}`}>
        <div className={collapsed ? 'flex justify-center pb-7' : 'px-2 pb-7'}><Logo company={company} compact={collapsed} /></div>
        <nav aria-label={t('main_nav')} className="thin-scroll min-h-0 flex-1 overflow-y-auto"><NavList collapsed={collapsed} hidden={hidden} jobs={jobs} /></nav>
        <button type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? t('menu_expand') : t('menu_collapse')} title={collapsed ? t('menu_expand') : t('menu_collapse')}
          className={`mt-3 flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? 'justify-center px-2' : 'px-3'}`}>
          {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <><PanelLeftClose size={18} aria-hidden />{t('menu_collapse')}</>}
        </button>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={t('close')} className="absolute inset-0 bg-scrim/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-rule-strong bg-bg px-4 py-5">
            <div className="flex items-center justify-between px-2 pb-6">
              <Logo company={company} />
              <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-sm p-2 text-muted hover:bg-surface-2 hover:text-ink"><X size={20} /></button>
            </div>
            <nav aria-label={t('main_nav')}><NavList onNavigate={onClose} hidden={hidden} jobs={jobs} /></nav>
          </aside>
        </div>
      )}
    </>
  );
}

/** Top bar: search, language, theme, account – the account controls sit in the top-right corner. */
/** Small search window: opens from the magnifier or Ctrl+K, closes after a pick or with Esc. */
function SearchDialog({ onClose }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    input.current?.focus();
    return () => el?.close();
  }, []);
  return (
    <dialog ref={ref} aria-label={t('search')} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
      className="mx-auto mb-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-visible rounded-2xl border border-line bg-surface p-3 text-ink shadow-lg backdrop:bg-scrim/40">
      <LiveSearch inputRef={input} inline onDone={onClose} />
      <p className="mt-2 px-1 text-xs text-muted">{t('search_dialog_hint')}</p>
    </dialog>
  );
}

export default function Header({ onMenu, company }) {
  const { user, logout, setUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [dark, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const menuRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const hotkey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', hotkey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', hotkey); };
  }, []);

  const changeLang = (next) => {
    setLang(next);
    if (user) api('/auth/me', { method: 'PATCH', body: { language: next } }).then(setUser).catch(() => {});
  };

  const iconBtn = 'rounded-sm p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink active:bg-well';

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-8">
        <button type="button" className={`${iconBtn} lg:hidden`} aria-label={t('open_menu')} onClick={onMenu}><Menu size={20} /></button>

        <div className="min-w-0 flex-1"><Greeting company={company} /></div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('search')} title={`${t('search')} (Ctrl K)`}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-muted transition-colors hover:border-rule-strong hover:text-ink">
            <Search size={17} /><span className="hidden text-sm md:inline">{t('search')}</span>
            <kbd className="hidden rounded border border-line px-1.5 font-mono text-[11px] lg:inline">Ctrl K</kbd>
          </button>
          <div role="group" aria-label={t('language')} className="hidden rounded-lg border border-line bg-surface p-0.5 text-sm sm:flex">
            {LANGUAGES.map((code) => (
              <button key={code} type="button" onClick={() => changeLang(code)} aria-pressed={lang === code}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${lang === code ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}>
                {code.charAt(0).toUpperCase() + code.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => changeLang(LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length])} className={`${iconBtn} text-sm font-semibold sm:hidden`}>
            {(() => { const n = LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length]; return n.charAt(0).toUpperCase() + n.slice(1); })()}
          </button>

          <button type="button" onClick={toggleTheme} aria-label={dark ? t('theme_light') : t('theme_dark')}
            title={dark ? t('theme_light') : t('theme_dark')} className={iconBtn}>
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {!user && (
            <Link to={`/login?next=${encodeURIComponent(pathname + search)}`}
              className="ml-1 inline-flex items-center gap-2 rounded-sm border border-brand bg-brand px-4 py-2 font-display text-sm font-medium text-brand-ink transition-colors hover:bg-brand-strong">
              <LogIn size={16} />{t('sign_in')}
            </Link>
          )}
          <Notifications />
          {user && (
            <div className="relative ml-1" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-sm py-1 pl-1 pr-2 hover:bg-surface-2 active:bg-well">
                <Avatar person={user} size={32} />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-medium">{user.first_name || user.username}</span>
                  <span className="block text-xs text-muted">{t(`role_${user.role}`)}</span>
                </span>
              </button>
              {menuOpen && (
                <div role="menu" className="card absolute right-0 mt-2 w-64 overflow-hidden p-1.5">
                  <div className="flex items-center gap-3 px-2.5 py-2.5">
                    <Avatar person={user} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.full_name}</p>
                      <p className="truncate text-sm text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <Link role="menuitem" to="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-2.5 py-2 hover:bg-surface-2"><UserRound size={17} />{t('profile')}</Link>
                  {(user.role === 'admin' || (user.effective_permissions || []).includes('trainings')) && (
                    <Link role="menuitem" to="/admin?tab=trainings&new=1" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-2.5 py-2 hover:bg-surface-2"><GraduationCap size={17} />{t('tr_new')}</Link>
                  )}
                  <button role="menuitem" type="button" onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                    className="flex w-full items-center gap-3 px-2.5 py-2 text-left hover:bg-surface-2"><LogOut size={17} />{t('sign_out')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
