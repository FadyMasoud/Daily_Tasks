import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/ui/toast';
import { ArrowLeft } from 'lucide-react';

export default function TaskDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [task, setTask] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axios.get(`/api/tasks/${id}`)
      .then(({ data }) => {
        setTask(data);
        const initial = {};
        data.questions.forEach(q => { initial[q.id] = ''; });
        setAnswers(initial);
      })
      .catch(() => {
        toast({ title: t('error'), variant: 'destructive' });
        navigate('/user/tasks');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allFilled = task.questions.every(q => answers[q.id]?.trim());
    if (!allFilled) {
      return toast({ title: t('error'), description: t('answer_all'), variant: 'destructive' });
    }

    setSubmitting(true);
    try {
      await axios.post('/api/submissions', {
        task_id: parseInt(id),
        answers: task.questions.map(q => ({ question_id: q.id, answer_text: answers[q.id] })),
      });
      toast({ title: t('success'), description: t('submitted_success') });
      navigate('/user/tasks');
    } catch (err) {
      toast({
        title: t('error'),
        description: err.response?.data?.message || 'Submission failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;
  if (!task) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/user/tasks')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('my_tasks')}
      </button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isAr && task.title_ar ? task.title_ar : task.title}</CardTitle>
          {(task.description || task.description_ar) && (
            <p className="text-sm text-muted-foreground mt-1">
              {isAr && task.description_ar ? task.description_ar : task.description}
            </p>
          )}
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-5">
        {task.questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {i + 1}. {isAr && q.question_ar ? q.question_ar : q.question_text}
            </Label>
            <Textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder={t('your_answer')}
              rows={3}
              required
            />
          </div>
        ))}

        {task.questions.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No questions for this task.</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/user/tasks')}>{t('cancel')}</Button>
          <Button type="submit" disabled={submitting || task.questions.length === 0}>
            {submitting ? t('loading') : t('submit_answers')}
          </Button>
        </div>
      </form>
    </div>
  );
}
