import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/toast';
import { useConfirm } from './ui/confirm-dialog';
import {
  Sun, Moon, LogOut, BookOpen, CalendarDays, Menu, X,
  ListChecks, Upload, Inbox, Newspaper, History, Users, User,
} from 'lucide-react';
import { EgyptFlag, USAFlag } from './Flags';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const toggleLang = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', next);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      type: 'logout',
      title: t('confirm_logout_title'),
      message: t('confirm_logout_msg'),
      confirmLabel: t('logout'),
      cancelLabel: t('cancel'),
    });
    if (!ok) return;
    const name = user?.username;
    logout();
    toast({ title: t('toast_logout', { name }), description: t('toast_logout_desc') });
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin/tasks',       label: t('task_list'),   icon: <ListChecks size={19} /> },
    { to: '/admin/upload',      label: t('upload_task'), icon: <Upload size={19} /> },
    { to: '/admin/submissions', label: t('submissions'), icon: <Inbox size={19} /> },
    { to: '/admin/users',       label: t('users_title'), icon: <Users size={19} /> },
    { to: '/admin/posts',       label: t('nav_feed'),    icon: <Newspaper size={19} /> },
  ];

  const userLinks = [
    { to: '/user/calendar', label: t('nav_calendar'), icon: <CalendarDays size={19} /> },
    { to: '/user/tasks',    label: t('my_tasks'),     icon: <BookOpen size={19} /> },
    { to: '/user/feed',     label: t('nav_feed'),     icon: <Newspaper size={19} /> },
    { to: '/user/history',  label: t('history'),      icon: <History size={19} /> },
  ];

  const links = user?.role === 'admin' ? adminLinks : userLinks;
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        {/* ── Main bar ── */}
        <div className="h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <Link
            to={user?.role === 'admin' ? '/admin/tasks' : '/user/tasks'}
            className="flex items-center gap-2 font-bold text-primary tracking-wide shrink-0"
          >
            <BookOpen size={18} />
            <span className="hidden sm:inline text-sm">{t('app_title')}</span>
          </Link>

          {/* Desktop nav links — icon stacked over label */}
          {user && (
            <nav className="hidden md:flex items-stretch gap-1 flex-1 justify-center">
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex flex-col items-center justify-center gap-1 px-3 pt-1.5 pb-1 border-b-2 transition-colors ${
                    isActive(link.to)
                      ? 'text-primary border-primary font-semibold'
                      : 'text-muted-foreground border-transparent hover:text-primary'
                  }`}
                >
                  {link.icon}
                  <span className="text-[11px] leading-none whitespace-nowrap">{link.label}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {user && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-foreground max-w-[150px] me-1">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User size={15} />
                </span>
                <span className="truncate">{user.username}</span>
              </span>
            )}
            <button
              onClick={toggleLang}
              title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              aria-label={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              className="flex items-center p-1 rounded border border-border hover:bg-accent transition-colors overflow-hidden leading-none"
            >
              {i18n.language === 'ar' ? <USAFlag className="rounded-[2px]" /> : <EgyptFlag className="rounded-[2px]" />}
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground hidden sm:flex"
                title={t('logout')}
              >
                <LogOut size={15} />
              </button>
            )}
            {/* Hamburger — mobile only */}
            {user && (
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded hover:bg-accent transition-colors text-foreground md:hidden"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-border pb-3 pt-2 space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-2.5 mb-1 border-b border-border">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === 'admin' ? t('admin_panel') : t('my_tasks')}
                </p>
              </div>
            </div>
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive(link.to)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground hover:bg-accent hover:text-primary'
                }`}
              >
                {link.icon}{link.label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 w-full rounded text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={14} />
                {t('logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
