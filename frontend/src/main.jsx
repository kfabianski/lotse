import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { BriefingProvider } from './lib/briefing';
import { I18nProvider } from './lib/i18n';
import { ViewerProvider } from './lib/viewer';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <BriefingProvider>
            <ViewerProvider>
              <App />
            </ViewerProvider>
          </BriefingProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
