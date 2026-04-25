import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Brain, MessageSquare, Compass, User, ChevronRight, LogOut, Plus, Telescope, History } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { DecisionPage } from "./pages/Decision";
import { ProblemPage } from "./pages/Problem";
import { ExplorePage } from "./pages/Explore";
import { ProfilePage } from "./pages/Profile";
import { PostDetailPage } from "./pages/PostDetail";
import { ThoughtExplorerPage } from "./pages/ThoughtExplorer";
import { Auth } from "./components/Auth";
import { Header } from "./components/Header";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const screens = [
    { 
      title: "Xyrex", 
      text: "Turn chaos into clarity. Your AI-powered companion for complex choices and challenges.",
      icon: <Brain className="w-12 h-12 mb-6 text-foreground" />
    },
    { 
      title: "Analyze", 
      text: "Get deep AI insights into decisions with pros, cons, and long-term impact analysis.",
      icon: <Compass className="w-12 h-12 mb-6 text-foreground" />
    },
    { 
      title: "Solve", 
      text: "Identify root causes of problems and get actionable step-by-step plans to resolve them.",
      icon: <MessageSquare className="w-12 h-12 mb-6 text-foreground" />
    },
    { 
      title: "How it Works", 
      text: "Input your situation, let our AI break it down, then share with the community to get real-world feedback and collective wisdom.",
      icon: <div className="flex gap-2 mb-6"><Brain size={24}/><ChevronRight size={24}/><MessageSquare size={24}/></div>
    },
  ];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 md:p-16 lg:p-24 overflow-hidden">
      <Header />

      <div className="w-full max-w-6xl flex flex-col gap-10 md:gap-16 lg:gap-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start text-left"
          >
            <div className="mb-8 md:mb-12">
              {step === 3 ? (
                <div className="flex gap-4 items-center text-foreground">
                  <Brain size={40} className="md:w-16 md:h-16 lg:w-20 lg:h-20" />
                  <ChevronRight size={24} className="md:w-8 md:h-8 lg:w-10 lg:h-10 opacity-30" />
                  <MessageSquare size={40} className="md:w-16 md:h-16 lg:w-20 lg:h-20" />
                </div>
              ) : (
                React.cloneElement(screens[step].icon as React.ReactElement, { 
                  className: "w-14 h-14 md:w-20 md:h-20 lg:w-28 lg:h-28 text-foreground" 
                })
              )}
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tighter leading-[0.85] mb-8 md:mb-10 uppercase">
              {screens[step].title}
            </h1>
            
            <p className="text-muted text-lg md:text-xl lg:text-2xl leading-tight md:leading-[1.1] max-w-4xl font-medium">
              {screens[step].text}
            </p>
          </motion.div>
        </AnimatePresence>
        
        <div className="flex flex-col items-start gap-10 md:gap-16 w-full">
          <div className="flex gap-2 md:gap-4 w-full max-w-xl">
            {screens.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 md:h-1.5 flex-1 rounded-full transition-all duration-700 ease-in-out", 
                  i === step ? "bg-foreground" : "bg-border"
                )} 
              />
            ))}
          </div>

          <button
            onClick={() => step < screens.length - 1 ? setStep(step + 1) : onComplete()}
            className="btn-primary w-full md:w-auto px-8 py-5 md:px-12 md:py-7 lg:px-16 lg:py-8 text-xl md:text-2xl flex items-center justify-center gap-4 group rounded-xl md:rounded-3xl"
          >
            <span className="font-bold uppercase tracking-tight">
              {step === screens.length - 1 ? "Start Thinking" : "Continue"}
            </span>
            <ChevronRight size={24} className="md:w-7 md:h-7 lg:w-8 lg:h-8 group-hover:translate-x-3 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const location = useLocation();
  const navItems = [
    { path: "/decision", label: "Decision", icon: Brain },
    { path: "/problem", label: "Problem", icon: MessageSquare },
    { path: "/thought-explorer", label: "Thought Explorer", icon: Telescope },
    { path: "/explore", label: "Explore", icon: Compass },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-[120px] bottom-0 w-26 xl:w-64 bg-background border-r border-border z-40 hidden md:flex flex-col p-4">
        <nav className="flex-grow space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group",
                location.pathname.startsWith(item.path) 
                  ? "bg-foreground text-background font-bold" 
                  : "hover:bg-card text-muted hover:text-foreground"
              )}
            >
              <item.icon size={24} className={cn(
                "transition-transform group-hover:scale-110",
                location.pathname.startsWith(item.path) ? "text-background" : "text-muted group-hover:text-foreground"
              )} />
              <span className="text-lg hidden xl:inline">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            onClick={onLogout}
            className="flex items-center gap-4 p-3 rounded-2xl w-full text-muted hover:text-foreground hover:bg-card transition-all group"
          >
            <LogOut size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-lg hidden xl:inline text-left">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-t border-border z-40 flex md:hidden items-center justify-around px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              location.pathname.startsWith(item.path) ? "text-foreground" : "text-muted"
            )}
          >
            <item.icon size={24} />
          </Link>
        ))}
      </nav>
    </>
  );
};

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("xyrex_onboarding");
    if (hasSeenOnboarding) setShowOnboarding(false);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user profile exists in Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Anonymous",
              username: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || firebaseUser.uid.slice(0, 8),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              joinDate: new Date().toISOString(),
              reputation: 0,
              level: "Beginner Thinker",
              stats: {
                totalDecisions: 0,
                totalProblems: 0,
                successRate: 0,
                communityAgreement: 0
              }
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("xyrex_onboarding", "true");
    setShowOnboarding(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (showOnboarding) return <Onboarding onComplete={completeOnboarding} />;
  if (!user) return <Auth />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <div className="flex flex-col md:flex-row flex-grow">
          <Sidebar onLogout={handleLogout} />
          <main className="flex-grow md:pl-26 xl:pl-64 pt-[92px] md:pt-[136px] pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Navigate to="/explore" replace />} />
              <Route path="/decision" element={<DecisionPage />} />
              <Route path="/problem" element={<ProblemPage />} />
              <Route path="/thought-explorer" element={<ThoughtExplorerPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/explore/:type/:id" element={<PostDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
