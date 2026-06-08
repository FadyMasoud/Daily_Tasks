import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/toast';
import { Sun, Moon, LogOut, BookOpen, CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleLang = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    document.documentElement.setAttribute('dir', next === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', next);
  };

  const handleLogout = () => {
    const name = user?.username;
    logout();
    toast({
      title: t('toast_logout', { name }),
      description: t('toast_logout_desc'),
    });
    navigate('/login');
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={user?.role === 'admin' ? '/admin/tasks' : '/user/tasks'} className="flex items-center gap-2 font-bold text-primary">
          <BookOpen size={20} />
          <span>قراءات يومية</span>
        </Link>

        {user && (
          <div className="flex items-center gap-1 sm:gap-3">
            {user.role === 'admin' ? (
              <>
                <Link to="/admin/tasks" className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors">{t('task_list')}</Link>
                <Link to="/admin/upload" className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors">{t('upload_task')}</Link>
                <Link to="/admin/submissions" className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors">{t('submissions')}</Link>
              </>
            ) : (
              <>
                <Link to="/user/tasks"    className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors">{t('my_tasks')}</Link>
                <Link to="/user/calendar" className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors flex items-center gap-1"><CalendarDays size={13} />التقويم</Link>
                <Link to="/user/history"  className="text-sm px-2 py-1 rounded hover:bg-accent transition-colors">{t('history')}</Link>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="text-xs font-medium px-2 py-1 rounded border border-border hover:bg-accent transition-colors">
            {i18n.language === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button onClick={() => setDark(d => !d)} className="p-1.5 rounded hover:bg-accent transition-colors">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <button onClick={handleLogout} className="p-1.5 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors" title={t('logout')}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
