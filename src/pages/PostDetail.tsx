import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Brain, MessageCircle, Clock, Vote, MessageSquare, Send, ChevronLeft, AlertCircle, HelpCircle, Lightbulb, ListChecks, Telescope, ShieldAlert, Sparkles, CheckCircle2, X, TrendingUp } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, where, orderBy, increment, deleteField } from "firebase/firestore";
import { cn } from "@/src/lib/utils";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: string;
}

export const PostDetailPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    if (!id || !type) return;

    const collectionName = type === "decision" ? "decisions" : type === "problem" ? "problems" : "thoughts";
    const postRef = doc(db, collectionName, id);

    const unsubPost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate("/explore");
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`));

    const commentsQuery = query(
      collection(db, "comments"),
      where("postId", "==", id),
      orderBy("createdAt", "asc")
    );

    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [id, type, navigate]);

  const handleVote = async (optionIndex?: number) => {
    if (!auth.currentUser || !post || isVoting) return;
    setIsVoting(true);
    
    const collectionName = type === "decision" ? "decisions" : "problems";
    const postRef = doc(db, collectionName, id!);
    const userId = auth.currentUser.uid;
    const currentVote = post.votes && post.votes[userId];

    try {
      const updates: any = {};
      
      if (type === "decision") {
        // If user already voted for this specific option, remove it
        if (currentVote === optionIndex) {
          updates[`votes.${userId}`] = deleteField();
          updates[`optionVotes.${optionIndex}`] = increment(-1);
          updates.votesCount = increment(-1);
        } else {
          // If user had a different vote, decrement that one first
          if (currentVote !== undefined) {
            updates[`optionVotes.${currentVote}`] = increment(-1);
          } else {
            updates.votesCount = increment(1);
          }
          updates[`votes.${userId}`] = optionIndex;
          updates[`optionVotes.${optionIndex}`] = increment(1);
        }
      } else {
        // Simple vote for problems
        const hasVoted = !!currentVote;
        updates[`votes.${userId}`] = hasVoted ? deleteField() : true;
        updates.votesCount = increment(hasVoted ? -1 : 1);
      }

      await updateDoc(postRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser || isCommenting) return;
    setIsCommenting(true);

    try {
      await addDoc(collection(db, "comments"), {
        postId: id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "Anonymous",
        userPhoto: auth.currentUser.photoURL,
        text: newComment.trim(),
        createdAt: new Date().toISOString()
      });

      const collectionName = type === "decision" ? "decisions" : "problems";
      await updateDoc(doc(db, collectionName, id!), {
        commentsCount: increment(1)
      });

      setNewComment("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "comments");
    } finally {
      setIsCommenting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!post || !post.analysis) return null;

  const hasVoted = auth.currentUser && post.votes && post.votes[auth.currentUser.uid];

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-6 md:space-y-12">
      <button 
        onClick={() => navigate("/explore")}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm md:text-base"
      >
        <ChevronLeft size={18} className="md:w-5 md:h-5" /> Back to Explore
      </button>

      <div className="grid gap-8 md:gap-12 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <img 
                src={post.userPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} 
                alt={post.userName} 
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-lg md:text-xl font-bold">{post.userName}</h1>
                <p className="text-[10px] md:text-xs text-muted flex items-center gap-1 uppercase tracking-wider">
                  <Clock size={10} className="md:w-3 md:h-3" /> {new Date(post.createdAt).toLocaleDateString()} • {type}
                </p>
              </div>
            </div>

            <div className="card p-6 md:p-8 space-y-6 border-foreground/10">
              <div className="flex items-center gap-2">
                {type === "decision" ? (
                  <Brain size={20} className="text-blue-500" />
                ) : type === "problem" ? (
                  <MessageCircle size={20} className="text-green-500" />
                ) : (
                  <Telescope size={20} className="text-purple-500" />
                )}
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted">
                  {type === "decision" ? "Decision Analysis" : type === "problem" ? "Problem Breakdown" : "Thought Exploration"}
                </span>
              </div>
              <h2 className={cn(
                "font-display font-bold leading-tight",
                type === "decision" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
              )}>
                {type === "decision" ? post.question : type === "problem" ? post.description : post.thoughtText}
              </h2>
            </div>
          </section>

          {/* Opening Conversational Layer */}
          {(post.analysis.openingLine || post.analysis.collaborativeFraming) && (
            <section className="space-y-4">
              {post.analysis.openingLine && (
                <h3 className="text-xl md:text-2xl font-display font-bold leading-tight text-foreground/90">
                  {post.analysis.openingLine}
                </h3>
              )}
              {post.analysis.collaborativeFraming && (
                <p className="text-lg text-muted leading-relaxed italic border-l-2 border-border pl-4">
                  {post.analysis.collaborativeFraming}
                </p>
              )}
            </section>
          )}

          {/* AI Analysis Results */}
          <div className="space-y-12">
            {type === "decision" ? (
              <div className="space-y-12">
                <div className="grid gap-6 md:gap-8 lg:grid-cols-2 items-start">
                  {post.analysis?.options?.map((opt: any, i: number) => (
                    <div key={i} className="card space-y-6 md:space-y-8 flex flex-col p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] bg-background border-2 border-border hover:border-foreground/20 transition-all shadow-none hover:shadow-2xl hover:shadow-foreground/5 min-h-full">
                      <div className="space-y-3">
                        <div className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest opacity-50">Perspective {i + 1}</div>
                        <h3 className="text-xl md:text-3xl font-display font-bold leading-tight">{opt.title}</h3>
                      </div>

                      <div className="grid gap-6 md:gap-8 sm:grid-cols-2 flex-grow">
                        <div className="space-y-4 text-left">
                          <h4 className="text-[10px] md:text-xs font-bold text-green-500 uppercase flex items-center gap-2 tracking-widest leading-none">
                            <CheckCircle2 size={14} /> Positives
                          </h4>
                          <ul className="space-y-3 text-sm md:text-base text-muted leading-relaxed">
                            {opt.pros.map((pro: string, j: number) => <li key={j} className="flex gap-2"><span>•</span> {pro}</li>)}
                          </ul>
                        </div>
                        <div className="space-y-4 text-left">
                          <h4 className="text-[10px] md:text-xs font-bold text-red-500 uppercase flex items-center gap-2 tracking-widest leading-none">
                            <X size={14} /> Trade-offs
                          </h4>
                          <ul className="space-y-3 text-sm md:text-base text-muted leading-relaxed">
                            {opt.cons.map((con: string, j: number) => <li key={j} className="flex gap-2"><span>•</span> {con}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border">
                        <button 
                          onClick={() => handleVote(i)}
                          disabled={isVoting || auth.currentUser?.uid === post.userId}
                          className={cn(
                            "w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            post.votes?.[auth.currentUser?.uid || ""] === i 
                              ? "bg-foreground text-background" 
                              : "bg-card border border-border text-foreground hover:border-muted",
                            auth.currentUser?.uid === post.userId && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <Vote size={14} />
                          {auth.currentUser?.uid === post.userId 
                            ? `Votes: ${post.optionVotes?.[i] || 0}`
                            : post.votes?.[auth.currentUser?.uid || ""] === i ? "Voted for this" : "Vote for this option"
                          }
                          {auth.currentUser?.uid !== post.userId && (
                            <span className="ml-1 opacity-50">({post.optionVotes?.[i] || 0})</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-12">
                  <div className="p-10 rounded-[2.5rem] bg-foreground/5 border-2 border-foreground/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Brain size={80} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-6">The Path Forward</h3>
                    <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-display font-medium">
                      {post.analysis?.interpretationLayer}
                    </p>
                  </div>

                  <div className="card space-y-4 p-8 border-foreground/10 bg-background">
                    <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={20} /> Supportive Note
                    </h3>
                    <p className="text-lg text-muted leading-relaxed italic">{post.analysis?.tradeOffs}</p>
                  </div>
                </div>
              </div>
            ) : type === "problem" ? (
              <div className="space-y-12">
                <div className="grid gap-8 md:grid-cols-2 items-start">
                  <div className="card space-y-6 p-8 rounded-[2rem]">
                    <h3 className="text-sm font-bold text-red-500 uppercase flex items-center gap-2 tracking-widest">
                      <AlertCircle size={16} /> Root Causes
                    </h3>
                    <ul className="space-y-4">
                      {post.analysis?.rootCauses?.map((cause: string, i: number) => (
                        <li key={i} className="text-base text-muted flex gap-3">
                          <span className="text-foreground font-bold select-none">{i + 1}.</span> {cause}
                        </li>
                      )) || <li className="text-base text-muted italic">No root causes identified.</li>}
                    </ul>
                  </div>

                  <div className="p-10 rounded-[2rem] border-2 border-foreground/10 bg-foreground/5 dark:bg-foreground/5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                      <Sparkles size={16} /> Initial Insight
                    </h3>
                    <p className="text-xl italic font-serif leading-relaxed text-foreground/80">
                      "{post.analysis?.insightLayer}"
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                    <Lightbulb size={24} className="text-yellow-500" /> Proposed Solutions
                  </h3>
                  <div className="grid gap-6">
                    {post.analysis?.solutions?.map((sol: any, i: number) => (
                      <div key={i} className="card space-y-6 p-8 md:p-10 rounded-[2rem] bg-background border-2 border-border hover:border-foreground/20 transition-all shadow-none hover:shadow-2xl hover:shadow-foreground/5">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-xl font-bold leading-tight">{sol.title}</h4>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-3 py-1 rounded-full border flex-shrink-0",
                            sol.difficulty === "Easy" ? "border-green-500 text-green-500 bg-green-500/5" :
                            sol.difficulty === "Medium" ? "border-yellow-500 text-yellow-500 bg-yellow-500/5" :
                            "border-red-500 text-red-500 bg-red-500/5"
                          )}>
                            {sol.difficulty}
                          </span>
                        </div>
                        <div className="grid gap-10 sm:grid-cols-2 uppercase tracking-widest text-[10px] font-bold text-muted/50">
                          <div className="space-y-3">
                            <span className="text-muted/100">Positives</span>
                            <p className="normal-case text-base font-normal opacity-100">{sol.pros.join(", ")}</p>
                          </div>
                          <div className="space-y-3">
                            <span className="text-muted/100">Trade-offs</span>
                            <p className="normal-case text-base font-normal opacity-100">{sol.cons.join(", ")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="card space-y-8 p-10 rounded-[2.5rem] border-foreground/10">
                    <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                      <ListChecks size={24} className="text-foreground" /> The Plan of Action
                    </h3>
                    <div className="space-y-6">
                      {post.analysis?.stepByStepPlan?.map((step: string, i: number) => (
                        <div key={i} className="flex gap-6 items-start group">
                          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            {i + 1}
                          </div>
                          <p className="text-muted text-lg pt-1 leading-relaxed">{step}</p>
                        </div>
                      )) || <p className="text-base text-muted italic">No plan identified.</p>}
                    </div>
                  </div>

                  <div className="p-10 rounded-[2.5rem] bg-foreground/5 border-2 border-foreground/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Brain size={120} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-8">The Overall Meaning</h3>
                    <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-display font-medium max-w-4xl">
                      {post.analysis?.interpretationLayer}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="p-10 rounded-[2.5rem] border-2 border-foreground/10 bg-foreground/5 dark:bg-foreground/5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Sparkles size={16} /> Initial Insight
                  </h3>
                  <p className="text-xl italic font-serif leading-relaxed text-foreground/80">
                    "{post.analysis?.insightLayer}"
                  </p>
                </div>

                {post.analysis?.isHarmful && (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 text-red-500">
                      <ShieldAlert size={24} />
                      <h3 className="text-lg font-bold uppercase tracking-wider">Note on Safety</h3>
                    </div>
                    <p className="text-red-500/90 font-medium leading-relaxed">
                      I’d strongly advise against acting on this. It could lead to serious harm. Let’s understand what’s behind this thought instead.
                    </p>
                  </div>
                )}

                <div className="grid gap-12 lg:grid-cols-2 items-start">
                  <div className="card space-y-8 p-10 rounded-[2rem]">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                        <Brain size={16} /> Analysis Breakdown
                      </h3>
                      <p className="text-muted text-lg leading-relaxed whitespace-pre-wrap">{post.analysis?.analysis}</p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted">Potential Outcomes</h4>
                      <ul className="space-y-3">
                        {post.analysis?.outcomes?.map((outcome: string, i: number) => (
                          <li key={i} className="text-base text-muted flex gap-3">
                            <span className="text-foreground font-bold select-none">•</span>
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="card space-y-4 p-10 rounded-[2rem] border-red-500/10">
                      <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={16} /> Risks / Challenges
                      </h3>
                      <ul className="space-y-3">
                        {post.analysis?.risks?.map((risk: string, i: number) => (
                          <li key={i} className="text-base text-muted flex gap-3">
                            <span className="text-red-500 font-bold select-none">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="card space-y-4 p-10 rounded-[2rem]">
                      <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Long-term View</h3>
                      <p className="text-base text-muted leading-relaxed">{post.analysis?.longTermImpact}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-10 rounded-[2.5rem] bg-foreground/5 border-2 border-foreground/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles size={80} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-6">The Collective Meaning</h3>
                    <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-display font-medium">
                      {post.analysis?.interpretationLayer}
                    </p>
                  </div>

                  <div className="card bg-foreground/5 border-foreground/10 p-8 space-y-8">
                    <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                      <HelpCircle size={24} className="text-muted" /> Some things to ponder
                    </h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {post.analysis?.reflectionQuestions?.map((q: string, i: number) => (
                        <div key={i} className="p-6 bg-background rounded-2xl border border-border text-lg text-muted italic leading-relaxed">
                          "{q}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Closing Conversational Layer */}
          {post.analysis?.reflectiveQuestion && (
            <div className="card border-dashed border-2 p-12 md:p-16 text-center space-y-6 shadow-2xl shadow-foreground/5">
              <p className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight tracking-tight">
                {post.analysis.reflectiveQuestion}
              </p>
            </div>
          )}

          {/* Voting & Interaction */}
          <div className="flex items-center gap-6 pt-8 border-t border-border">
            {type === "problem" && (
              <button 
                onClick={() => handleVote()}
                disabled={isVoting || auth.currentUser?.uid === post.userId}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all",
                  hasVoted ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:border-muted",
                  auth.currentUser?.uid === post.userId && "cursor-not-allowed opacity-70"
                )}
              >
                <Vote size={20} />
                {auth.currentUser?.uid === post.userId 
                  ? `Votes: ${post.votesCount || 0}`
                  : hasVoted ? "Voted" : "Helpful Analysis"
                }
                {auth.currentUser?.uid !== post.userId && (
                  <span className="ml-2 opacity-50">{post.votesCount || 0}</span>
                )}
              </button>
            )}
            {type !== "thought" && (
              <div className="flex items-center gap-2 text-muted">
                <MessageSquare size={20} />
                <span className="font-bold">{post.commentsCount || 0} Comments</span>
              </div>
            )}
          </div>

          {/* Comments Section */}
          {type !== "thought" && (
            <section className="space-y-8 pt-8">
              <h3 className="text-2xl font-display font-bold">Community Advice</h3>
              
              {auth.currentUser?.uid !== post.userId ? (
                <form onSubmit={handleAddComment} className="space-y-4">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your perspective or advice..."
                    className="w-full bg-card border border-border rounded-xl p-4 focus:outline-none focus:border-muted transition-colors min-h-[100px] resize-none"
                  />
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={!newComment.trim() || isCommenting}
                      className="btn-primary flex items-center gap-2 px-8"
                    >
                      {isCommenting ? "Posting..." : "Post Advice"}
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 card border-dashed text-center">
                  <p className="text-muted text-sm">You cannot comment on your own post. See what the community has to say!</p>
                </div>
              )}

              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <img 
                      src={comment.userPhoto || `https://picsum.photos/seed/${comment.userId}/100/100`} 
                      alt={comment.userName} 
                      className="w-10 h-10 rounded-full bg-card flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">{comment.userName}</span>
                        <span className="text-[10px] text-muted uppercase tracking-wider">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted leading-relaxed bg-card p-4 rounded-xl border border-border">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-12 card border-dashed">
                    <p className="text-muted">No advice yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar / Related Info */}
        <div className="space-y-8">
          <div className="card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted">About Xyrex Insights</h3>
            <p className="text-xs text-muted leading-relaxed">
              Xyrex uses advanced AI to provide structured thinking frameworks. Community advice adds the human element—real experiences that data can't always capture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
