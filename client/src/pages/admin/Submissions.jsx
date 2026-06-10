import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function AdminSubmissions() {
  const { t, i18n } = useTranslation();
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const isAr        = i18n.language === 'ar';

  const [submissions, setSubmissions] = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState(new Set());
  const [filters,     setFilters]     = useState({ username: '', task_id: '', date: '', page: 1, limit: 20 });
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });

  const fetchTasks = async () => {
    try { const { data } = await axios.get('/api/admin/tasks'); setTasks(data); } catch {}
  };

  const fetchSubmissions = async (f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.username) params.set('username', f.username);
      if (f.task_id)  params.set('task_id',  f.task_id);
      if (f.date)     params.set('date',      f.date);
      params.set('page',  f.page);
      params.set('limit', f.limit);

      const { data } = await axios.get(`/api/admin/submissions?${params}`);
      setSubmissions(data.data);
      setPagination({ total: data.total, pages: data.pages });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); fetchSubmissions(); }, []);

  const toggleExpand = id => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSearch = e => {
    e.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    fetchSubmissions(next);
  };

  const goPage = delta => {
    const next = { ...filters, page: filters.page + delta };
    setFilters(next);
    fetchSubmissions(next);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('submissions')}</h1>

      {/* Filter bar */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search_username')}
            value={filters.username}
            onChange={e => setFilters(f => ({ ...f, username: e.target.value }))}
            className="ps-8"
          />
        </div>

        <Select
          value={filters.task_id}
          onChange={e => setFilters(f => ({ ...f, task_id: e.target.value }))}
          className="w-48"
        >
          <option value="">{t('select_task')}</option>
          {tasks.map(task => (
            <option key={task.id} value={task.id}>
              {isAr && task.title_ar ? task.title_ar : task.title}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
          className="w-40"
          title={isAr ? 'فلتر حسب اليوم' : 'Filter by day'}
        />

        <Button type="submit">بحث</Button>

        {(filters.username || filters.task_id || filters.date) && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const reset = { ...filters, username: '', task_id: '', date: '', page: 1 };
              setFilters(reset);
              fetchSubmissions(reset);
            }}
          >
            مسح
          </Button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-8">{t('loading')}</div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('username_col')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('email')}</th>
                  <th className="px-4 py-3 text-start font-medium">المهمة</th>
                  <th className="px-4 py-3 text-start font-medium">{t('submitted_at')}</th>
                  <th className="px-4 py-3 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : submissions.map(sub => (
                  <>
                    <tr key={sub.submission_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{sub.username}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{sub.email}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/submissions/${sub.task_id}/user/${sub.user_id}`)}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors font-medium text-start"
                        >
                          {isAr && sub.title_ar ? sub.title_ar : sub.title}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => toggleExpand(sub.submission_id)}
                        >
                          {expanded.has(sub.submission_id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                      </td>
                    </tr>

                    {expanded.has(sub.submission_id) && (
                      <tr key={`${sub.submission_id}-answers`} className="bg-muted/10">
                        <td colSpan={5} className="px-8 py-4">
                          <div className="space-y-3">
                            {sub.answers.map((ans, i) => (
                              <div key={i} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                                </p>
                                <p className="text-sm bg-background rounded-md px-3 py-2 border">
                                  {ans.answer_text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t('page')} {filters.page} {t('of')} {pagination.pages} ({pagination.total})
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={filters.page <= 1}
                  onClick={() => goPage(-1)}>{t('prev')}</Button>
                <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages}
                  onClick={() => goPage(1)}>{t('next')}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
