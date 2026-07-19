import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from './ui/toast';
import { Send, Trash2, ChevronUp } from 'lucide-react';

const COMMENT_CLAMP = 100; // characters shown before "See more"

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

// Long comments are clamped to COMMENT_CLAMP chars with an inline See more / See less toggle.
function CommentText({ text }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COMMENT_CLAMP;
  const shown = !isLong || expanded ? text : `${text.slice(0, COMMENT_CLAMP).trimEnd()}… `;

  return (
    <p className="text-sm text-foreground mt-0.5 leading-snug whitespace-pre-wrap break-words">
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-xs font-semibold text-primary hover:underline align-baseline"
        >
          {expanded ? t('see_less') : t('see_more')}
        </button>
      )}
    </p>
  );
}

/**
 * Self-contained, paginated comment thread for a post.
 * - Loads the newest `initialCount` comments on mount.
 * - "View previous comments" pulls the next `pageSize` older ones (cursor by id).
 * - New comments append at the bottom; the running total stays in sync.
 *
 * Props:
 *   postId         – required
 *   currentUser    – { username, role } for delete permission
 *   initialCount   – how many newest comments to show first (default 3)
 *   pageSize       – how many older comments each "view previous" loads (default 5)
 *   onCountChange  – optional (total) => void, fired whenever the total changes
 *   className      – wrapper classes
 *   scroll         – when true, the comment list scrolls inside a fixed max height
 */
export default function CommentsThread({
  postId,
  currentUser,
  initialCount = 3,
  pageSize = 5,
  onCountChange,
  className = '',
  scroll = false,
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [comments, setComments]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const inputRef = useRef(null);

  const bumpTotal = (next) => {
    setTotal(next);
    onCountChange?.(next);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios.get(`/api/posts/${postId}/comments`, { params: { limit: initialCount } })
      .then(({ data }) => {
        if (!active) return;
        setComments(data.comments);
        setTotal(data.total);
        onCountChange?.(data.total);
      })
      .catch(() => active && toast({ title: t('comment_load_error'), variant: 'destructive' }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadPrevious = async () => {
    if (!comments.length) return;
    setLoadingMore(true);
    try {
      const { data } = await axios.get(`/api/posts/${postId}/comments`, {
        params: { limit: pageSize, before: comments[0].id },
      });
      setComments(prev => [...data.comments, ...prev]);
      setTotal(data.total);
      onCountChange?.(data.total);
    } catch {
      toast({ title: t('comment_load_error'), variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`/api/posts/${postId}/comments`, {
        comment_text: commentText.trim(),
      });
      setComments(prev => [...prev, data]);
      bumpTotal(total + 1);
      setCommentText('');
    } catch {
      toast({ title: t('comment_send_error'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await axios.delete(`/api/posts/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      bumpTotal(Math.max(0, total - 1));
    } catch {
      toast({ title: t('comment_delete_error'), variant: 'destructive' });
    }
  };

  const hasMore = comments.length < total;

  return (
    <div className={className}>
      <div className={scroll ? 'space-y-3 overflow-y-auto pr-1 flex-1 min-h-0' : 'space-y-3'}>
        {hasMore && (
          <button
            onClick={loadPrevious}
            disabled={loadingMore}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <ChevronUp size={13} />
            {loadingMore ? t('loading_comments') : t('view_previous_comments')}
          </button>
        )}

        {loading ? (
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
                        onClick={() => handleDelete(c.id)}
                        className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <CommentText text={c.comment_text} />
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleComment} className="flex items-center gap-2 pt-3">
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
  );
}
