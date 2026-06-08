import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ArrowRight, User, BookOpen, Calendar, CheckCircle, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';

export default function TaskUserDetail() {
  const { taskId, userId } = useParams();
  const { i18n }  = useTranslation();
  const navigate  = useNavigate();
  const { toast } = useToast();
  const isAr      = i18n.language === 'ar';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/admin/submission-detail/${taskId}/${userId}`)
      .then(({ data }) => setData(data))
      .catch(() => {
        toast({ title: 'خطأ', variant: 'destructive' });
        navigate('/admin/submissions');
      })
      .finally(() => setLoading(false));
  }, [taskId, userId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">جاري التحميل...</div>
  );
  if (!data) return null;

  const taskTitle = isAr && data.task.title_ar ? data.task.title_ar : data.task.title;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Back */}
      <button
        onClick={() => navigate('/admin/submissions')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowRight size={14} />
        العودة إلى الإجابات
      </button>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-6 mb-6 shadow-lg text-white">
        {/* decorative circle */}
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -right-6 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* Task name */}
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-white/20 rounded-xl p-2 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs text-green-200 font-medium mb-0.5">المهمة</p>
              <h1 className="text-lg font-bold leading-snug">{taskTitle}</h1>
            </div>
          </div>

          {/* User + date row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-green-100">
            <span className="flex items-center gap-1.5">
              <User size={13} />
              <span className="font-medium text-white">{data.user.username}</span>
            </span>
            <span className="text-green-300">·</span>
            <span className="flex items-center gap-1.5">
              <span>{data.user.email}</span>
            </span>
          </div>

          {/* Submission date + badge */}
          <div className="flex items-center justify-between mt-4">
            <span className="flex items-center gap-1.5 text-xs text-green-200">
              <Calendar size={12} />
              {new Date(data.submission.submitted_at).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
            </span>
            <Badge className="bg-white/20 text-white border-white/30 flex items-center gap-1">
              <CheckCircle size={11} />
              مكتملة
            </Badge>
          </div>
        </div>
      </div>

      {/* Q&A list */}
      <div className="space-y-4">
        {data.answers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد إجابات</p>
        ) : data.answers.map((ans, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Question */}
              <div className="flex items-start gap-3 px-5 pt-4 pb-3 bg-muted/30 border-b border-border">
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-medium leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
                  {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                </p>
              </div>
              {/* Answer */}
              <div className="flex items-start gap-3 px-5 py-3.5">
                <MessageSquare size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{ans.answer_text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
