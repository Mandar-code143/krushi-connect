import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Language } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'farmer' | 'worker' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  village: string;
  taluka: string;
  district: string;
  state: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  joinedDate: string;
  primaryCrops?: string;
  skills?: string;
  experienceYears?: number;
  dailyWage?: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, metadata: Record<string, string>) => Promise<{ error?: string }>;
  demoLogin: (role: UserRole) => void;
  logout: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users fallback
const demoUsers: Record<string, AppUser> = {
  farmer: {
    id: 'f1', name: 'Rajesh Patil', phone: '9876543210', email: 'rajesh@example.com',
    role: 'farmer', village: 'Shindewadi', taluka: 'Baramati', district: 'Pune', state: 'Maharashtra',
    verified: true, rating: 4.7, reviewCount: 23, joinedDate: '2024-03-15',
  },
  worker: {
    id: 'w1', name: 'Sunita Jadhav', phone: '9123456780',
    role: 'worker', village: 'Nimgaon', taluka: 'Indapur', district: 'Pune', state: 'Maharashtra',
    verified: true, rating: 4.9, reviewCount: 45, joinedDate: '2024-01-20',
  },
  admin: {
    id: 'a1', name: 'Priya Sharma', phone: '9000000001', email: 'admin@krushi.in',
    role: 'admin', village: '', taluka: '', district: 'Pune', state: 'Maharashtra',
    verified: true, rating: 0, reviewCount: 0, joinedDate: '2023-12-01',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLang] = useState<Language>(() => {
    return (localStorage.getItem('krushi_lang') as Language) || 'en';
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      const appUser: AppUser = {
        id: data.id,
        name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || undefined,
        role: (data.role as UserRole) || 'farmer',
        village: data.village || '',
        taluka: data.taluka || '',
        district: data.district || 'Pune',
        state: data.state || 'Maharashtra',
        verified: data.verified || false,
        rating: Number(data.rating) || 0,
        reviewCount: data.review_count || 0,
        joinedDate: data.created_at || new Date().toISOString(),
        primaryCrops: data.primary_crops || undefined,
        skills: data.skills || undefined,
        experienceYears: data.experience_years || undefined,
        dailyWage: data.daily_wage || undefined,
        avatarUrl: data.avatar_url || undefined,
      };
      setUser(appUser);
      localStorage.setItem('krushi_user', JSON.stringify(appUser));
      if (data.language) {
        setLang(data.language as Language);
        localStorage.setItem('krushi_lang', data.language);
      }
    }
  }, []);

  // Listen to auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
        setUser({
          id: session.user.id,
          name: String(meta.full_name || meta.name || session.user.email?.split('@')[0] || ''),
          phone: String(meta.phone || ''),
          email: session.user.email || undefined,
          role: (String(meta.role || 'farmer') as UserRole),
          village: String(meta.village || ''),
          taluka: String(meta.taluka || ''),
          district: String(meta.district || 'Pune'),
          state: String(meta.state || 'Maharashtra'),
          verified: false,
          rating: 0,
          reviewCount: 0,
          joinedDate: session.user.created_at || new Date().toISOString(),
          primaryCrops: undefined,
          skills: undefined,
          experienceYears: undefined,
          dailyWage: undefined,
          avatarUrl: undefined,
        });

        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setUser(null);
        localStorage.removeItem('krushi_user');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
        setUser({
          id: session.user.id,
          name: String(meta.full_name || meta.name || session.user.email?.split('@')[0] || ''),
          phone: String(meta.phone || ''),
          email: session.user.email || undefined,
          role: (String(meta.role || 'farmer') as UserRole),
          village: String(meta.village || ''),
          taluka: String(meta.taluka || ''),
          district: String(meta.district || 'Pune'),
          state: String(meta.state || 'Maharashtra'),
          verified: false,
          rating: 0,
          reviewCount: 0,
          joinedDate: session.user.created_at || new Date().toISOString(),
          primaryCrops: undefined,
          skills: undefined,
          experienceYears: undefined,
          dailyWage: undefined,
          avatarUrl: undefined,
        });
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        localStorage.removeItem('krushi_user');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signup = useCallback(async (email: string, password: string, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const demoLogin = useCallback((role: UserRole) => {
    const u = demoUsers[role];
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    localStorage.removeItem('krushi_user');
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem('krushi_lang', lang);
    if (supabaseUser) {
      void supabase.from('profiles').update({ language: lang }).eq('id', supabaseUser.id);
    }
  }, [supabaseUser]);

  const refreshProfile = useCallback(async () => {
    if (supabaseUser) await fetchProfile(supabaseUser.id);
  }, [supabaseUser, fetchProfile]);

  return (
    <AuthContext.Provider value={{
      user, supabaseUser, isAuthenticated: !!user, isLoading,
      login, signup, demoLogin, logout,
      language, setLanguage, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
