import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
  CheckCircle2, Lock, BookOpen, Calendar, CalendarSearch,
  MessageSquare, X, Play, Eye, Trophy, ListChecks, Circle, SlidersHorizontal,
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
        className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            className={`min-w-[38px] py-2 rounded-md border text-sm font-medium transition-colors ${
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
        className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────
function TaskCard({ task, isAr, t, onClick, sc }) {
  const title = isAr && task.title_ar ? task.title_ar : task.title;
  const desc  = isAr && task.description_ar ? task.description_ar : task.description;

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      disabled={task.locked}
      title={task.locked ? t('complete_previous') : ''}
      className={`group text-start flex flex-col h-full rounded-xl border bg-card overflow-hidden transition-all duration-200 ${sc.border} ${
        task.locked
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      {/* Colored status strip */}
      <div className={`h-1.5 w-full ${sc.bar}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon + status badge */}
        <div className="flex items-center justify-between mb-3">
          <div className={`w-12 h-12 rounded-2xl grid place-items-center ${sc.iconBg}`}>
            {sc.icon}
          </div>
          <Badge variant={sc.badge}>{sc.label}</Badge>
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg leading-snug text-foreground">
          {title}
        </h3>

        {/* Description */}
        {desc && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
            {desc}
          </p>
        )}

        <div className="flex-1" />

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {task.scheduled_at && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <Calendar size={13} />
              {new Date(task.scheduled_at).toLocaleDateString(
                isAr ? 'ar-EG' : 'en-US',
                { day: 'numeric', month: 'short', year: 'numeric' }
              )}
            </span>
          )}
          {task.question_count > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
              <MessageSquare size={13} />
              {task.question_count} {isAr ? 'سؤال' : task.question_count === 1 ? 'question' : 'questions'}
            </span>
          )}
        </div>

        {/* Action button */}
        <div
          className={`mt-4 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${sc.ctaClass}`}
        >
          {sc.ctaIcon}
          {sc.ctaLabel}
        </div>
      </div>
    </button>
  );
}

// ── Filters (shared between sidebar on desktop and top block on mobile) ──
function Filters({ isAr, statusFilter, setStatusFilter, statusOptions, dateFrom, dateTo, setDateFrom, setDateTo, resetView }) {
  return (
    <div className="space-y-5">
      {/* Status filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5 text-muted-foreground">
          <SlidersHorizontal size={15} />
          <span className="text-sm font-semibold">{isAr ? 'الحالة' : 'Status'}</span>
        </div>
        <div className="flex flex-col gap-2">
          {statusOptions.map(o => {
            const active = statusFilter === o.key;
            return (
              <button
                key={o.key}
                onClick={() => { setStatusFilter(o.key); resetView(); }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors ${
                  active ? o.activeClass : 'border-border text-foreground hover:bg-muted/60'
                }`}
              >
                <span className="flex items-center gap-2">{o.icon}{o.label}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                  active ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {o.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date filter */}
      <div>
        <div className="flex items-center gap-2 mb-2.5 text-muted-foreground">
          <CalendarSearch size={15} />
          <span className="text-sm font-semibold">{isAr ? 'التاريخ' : 'Date'}</span>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{isAr ? 'من' : 'From'}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetView(); }}
              className="h-9 w-full text-sm px-2"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{isAr ? 'إلى' : 'To'}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetView(); }}
              className="h-9 w-full text-sm px-2"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); resetView(); }}
              className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
            >
              <X size={13} />
              {isAr ? 'مسح التاريخ' : 'Clear dates'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function UserTasksList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [answerModal, setAnswerModal] = useState(null);
  const [answers, setAnswers]         = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all | completed | incomplete
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const sentinelRef = useRef(null);

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

  // Status + date filters
  const filtered = useMemo(() => {
    let result = sorted;
    if (statusFilter === 'completed')  result = result.filter(t => t.submitted);
    if (statusFilter === 'incomplete') result = result.filter(t => !t.submitted);
    if (dateFrom) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) >= new Date(dateFrom)
    );
    if (dateTo) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) <= new Date(dateTo + 'T23:59:59')
    );
    return result;
  }, [sorted, statusFilter, dateFrom, dateTo]);

  const resetView = () => { setPage(1); setVisibleCount(PAGE_SIZE); };

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const infiniteSlice = useMemo(() =>
    filtered.slice(0, visibleCount),
  [filtered, visibleCount]);

  const hasMoreToScroll = visibleCount < filtered.length;

  // Infinite scroll (small screens)
  useEffect(() => {
    if (isLargeScreen || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLargeScreen, loading, filtered.length, hasMoreToScroll]);

  const displayed = isLargeScreen ? paginated : infiniteSlice;

  // Stats
  const stats = useMemo(() => ({
    total:     tasks.length,
    completed: tasks.filter(t => t.submitted).length,
    pending:   tasks.filter(t => !t.submitted && !t.locked).length,
  }), [tasks]);

  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const allDone = stats.total > 0 && stats.completed === stats.total;

  const subtitle = stats.total === 0
    ? (isAr ? 'ستظهر مهامك هنا فور نشرها' : 'Your tasks will appear here once published')
    : allDone
      ? (isAr ? '🎉 أحسنت! أكملت جميع مهامك' : '🎉 Well done! You’ve completed everything')
      : (isAr ? 'استمر في التقدم، خطوة بخطوة' : 'Keep going — one step at a time');

  const statusOptions = [
    { key: 'all',        label: isAr ? 'الكل' : 'All',              count: stats.total,                   icon: <ListChecks size={16} />,  activeClass: 'bg-primary text-primary-foreground border-primary' },
    { key: 'completed',  label: isAr ? 'مكتملة' : 'Completed',      count: stats.completed,               icon: <CheckCircle2 size={16} />, activeClass: 'bg-[#3D6B35] text-white border-[#3D6B35]' },
    { key: 'incomplete', label: isAr ? 'غير مكتملة' : 'Not completed', count: stats.total - stats.completed, icon: <Circle size={16} />,       activeClass: 'bg-[#A07830] text-white border-[#A07830]' },
  ];

  const getStatusConfig = (task) => {
    if (task.locked) return {
      bar: 'bg-muted-foreground/40', border: 'border-border', iconBg: 'bg-muted',
      icon: <Lock size={22} className="text-muted-foreground" />,
      badge: 'muted', label: t('locked'),
      ctaClass: 'bg-muted text-muted-foreground',
      ctaIcon: <Lock size={15} />, ctaLabel: t('complete_previous'),
    };
    if (task.submitted) return {
      bar: 'bg-[#3D6B35]', border: 'border-[#3D6B35]/30', iconBg: 'bg-[#3D6B35]/15',
      icon: <CheckCircle2 size={22} className="text-[#3D6B35]" />,
      badge: 'success', label: t('completed'),
      ctaClass: 'bg-[#3D6B35]/10 text-[#3D6B35] group-hover:bg-[#3D6B35] group-hover:text-white',
      ctaIcon: <Eye size={15} />, ctaLabel: isAr ? 'عرض إجاباتك' : 'View answers',
    };
    return {
      bar: 'bg-[#A07830]', border: 'border-border', iconBg: 'bg-[#A07830]/15',
      icon: <BookOpen size={22} className="text-[#A07830]" />,
      badge: 'warning', label: t('pending'),
      ctaClass: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
      ctaIcon: <Play size={15} className="fill-current" />, ctaLabel: isAr ? 'ابدأ المهمة' : 'Start task',
    };
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>;

  const filterProps = {
    isAr, statusFilter, setStatusFilter, statusOptions,
    dateFrom, dateTo, setDateFrom, setDateTo, resetView,
  };

  return (
    <div>
      {/* ── Hero / progress header ── */}
      <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('my_tasks')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          {stats.total > 0 && (
            <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${
              allDone ? 'bg-[#3D6B35]/10 border-[#3D6B35]/30' : 'bg-card border-border'
            }`}>
              {allDone && <Trophy size={22} className="text-[#3D6B35]" />}
              <div className="text-center">
                <p className="text-2xl font-bold text-[#3D6B35] leading-none">
                  {stats.completed}
                  <span className="text-base font-medium text-muted-foreground">/{stats.total}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مكتملة' : 'completed'}</p>
              </div>
            </div>
          )}
        </div>

        {stats.total > 0 && (
          <div className="mt-5">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-[#3D6B35] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-medium">
              <span className="text-[#3D6B35]">{pct}% {isAr ? 'مكتمل' : 'complete'}</span>
              {stats.pending > 0 && (
                <span className="text-[#A07830]">
                  {stats.pending} {isAr ? 'بانتظارك' : stats.pending === 1 ? 'task waiting' : 'tasks waiting'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar (filters) + cards ── */}
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {/* Filters: sticky sidebar on desktop, stacked panel on mobile */}
        <aside className="mb-5 lg:mb-0 lg:sticky lg:top-6">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <Filters {...filterProps} />
          </div>
        </aside>

        {/* Cards */}
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
              <CalendarSearch size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {(statusFilter !== 'all' || dateFrom || dateTo)
                  ? (isAr ? 'لا توجد مهام مطابقة للفلتر' : 'No tasks match your filters')
                  : t('no_tasks')}
              </p>
              {(statusFilter !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); resetView(); }}
                  className="text-primary text-sm hover:underline mt-2 inline-block"
                >
                  {isAr ? 'إزالة الفلاتر' : 'Clear filters'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayed.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isAr={isAr}
                    t={t}
                    onClick={handleCardClick}
                    sc={getStatusConfig(task)}
                  />
                ))}
              </div>

              {isLargeScreen ? (
                <Paginator
                  page={page}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              ) : (
                hasMoreToScroll && (
                  <div ref={sentinelRef} className="py-6 text-center text-sm text-muted-foreground">
                    {t('loading')}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

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
