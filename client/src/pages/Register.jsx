import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useToast } from '../components/ui/toast';
import { BookOpen, Mail, Lock, User, UserPlus } from 'lucide-react';

export default function Register() {
  const { t }     = useTranslation();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const [form,    setForm]    = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/register', form);
      toast({ title: t('register_pending_title'), description: t('register_pending_desc') });
      navigate('/login');
    } catch (err) {
      toast({
        title: t('error'),
        description: err.response?.data?.message || 'فشل إنشاء الحساب',
        variant: 'destructive',
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

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('username')}
                </label>
                <div className="relative">
                  <User size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder={t('username')}
                    required
                    className="w-full border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md ps-9 pe-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                  />
                </div>
              </div>

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
                    minLength={6}
                    autoComplete="new-password"
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
                <UserPlus size={14} />
                {loading ? t('loading') : t('register')}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-border text-center text-sm text-muted-foreground">
              {t('already_have_account')}{' '}
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                {t('sign_in')}
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
