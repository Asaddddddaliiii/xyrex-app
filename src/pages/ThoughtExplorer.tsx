import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Telescope, Brain, AlertCircle, HelpCircle, Trash2, History, ChevronRight, ShieldAlert, Sparkles } from "lucide-react";
import { geminiService, ThoughtAnalysis } from "@/src/services/gemini";
import { cn } from "@/src/lib/utils";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, limit, deleteDoc, doc, getDocs, getDoc } from "firebase/firestore";

const LOADING_MESSAGES = [
  "Thinking this through...",
  "Let’s take a closer look...",
  "Breaking this down...",
  "Looking deeper into this thought...",
  "Thinking alongside you..."
];

export const ThoughtExplorerPage = () => {
  const [thought, setThought] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<ThoughtAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "thoughts"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
      setLoadingHistory(false);
    }, (err) => {
      console.error("History fetch failed:", err);
      setLoadingHistory(false);
    });

    return () => unsub();
  }, []);

  const handleAnalyze = async () => {
    if (!thought.trim() || !auth.currentUser) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    // Cycle loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
      });
    }, 2000);

    try {
      const result = await geminiService.analyzeThought(thought);
      setAnalysis(result);
    } catch (err: any) {
      console.error("Thought analysis failed:", err);
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      clearInterval(messageInterval);
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis || !auth.currentUser) return;
    setIsSaving(true);
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      await addDoc(collection(db, "thoughts"), {
        userId: auth.currentUser.uid,
        userName: userData?.name || auth.currentUser.displayName || "Anonymous",
        userPhoto: userData?.photoURL || auth.currentUser.photoURL,
        thoughtText: thought,
        analysis,
        isPublic,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      setAnalysis(null);
      setThought("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "thoughts");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "thoughts", id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8 md:space-y-12 text-left">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Telescope className="text-foreground shrink-0" size={28} />
          <h1 className="text-2xl md:text-5xl font-display font-bold">Thought Explorer</h1>
        </div>
        <p className="text-sm md:text-lg text-muted">A private space to explore "what if" thoughts safely.</p>
      </header>

      <div className="space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-medium text-muted uppercase tracking-wider">What's on your mind?</label>
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="Enter a thought... (e.g., What if I quit everything?)"
            className="w-full bg-card border border-border rounded-xl p-4 text-xl focus:outline-none focus:border-muted transition-colors min-h-[120px] resize-none"
          />
        </div>

        <div className="flex items-center gap-8 pt-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn("w-10 h-5 rounded-full p-1 transition-colors", isPublic ? "bg-foreground" : "bg-border")}>
              <div className={cn("w-3 h-3 bg-background rounded-full transition-transform", isPublic ? "translate-x-5" : "translate-x-0")} />
            </div>
            <input type="checkbox" className="hidden" checked={isPublic} onChange={() => setIsPublic(!isPublic)} />
            <span className="text-sm font-medium">Public Thought (Share with Community)</span>
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={handleAnalyze}
          disabled={!thought.trim() || isAnalyzing}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              {loadingMessage}
            </>
          ) : (
            <>
              <Telescope size={24} />
              Analyze Thought
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12 pt-8 border-t border-border"
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-3xl md:text-4xl font-display font-bold leading-tight">{analysis.openingLine}</h3>
                <p className="text-xl md:text-2xl text-muted leading-relaxed font-medium italic opacity-70">
                  {analysis.collaborativeFraming}
                </p>
              </div>

              <div className="p-8 rounded-3xl border-2 border-foreground/10 bg-foreground/5 dark:bg-foreground/5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Sparkles size={16} /> Initial Insight
                </h3>
                <p className="text-xl italic font-serif leading-relaxed text-foreground/80">
                  "{analysis.insightLayer}"
                </p>
              </div>
            </div>

            {analysis.isHarmful && (
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
                  <p className="text-muted text-lg leading-relaxed whitespace-pre-wrap">{analysis.analysis}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted">Potential Outcomes</h4>
                  <ul className="space-y-3">
                    {analysis.outcomes.map((outcome, i) => (
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
                    {analysis.risks.map((risk, i) => (
                      <li key={i} className="text-base text-muted flex gap-3">
                        <span className="text-red-500 font-bold select-none">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card space-y-4 p-10 rounded-[2rem]">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Long-term View</h3>
                  <p className="text-base text-muted leading-relaxed">{analysis.longTermImpact}</p>
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
                  {analysis.interpretationLayer}
                </p>
              </div>

              <div className="card bg-foreground/5 border-foreground/10 p-8 space-y-8">
                <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                  <HelpCircle size={24} className="text-muted" /> Some things to ponder
                </h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  {analysis.reflectionQuestions.map((q, i) => (
                    <div key={i} className="p-6 bg-background rounded-2xl border border-border text-lg text-muted italic leading-relaxed">
                      "{q}"
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card border-dashed border-2 p-12 md:p-16 text-center space-y-6 shadow-2xl shadow-foreground/5">
              <p className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight tracking-tight">
                {analysis.reflectiveQuestion}
              </p>
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary px-12 py-4 text-lg flex items-center gap-2"
              >
                {isSaving && <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
                {isPublic ? "Share with Community" : "Save Privately"}
              </button>
            </div>

            {analysis.supportMessage && (
              <div className="p-6 card border-dashed border-muted text-center">
                <p className="text-sm text-muted italic">{analysis.supportMessage}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-6 pt-12 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <History size={24} className="text-muted" /> Recent Thoughts
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Your History</span>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <div className="grid gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                className="card p-4 flex items-center justify-between group hover:border-muted transition-colors"
              >
                <div className="flex items-center gap-4 flex-grow">
                  <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center">
                    <Telescope size={20} className="text-muted" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-medium line-clamp-1">{item.thoughtText}</h4>
                    <p className="text-[10px] text-muted uppercase tracking-wider">
                      {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setAnalysis(item.analysis)}
                    className="p-2 text-muted hover:text-foreground transition-colors"
                    title="View Analysis"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card border-dashed py-12 text-center text-muted">
            No recent thoughts explored.
          </div>
        )}
      </section>
    </div>
  );
};
