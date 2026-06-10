import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/toast';
import { Heart, MessageCircle, Copy, Send, Trash2, ImageOff, CheckCheck } from 'lucide-react';

const FEED_PAGE_SIZE = 5;

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
    <div className="flex items-center justify-center gap-1 mt-6 flex-wrap" dir="ltr">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            className={`min-w-[34px] py-1.5 rounded-md border text-sm font-medium transition-colors ${
              p === page
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
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
        className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────
function timeAgo(dateStr, t) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return t('time_just_now');
  if (diff < 3600)  return t('time_minutes_ago', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time_hours_ago',   { n: Math.floor(diff / 3600) });
  return t('time_days_ago', { n: Math.floor(diff / 86400) });
}

function Avatar({ name }) {
  const letter = name ? name[0].toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
      {letter}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────
function PostCard({ post, currentUser, onLikeToggle }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [copied, setCopied]             = useState(false);
  const inputRef = useRef(null);

  const loadComments = async () => {
    if (comments.length > 0) return;
    setLoadingComments(true);
    try {
      const { data } = await axios.get(`/api/posts/${post.id}/comments`);
      setComments(data);
    } catch {
      toast({ title: t('comment_load_error'), variant: 'destructive' });
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
    if (next) setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`/api/posts/${post.id}/comments`, { comment_text: commentText.trim() });
      setComments(prev => [...prev, data]);
      setCommentText('');
    } catch {
      toast({ title: t('comment_send_error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`/api/posts/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      toast({ title: t('comment_delete_error'), variant: 'destructive' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(post.description).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <article className="bg-card border border-border rounded-md shadow-sm overflow-hidden">

      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar name={post.author_name} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-none">{post.author_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(post.created_at, t)}</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.description}</p>
      </div>

      {post.image_path ? (
        <div className="bg-muted border-y border-border overflow-hidden">
          <img src={post.image_path} alt="post" className="w-full max-h-[480px] object-cover" />
        </div>
      ) : null}

      {(post.like_count > 0 || post.comment_count > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-b border-border">
          {post.like_count > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-[#8B2020] flex items-center justify-center">
                <Heart size={9} className="text-white fill-white" />
              </span>
              {post.like_count}
            </span>
          )}
          {post.comment_count > 0 && (
            <button onClick={toggleComments} className="hover:underline ms-auto">
              {post.comment_count} {t('comment_action')}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center border-b border-border">
        <button
          onClick={() => onLikeToggle(post.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 ${
            post.liked_by_me ? 'text-[#8B2020]' : 'text-muted-foreground'
          }`}
        >
          <Heart size={16} className={post.liked_by_me ? 'fill-[#8B2020]' : ''} />
          {t('like_action')}
        </button>

        <button
          onClick={toggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors border-x border-border"
        >
          <MessageCircle size={16} />
          {t('comment_action')}
        </button>

        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 ${
            copied ? 'text-[#3D6B35]' : 'text-muted-foreground'
          }`}
        >
          {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
          {copied ? t('copied_text') : t('copy_text')}
        </button>
      </div>

      {showComments && (
        <div className="px-4 py-3 space-y-3 bg-background/50">
          {loadingComments ? (
            <p className="text-xs text-muted-foreground text-center py-2">{t('loading_comments')}</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">{t('no_comments')}</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar name={c.username} />
                <div className="flex-1 min-w-0 bg-muted/50 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{c.username}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground">{timeAgo(c.created_at, t)}</p>
                      {(c.username === currentUser?.username || currentUser?.role === 'admin') && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 leading-snug">{c.comment_text}</p>
                </div>
              </div>
            ))
          )}

          <form onSubmit={handleComment} className="flex items-center gap-2 pt-1">
            <Avatar name={currentUser?.username} />
            <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 border border-border">
              <input
                ref={inputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('comment_placeholder')}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="text-primary hover:text-primary/80 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

// ── UserFeed ──────────────────────────────────────────────────
export default function UserFeed() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);

  useEffect(() => {
    axios.get('/api/posts')
      .then(({ data }) => setPosts(data))
      .catch(() => toast({ title: t('reflection_load_error'), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  const handleLikeToggle = async (postId) => {
    try {
      const { data } = await axios.post(`/api/posts/${postId}/like`);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked_by_me: data.liked, like_count: p.like_count + (data.liked ? 1 : -1) }
          : p
      ));
    } catch {
      toast({ title: t('like_error'), variant: 'destructive' });
    }
  };

  // Sort newest first
  const sorted = useMemo(() =>
    [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  [posts]);

  const paginated = useMemo(() => {
    const start = (page - 1) * FEED_PAGE_SIZE;
    return sorted.slice(start, start + FEED_PAGE_SIZE);
  }, [sorted, page]);

  if (loading) return (
    <div className="py-20 text-center text-muted-foreground">{t('loading')}</div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">{t('reflections')}</h1>
        {sorted.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {sorted.length} {t('reflections').toLowerCase()}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-md">
          <ImageOff size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('no_reflections')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onLikeToggle={handleLikeToggle}
            />
          ))}
          <Paginator
            page={page}
            total={sorted.length}
            pageSize={FEED_PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
