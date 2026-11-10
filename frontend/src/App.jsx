import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import Header, { Sidebar } from './components/Header';
import Footer from './components/Footer';
import { applyScheme } from './lib/scheme';
import { Empty } from './components/ui';
import { useAuth } from './lib/auth';
import { KNOWLEDGE_GROUP, NEWS_GROUP, useI18n } from './lib/i18n';
import { api } from './lib/api';
import Home from './pages/Home';
import Login from './pages/Login';
import Articles from './pages/Articles';
import ArticleView from './pages/ArticleView';
import ArticleEdit from './pages/ArticleEdit';
import Board from './pages/Board';
import People from './pages/People';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Search from './pages/Search';
import Ideas from './pages/Ideas';
import Events from './pages/Events';
import Documents from './pages/Documents';
import Trainings, { TrainingView } from './pages/Trainings';
import Polls from './pages/Polls';

function Guard({ role, perm, children }) {
  const { user, can, has } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  const ok = perm ? has(...perm.split(',')) : can(role);
  return ok ? children : <Navigate to="/" replace />;
}

/** New page: start at the top. Browser back/forward: return to the remembered position - retried for a moment,
 * because the page content is loaded asynchronously and is not tall enough right away. */
function useScrollMemory() {
  const location = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);
  useEffect(() => {
    const key = `lotse-scroll:${location.key}`;
    let saved = null;
    try { saved = Number(sessionStorage.getItem(key)); } catch { /* ignore */ }
    let frame = 0;
    let tries = 0;
    if (navType === 'POP' && saved) {
      const restore = () => {
        window.scrollTo(0, saved);
        tries += 1;
        if (Math.abs(window.scrollY - saved) > 2 && tries < 120) frame = requestAnimationFrame(restore);
      };
      restore();
    } else if (!location.hash) {
      window.scrollTo(0, 0);
    }
    let timer = 0;
    const remember = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { try { sessionStorage.setItem(key, String(Math.round(window.scrollY))); } catch { /* ignore */ } }, 80);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener('scroll', remember); };
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function App() {
  const { user, ready } = useAuth();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('lotse-menu') === 'small'; } catch { return false; } });
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem('lotse-menu', c ? 'wide' : 'small'); } catch { /* ignore */ } return !c; });
  const { t } = useI18n();
  const [config, setConfig] = useState(null);
  const [ssoChecked, setSsoChecked] = useState(false);
  const { ssoLogin } = useAuth();
  useEffect(() => {
    // Windows sign-in, checked on every page open: the person signed in to this PC is looked up in
    // LDAP/AD and signed in without a password. A stored session of someone else (shared PC) is replaced.
    // Skipped after an explicit sign-out in this tab and for local accounts that signed in with a password.
    if (!ready || !config) return;
    let off = false;
    try { off = sessionStorage.getItem('lotse-sso-off') === '1'; } catch { /* ignore */ }
    if (!config.sso_enabled || off || user?.auth_source === 'local') { setSsoChecked(true); return; }
    ssoLogin().catch(() => {}).finally(() => setSsoChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, ready]);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    api('/auth/config').then(setConfig).catch(() => setConfig({ public_read: false }));
  }, []);
  useEffect(() => { if (config) applyScheme(user?.color_scheme || config.color_scheme); }, [config, user?.color_scheme]);
  useScrollMemory();

  if (!ready || !config || !ssoChecked) return null;
  // Everyone may read when public_read is on; signing in is only needed to post or edit.
  if (pathname === '/login' || (!user && !config.public_read)) return <Login config={config} />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2">
        {t('skip')}
      </a>
      <Sidebar company={config?.company_name} open={drawer} onClose={() => setDrawer(false)} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className={collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-60'}>
      <Header onMenu={() => setDrawer(true)} company={config?.company_name} />
      <main id="main" className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 sm:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<Articles key="news" group={NEWS_GROUP} titleKey="nav_news" />} />
          <Route path="/knowledge" element={<Articles key="knowledge" group={KNOWLEDGE_GROUP} titleKey="nav_knowledge" />} />
          <Route path="/articles/new" element={<Guard perm="content_own,content_all"><ArticleEdit /></Guard>} />
          <Route path="/articles/:id" element={<ArticleView />} />
          <Route path="/articles/:id/edit" element={<Guard perm="content_own,content_all"><ArticleEdit /></Guard>} />
          <Route path="/board" element={<Board />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/polls" element={<Polls />} />
          <Route path="/calendar" element={<Events />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/people" element={<People />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Guard role="user"><Profile /></Guard>} />
          <Route path="/trainings" element={<Guard role="user"><Trainings /></Guard>} />
          <Route path="/trainings/:id" element={<Guard role="user"><TrainingView /></Guard>} />
          <Route path="/admin" element={<Guard perm="trainings,quicklinks,locations,people,content_all,mails"><Admin /></Guard>} />
          <Route path="*" element={<Empty>{t('not_found')}</Empty>} />
        </Routes>
      </main>
      <Footer company={config?.company_name} text={config?.footer_text} config={config} />
      </div>
    </>
  );
}
