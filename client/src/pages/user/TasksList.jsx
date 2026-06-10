import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import {
  CheckCircle2, Lock, BookOpen, Calendar,
  CalendarSearch, MessageSquare, X,
} from 'lucide-react';

const PAGE_SIZE = 6;

// ── Paginator ─────────────────────────────────────────────────
function Paginator({ page, total, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-8 flex-wrap" dir="ltr">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>
      {getPages().map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[34px] py-1.5 rounded-md border text-sm font-medium transition-colors ${
              p === page
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border hover:bg-accent text-foreground'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === Math.ceil(total / pageSize)}
        className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function UserTasksList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [answerModal, setAnswerModal] = useState(null);
  const [answers, setAnswers]       = useState([]);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);

  useEffect(() => {
    axios.get('/api/tasks')
      .then(({ data }) => setTasks(data))
      .catch(() => toast({ title: t('error'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const openCompletedModal = async (task) => {
    try {
      const { data } = await axios.get(`/api/submissions/my/${task.id}`);
      setAnswers(data.answers);
      setAnswerModal(task);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const handleCardClick = (task) => {
    if (task.locked) return;
    if (task.submitted) { openCompletedModal(task); return; }
    navigate(`/user/tasks/${task.id}`);
  };

  // Sort newest first (by scheduled_at, fallback created_at)
  const sorted = useMemo(() =>
    [...tasks].sort((a, b) => {
      const da = a.scheduled_at || a.created_at;
      const db = b.scheduled_at || b.created_at;
      return new Date(db) - new Date(da);
    }),
  [tasks]);

  // Date filter (filters on scheduled_at)
  const filtered = useMemo(() => {
    let result = sorted;
    if (dateFrom) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) >= new Date(dateFrom)
    );
    if (dateTo) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) <= new Date(dateTo + 'T23:59:59')
    );
    return result;
  }, [sorted, dateFrom, dateTo]);

  // Paginate
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const resetPage = () => setPage(1);

  // Stats
  const stats = useMemo(() => ({
    total:     tasks.length,
    completed: tasks.filter(t => t.submitted).length,
    pending:   tasks.filter(t => !t.submitted && !t.locked).length,
  }), [tasks]);

  const getStatusConfig = (task) => {
    if (task.locked)    return { bar: 'bg-muted-foreground/40', border: 'border-border',        iconBg: 'bg-muted',            icon: <Lock        size={14} className="text-muted-foreground" />, badge: 'muted',   label: t('locked')    };
    if (task.submitted) return { bar: 'bg-[#3D6B35]',           border: 'border-[#3D6B35]/30', iconBg: 'bg-[#3D6B35]/15',     icon: <CheckCircle2 size={14} className="text-[#3D6B35]"         />, badge: 'success', label: t('completed') };
    return              { bar: 'bg-[#A07830]',           border: 'border-border',        iconBg: 'bg-[#A07830]/15',     icon: <BookOpen    size={14} className="text-[#A07830]"           />, badge: 'warning', label: t('pending')   };
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6 space-y-4">
        {/* Title + stats */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">{t('my_tasks')}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
              {stats.total} {isAr ? 'مهمة' : 'tasks'}
            </span>
            {stats.completed > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#3D6B35]/10 border border-[#3D6B35]/30 text-[#3D6B35] font-semibold">
                ✓ {stats.completed} {isAr ? 'مكتملة' : 'done'}
              </span>
            )}
            {stats.pending > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#A07830]/10 border border-[#A07830]/30 text-[#A07830] font-semibold">
                ◷ {stats.pending} {isAr ? 'معلقة' : 'pending'}
              </span>
            )}
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 bg-muted/40 rounded-md border border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <CalendarSearch size={14} />
            <span className="text-xs font-medium">{isAr ? 'تصفية:' : 'Filter:'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">{isAr ? 'من' : 'From'}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetPage(); }}
              className="h-7 w-36 text-xs px-2"
            />
            <label className="text-xs text-muted-foreground">{isAr ? 'إلى' : 'To'}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetPage(); }}
              className="h-7 w-36 text-xs px-2"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                <X size={11} />
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-muted-foreground ms-auto">
              {filtered.length} {isAr ? 'نتيجة' : 'result(s)'}
            </span>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-md">
          <CalendarSearch size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {(dateFrom || dateTo)
              ? (isAr ? 'لا توجد مهام في هذا النطاق الزمني' : 'No tasks in this date range')
              : t('no_tasks')}
          </p>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-primary text-xs hover:underline mt-2 inline-block"
            >
              {isAr ? 'إزالة الفلتر' : 'Remove filter'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(task => {
            const sc = getStatusConfig(task);
            const title = isAr && task.title_ar ? task.title_ar : task.title;
            const desc  = isAr && task.description_ar ? task.description_ar : task.description;

            return (
              <div
                key={task.id}
                onClick={() => handleCardClick(task)}
                title={task.locked ? t('complete_previous') : ''}
                className={`relative rounded-md border bg-card overflow-hidden transition-all duration-200 group ${sc.border} ${
                  task.locked
                    ? 'opacity-55 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Left status bar */}
                <div className={`absolute inset-y-0 start-0 w-[3px] ${sc.bar}`} />

                <div className="p-5 ps-6 flex flex-col h-full">
                  {/* Top row: icon circle + badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sc.iconBg}`}>
                      {sc.icon}
                    </div>
                    <Badge variant={sc.badge} className="text-xs">
                      {sc.label}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base leading-snug text-foreground mb-1.5">
                    {title}
                  </h3>

                  {/* Description */}
                  {desc && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {desc}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                    {task.scheduled_at ? (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(task.scheduled_at).toLocaleDateString(
                          isAr ? 'ar-EG' : 'en-US',
                          { day: 'numeric', month: 'short', year: 'numeric' }
                        )}
                      </span>
                    ) : <span />}
                    {task.question_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        {task.question_count}
                      </span>
                    )}
                  </div>

                  {/* CTA label */}
                  {!task.locked && !task.submitted && (
                    <p className="text-xs font-semibold text-primary mt-2.5 group-hover:underline underline-offset-2">
                      {isAr ? 'اضغط للبدء ←' : 'Tap to start →'}
                    </p>
                  )}
                  {task.submitted && (
                    <p className="text-xs font-semibold text-[#3D6B35] mt-2.5 group-hover:underline underline-offset-2">
                      {isAr ? 'عرض إجاباتك ←' : 'View your answers →'}
                    </p>
                  )}
                  {task.locked && (
                    <p className="text-xs text-muted-foreground mt-2.5">{t('complete_previous')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Paginator
        page={page}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* ── Answers modal ── */}
      <Dialog open={!!answerModal} onClose={() => setAnswerModal(null)}>
        <DialogContent onClose={() => setAnswerModal(null)} className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {answerModal && (isAr && answerModal.title_ar ? answerModal.title_ar : answerModal.title)}
            </DialogTitle>
          </DialogHeader>
          <div className="h-0.5 bg-[#C4963A] -mx-6 mb-4" />
          <div className="space-y-4">
            {answers.map((ans, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                </p>
                <p className="text-sm bg-muted rounded-md px-3 py-2.5 text-foreground leading-relaxed">
                  {ans.answer_text}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
