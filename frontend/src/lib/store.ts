import { create } from "zustand";
import { supabase } from "./supabase";

interface User {
  id: string; // Supabase uses UUIDs
  email: string;
  role: "candidate" | "company" | "admin";
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, token: null });
  },
  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata?.role || "candidate",
          },
          token: session.access_token,
        });
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            role: session.user.user_metadata?.role || "candidate",
          },
          token: session.access_token,
        });
      } else {
        set({ user: null, token: null });
      }
    });
  },
}));
