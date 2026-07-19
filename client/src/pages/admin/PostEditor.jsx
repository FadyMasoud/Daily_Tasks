import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/toast';
import { Button } from '../../components/ui/button';
import CommentsThread from '../../components/CommentsThread';
import { Upload, X, ArrowRight, MessageCircle } from 'lucide-react';

export default function PostEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (!isEdit) return;
    axios.get('/api/posts')
      .then(({ data }) => {
        const post = data.find(p => String(p.id) === String(id));
        if (!post) { navigate('/admin/posts'); return; }
        setDescription(post.description);
        if (post.image_path) setImagePreview(post.image_path);
      })
      .catch(() => toast({ title: t('reflection_load_one_error'), variant: 'destructive' }))
      .finally(() => setFetching(false));
  }, [id]);

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({ title: t('reflection_file_error'), description: t('reflection_file_hint'), variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return toast({ title: t('reflection_content_required'), variant: 'destructive' });

    const fd = new FormData();
    fd.append('description', description.trim());
    if (imageFile) fd.append('image', imageFile);

    setLoading(true);
    try {
      if (isEdit) {
        await axios.patch(`/api/posts/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast({ title: t('reflection_updated') });
      } else {
        await axios.post('/api/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast({ title: t('reflection_published') });
      }
      navigate('/admin/posts');
    } catch (err) {
      toast({ title: t('reflection_save_error'), description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div className={isEdit ? 'max-w-5xl mx-auto' : 'max-w-xl mx-auto'}>
      <button
        onClick={() => navigate('/admin/posts')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowRight size={14} />
        {t('back_to_reflections')}
      </button>

      <div className={isEdit ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start' : ''}>
        <div>
          <h1 className="text-xl font-bold mb-6">{isEdit ? t('edit_reflection') : t('new_reflection')}</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('image_optional')}
          </label>

          {imagePreview ? (
            <div className="relative rounded-md overflow-hidden border border-border aspect-video bg-muted">
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1 border border-border transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={e => handleFile(e.target.files[0])}
                className="hidden"
              />
              <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('image_drag')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('image_hint')}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('content_label')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('content_placeholder')}
            rows={6}
            required
            className="w-full border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-md px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all resize-none leading-relaxed"
          />
          <p className="text-xs text-muted-foreground text-end">{t('chars_count', { n: description.length })}</p>
        </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/posts')}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('saving') : isEdit ? t('save_changes') : t('publish')}
              </Button>
            </div>
          </form>
        </div>

        {isEdit && (
          <aside className="mt-8 lg:mt-0 lg:sticky lg:top-6">
            <div className="bg-card border border-border rounded-md shadow-sm flex flex-col lg:max-h-[calc(100vh-7rem)]">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <MessageCircle size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t('comments_title')}
                  {commentCount > 0 && <span className="text-muted-foreground font-normal"> · {commentCount}</span>}
                </h2>
              </div>
              <CommentsThread
                postId={id}
                currentUser={user}
                initialCount={8}
                pageSize={10}
                scroll
                onCountChange={setCommentCount}
                className="flex flex-col flex-1 min-h-0 px-4 py-3"
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
