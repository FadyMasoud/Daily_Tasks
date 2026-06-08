import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Lock, CalendarDays } from 'lucide-react';
import { useToast } from '../../components/ui/toast';

const DAYS_AR    = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const DAYS_EN    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_AR  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function UserCalendar() {
  const { i18n } = useTranslation();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const isAr      = i18n.language === 'ar';

  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [tasks,       setTasks]       = useState([]);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [loading,     setLoading]     = useState(true);

  const DAYS   = isAr ? DAYS_AR   : DAYS_EN;
  const MONTHS = isAr ? MONTHS_AR : MONTHS_EN;

  useEffect(() => {
    axios.get('/api/tasks')
      .then(({ data }) => setTasks(data))
      .catch(() => toast({ title: 'خطأ', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      const raw = task.scheduled_at || task.created_at;
      if (!raw) return;
      const key = raw.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const pad  = n => String(n).padStart(2, '0');
  const dateStr = d => `${year}-${pad(month + 1)}-${pad(d)}`;

  const prevMonth = () => {
    setSelectedDay(1);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(1);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const isToday = d =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year  === today.getFullYear();

  const selectedKey   = dateStr(selectedDay);
  const selectedTasks = tasksByDate[selectedKey] || [];

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">

      {/* ── Calendar panel ── */}
      <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-auto">

        {/* Month / year header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={isAr ? nextMonth : prevMonth}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          <div className="text-center select-none">
            <h2 className="text-2xl font-bold tracking-tight">{MONTHS[month]}</h2>
            {/* Year strip */}
            <div className="flex items-center justify-center gap-2 mt-1">
              <button onClick={() => setYear(y => y - 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
                {year - 1}
              </button>
              <span className="text-sm font-bold px-2.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                {year}
              </span>
              <button onClick={() => setYear(y => y + 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
                {year + 1}
              </button>
            </div>
          </div>

          <button
            onClick={isAr ? prevMonth : nextMonth}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {isAr ? d.slice(0, 5) : d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d        = i + 1;
            const key      = dateStr(d);
            const dayTasks = tasksByDate[key] || [];
            const done     = dayTasks.filter(t => t.submitted).length;
            const pending  = dayTasks.filter(t => !t.submitted && !t.locked).length;
            const sel      = d === selectedDay;
            const tod      = isToday(d);

            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={[
                  'relative flex flex-col items-center justify-start rounded-2xl pt-2 pb-1 px-1 transition-all duration-150 min-h-[52px]',
                  sel
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105 z-10'
                    : tod
                    ? 'ring-2 ring-primary hover:bg-accent'
                    : 'hover:bg-accent',
                ].join(' ')}
              >
                <span className={`text-sm font-semibold leading-none ${tod && !sel ? 'text-primary' : ''}`}>
                  {d}
                </span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                    {done    > 0 && <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-green-300' : 'bg-green-500'}`} />}
                    {pending > 0 && <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-yellow-200' : 'bg-yellow-400'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground select-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            {isAr ? 'مكتملة' : 'Completed'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
            {isAr ? 'معلقة' : 'Pending'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary inline-block" />
            {isAr ? 'اليوم' : 'Today'}
          </span>
        </div>
      </div>

      {/* ── Side panel ── */}
      <div className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-s border-border flex flex-col bg-card">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-primary" />
            <span className="font-semibold text-sm">
              {MONTHS[month]} {selectedDay}،  {year}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedTasks.length > 0
              ? `${selectedTasks.length} ${isAr ? 'مهمة' : 'task(s)'}`
              : isAr ? 'لا توجد مهام' : 'No tasks'}
          </p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <CalendarDays size={44} className="mb-3 opacity-20" />
              <p className="text-sm">{isAr ? 'لا توجد مهام في هذا اليوم' : 'No tasks on this day'}</p>
            </div>
          ) : selectedTasks.map(task => (
            <div
              key={task.id}
              onClick={() => !task.locked && !task.submitted && navigate(`/user/tasks/${task.id}`)}
              className={[
                'rounded-xl border p-3.5 transition-all',
                task.submitted
                  ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800/50'
                  : task.locked
                  ? 'border-border bg-muted/20 opacity-60'
                  : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800/50 cursor-pointer hover:shadow-sm hover:-translate-y-0.5',
              ].join(' ')}
            >
              <div className="flex items-start gap-2.5">
                {task.submitted
                  ? <CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" />
                  : task.locked
                  ? <Lock        size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                  : <Clock       size={15} className="text-yellow-600 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium leading-snug">
                    {isAr && task.title_ar ? task.title_ar : task.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    task.submitted ? 'text-green-600' : task.locked ? 'text-muted-foreground' : 'text-yellow-600'
                  }`}>
                    {task.submitted
                      ? (isAr ? 'مكتملة' : 'Completed')
                      : task.locked
                      ? (isAr ? 'مقفلة' : 'Locked')
                      : (isAr ? 'اضغط للبدء' : 'Tap to start')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
