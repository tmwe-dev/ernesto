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

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Load profile
          const { data: profileData } = await supabase
            .from('ernesto_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        try {
          const { data: profileData } = await supabase
            .from('ernesto_profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        } catch (error) {
          console.error('Failed to load profile:', error);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // Call auth edge function
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            action: 'login',
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Set session manually
      if (data.data.session) {
        setSession(data.data.session);
        setUser(data.data.session.user);
        setProfile(data.data.user.profile);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      inviteCode: string
    ) => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ernesto-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'register',
              email,
              password,
              full_name: fullName,
              invite_code: inviteCode,
            }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Registration failed');
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
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
