import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useToast } from '../../components/ui/toast';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function UserHistory() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [submissions, setSubmissions] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [detailCache, setDetailCache] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/submissions/my')
      .then(({ data }) => setSubmissions(data))
      .catch(() => toast({ title: t('error'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (sub) => {
    const id = sub.task_id;
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!detailCache[id]) {
        try {
          const { data } = await axios.get(`/api/submissions/my/${id}`);
          setDetailCache(c => ({ ...c, [id]: data.answers }));
        } catch {
          toast({ title: t('error'), variant: 'destructive' });
        }
      }
    }
    setExpanded(next);
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('history')}</h1>

      {submissions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No completed tasks yet.</div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="rounded-xl border overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-start"
                onClick={() => toggle(sub)}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-[#3D6B35] shrink-0" />
                  <div>
                    <p className="font-medium text-sm">
                      {isAr && sub.title_ar ? sub.title_ar : sub.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('submitted_at')}: {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="shrink-0">{t('completed')}</Badge>
                <span className="ml-2 text-muted-foreground">
                  {expanded.has(sub.task_id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {expanded.has(sub.task_id) && detailCache[sub.task_id] && (
                <div className="px-5 pb-4 space-y-3 border-t border-border bg-muted/10">
                  {detailCache[sub.task_id].map((ans, i) => (
                    <div key={i} className="pt-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                      </p>
                      <p className="text-sm bg-background rounded-md px-3 py-2 border">{ans.answer_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
