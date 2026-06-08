import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

export default function AdminTaskList() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editSchedule, setEditSchedule] = useState('');

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
    if (!confirm('Delete this task?')) return;
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: t('success') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('task_list')}</h1>
        <Link to="/admin/upload">
          <Button size="sm"><Plus size={14} className="mr-1" />{t('upload_task')}</Button>
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
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
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('no_tasks')}</td></tr>
              ) : tasks.map((task, idx) => (
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
                        <button onClick={() => saveSchedule(task.id)} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-600"><X size={14} /></button>
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
    </div>
  );
}
