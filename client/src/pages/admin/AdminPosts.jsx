import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/ui/toast';
import { useConfirm } from '../../components/ui/confirm-dialog';
import { Button } from '../../components/ui/button';
import { Plus, Pencil, Trash2, Heart, MessageCircle, ImageOff } from 'lucide-react';

export default function AdminPosts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/posts')
      .then(({ data }) => setPosts(data))
      .catch(() => toast({ title: t('reflection_load_error'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    const ok = await confirm({
      type: 'delete',
      title: t('confirm_delete_post_title'),
      message: t('confirm_delete_post_msg'),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast({ title: t('reflection_deleted') });
    } catch {
      toast({ title: t('reflection_delete_error'), variant: 'destructive' });
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return t('time_just_now');
    if (diff < 3600)  return t('time_minutes_ago', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('time_hours_ago',   { n: Math.floor(diff / 3600) });
    return t('time_days_ago', { n: Math.floor(diff / 86400) });
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">{t('reflections')}</h1>
        <Link to="/admin/posts/create">
          <Button size="sm" className="flex items-center gap-1.5">
            <Plus size={14} />
            {t('new_reflection')}
          </Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-md">
          <ImageOff size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('no_reflections')}</p>
          <Link to="/admin/posts/create" className="text-primary text-sm hover:underline mt-1 inline-block">
            {t('add_first_reflection')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.id} className="bg-card border border-border rounded-md overflow-hidden shadow-sm flex flex-col">
              {post.image_path ? (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img src={post.image_path} alt="post" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted/50 flex items-center justify-center border-b border-border">
                  <ImageOff size={28} className="text-muted-foreground opacity-30" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                <p className="text-sm text-foreground leading-relaxed line-clamp-3 flex-1">
                  {post.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart size={12} className="text-[#8B2020]" />
                      {post.like_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} className="text-primary" />
                      {post.comment_count}
                    </span>
                    <span>{timeAgo(post.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                      title={t('edit')}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
