import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header, { Sidebar } from './components/Header';
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

function Guard({ role, children }) {
  const { user, can } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  return can(role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const [config, setConfig] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    api('/auth/config').then(setConfig).catch(() => setConfig({ public_read: false }));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (!ready || !config) return null;
  // Everyone may read when public_read is on; signing in is only needed to post or edit.
  if (pathname === '/login' || (!user && !config.public_read)) return <Login config={config} />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2">
        {t('skip')}
      </a>
      <Sidebar company={config?.company_name} open={drawer} onClose={() => setDrawer(false)} />
      <div className="lg:pl-60">
      <Header onMenu={() => setDrawer(true)} />
      <main id="main" className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 sm:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<Articles key="news" group={NEWS_GROUP} titleKey="nav_news" />} />
          <Route path="/knowledge" element={<Articles key="knowledge" group={KNOWLEDGE_GROUP} titleKey="nav_knowledge" />} />
          <Route path="/articles/new" element={<Guard role="editor"><ArticleEdit /></Guard>} />
          <Route path="/articles/:id" element={<ArticleView />} />
          <Route path="/articles/:id/edit" element={<Guard role="editor"><ArticleEdit /></Guard>} />
          <Route path="/board" element={<Board />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/calendar" element={<Events />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/people" element={<People />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Guard role="user"><Profile /></Guard>} />
          <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
          <Route path="*" element={<Empty>{t('not_found')}</Empty>} />
        </Routes>
      </main>
      </div>
    </>
  );
}
