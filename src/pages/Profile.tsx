import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Settings, Award, TrendingUp, CheckCircle2, MessageSquare, Brain, Calendar, Clock, History, LogOut, Camera, Trash2, ExternalLink } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, deleteDoc, writeBatch, increment } from "firebase/firestore";
import { signOut, updateProfile } from "firebase/auth";
import { cn } from "@/src/lib/utils";
import { Vote, X, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL: string;
  bio: string;
  joinDate: string;
  reputation: number;
  level: string;
  stats: {
    totalDecisions: number;
    totalProblems: number;
    successRate: number;
    communityAgreement: number;
  };
}

interface Activity {
  id: string;
  type: "decision" | "problem";
  content: string;
  createdAt: string;
  status?: string;
  votesCount?: number;
}

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{id: string, type: string} | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setProfile(data);
        setEditName(data.name);
        setEditBio(data.bio || "");
        setEditPhoto(data.photoURL || "");
      }

      // Fetch recent activities
      const dQuery = query(
        collection(db, "decisions"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const pQuery = query(
        collection(db, "problems"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const [dSnap, pSnap] = await Promise.all([getDocs(dQuery), getDocs(pQuery)]);
      
      const dActs = dSnap.docs.map(doc => ({
        id: doc.id,
        type: "decision" as const,
        content: doc.data().question,
        createdAt: doc.data().createdAt,
        status: doc.data().outcome || "Pending",
        votesCount: doc.data().votesCount || 0
      }));

      const pActs = pSnap.docs.map(doc => ({
        id: doc.id,
        type: "problem" as const,
        content: doc.data().description,
        createdAt: doc.data().createdAt,
        votesCount: doc.data().votesCount || 0
      }));

      const combined = [...dActs, ...pActs].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10);

      setActivities(combined);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleDeleteActivity = async (id: string, type: string) => {
    setIsDeleting(id);
    try {
      const collectionName = type === "decision" ? "decisions" : "problems";
      await deleteDoc(doc(db, collectionName, id));
      
      // Update local state
      setActivities(prev => prev.filter(a => a.id !== id));
      
      // Update user stats in Firestore
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const statField = type === "decision" ? "stats.totalDecisions" : "stats.totalProblems";
        await updateDoc(userRef, {
          [statField]: increment(-1)
        });
        
        // Update local profile state if it exists
        if (profile) {
          setProfile({
            ...profile,
            stats: {
              ...profile.stats,
              totalDecisions: type === "decision" ? profile.stats.totalDecisions - 1 : profile.stats.totalDecisions,
              totalProblems: type === "problem" ? (profile.stats.totalProblems || 0) - 1 : (profile.stats.totalProblems || 0)
            }
          });
        }
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, id);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !profile) return;
    setIsSaving(true);
    try {
      // Update Firestore
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        name: editName,
        bio: editBio,
        photoURL: editPhoto
      });

      // Update Firebase Auth profile so new posts have correct info
      // Firebase Auth photoURL has a length limit (~2048 chars). 
      // Base64 strings are usually much longer, so we only update Auth if it's a real URL or short.
      const authPhoto = editPhoto.length < 2000 ? editPhoto : ""; 
      
      await updateProfile(auth.currentUser, {
        displayName: editName,
        photoURL: authPhoto
      });

      // Update existing posts to reflect new name/photo in Explore
      const batch = writeBatch(db);
      
      const dQuery = query(collection(db, "decisions"), where("userId", "==", auth.currentUser.uid));
      const pQuery = query(collection(db, "problems"), where("userId", "==", auth.currentUser.uid));
      
      const [dSnap, pSnap] = await Promise.all([getDocs(dQuery), getDocs(pQuery)]);
      
      dSnap.docs.forEach(doc => {
        batch.update(doc.ref, { userName: editName, userPhoto: editPhoto });
      });
      pSnap.docs.forEach(doc => {
        batch.update(doc.ref, { userName: editName, userPhoto: editPhoto });
      });
      
      await batch.commit();

      setProfile({ ...profile, name: editName, bio: editBio, photoURL: editPhoto });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (file) {
      if (file.size > 1024 * 1024) {
        setPhotoError("Image size must be less than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const stats = [
    { label: "Total Decisions", value: profile.stats.totalDecisions, icon: Brain },
    { label: "Total Problems", value: profile.stats.totalProblems || 0, icon: MessageSquare },
    { label: "Success Rate", value: `${profile.stats.successRate}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="pb-20 px-4 md:px-6 max-w-5xl mx-auto space-y-8 md:space-y-12 text-left">
      <header className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center text-center md:text-left">
        <div className="relative group shrink-0">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-card border border-border flex items-center justify-center overflow-hidden relative">
            {editPhoto || profile.photoURL ? (
              <img 
                src={isEditing ? editPhoto : profile.photoURL} 
                alt={profile.name} 
                className={cn("w-full h-full object-cover", isEditing && "opacity-50")} 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <User size={64} className={cn("text-muted", isEditing && "opacity-50")} />
            )}
            
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 transition-colors text-white"
              >
                <Camera size={24} className="mb-1" />
                <span className="text-[10px] font-bold uppercase">Change Photo</span>
              </button>
            )}
          </div>
          {photoError && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase">{photoError}</p>}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="space-y-4 flex-grow w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 w-full">
              {isEditing ? (
                <div className="space-y-3">
                  <input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl md:text-4xl font-display font-bold bg-card border border-border rounded-xl px-4 py-2 w-full focus:outline-none focus:border-muted text-center md:text-left"
                    placeholder="Your Name"
                  />
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="text-sm md:text-base text-muted bg-card border border-border rounded-xl px-4 py-2 w-full focus:outline-none focus:border-muted resize-none text-center md:text-left"
                    placeholder="Tell us about yourself..."
                    rows={2}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center md:items-start gap-1">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl md:text-4xl font-display font-bold">{profile.name}</h1>
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-muted hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-muted">@{profile.username} • Joined {new Date(profile.joinDate).toLocaleDateString()}</p>
                  {profile.bio && <p className="text-sm text-muted max-w-xl mt-2">{profile.bio}</p>}
                </div>
              )}
            </div>
            <div className="flex justify-center md:justify-start gap-3 w-full md:w-auto">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary py-2 px-6 text-sm flex items-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="btn-primary py-2 px-6 text-sm flex items-center gap-2"
                  >
                    {isSaving ? "Saving..." : <><Save size={16} /> Save</>}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary py-2 px-6 text-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={cn(
            "card p-4 space-y-1 md:space-y-2 text-center md:text-left",
            i === 2 && "col-span-2 md:col-span-1"
          )}>
            <stat.icon size={18} className="text-muted mx-auto md:mx-0" />
            <div className="text-xl md:text-2xl font-display font-bold">{stat.value}</div>
            <div className="text-[9px] md:text-[10px] text-muted uppercase font-bold tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Recent History</h2>
          <button className="text-xs text-muted hover:text-foreground">View All</button>
        </div>
        
        <div className="space-y-3 md:space-y-4">
          {activities.length > 0 ? activities.map((activity) => (
            <div 
              key={activity.id} 
              onClick={() => navigate(`/explore/${activity.type}/${activity.id}`)}
              className="card p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer hover:border-muted transition-colors"
            >
              <div className="flex items-start md:items-center gap-3 md:gap-4 flex-grow">
                <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center shrink-0">
                  {activity.type === "decision" ? <Brain size={20} /> : <MessageSquare size={20} />}
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-medium group-hover:text-foreground transition-colors truncate">
                    {activity.content}
                  </h4>
                  <div className="text-[10px] text-muted flex flex-wrap items-center gap-x-3 gap-y-1 uppercase tracking-wider mt-1">
                    <span className="flex items-center gap-1 shrink-0"><Calendar size={10} /> {new Date(activity.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 shrink-0"><Vote size={10} /> {activity.votesCount || 0} votes</span>
                    <span className="shrink-0">• {activity.type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-none pt-3 sm:pt-0 border-border">
                <div className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none",
                  activity.status === "Resolved" ? "border-green-500 text-green-500" : "border-muted text-muted"
                )}>
                  {activity.status || "Active"}
                </div>
                <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/explore/${activity.type}/${activity.id}`);
                    }}
                    className="p-2 bg-card border border-border rounded-lg text-muted hover:text-foreground transition-colors"
                    title="View Analysis"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm({ id: activity.id, type: activity.type });
                    }}
                    disabled={isDeleting === activity.id}
                    className="p-2 bg-card border border-border rounded-lg text-muted hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="card border-dashed py-12 text-center text-muted">
              No recent activity.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card max-w-sm w-full p-8 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold">Delete Activity?</h3>
                <p className="text-sm text-muted">This action cannot be undone. All data associated with this post will be permanently removed.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteActivity(showDeleteConfirm.id, showDeleteConfirm.type)}
                  disabled={isDeleting !== null}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl flex-1 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
