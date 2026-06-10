import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../components/ui/toast';
import {
  Upload, FileSpreadsheet, Download, Pencil, Plus,
  Trash2, ChevronUp, ChevronDown,
} from 'lucide-react';

export default function UploadTask() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const editId = searchParams.get('edit');
  const isEdit = !!editId;

  // ── Task form ──────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '', title_ar: '', description: '', description_ar: '',
    auto_schedule: false, scheduled_at: '', requires_previous: false,
  });

  // ── Excel mode state ───────────────────────────────────────
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [file, setFile] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [dragging, setDragging] = useState(false);

  // ── Manual mode state ──────────────────────────────────────
  const [questionMode, setQuestionMode] = useState('excel'); // 'excel' | 'manual'
  const [manualQuestions, setManualQuestions] = useState([]);
  const [newQ, setNewQ] = useState({ question_ar: '', question_text: '' });
  const [editingIdx, setEditingIdx] = useState(null);
  const [editQ, setEditQ] = useState({ question_ar: '', question_text: '' });

  // ── UI state ───────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [downloading, setDownloading] = useState(false);
  const [downloadingExisting, setDownloadingExisting] = useState(false);

  // ── Fetch task data when editing ───────────────────────────
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

  // ── Switch to manual mode (pre-load existing questions once) ─
  const switchToManual = () => {
    setQuestionMode('manual');
    if (manualQuestions.length === 0 && existingQuestions.length > 0) {
      setManualQuestions(existingQuestions.map(q => ({
        question_ar: q.question_ar || '',
        question_text: q.question_text || '',
      })));
    }
  };

  // ── Manual question operations ─────────────────────────────
  const addQuestion = () => {
    if (!newQ.question_ar.trim() && !newQ.question_text.trim()) return;
    setManualQuestions(prev => [...prev, { ...newQ }]);
    setNewQ({ question_ar: '', question_text: '' });
  };

  const removeQuestion = (idx) => {
    setManualQuestions(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveQuestion = (idx, dir) => {
    const next = [...manualQuestions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setManualQuestions(next);
  };

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditQ({ ...manualQuestions[idx] });
  };

  const saveEdit = () => {
    setManualQuestions(prev => prev.map((q, i) => i === editingIdx ? { ...editQ } : q));
    setEditingIdx(null);
  };

  const handleNewQKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addQuestion(); }
  };

  // ── Excel helpers ──────────────────────────────────────────
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

  // ── Submit ─────────────────────────────────────────────────
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

      if (questionMode === 'manual' && manualQuestions.length > 0) {
        await axios.post(`/api/tasks/save-questions/${taskId}`, { questions: manualQuestions });
      } else if (questionMode === 'excel' && file) {
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
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t('loading')}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
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

        {/* ── Task info card ── */}
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

        {/* ── Questions card ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>{t('upload_questions')}</CardTitle>
              {/* Mode tabs */}
              <div className="flex gap-0.5 p-1 bg-muted rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setQuestionMode('excel')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    questionMode === 'excel'
                      ? 'bg-background shadow-sm text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileSpreadsheet size={13} />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={switchToManual}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    questionMode === 'manual'
                      ? 'bg-background shadow-sm text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Pencil size={13} />
                  يدوي
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* ── Excel mode ── */}
            {questionMode === 'excel' && (
              <>
                {/* Existing questions panel (edit only) */}
                {isEdit && existingQuestions.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={15} className="text-primary" />
                        <span className="text-sm font-medium">
                          الأسئلة الحالية
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                            {existingQuestions.length}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={downloadExisting}
                        disabled={downloadingExisting}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 transition-colors"
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

                {/* Template info box */}
                <div className="rounded-md border border-border bg-muted/40 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-md p-2 shrink-0 border border-primary/20">
                        <FileSpreadsheet size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {isEdit ? 'استبدال الأسئلة' : 'القراءة تُنمّي العقول'}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                          {isEdit
                            ? 'حمّل القالب الفارغ · عدّل الأسئلة · ارفع الملف'
                            : 'Download the template · fill your questions · upload it back'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-xs">
                          <span>Column A — Arabic</span>
                          <span className="text-border">·</span>
                          <span>Column B — English</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      disabled={downloading}
                      className="shrink-0 inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 font-semibold text-xs px-4 py-2.5 rounded-md transition-colors"
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
                    <div className="flex flex-col items-center gap-2 text-primary">
                      <FileSpreadsheet size={32} />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">{previewQuestions.length} questions parsed</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload size={32} />
                      <span>{t('drag_drop')}</span>
                      <span className="text-xs">Column A: Arabic • Column B: English (optional)</span>
                      {isEdit && existingQuestions.length > 0 && (
                        <span className="text-xs text-[#A07830] mt-1">
                          رفع ملف جديد سيستبدل الأسئلة الحالية
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview after parse */}
                {previewQuestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('preview_questions')} ({previewQuestions.length})</h4>
                    <div className="max-h-48 overflow-y-auto rounded-lg border divide-y divide-border text-sm">
                      {previewQuestions.map((q, i) => (
                        <div key={i} className="px-3 py-2 flex items-start gap-3">
                          <span className="text-muted-foreground text-xs mt-0.5 shrink-0">{i + 1}</span>
                          <div>
                            {q.question_ar && <div dir="rtl">{q.question_ar}</div>}
                            {q.question_text && <div className="text-muted-foreground text-xs">{q.question_text}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Manual mode ── */}
            {questionMode === 'manual' && (
              <div className="space-y-3">

                {/* Question count badge */}
                {manualQuestions.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {manualQuestions.length} سؤال مضاف
                  </p>
                )}

                {/* Questions list */}
                {manualQuestions.length > 0 ? (
                  <div className="rounded-md border border-border overflow-hidden divide-y divide-border">
                    {manualQuestions.map((q, i) => (
                      <div key={i} className="bg-card">
                        {editingIdx === i ? (
                          /* Inline edit row */
                          <div className="px-3 py-2.5 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                dir="rtl"
                                placeholder="السؤال بالعربية"
                                value={editQ.question_ar}
                                onChange={e => setEditQ(q => ({ ...q, question_ar: e.target.value }))}
                                autoFocus
                              />
                              <Input
                                placeholder="Question in English"
                                value={editQ.question_text}
                                onChange={e => setEditQ(q => ({ ...q, question_text: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={saveEdit}>حفظ</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setEditingIdx(null)}>إلغاء</Button>
                            </div>
                          </div>
                        ) : (
                          /* Display row */
                          <div className="flex items-start gap-2 px-3 py-2.5">
                            <span className="text-muted-foreground text-xs w-5 mt-0.5 text-center shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(i)}>
                              <p className="text-sm text-foreground leading-snug" dir="rtl">
                                {q.question_ar || <span className="text-muted-foreground italic">—</span>}
                              </p>
                              {q.question_text && (
                                <p className="text-xs text-muted-foreground mt-0.5">{q.question_text}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveQuestion(i, -1)}
                                disabled={i === 0}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveQuestion(i, 1)}
                                disabled={i === manualQuestions.length - 1}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                              >
                                <ChevronDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQuestion(i)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-md">
                    <p className="text-sm">لم تُضف أسئلة بعد</p>
                    <p className="text-xs mt-1 opacity-70">أضف أول سؤال من النموذج أدناه</p>
                  </div>
                )}

                {/* Add question form */}
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    إضافة سؤال جديد
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      dir="rtl"
                      placeholder="السؤال بالعربية *"
                      value={newQ.question_ar}
                      onChange={e => setNewQ(q => ({ ...q, question_ar: e.target.value }))}
                      onKeyDown={handleNewQKeyDown}
                    />
                    <Input
                      placeholder="Question in English (optional)"
                      value={newQ.question_text}
                      onChange={e => setNewQ(q => ({ ...q, question_text: e.target.value }))}
                      onKeyDown={handleNewQKeyDown}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addQuestion}
                    disabled={!newQ.question_ar.trim() && !newQ.question_text.trim()}
                    className="w-full gap-1.5"
                  >
                    <Plus size={14} />
                    إضافة
                  </Button>
                </div>

                {isEdit && existingQuestions.length > 0 && manualQuestions.length > 0 && (
                  <p className="text-xs text-[#A07830] text-center">
                    الحفظ سيستبدل الأسئلة الحالية ({existingQuestions.length}) بهذه القائمة
                  </p>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Actions ── */}
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
