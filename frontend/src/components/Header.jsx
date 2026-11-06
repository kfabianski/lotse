import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen, CalendarDays, FileText, Home, Lightbulb, LogIn, LogOut, Menu, Moon, Newspaper, Search, Settings, StickyNote,
  Sun, UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { Avatar } from './ui';

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

export function Logo({ company }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        <path d="M10 8h4.5v12H22v4H10z" fill="#fff" />
        <circle cx="21" cy="11" r="3" fill="#fff" opacity=".55" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[1.05rem] font-semibold tracking-tight">Lotse</span>
        {company && <span className="block text-xs text-muted">{company}</span>}
      </span>
    </Link>
  );
}

function useNavItems() {
  const { t } = useI18n();
  const { can } = useAuth();
  return [
    { to: '/', label: t('nav_home'), icon: Home, end: true },
    { to: '/news', label: t('nav_news'), icon: Newspaper },
    { to: '/calendar', label: t('nav_calendar'), icon: CalendarDays },
    { to: '/knowledge', label: t('nav_knowledge'), icon: BookOpen },
    { to: '/documents', label: t('nav_documents'), icon: FileText },
    { to: '/board', label: t('nav_board'), icon: StickyNote },
    { to: '/ideas', label: t('nav_ideas'), icon: Lightbulb },
    { to: '/people', label: t('nav_people'), icon: Users },
    ...(can('admin') ? [{ to: '/admin', label: t('nav_admin'), icon: Settings }] : []),
  ];
}

function NavList({ onNavigate }) {
  const items = useNavItems();
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-[0.95rem] font-medium transition-colors ${
              isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}>
            <Icon size={18} strokeWidth={2} />{label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Left navigation rail (desktop) + drawer (mobile). */
export function Sidebar({ company, open, onClose }) {
  const { t } = useI18n();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <div className="px-2 pb-6"><Logo company={company} /></div>
        <nav aria-label={t('main_nav')}><NavList /></nav>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label={t('close')} className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface px-3 py-4 shadow-2xl">
            <div className="flex items-center justify-between px-2 pb-6">
              <Logo company={company} />
              <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-lg p-2 text-muted hover:bg-surface-2"><X size={20} /></button>
            </div>
            <nav aria-label={t('main_nav')}><NavList onNavigate={onClose} /></nav>
          </aside>
        </div>
      )}
    </>
  );
}

/** Top bar: search, language, theme, account – the account controls sit in the top-right corner. */
export default function Header({ onMenu }) {
  const { user, logout, setUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [dark, toggleTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const hotkey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', hotkey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', hotkey); };
  }, []);

  const changeLang = (next) => {
    setLang(next);
    if (user) api('/auth/me', { method: 'PATCH', body: { language: next } }).then(setUser).catch(() => {});
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const iconBtn = 'rounded-xl p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink';

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-8">
        <button type="button" className={`${iconBtn} lg:hidden`} aria-label={t('open_menu')} onClick={onMenu}><Menu size={20} /></button>

        <form onSubmit={submitSearch} role="search" className="min-w-0 flex-1">
          <label className="relative block max-w-md">
            <span className="sr-only">{t('search')}</span>
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_placeholder')}
              className="h-10 w-full rounded-xl border border-line bg-surface pl-10 pr-14 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted sm:block">Ctrl K</kbd>
          </label>
        </form>

        <div className="flex items-center gap-1">
          <div role="group" aria-label={t('language')} className="hidden rounded-xl border border-line bg-surface p-0.5 text-sm sm:flex">
            {['de', 'en'].map((code) => (
              <button key={code} type="button" onClick={() => changeLang(code)} aria-pressed={lang === code}
                className={`rounded-[10px] px-2.5 py-1 font-medium transition-colors ${lang === code ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => changeLang(lang === 'de' ? 'en' : 'de')} className={`${iconBtn} text-sm font-semibold sm:hidden`}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>

          <button type="button" onClick={toggleTheme} aria-label={dark ? t('theme_light') : t('theme_dark')}
            title={dark ? t('theme_light') : t('theme_dark')} className={iconBtn}>
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {!user && (
            <Link to={`/login?next=${encodeURIComponent(pathname + search)}`}
              className="ml-1 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90">
              <LogIn size={16} />{t('sign_in')}
            </Link>
          )}
          {user && (
            <div className="relative ml-1" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-surface-2">
                <Avatar person={user} size={32} />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-medium">{user.first_name || user.username}</span>
                  <span className="block text-xs text-muted">{t(`role_${user.role}`)}</span>
                </span>
              </button>
              {menuOpen && (
                <div role="menu" className="card absolute right-0 mt-2 w-64 overflow-hidden p-1.5 shadow-xl">
                  <div className="flex items-center gap-3 px-2.5 py-2.5">
                    <Avatar person={user} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.full_name}</p>
                      <p className="truncate text-sm text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <Link role="menuitem" to="/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2"><UserRound size={17} />{t('profile')}</Link>
                  <button role="menuitem" type="button" onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2"><LogOut size={17} />{t('sign_out')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
