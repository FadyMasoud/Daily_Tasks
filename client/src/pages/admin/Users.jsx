import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import { useConfirm } from '../../components/ui/confirm-dialog';
import { Search, Plus, Pencil, Trash2, ShieldCheck, X } from 'lucide-react';

const EMPTY_ADMIN = { username: '', email: '', password: '', language: 'ar' };

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const isAr = i18n.language === 'ar';

  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter]     = useState('all'); // all | admin | user
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive

  // Dialogs
  const [addOpen, setAddOpen]   = useState(false);
  const [addForm, setAddForm]   = useState(EMPTY_ADMIN);
  const [editUser, setEditUser] = useState(null);   // user object or null
  const [saving, setSaving]     = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/users');
      setUsers(data);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchUsers(); }, []);

  // ── Filtering ──
  const norm = v => (v ?? '').toString().toLowerCase();
  const filtered = useMemo(() => {
    const q = norm(search).trim();
    return users.filter(u => {
      if (q && !norm(`${u.username} ${u.email}`).includes(q)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active'   && !u.active) return false;
      if (statusFilter === 'inactive' &&  u.active) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const hasFilters = search || roleFilter !== 'all' || statusFilter !== 'all';
  const clearAll = () => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); };

  // ── Actions ──
  const patchUser = async (id, body) => {
    const { data } = await axios.patch(`/api/admin/users/${id}`, body);
    setUsers(prev => prev.map(u => u.id === id ? data : u));
    return data;
  };

  const toggleActive = async (u) => {
    if (u.id === me?.id) {
      toast({ title: t('error'), description: t('cannot_deactivate_self'), variant: 'destructive' });
      return;
    }
    try {
      await patchUser(u.id, { active: u.active ? 0 : 1 });
    } catch (err) {
      toast({ title: t('error'), description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  const deleteUser = async (u) => {
    if (u.id === me?.id) {
      toast({ title: t('error'), description: t('cannot_delete_self'), variant: 'destructive' });
      return;
    }
    const ok = await confirm({
      type: 'delete',
      title: t('confirm_delete_user_title'),
      message: t('confirm_delete_user_msg', { name: u.username }),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/admin/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast({ title: t('success') });
    } catch (err) {
      toast({ title: t('error'), description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addForm.username.trim() || !addForm.email.trim() || !addForm.password.trim()) return;
    setSaving(true);
    try {
      const { data } = await axios.post('/api/admin/users', { ...addForm, role: 'admin' });
      setUsers(prev => [data, ...prev]);
      setAddOpen(false);
      setAddForm(EMPTY_ADMIN);
      toast({ title: t('success'), description: t('admin_added') });
    } catch (err) {
      toast({ title: t('error'), description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        username: editUser.username,
        email: editUser.email,
        role: editUser.role,
        language: editUser.language,
        active: editUser.active ? 1 : 0,
      };
      if (editUser._password?.trim()) body.password = editUser._password.trim();
      await patchUser(editUser.id, body);
      setEditUser(null);
      toast({ title: t('success') });
    } catch (err) {
      toast({ title: t('error'), description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(isAr ? 'ar-EG' : 'en-US',
    { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) return <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold">{t('users_title')}</h1>
        <Button size="sm" onClick={() => { setAddForm(EMPTY_ADMIN); setAddOpen(true); }}>
          <ShieldCheck size={14} className="mr-1" />{t('add_admin')}
        </Button>
      </div>

      {/* Search / filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-muted/40 rounded-lg border border-border">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم أو البريد...' : 'Search name or email...'}
            className="h-9 ps-8"
          />
        </div>
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-9 w-auto">
          <option value="all">{isAr ? 'كل الأدوار' : 'All roles'}</option>
          <option value="admin">{isAr ? 'مسؤول' : 'Admin'}</option>
          <option value="user">{isAr ? 'مستخدم' : 'User'}</option>
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 w-auto">
          <option value="all">{isAr ? 'كل الحالات' : 'All statuses'}</option>
          <option value="active">{t('active_status')}</option>
          <option value="inactive">{t('inactive_status')}</option>
        </Select>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
          >
            <X size={13} />{isAr ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">#</th>
                <th className="px-4 py-3 text-start font-medium">{t('username')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('email')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('role_col')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('status')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('scheduled_at')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {hasFilters ? (isAr ? 'لا توجد نتائج مطابقة' : 'No matching results') : (isAr ? 'لا يوجد مستخدمون' : 'No users')}
                  </td>
                </tr>
              ) : filtered.map((u, idx) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === me?.id && <span className="ms-1.5 text-xs text-muted-foreground">({isAr ? 'أنت' : 'you'})</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? (isAr ? 'مسؤول' : 'Admin') : (isAr ? 'مستخدم' : 'User')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(u)} title={t('toggle_active')}>
                      <Badge variant={u.active ? 'success' : 'warning'}>
                        {u.active ? t('active_status') : t('inactive_status')}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEditUser({ ...u, _password: '' })}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => deleteUser(u)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasFilters && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {filtered.length} / {users.length} {isAr ? 'نتيجة' : 'results'}
        </p>
      )}

      {/* ── Add admin dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />{t('add_admin')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('username')} *</Label>
              <Input value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('email')} *</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('password')} *</Label>
              <Input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('language')}</Label>
              <Select value={addForm.language} onChange={e => setAddForm(f => ({ ...f, language: e.target.value }))}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('saving') : t('add_admin')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit user dialog ── */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
        <DialogContent onClose={() => setEditUser(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={16} className="text-primary" />{t('edit_user')}
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t('username')}</Label>
                <Input value={editUser.username} onChange={e => setEditUser(u => ({ ...u, username: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('email')}</Label>
                <Input type="email" value={editUser.email} onChange={e => setEditUser(u => ({ ...u, email: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('role_col')}</Label>
                  <Select
                    value={editUser.role}
                    onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}
                    disabled={editUser.id === me?.id}
                  >
                    <option value="user">{isAr ? 'مستخدم' : 'User'}</option>
                    <option value="admin">{isAr ? 'مسؤول' : 'Admin'}</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('status')}</Label>
                  <Select
                    value={editUser.active ? '1' : '0'}
                    onChange={e => setEditUser(u => ({ ...u, active: e.target.value === '1' }))}
                    disabled={editUser.id === me?.id}
                  >
                    <option value="1">{t('active_status')}</option>
                    <option value="0">{t('inactive_status')}</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('new_password_optional')}</Label>
                <Input type="password" value={editUser._password}
                  onChange={e => setEditUser(u => ({ ...u, _password: e.target.value }))}
                  placeholder={isAr ? 'اتركه فارغاً لعدم التغيير' : 'Leave blank to keep current'} />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>{t('cancel')}</Button>
                <Button type="submit" disabled={saving}>{saving ? t('saving') : t('save_changes')}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
