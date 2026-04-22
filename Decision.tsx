import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Brain, AlertTriangle, TrendingUp, HelpCircle, CheckCircle2, Sparkles } from "lucide-react";
import { geminiService, DecisionAnalysis } from "@/src/services/gemini";
import { cn } from "@/src/lib/utils";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const LOADING_MESSAGES = [
  "Thinking this through...",
  "Let’s take a closer look...",
  "Breaking this down...",
  "Balancing the options...",
  "Thinking alongside you..."
];

export const DecisionPage = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isPublic, setIsPublic] = useState(true);
  const [allowVoting, setAllowVoting] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => setOptions([...options, ""]);
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAnalyze = async () => {
    if (!question.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    
    // Cycle loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
      });
    }, 2000);

    try {
      const result = await geminiService.analyzeDecision(question, options.filter(o => o.trim()));
      setAnalysis(result);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      clearInterval(messageInterval);
      setIsAnalyzing(false);
    }
  };

  const handlePost = async () => {
    if (!analysis || !auth.currentUser) return;
    setIsSaving(true);
    try {
      // Fetch latest user info to ensure name/photo are correct
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;

      await addDoc(collection(db, "decisions"), {
        userId: auth.currentUser.uid,
        userName: userData?.name || auth.currentUser.displayName || "Anonymous",
        userPhoto: userData?.photoURL || auth.currentUser.photoURL,
        question,
        options: analysis.options.map(o => o.title),
        optionVotes: analysis.options.reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {}),
        analysis,
        votes: {},
        votesCount: 0,
        commentsCount: 0,
        isPublic,
        allowVoting,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      // Update user stats
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        "stats.totalDecisions": increment(1)
      });

      navigate("/explore");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "decisions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8 md:space-y-12 text-left">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-display font-bold">New Decision</h1>
        <p className="text-sm md:text-lg text-muted">Structure your thoughts and see every side.</p>
      </header>

      {!analysis ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted uppercase tracking-wider">What are you deciding?</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Should I quit my job to start a startup?"
              className="w-full bg-card border border-border rounded-xl p-4 text-xl focus:outline-none focus:border-muted transition-colors min-h-[120px] resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted uppercase tracking-wider">Options (Optional)</label>
              <button onClick={handleAddOption} className="text-xs flex items-center gap-1 hover:text-foreground transition-colors">
                <Plus size={14} /> Add Option
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((option, index) => (
                <div key={index} className="relative">
                  <input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full bg-card border border-border rounded-lg py-3 px-4 pr-10 focus:outline-none focus:border-muted transition-colors"
                  />
                  {options.length > 2 && (
                    <button 
                      onClick={() => handleRemoveOption(index)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-8 items-center pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn("w-10 h-5 rounded-full p-1 transition-colors", isPublic ? "bg-foreground" : "bg-border")}>
                <div className={cn("w-3 h-3 bg-background rounded-full transition-transform", isPublic ? "translate-x-5" : "translate-x-0")} />
              </div>
              <input type="checkbox" className="hidden" checked={isPublic} onChange={() => setIsPublic(!isPublic)} />
              <span className="text-sm font-medium">Public Post</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn("w-10 h-5 rounded-full p-1 transition-colors", allowVoting ? "bg-foreground" : "bg-border")}>
                <div className={cn("w-3 h-3 bg-background rounded-full transition-transform", allowVoting ? "translate-x-5" : "translate-x-0")} />
              </div>
              <input type="checkbox" className="hidden" checked={allowVoting} onChange={() => setAllowVoting(!allowVoting)} />
              <span className="text-sm font-medium">Allow Community Voting</span>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={!question.trim() || isAnalyzing}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                {loadingMessage}
              </>
            ) : (
              <>
                <Brain size={24} />
                Analyze Decision
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Thinking Process</h2>
            <button onClick={() => setAnalysis(null)} className="btn-secondary text-xs py-2 px-4 rounded-full">Start Over</button>
          </div>

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

          <div className="grid gap-8 lg:grid-cols-2 items-start">
            {analysis.options.map((opt, i) => (
              <div key={i} className="card space-y-8 flex flex-col p-10 rounded-[2rem] bg-background border-2 border-border hover:border-foreground/20 transition-all shadow-none hover:shadow-2xl hover:shadow-foreground/5 min-h-full">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-muted uppercase tracking-widest opacity-50">Perspective {i + 1}</div>
                  <h3 className="text-3xl md:text-4xl font-display font-bold leading-tight">{opt.title}</h3>
                </div>

                <div className="grid gap-10 sm:grid-cols-2 flex-grow">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-green-500 uppercase flex items-center gap-2 tracking-widest">
                      <CheckCircle2 size={14} /> Positives
                    </h4>
                    <ul className="space-y-3 text-base text-muted leading-relaxed">
                      {opt.pros.map((pro, j) => <li key={j} className="flex gap-2"><span>•</span> {pro}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-red-500 uppercase flex items-center gap-2 tracking-widest">
                      <X size={14} /> Trade-offs
                    </h4>
                    <ul className="space-y-3 text-base text-muted leading-relaxed">
                      {opt.cons.map((con, j) => <li key={j} className="flex gap-2"><span>•</span> {con}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            <div className="p-10 rounded-[2.5rem] bg-foreground/5 border-2 border-foreground/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain size={80} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-6">The Path Forward</h3>
              <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-display font-medium">
                {analysis.interpretationLayer}
              </p>
            </div>

            <div className="card space-y-4 border-foreground/10 bg-background p-8">
              <h3 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2 text-foreground">
                <TrendingUp size={20} /> Supportive Note
              </h3>
              <p className="text-lg text-muted leading-relaxed italic">
                {analysis.tradeOffs}
              </p>
            </div>
          </div>

          <div className="card border-dashed border-2 p-12 md:p-16 text-center space-y-6 shadow-2xl shadow-foreground/5">
            <p className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight tracking-tight">
              {analysis.reflectiveQuestion}
            </p>
          </div>

          <div className="flex justify-center pt-8">
            <button 
              onClick={handlePost}
              disabled={isSaving}
              className="btn-primary px-12 py-4 text-lg flex items-center gap-2"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
              {isPublic ? "Post to Community" : "Save Privately"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
