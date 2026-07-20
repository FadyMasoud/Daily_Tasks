import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import useMediaQuery from '../../hooks/useMediaQuery';
import {
  CheckCircle2, Lock, BookOpen, CalendarSearch,
  MessageSquare, X, Search, ChevronDown,
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
        className="px-3 py-2 border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            className={`min-w-[38px] py-2 border text-sm font-medium transition-colors ${
              p === page
                ? 'border-primary bg-primary text-primary-foreground'
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
        className="px-3 py-2 border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── Task card (sharp, classic) ────────────────────────────────
function TaskCard({ task, isAr, t, onClick, sc }) {
  const title = isAr && task.title_ar ? task.title_ar : task.title;
  const desc  = isAr && task.description_ar ? task.description_ar : task.description;

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      disabled={task.locked}
      title={task.locked ? t('complete_previous') : ''}
      className={`group text-start flex flex-col h-full min-w-0 bg-card border border-border border-s-[3px] shadow-sm transition-shadow ${sc.accent} ${
        task.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
      }`}
    >
      <div className="p-4 flex flex-col flex-1 min-w-0">
        {/* Status label + date */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${sc.labelClass}`}>
            {sc.icon}
            {sc.label}
          </span>
          {task.scheduled_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(task.scheduled_at).toLocaleDateString(
                isAr ? 'ar-EG' : 'en-US',
                { day: 'numeric', month: 'short', year: 'numeric' }
              )}
            </span>
          )}
        </div>

        {/* Title with underline rule */}
        <h3 className="font-bold text-base leading-snug text-foreground border-b border-border pb-2 mb-2 truncate">
          {title}
        </h3>

        {/* Description */}
        {desc && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed break-words">
            {desc}
          </p>
        )}

        <div className="flex-1" />

        {/* Footer: question count + action link */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
          {task.question_count > 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare size={13} />
              {task.question_count} {isAr ? 'سؤال' : task.question_count === 1 ? 'question' : 'questions'}
            </span>
          ) : <span />}
          <span className={`text-sm font-semibold group-hover:underline underline-offset-2 ${sc.ctaClass}`}>
            {sc.ctaLabel} {isAr ? '←' : '→'}
          </span>
        </div>
      </div>
    </button>
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
  const [query, setQuery]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | completed | incomplete
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile-only collapse
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

  // Search + status + date filters
  const filtered = useMemo(() => {
    let result = sorted;
    const q = query.trim().toLowerCase();
    if (q) result = result.filter(t =>
      [t.title, t.title_ar, t.description, t.description_ar]
        .some(v => v && v.toLowerCase().includes(q))
    );
    if (statusFilter === 'completed')  result = result.filter(t => t.submitted);
    if (statusFilter === 'incomplete') result = result.filter(t => !t.submitted);
    if (dateFrom) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) >= new Date(dateFrom)
    );
    if (dateTo) result = result.filter(t =>
      t.scheduled_at && new Date(t.scheduled_at) <= new Date(dateTo + 'T23:59:59')
    );
    return result;
  }, [sorted, query, statusFilter, dateFrom, dateTo]);

  const resetView = () => { setPage(1); setVisibleCount(PAGE_SIZE); };
  const hasFilters = query || statusFilter !== 'all' || dateFrom || dateTo;
  const activeFilterCount = [query, statusFilter !== 'all', dateFrom, dateTo].filter(Boolean).length;
  const clearAll = () => { setQuery(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); resetView(); };

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
  }), [tasks]);
  const incomplete = stats.total - stats.completed;
  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const subtitle = stats.total === 0
    ? (isAr ? 'ستظهر قراءاتك هنا فور نشرها' : 'Your tasks will appear here once published')
    : (isAr ? 'استمر في التقدم، خطوة بخطوة' : 'Keep going — one step at a time');

  const getStatusConfig = (task) => {
    if (task.locked) return {
      accent: 'border-s-border',
      labelClass: 'text-muted-foreground',
      icon: <Lock size={13} />, label: t('locked'),
      ctaClass: 'text-muted-foreground', ctaLabel: t('complete_previous'),
    };
    if (task.submitted) return {
      accent: 'border-s-[hsl(var(--success))]',
      labelClass: 'text-[hsl(var(--success))]',
      icon: <CheckCircle2 size={13} />, label: t('completed'),
      ctaClass: 'text-[hsl(var(--success))]', ctaLabel: isAr ? 'عرض إجاباتك' : 'View answers',
    };
    return {
      accent: 'border-s-[hsl(var(--warning))]',
      labelClass: 'text-[hsl(var(--warning))]',
      icon: <BookOpen size={13} />, label: t('pending'),
      ctaClass: 'text-primary', ctaLabel: isAr ? 'ابدأ القراءة' : 'Start task',
    };
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div>
      {/* ── Classic header with underline (compact on mobile, full on desktop) ── */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">{t('my_tasks')}</h1>
            <p className="hidden sm:block text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {stats.total > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{stats.completed}</span>
              {' / '}{stats.total} {isAr ? 'مكتملة' : 'completed'}
              <span className="mx-1.5 text-border">·</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </p>
          )}
        </div>
        {/* Rule: thin full line with a short accent segment (classic detail) */}
        <div className="mt-2 sm:mt-3 h-px bg-border relative">
          <span className="absolute -top-px start-0 h-0.5 w-14 sm:w-20 bg-primary" />
        </div>
      </header>

      {/* ── Cards (left) + Search panel (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6 lg:items-start">
        {/* Cards */}
        <div className="lg:order-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border">
              <CalendarSearch size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {hasFilters
                  ? (isAr ? 'لا توجد قراءات مطابقة للبحث' : 'No tasks match your search')
                  : t('no_tasks')}
              </p>
              {hasFilters && (
                <button onClick={clearAll} className="text-primary text-sm hover:underline mt-2 inline-block">
                  {isAr ? 'مسح البحث' : 'Clear search'}
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

        {/* Search / filter panel — right side on desktop, top on mobile */}
        <aside className="order-first lg:order-2 mb-6 lg:mb-0 lg:sticky lg:top-6">
          <div className="border border-border bg-card shadow-sm">
            {/* Header — a tappable bar on mobile, static title on desktop */}
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className={`w-full px-4 py-3 flex items-center gap-2 cursor-pointer lg:cursor-default lg:border-b lg:border-border ${
                filtersOpen ? 'border-b border-border' : ''
              }`}
            >
              <Search size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {isAr ? 'بحث' : 'Search'}
              </h2>
              {activeFilterCount > 0 && (
                <span className="ms-1 text-[11px] font-bold bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                size={16}
                className={`ms-auto lg:hidden text-muted-foreground transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Body — collapsible on mobile, always open on desktop */}
            <div className={`p-4 space-y-4 ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
              {/* Text search */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {isAr ? 'الكلمة المفتاحية' : 'Keyword'}
                </label>
                <Input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); resetView(); }}
                  placeholder={isAr ? 'ابحث في القراءات...' : 'Search tasks...'}
                  className="rounded-none"
                />
              </div>

              {/* Status select */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {isAr ? 'الحالة' : 'Status'}
                </label>
                <Select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); resetView(); }}
                  className="rounded-none"
                >
                  <option value="all">{isAr ? `الكل (${stats.total})` : `All (${stats.total})`}</option>
                  <option value="completed">{isAr ? `مكتملة (${stats.completed})` : `Completed (${stats.completed})`}</option>
                  <option value="incomplete">{isAr ? `غير مكتملة (${incomplete})` : `Not completed (${incomplete})`}</option>
                </Select>
              </div>

              {/* Date range */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {isAr ? 'من تاريخ' : 'From date'}
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); resetView(); }}
                  className="rounded-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {isAr ? 'إلى تاريخ' : 'To date'}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); resetView(); }}
                  className="rounded-none"
                />
              </div>

              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="w-full flex items-center justify-center gap-1.5 text-sm py-2 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                >
                  <X size={13} />
                  {isAr ? 'مسح الكل' : 'Clear all'}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Answers modal ── */}
      <Dialog open={!!answerModal} onClose={() => setAnswerModal(null)}>
        <DialogContent onClose={() => setAnswerModal(null)} className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {answerModal && (isAr && answerModal.title_ar ? answerModal.title_ar : answerModal.title)}
            </DialogTitle>
          </DialogHeader>
          <div className="h-0.5 bg-primary -mx-6 mb-4" />
          <div className="space-y-4">
            {answers.map((ans, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                </p>
                <p className="text-sm bg-muted px-3 py-2.5 text-foreground leading-relaxed">
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
