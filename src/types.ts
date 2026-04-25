export type UserLevel = "Beginner Thinker" | "Analyst" | "Strategist" | "Decision Master";

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoURL?: string;
  bio?: string;
  joinDate: string;
  reputation: number;
  level: UserLevel;
  stats: {
    totalDecisions: number;
    totalProblems: number;
    successRate: number;
    communityAgreement: number;
  };
}

export interface Decision {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  question: string;
  options: string[];
  analysis: any;
  votes: Record<string, number>; // optionIndex -> count
  voters: string[];
  isPublic: boolean;
  allowVoting: boolean;
  createdAt: string;
  outcome?: "Yes" | "No" | "Partially";
}

export interface Problem {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  description: string;
  analysis: any;
  isPublic: boolean;
  createdAt: string;
  commentsCount: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  postId: string;
  content: string;
  upvotes: number;
  createdAt: string;
}
