import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, Brain, ListChecks, HelpCircle, Lightbulb, AlertCircle, Sparkles } from "lucide-react";
import { geminiService, ProblemAnalysis } from "@/src/services/gemini";
import { cn } from "@/src/lib/utils";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const LOADING_MESSAGES = [
  "Thinking this through...",
  "Let’s take a closer look...",
  "Breaking this down...",
  "Searching for root causes...",
  "Thinking alongside you..."
];

export const ProblemPage = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysis, setAnalysis] = useState<ProblemAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!description.trim()) return;
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
      const result = await geminiService.analyzeProblem(description);
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

      await addDoc(collection(db, "problems"), {
        userId: auth.currentUser.uid,
        userName: userData?.name || auth.currentUser.displayName || "Anonymous",
        userPhoto: userData?.photoURL || auth.currentUser.photoURL,
        description,
        analysis,
        isPublic,
        votes: {},
        votesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });

      // Update user stats
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        "stats.totalProblems": increment(1)
      });

      navigate("/explore");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "problems");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8 md:space-y-12 text-left">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-5xl font-display font-bold">Solve a Problem</h1>
        <p className="text-sm md:text-lg text-muted">Break down complex issues and find structured solutions.</p>
      </header>

      {!analysis ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted uppercase tracking-wider">Describe the problem</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., I'm feeling burnt out and don't know how to regain my motivation."
              className="w-full bg-card border border-border rounded-xl p-4 text-xl focus:outline-none focus:border-muted transition-colors min-h-[160px] resize-none"
            />
          </div>

          <div className="flex items-center gap-8 pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={cn("w-10 h-5 rounded-full p-1 transition-colors", isPublic ? "bg-foreground" : "bg-border")}>
                <div className={cn("w-3 h-3 bg-background rounded-full transition-transform", isPublic ? "translate-x-5" : "translate-x-0")} />
              </div>
              <input type="checkbox" className="hidden" checked={isPublic} onChange={() => setIsPublic(!isPublic)} />
              <span className="text-sm font-medium">Public Post (Allow Community Advice)</span>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <button 
            onClick={handleAnalyze}
            disabled={!description.trim() || isAnalyzing}
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
                Analyze Problem
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Problem Analysis</h2>
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

          <div className="grid gap-12 lg:grid-cols-3 items-start">
            <div className="md:col-span-1 space-y-8">
              <div className="card space-y-6 p-8 rounded-[2rem]">
                <h3 className="text-sm font-bold text-red-500 uppercase flex items-center gap-2 tracking-widest">
                  <AlertCircle size={16} /> Root Causes
                </h3>
                <ul className="space-y-4">
                  {analysis.rootCauses.map((cause, i) => (
                    <li key={i} className="text-base text-muted flex gap-3">
                      <span className="text-foreground font-bold select-none">{i + 1}.</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="md:col-span-2 space-y-12">
              <div className="space-y-6">
                <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                  <Lightbulb size={24} className="text-yellow-500" /> Proposed Solutions
                </h3>
                <div className="grid gap-8">
                  {analysis.solutions.map((sol, i) => (
                    <div key={i} className="card space-y-6 p-10 rounded-[2rem] bg-background border-2 border-border hover:border-foreground/20 transition-all shadow-none hover:shadow-2xl hover:shadow-foreground/5">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-2xl font-bold leading-tight">{sol.title}</h4>
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-3 py-1 rounded-full border flex-shrink-0",
                          sol.difficulty === "Easy" ? "border-green-500 text-green-500 bg-green-500/5" :
                          sol.difficulty === "Medium" ? "border-yellow-500 text-yellow-500 bg-yellow-500/5" :
                          "border-red-500 text-red-500 bg-red-500/5"
                        )}>
                          {sol.difficulty}
                        </span>
                      </div>
                      <div className="grid gap-10 sm:grid-cols-2">
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-muted uppercase tracking-widest opacity-50">Impact</span>
                          <p className="text-muted leading-relaxed">{sol.pros.join(", ")}</p>
                        </div>
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-muted uppercase tracking-widest opacity-50">Considerations</span>
                          <p className="text-muted leading-relaxed">{sol.cons.join(", ")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card space-y-8 p-10 rounded-[2.5rem] border-foreground/10">
                <h3 className="text-2xl font-display font-bold flex items-center gap-3">
                  <ListChecks size={24} className="text-foreground" /> The Plan of Action
                </h3>
                <div className="space-y-6">
                  {analysis.stepByStepPlan.map((step, i) => (
                    <div key={i} className="flex gap-6 items-start group">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <p className="text-muted text-lg pt-1 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 rounded-[3rem] bg-foreground/5 border-2 border-foreground/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain size={120} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted mb-8">The Overall Meaning</h3>
            <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed text-foreground font-display font-medium max-w-4xl">
              {analysis.interpretationLayer}
            </p>
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
              {isPublic ? "Share for Advice" : "Save Privately"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
