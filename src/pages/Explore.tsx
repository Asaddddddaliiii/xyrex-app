import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, MessageSquare, Vote, Clock, TrendingUp, Brain, MessageCircle, Telescope } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface Post {
  id: string;
  type: "decision" | "problem" | "thought";
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  votes?: number;
  comments?: number;
  createdAt: string;
  tags: string[];
}

export const ExplorePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const filters = ["Trending", "Latest", "Most Voted"];

  useEffect(() => {
    setLoading(true);
    
    // Fetch decisions
    const dQuery = query(
      collection(db, "decisions"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const pQuery = query(
      collection(db, "problems"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const tQuery = query(
      collection(db, "thoughts"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubDecisions = onSnapshot(dQuery, (snapshot) => {
      const dPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        type: "decision" as const,
        userId: doc.data().userId,
        userName: doc.data().userName,
        userPhoto: doc.data().userPhoto,
        content: doc.data().question,
        votes: doc.data().votesCount || 0,
        comments: doc.data().commentsCount || 0,
        createdAt: doc.data().createdAt,
        tags: ["Decision", ...(doc.data().options || [])]
      }));
      
      setPosts(prev => {
        const others = prev.filter(p => p.type !== "decision");
        const combined = [...others, ...dPosts].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return combined;
      });
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "decisions"));

    const unsubProblems = onSnapshot(pQuery, (snapshot) => {
      const pPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        type: "problem" as const,
        userId: doc.data().userId,
        userName: doc.data().userName,
        userPhoto: doc.data().userPhoto,
        content: doc.data().description,
        votes: doc.data().votesCount || 0,
        comments: doc.data().commentsCount || 0,
        createdAt: doc.data().createdAt,
        tags: ["Problem"]
      }));

      setPosts(prev => {
        const others = prev.filter(p => p.type !== "problem");
        const combined = [...others, ...pPosts].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return combined;
      });
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "problems"));

    const unsubThoughts = onSnapshot(tQuery, (snapshot) => {
      const tPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        type: "thought" as const,
        userId: doc.data().userId,
        userName: doc.data().userName,
        userPhoto: doc.data().userPhoto,
        content: doc.data().thoughtText,
        votes: 0,
        comments: 0,
        createdAt: doc.data().createdAt,
        tags: ["Thought"]
      }));

      setPosts(prev => {
        const others = prev.filter(p => p.type !== "thought");
        const combined = [...others, ...tPosts].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return combined;
      });
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "thoughts"));

    return () => {
      unsubDecisions();
      unsubProblems();
      unsubThoughts();
    };
  }, []);

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(search.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-display font-bold">Explore</h1>
          <p className="text-sm md:text-base text-muted">Learn from the collective wisdom of the community.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search insights..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-muted transition-colors text-sm"
            />
          </div>
          <button className="btn-secondary p-2 rounded-full">
            <Filter size={18} />
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              filter === f ? "bg-foreground text-background" : "bg-card border border-border text-muted hover:text-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => navigate(`/explore/${post.type}/${post.id}`)}
                className="card group cursor-pointer hover:border-muted/50 transition-all p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                  <div className="space-y-4 flex-grow text-left">
                    <div className="flex items-center gap-3">
                      <img 
                        src={post.userPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} 
                        alt={post.userName} 
                        className="w-8 h-8 rounded-full bg-border"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{post.userName}</span>
                        <span className="text-[10px] text-muted flex items-center gap-1 uppercase tracking-wider">
                          <Clock size={10} /> {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {post.type === "decision" ? (
                          <Brain size={16} className="text-blue-500" />
                        ) : post.type === "problem" ? (
                          <MessageCircle size={16} className="text-green-500" />
                        ) : (
                          <Telescope size={16} className="text-purple-500" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          {post.type}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-semibold leading-tight group-hover:text-foreground transition-colors">
                        {post.content}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-border/50 text-muted">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-border md:border-none">
                    {post.type !== "thought" && (
                      <div className="flex items-center gap-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Vote size={16} />
                          <span className="text-xs font-medium">{post.votes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare size={16} />
                          <span className="text-xs font-medium">{post.comments || 0}</span>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/explore/${post.type}/${post.id}`);
                      }}
                      className="btn-secondary text-[10px] py-1 px-3 uppercase tracking-widest font-bold"
                    >
                      View Analysis
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="text-center py-20 card border-dashed">
          <p className="text-muted">No posts found matching your search.</p>
        </div>
      )}
    </div>
  );
};
