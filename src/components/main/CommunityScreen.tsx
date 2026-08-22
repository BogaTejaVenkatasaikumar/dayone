import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Send, Users, Sparkles, Hash } from 'lucide-react';
import { communityApi } from '../../api';

export const CommunityScreen = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await communityApi.getPosts('general');
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || submitting) return;

    setSubmitting(true);
    try {
      await communityApi.createPost('Discussion', newPost, 'general');
      setNewPost('');
      await fetchPosts();
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleLike = async (postId: string) => {
    try {
      await communityApi.likePost(postId);
      // Optimistic UI update
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Collaborative Network</span>
        <h2 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface">Community Hub</h2>
      </div>

      <div className="bg-surface-container rounded-[2rem] p-6 border border-outline-variant/10 shadow-xl space-y-6">
        <h4 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" /> Start a Discussion
        </h4>
        <form onSubmit={handlePostSubmit} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            className="flex-1 p-4 rounded-xl bg-surface-container-high border-none text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary outline-none transition-all text-xs font-semibold"
            placeholder="Share your progress, ask a question, or inspire others..."
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            disabled={submitting}
            required
          />
          <button
            type="submit"
            disabled={submitting || !newPost.trim()}
            className="px-6 py-4 rounded-xl bg-primary-container text-white font-headline font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Share'} <Send size={14} />
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <h4 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2">
            <Hash size={20} className="text-tertiary" /> Global Feed
          </h4>
          <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full"><Users size={14} /> {posts.length} Discussions</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant font-semibold text-sm">Syncing community posts...</div>
        ) : posts.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-12 border border-outline-variant/10 text-center space-y-4 shadow-sm">
            <Users size={32} className="text-on-surface-variant/30 mx-auto" />
            <h4 className="font-headline font-bold text-lg text-on-surface">No Posts Yet</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">Be the first to share your learning journey with the community!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-surface-container rounded-[1.5rem] p-6 border border-outline-variant/10 shadow-sm space-y-4 transition-all hover:border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shadow-inner">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{post.author_name}</h5>
                    <span className="text-[10px] text-on-surface-variant font-semibold">
                      {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-on-surface-variant leading-relaxed">{post.content}</p>

                <div className="pt-3 border-t border-outline-variant/5 flex gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-error transition-colors group"
                  >
                    <Heart size={16} className="group-hover:fill-error/20" /> {post.likes_count} Likes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
