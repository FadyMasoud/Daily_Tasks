import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { useConfirm } from '../../components/ui/confirm-dialog';
import { Pencil, Trash2, Plus, Check, X, Search } from 'lucide-react';

const EMPTY_FILTERS = {
  name: '', scheduled: '', auto: 'all', published: 'all', requires: 'all', questions: '',
};

export default function AdminTaskList() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editSchedule, setEditSchedule] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const isAr = i18n.language === 'ar';

  const fetchTasks = async () => {
    try {
      const { data } = await axios.get('/api/tasks');
      setTasks(data);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const toggle = async (id, field, currentVal) => {
    try {
      const { data } = await axios.patch(`/api/tasks/${id}`, { [field]: currentVal ? 0 : 1 });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const saveSchedule = async (id) => {
    try {
      const { data } = await axios.patch(`/api/tasks/${id}`, { scheduled_at: editSchedule || null });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      setEditingId(null);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const deleteTask = async (id) => {
    const ok = await confirm({
      type: 'delete',
      title: t('confirm_delete_task_title'),
      message: t('confirm_delete_task_msg'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: t('success') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  // ── Filtering: general search + per-column filters ──
  const norm = (v) => (v ?? '').toString().toLowerCase();
  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const filtered = useMemo(() => {
    const g = norm(search).trim();
    return tasks.filter(task => {
      const scheduledStr = task.scheduled_at ? new Date(task.scheduled_at).toLocaleString() : '';
      const nameHay = `${task.title || ''} ${task.title_ar || ''}`;

      if (g) {
        const hay = norm(`${nameHay} ${scheduledStr} ${task.question_count || 0}`);
        if (!hay.includes(g)) return false;
      }
      if (filters.name && !norm(nameHay).includes(norm(filters.name))) return false;
      if (filters.scheduled && !norm(scheduledStr).includes(norm(filters.scheduled))) return false;
      if (filters.auto !== 'all' && !!task.auto_schedule !== (filters.auto === 'yes')) return false;
      if (filters.published !== 'all' && !!task.is_published !== (filters.published === 'yes')) return false;
      if (filters.requires !== 'all' && !!task.requires_previous !== (filters.requires === 'yes')) return false;
      if (filters.questions && !norm(task.question_count || 0).includes(norm(filters.questions))) return false;
      return true;
    });
  }, [tasks, search, filters]);

  const hasActiveFilters = search || Object.keys(EMPTY_FILTERS).some(k => filters[k] !== EMPTY_FILTERS[k]);
  const clearAll = () => { setSearch(''); setFilters(EMPTY_FILTERS); };

  // Reusable Yes/No/All column select
  const BoolFilter = ({ value, onChange }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 w-full text-xs px-1.5 rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="all">{isAr ? 'الكل' : 'All'}</option>
      <option value="yes">{isAr ? 'نعم' : 'Yes'}</option>
      <option value="no">{isAr ? 'لا' : 'No'}</option>
    </select>
  );

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl font-bold">{t('task_list')}</h1>
        <div className="flex items-center gap-2">
          {/* General search */}
          <div className="relative">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث عام...' : 'Search all...'}
              className="h-9 w-44 sm:w-56 ps-8"
            />
          </div>
          <Link to="/admin/upload">
            <Button size="sm"><Plus size={14} className="mr-1" />{t('upload_task')}</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              {/* Column labels */}
              <tr>
                <th className="px-4 py-3 text-start font-medium">#</th>
                <th className="px-4 py-3 text-start font-medium">{t('task_name_en')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('scheduled_at')}</th>
                <th className="px-4 py-3 text-center font-medium">Auto</th>
                <th className="px-4 py-3 text-center font-medium">{t('published')}</th>
                <th className="px-4 py-3 text-center font-medium">Req. Prev</th>
                <th className="px-4 py-3 text-center font-medium">{t('questions_count')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('actions')}</th>
              </tr>
              {/* Per-column search row */}
              <tr className="bg-muted/50 border-t border-border">
                <th className="px-2 py-2" />
                <th className="px-2 py-2">
                  <Input
                    value={filters.name}
                    onChange={e => setFilter('name', e.target.value)}
                    placeholder={isAr ? 'بحث بالاسم' : 'Name'}
                    className="h-8 text-xs"
                  />
                </th>
                <th className="px-2 py-2">
                  <Input
                    value={filters.scheduled}
                    onChange={e => setFilter('scheduled', e.target.value)}
                    placeholder={isAr ? 'التاريخ' : 'Date'}
                    className="h-8 text-xs"
                  />
                </th>
                <th className="px-2 py-2"><BoolFilter value={filters.auto} onChange={v => setFilter('auto', v)} /></th>
                <th className="px-2 py-2"><BoolFilter value={filters.published} onChange={v => setFilter('published', v)} /></th>
                <th className="px-2 py-2"><BoolFilter value={filters.requires} onChange={v => setFilter('requires', v)} /></th>
                <th className="px-2 py-2">
                  <Input
                    value={filters.questions}
                    onChange={e => setFilter('questions', e.target.value)}
                    placeholder="#"
                    className="h-8 text-xs text-center"
                  />
                </th>
                <th className="px-2 py-2 text-center">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      title={isAr ? 'مسح الفلاتر' : 'Clear filters'}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {hasActiveFilters
                      ? (isAr ? 'لا توجد نتائج مطابقة' : 'No matching results')
                      : t('no_tasks')}
                  </td>
                </tr>
              ) : filtered.map((task, idx) => (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{task.title}</div>
                    {task.title_ar && <div className="text-xs text-muted-foreground" dir="rtl">{task.title_ar}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === task.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="datetime-local"
                          value={editSchedule}
                          onChange={e => setEditSchedule(e.target.value)}
                          className="h-7 text-xs w-48"
                        />
                        <button onClick={() => saveSchedule(task.id)} className="text-primary hover:text-primary/80"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="text-destructive hover:text-destructive/80"><X size={14} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(task.id); setEditSchedule(task.scheduled_at ? task.scheduled_at.slice(0, 16) : ''); }}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        {task.scheduled_at ? new Date(task.scheduled_at).toLocaleString() : '—'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(task.id, 'auto_schedule', task.auto_schedule)}>
                      <Badge variant={task.auto_schedule ? 'success' : 'muted'}>{task.auto_schedule ? 'Yes' : 'No'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(task.id, 'is_published', task.is_published)}>
                      <Badge variant={task.is_published ? 'success' : 'warning'}>{task.is_published ? t('published') : t('unpublished')}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(task.id, 'requires_previous', task.requires_previous)}>
                      <Badge variant={task.requires_previous ? 'default' : 'muted'}>{task.requires_previous ? 'Yes' : 'No'}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary">{task.question_count || 0}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Link to={`/admin/upload?edit=${task.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil size={12} /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteTask(task.id)}>
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

      {/* Result count */}
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {filtered.length} / {tasks.length} {isAr ? 'نتيجة' : 'results'}
        </p>
      )}
    </div>
  );
}
