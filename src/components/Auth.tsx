import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Mail, Lock, Chrome, User } from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username.trim()) {
          await updateProfile(userCredential.user, {
            displayName: username.trim()
          });
        }
      }
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password provider is disabled. In Firebase Console, ensure 'Email/Password' is enabled (not just 'Email link') and that you clicked 'Save'. Changes may take 1-2 minutes to apply.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 my-auto"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border mb-4">
            <Brain size={32} className="text-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">XYREX</h1>
          <p className="text-muted font-medium">Turn chaos into clarity</p>
        </div>

        <div className="card space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-medium text-muted uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your unique name"
                      required={!isLogin}
                      className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-muted transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-muted transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-muted transition-colors"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted">Or continue with</span></div>
          </div>

          <button 
            onClick={handleGoogleAuth} 
            disabled={loading}
            className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
          >
            <Chrome size={18} />
            Google
          </button>
        </div>

        <p className="text-center text-sm text-muted">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-foreground font-medium hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
