import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminAuthContextType {
  user: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
  adminRole: 'super_admin' | 'admin' | 'manager' | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin' | 'manager' | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'Store Administrator',
          });

          // Verify in admin_users table
          try {
            const { data: adminRecord, error } = await supabase
              .from('admin_users')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (!error && adminRecord) {
              setAdminRole(adminRecord.role);
              setIsAdmin(true);
            } else {
              // Check user metadata or default
              setAdminRole('admin');
              setIsAdmin(true);
            }
          } catch {
            setAdminRole('admin');
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error('[AdminAuth] Session fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'Store Administrator',
          });

          try {
            const { data: adminRecord } = await supabase
              .from('admin_users')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (adminRecord) {
              setAdminRole(adminRecord.role);
              setIsAdmin(true);
            } else {
              setAdminRole('admin');
              setIsAdmin(true);
            }
          } catch {
            setAdminRole('admin');
            setIsAdmin(true);
          }
        } else {
          setUser(null);
          setAdminRole(null);
          setIsAdmin(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error:
          'Supabase credentials missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.',
      };
    }

    try {
      if (!email.trim() || !password) {
        return { error: 'Both email and password are required.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name || 'Store Administrator',
        });
        setIsAdmin(true);
        setAdminRole('admin');
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Authentication failed' };
    }
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    setUser(null);
    setAdminRole(null);
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        adminRole,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
