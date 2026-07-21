import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';
import { BookOpen, Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const { t }     = useTranslation();
  const { login } = useAuth();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', form);
      login(data.user, data.token);
      toast({ title: t('toast_hello', { name: data.user.username }), description: t('toast_hello_desc') });
      navigate(data.user.role === 'admin' ? '/admin/tasks' : '/user/tasks');
    } catch (err) {
      const inactive = err.response?.status === 403 && err.response?.data?.code === 'inactive';
      toast({
        title: inactive ? t('account_pending_title') : t('error'),
        description: inactive
          ? t('account_inactive')
          : (err.response?.data?.message || t('invalid_credentials')),
        variant: inactive ? 'default' : 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">

          {/* Antique gold top accent */}
          <div className="h-1 bg-[#C4963A]" />

          <div className="px-8 pt-8 pb-8">

            {/* Brand */}
            <div className="flex items-center justify-center gap-2 mb-7">
              <BookOpen size={22} className="text-primary" />
              <span className="font-bold text-lg text-foreground tracking-widest">{t('app_title')}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={t('email')}
                    required
                    autoComplete="email"
                    className="w-full border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md ps-9 pe-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('password')}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('password')}
                    required
                    autoComplete="current-password"
                    className="w-full border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md ps-9 pe-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md py-2.5 text-sm transition-colors border border-primary/60 shadow-sm disabled:opacity-60 mt-2"
              >
                <LogIn size={14} />
                {loading ? t('loading') : t('login')}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border text-center text-sm text-muted-foreground">
              {t('no_account')}{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                {t('sign_up')}
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          جميع الحقوق محفوظة © FEQ · All Rights Reserved
        </p>
      </div>
    </div>
  );
}
