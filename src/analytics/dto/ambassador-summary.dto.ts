export interface AmbassadorSummary {
  id: string;
  name: string;
  actual: {
    stories: number;
    posts: number;
    reels: number;
  };
  expected: {
    stories: number;
    posts: number;
    reels: number;
  }; edits
  compliance: {
    story: string;
    post: string;
    reel: string;
  };
  role?: 'ambassador' | 'leader'; // ✅ Add this
  active?: boolean;   
  photoUrl?: string; // ✅ Add this line
            // ✅ Add this
}
