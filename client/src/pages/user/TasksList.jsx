import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../components/ui/toast';
import { CheckCircle, Clock, Lock, Calendar } from 'lucide-react';

export default function UserTasksList() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerModal, setAnswerModal] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    axios.get('/api/tasks').then(({ data }) => setTasks(data)).catch(() => {
      toast({ title: t('error'), variant: 'destructive' });
    }).finally(() => setLoading(false));
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

  const getStatus = (task) => {
    if (task.locked) return { label: t('locked'), variant: 'muted', icon: <Lock size={12} /> };
    if (task.submitted) return { label: t('completed'), variant: 'success', icon: <CheckCircle size={12} /> };
    return { label: t('pending'), variant: 'warning', icon: <Clock size={12} /> };
  };

  if (loading) return <div className="p-8 text-center">{t('loading')}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('my_tasks')}</h1>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t('no_tasks')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => {
            const status = getStatus(task);
            return (
              <div
                key={task.id}
                title={task.locked ? t('complete_previous') : ''}
                onClick={() => handleCardClick(task)}
                className={`cursor-pointer transition-all ${task.locked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:-translate-y-0.5'}`}
              >
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm leading-snug">
                        {isAr && task.title_ar ? task.title_ar : task.title}
                      </h3>
                      <Badge variant={status.variant} className="shrink-0 flex items-center gap-1">
                        {status.icon}{status.label}
                      </Badge>
                    </div>
                    {(task.description || task.description_ar) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {isAr && task.description_ar ? task.description_ar : task.description}
                      </p>
                    )}
                    {task.scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar size={11} />
                        {new Date(task.scheduled_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!answerModal} onClose={() => setAnswerModal(null)}>
        <DialogContent onClose={() => setAnswerModal(null)} className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {answerModal && (isAr && answerModal.title_ar ? answerModal.title_ar : answerModal.title)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {answers.map((ans, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-medium">
                  {isAr && ans.question_ar ? ans.question_ar : ans.question_text}
                </p>
                <p className="text-sm bg-muted rounded-md px-3 py-2">{ans.answer_text}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
