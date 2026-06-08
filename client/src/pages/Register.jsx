import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';
import { TreePine, Sprout, Leaf, Mail, Lock, User, UserPlus } from 'lucide-react';

export default function Register() {
  const { t }     = useTranslation();
  const { login } = useAuth();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const [form,    setForm]    = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/register', form);
      login(data.user, data.token);
      toast({ title: t('toast_register_success'), description: t('toast_register_desc', { name: data.user.username }) });
      navigate(data.user.role === 'admin' ? '/admin/tasks' : '/user/tasks');
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-950">

      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-emerald-500 to-green-400 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center gap-2">
          <div className="flex items-end gap-1">
            <Sprout   size={16} className="text-emerald-100 mb-0.5" />
            <TreePine size={26} className="text-white" />
            <Leaf     size={13} className="text-emerald-100 mb-1" />
          </div>
          <span className="text-white font-bold text-xl tracking-wide">قراءات يومية</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">

            {/* Card top accent */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />

            <div className="px-8 pt-8 pb-6">
              {/* Icon cluster */}
              <div className="flex items-end justify-center gap-1.5 mb-6">
                <Sprout   size={18} className="text-emerald-400 mb-0.5" />
                <TreePine size={36} className="text-emerald-600" />
                <Leaf     size={14} className="text-green-400 mb-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="relative">
                  <User size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder={t('username')}
                    required
                    className="w-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-foreground placeholder:text-gray-400 rounded-xl ps-10 pe-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={t('email')}
                    required
                    autoComplete="email"
                    className="w-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-foreground placeholder:text-gray-400 rounded-xl ps-10 pe-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('password')}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-foreground placeholder:text-gray-400 rounded-xl ps-10 pe-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                >
                  <UserPlus size={15} />
                  {loading ? t('loading') : t('register')}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {t('already_have_account')}{' '}
                <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                  {t('sign_in')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-gray-100 dark:border-zinc-800">
        جميع الحقوق محفوظة © FEQ
        &nbsp;·&nbsp;
        All Rights Reserved © FEQ
      </footer>
    </div>
  );
}
