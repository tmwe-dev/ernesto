import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

async function loadProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('ernesto_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

function buildFallbackProfile(user: User): Profile {
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email || 'User',
    role: 'admin',
    is_active: true,
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user || null);

        if (s?.user) {
          const p = await loadProfile(s.user.id);
          if (mounted) setProfile(p || buildFallbackProfile(s.user));
        } else {
          setProfile(null);
        }
        if (mounted) setIsLoading(false);
      }
    );

    const fallback = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, _inviteCode: string) => {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setIsLoading(false);
        throw new Error(error.message);
      }
    },
    []
  );

 const signOut = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
  }, []);

  return {
    user,
    profile,
    session,
    isLoading,
    isAdmin: profile?.role === 'admin',
    isManager: profile?.role === 'manager',
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };
}
