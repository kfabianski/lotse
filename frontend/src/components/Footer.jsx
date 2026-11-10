import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { SocialIcons } from './Social';

/** Page footer: copyright line, the admin's own text (e.g. address), a few useful links. */
export default function Footer({ company, text, config }) {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto mt-8 max-w-[1240px] px-4 pb-8 sm:px-8">
      <div className="flex flex-col gap-3 border-t border-line pt-5 text-sm text-muted md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p><span className="font-medium text-ink">© {year} {company}</span><span className="ml-3">{t('footer_product')}</span></p>
          {text && <p className="max-w-[70ch]">{text}</p>}
        </div>
        <nav aria-label={t('footer_nav')} className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/documents" className="hover:text-ink hover:underline">{t('nav_documents')}</Link>
          <Link to="/people" className="hover:text-ink hover:underline">{t('nav_people')}</Link>
          <Link to="/ideas" className="hover:text-ink hover:underline">{t('nav_ideas')}</Link>
          <Link to="/profile" className="hover:text-ink hover:underline">{t('profile')}</Link>
          <SocialIcons config={config} />
        </nav>
      </div>
    </footer>
  );
}
