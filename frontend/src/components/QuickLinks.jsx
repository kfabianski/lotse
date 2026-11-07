/** Quick-access tiles on the home page: company tools, shared mailboxes, phone numbers (managed by admins). */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Building2, CalendarDays, Calculator, Car, Check, Clock, Copy, Euro, FileText, Globe, LifeBuoy, Link2, Mail,
  MessageSquare, Monitor, Package, Phone, Printer, Receipt, ShieldCheck, ShoppingCart, Truck, Users, Wifi, Wrench,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFetch } from '../lib/useFetch';

export const QUICK_ICONS = {
  link: Link2, clock: Clock, mail: Mail, receipt: Receipt, calculator: Calculator, lifebuoy: LifeBuoy, monitor: Monitor,
  truck: Truck, package: Package, users: Users, calendar: CalendarDays, file: FileText, globe: Globe, phone: Phone,
  printer: Printer, wifi: Wifi, cart: ShoppingCart, building: Building2, book: BookOpen, wrench: Wrench, euro: Euro,
  shield: ShieldCheck, message: MessageSquare, car: Car,
};

const mailOf = (url) => (url.startsWith('mailto:') ? url.slice(7) : null);

export function QuickLinkTile({ link }) {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const Icon = QUICK_ICONS[link.icon] || Link2;
  const title = (lang === 'en' && link.title_en) || link.title_de;
  const subtitle = (lang === 'en' && link.subtitle_en) || link.subtitle_de;
  const mail = mailOf(link.url);
  const external = /^https?:/i.test(link.url);
  const body = (
    <>
      <Icon size={19} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted group-hover:text-ink" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display font-semibold leading-tight text-ink">{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
      </span>
    </>
  );
  const cls = 'group flex min-w-0 flex-1 items-center gap-3 py-3 pr-2';
  const copy = async () => {
    try { await navigator.clipboard.writeText(mail); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* not allowed */ }
  };
  return (
    <li className="flex items-center border-b border-line hover:bg-surface-2">
      {link.url.startsWith('/')
        ? <Link to={link.url} className={cls}>{body}</Link>
        : <a href={link.url} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>}
      {mail && (
        <button type="button" onClick={copy} title={copied ? t('quick_copied') : t('quick_copy')} aria-label={t('quick_copy')}
          className="rounded-sm p-2 text-muted hover:bg-well hover:text-ink">
          {copied ? <Check size={16} className="text-safe" /> : <Copy size={16} />}
        </button>
      )}
    </li>
  );
}

export default function QuickLinks() {
  const { t } = useI18n();
  const { data } = useFetch('/quicklinks');
  if (!data?.length) return null;
  return (
    <section aria-label={t('quick_title')}>
      <ul className="grid gap-x-8 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {data.map((l) => <QuickLinkTile key={l.id} link={l} />)}
      </ul>
    </section>
  );
}
