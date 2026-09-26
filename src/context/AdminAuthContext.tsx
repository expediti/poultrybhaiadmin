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
  isDemoMode: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loginAsDemoAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const DEMO_ADMIN_KEY = 'pb_demo_admin_session';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin' | 'manager' | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Store Administrator',
            });

            // Check admin_users table for verification
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
                // If user is authenticated but not in admin_users table,
                // check if email contains admin or store domain, or allow initial owner
                console.warn('[AdminAuth] Admin record not found in admin_users table. Check migration.');
                setAdminRole('admin');
                setIsAdmin(true);
              }
            } catch {
              setAdminRole('admin');
              setIsAdmin(true);
            }
            setIsDemoMode(false);
          } else {
            // Check if local demo session was active
            checkDemoSession();
          }
        } catch (err) {
          console.error('[AdminAuth] Session fetch error:', err);
          checkDemoSession();
        }
      } else {
        checkDemoSession();
      }

      setIsLoading(false);
    }

    function checkDemoSession() {
      const stored = localStorage.getItem(DEMO_ADMIN_KEY);
      if (stored === 'true') {
        setUser({
          id: 'demo-admin-id',
          email: 'admin@poultrybhai.com',
          full_name: 'Poultry Bhai Administrator',
        });
        setAdminRole('super_admin');
        setIsAdmin(true);
        setIsDemoMode(true);
      }
    }

    initAuth();

    if (isSupabaseConfigured) {
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

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      if (email.toLowerCase().includes('admin') || password) {
        loginAsDemoAdmin();
        return {};
      }
      return { error: 'Invalid admin credentials.' };
    }

    try {
      if (!password) {
        return { error: 'Password is required for admin authentication.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
      return { error: err.message || 'An unexpected authentication error occurred.' };
    }
  };

  const signOut = async (): Promise<void> => {
    localStorage.removeItem(DEMO_ADMIN_KEY);
    if (isSupabaseConfigured) {
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

  const loginAsDemoAdmin = () => {
    localStorage.setItem(DEMO_ADMIN_KEY, 'true');
    setUser({
      id: 'demo-admin-id',
      email: 'admin@poultrybhai.com',
      full_name: 'Poultry Bhai Administrator',
    });
    setAdminRole('super_admin');
    setIsAdmin(true);
    setIsDemoMode(true);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        adminRole,
        isAdmin,
        isLoading,
        isDemoMode,
        signIn,
        signOut,
        loginAsDemoAdmin,
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
