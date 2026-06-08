import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../components/ui/toast';
import { Upload, FileSpreadsheet, Download, TreePine, Sprout, Leaf, Pencil, Plus } from 'lucide-react';

export default function UploadTask() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const editId = searchParams.get('edit');
  const isEdit = !!editId;

  const [form, setForm] = useState({
    title: '', title_ar: '', description: '', description_ar: '',
    auto_schedule: false, scheduled_at: '', requires_previous: false,
  });
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [file, setFile] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [downloading, setDownloading] = useState(false);
  const [downloadingExisting, setDownloadingExisting] = useState(false);

  // Fetch task data when editing
  useEffect(() => {
    if (!isEdit) return;
    setFetching(true);
    axios.get(`/api/tasks/${editId}`)
      .then(({ data }) => {
        setForm({
          title: data.title || '',
          title_ar: data.title_ar || '',
          description: data.description || '',
          description_ar: data.description_ar || '',
          auto_schedule: !!data.auto_schedule,
          requires_previous: !!data.requires_previous,
          scheduled_at: data.scheduled_at ? data.scheduled_at.slice(0, 16) : '',
        });
        setExistingQuestions(data.questions || []);
      })
      .catch(() => toast({ title: t('error'), description: 'Failed to load task', variant: 'destructive' }))
      .finally(() => setFetching(false));
  }, [editId]);

  // Download blank template
  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const { data } = await axios.get('/api/tasks/template', { responseType: 'blob' });
      triggerDownload(data, 'questions-template.xlsx');
    } catch {
      toast({ title: t('error'), description: 'Failed to download template', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  // Download existing questions for this task
  const downloadExisting = async () => {
    setDownloadingExisting(true);
    try {
      const { data } = await axios.get(`/api/tasks/${editId}/questions-excel`, { responseType: 'blob' });
      triggerDownload(data, `task-${editId}-questions.xlsx`);
    } catch {
      toast({ title: t('error'), description: 'Failed to download questions', variant: 'destructive' });
    } finally {
      setDownloadingExisting(false);
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(new Blob([blob]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      previewFile(f);
    }
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); previewFile(f); }
  };

  const previewFile = async (f) => {
    const fd = new FormData();
    fd.append('file', f);
    try {
      const { data } = await axios.post('/api/tasks/parse-preview', fd);
      setPreviewQuestions(data.questions);
    } catch {
      toast({ title: t('error'), description: 'Failed to parse file', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      let taskId = editId;

      if (isEdit) {
        await axios.patch(`/api/tasks/${editId}`, {
          ...form,
          auto_schedule: form.auto_schedule ? 1 : 0,
          requires_previous: form.requires_previous ? 1 : 0,
          scheduled_at: form.scheduled_at || null,
        });
      } else {
        const { data: task } = await axios.post('/api/tasks', {
          ...form,
          auto_schedule: form.auto_schedule ? 1 : 0,
          requires_previous: form.requires_previous ? 1 : 0,
          scheduled_at: form.scheduled_at || null,
        });
        taskId = task.id;
      }

      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await axios.post(`/api/tasks/upload-questions/${taskId}`, fd);
      }

      toast({
        title: t('success'),
        description: isEdit ? 'تم حفظ التعديلات بنجاح!' : 'تم إنشاء المهمة بنجاح!',
      });
      navigate('/admin/tasks');
    } catch (err) {
      toast({ title: t('error'), description: err.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        {isEdit ? <Pencil size={20} className="text-primary" /> : <Plus size={20} className="text-primary" />}
        <h1 className="text-2xl font-bold">
          {isEdit ? 'تعديل المهمة' : t('upload_task')}
        </h1>
        {isEdit && (
          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            #{editId}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>معلومات المهمة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('task_name_ar')} *</Label>
                <Input dir="rtl" value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('task_name_en')}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('description_ar')}</Label>
                <Input dir="rtl" value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('description_en')}</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_schedule}
                  onChange={e => setForm(f => ({ ...f, auto_schedule: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t('auto_schedule')}</span>
              </label>

              <div className="space-y-1.5">
                <Label>{form.auto_schedule ? t('schedule_date') : t('schedule_datetime')}</Label>
                <Input
                  type={form.auto_schedule ? 'date' : 'datetime-local'}
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requires_previous}
                  onChange={e => setForm(f => ({ ...f, requires_previous: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">{t('requires_previous')}</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('upload_questions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Existing questions panel (edit mode only) */}
            {isEdit && existingQuestions.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-green-600" />
                    <span className="text-sm font-medium">
                      الأسئلة الحالية
                      <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                        {existingQuestions.length}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadExisting}
                    disabled={downloadingExisting}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 transition-colors shadow-sm"
                  >
                    <Download size={12} />
                    {downloadingExisting ? '...' : 'تحميل Excel'}
                  </button>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-border text-sm">
                  {existingQuestions.map((q, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-muted-foreground text-xs mt-0.5 shrink-0 w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        {q.question_ar && <p dir="rtl" className="truncate">{q.question_ar}</p>}
                        {q.question_text && <p className="text-xs text-muted-foreground truncate">{q.question_text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Green template banner */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 p-5 shadow-md">
              <TreePine size={80} className="absolute -right-3 -bottom-4 text-green-300/30" />
              <TreePine size={52} className="absolute right-14 -bottom-2 text-green-300/20" />
              <Sprout   size={36} className="absolute right-32 bottom-2  text-green-200/25" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 rounded-lg p-2 shrink-0">
                    <TreePine size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-snug">
                      {isEdit ? 'استبدال الأسئلة' : 'القراءة تُنمّي العقول'}
                    </p>
                    <p className="text-green-100 text-xs mt-0.5 leading-relaxed">
                      {isEdit
                        ? 'حمّل القالب الفارغ · عدّل الأسئلة · ارفع الملف'
                        : 'Download the template · fill your questions · upload it back'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-green-100 text-xs">
                      <span className="flex items-center gap-1"><Leaf size={11} /> Column A — English</span>
                      <span className="flex items-center gap-1"><Sprout size={11} /> Column B — Arabic</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  disabled={downloading}
                  className="shrink-0 inline-flex items-center gap-2 bg-white text-green-700 hover:bg-green-50 disabled:opacity-60 font-semibold text-xs px-4 py-2.5 rounded-lg shadow transition-colors"
                >
                  <Download size={14} />
                  {downloading ? '...' : 'قالب فارغ'}
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-green-500">
                  <FileSpreadsheet size={32} />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">{previewQuestions.length} questions parsed</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload size={32} />
                  <span>{t('drag_drop')}</span>
                  <span className="text-xs">Column A: English • Column B: Arabic (optional)</span>
                  {isEdit && existingQuestions.length > 0 && (
                    <span className="text-xs text-amber-500 mt-1">
                      رفع ملف جديد سيستبدل الأسئلة الحالية
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* New questions preview */}
            {previewQuestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('preview_questions')} ({previewQuestions.length})</h4>
                <div className="max-h-48 overflow-y-auto rounded-lg border divide-y divide-border text-sm">
                  {previewQuestions.map((q, i) => (
                    <div key={i} className="px-3 py-2 flex items-start gap-3">
                      <span className="text-muted-foreground text-xs mt-0.5 shrink-0">{i + 1}</span>
                      <div>
                        <div>{q.question_text}</div>
                        {q.question_ar && <div className="text-muted-foreground text-xs" dir="rtl">{q.question_ar}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tasks')}>{t('cancel')}</Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('loading') : isEdit ? 'حفظ التعديلات' : t('create_task')}
          </Button>
        </div>
      </form>
    </div>
  );
}
