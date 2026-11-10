/** Company social media: links (Facebook, LinkedIn, Instagram) set in Verwaltung -> Einstellungen, shown as a
 * home block and in the footer. */
import { ExternalLink, Facebook, Instagram, Linkedin } from 'lucide-react';
import { SectionHeading } from './ui';
import { useI18n } from '../lib/i18n';

const NETWORKS = [
  { key: 'facebook', name: 'Facebook', Icon: Facebook, color: '#1877F2' },
  { key: 'linkedin', name: 'LinkedIn', Icon: Linkedin, color: '#0A66C2' },
  { key: 'instagram', name: 'Instagram', Icon: Instagram, color: '#E4405F' },
];
export function socialLinks(config) {
  return NETWORKS.filter((n) => config?.[`social_${n.key}`]).map((n) => ({ ...n, url: config[`social_${n.key}`] }));
}

export function SocialBlock({ config }) {
  const { t } = useI18n();
  const links = socialLinks(config);
  return (
    <section>
      <SectionHeading>{t('social_follow')}</SectionHeading>
      <div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {links.map(({ key, name, Icon, color, url }) => (
            <li key={key}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="card flex items-center gap-3 p-4 transition-colors hover:border-brand">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: color }}><Icon size={20} /></span>
                <span className="min-w-0 flex-1"><span className="block font-medium text-ink">{name}</span>
                  <span className="block truncate text-sm text-muted">{t('social_open', { name })}</span></span>
                <ExternalLink size={16} className="shrink-0 text-muted" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SocialIcons({ config }) {
  const links = socialLinks(config);
  if (!links.length) return null;
  return (
    <span className="flex gap-3">
      {links.map(({ key, name, Icon, url }) => (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="hover:text-ink"><Icon size={18} /></a>
      ))}
    </span>
  );
}
