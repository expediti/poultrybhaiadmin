import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  configuredAdminEmail?: string;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  const [adminRole, setAdminRole] = useState<'super_admin' | 'admin' | 'manager' | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper function to verify admin access against both configured email and database admin_users table
  const verifyAdminAccess = useCallback(
    async (
      sessionUser: { id: string; email?: string; user_metadata?: any }
    ): Promise<{ authorized: boolean; role?: 'super_admin' | 'admin' | 'manager'; error?: string }> => {
      const sessionEmail = (sessionUser.email || '').trim().toLowerCase();

      // 1. Enforce configured admin email check (if VITE_ADMIN_EMAIL is set)
      if (configuredAdminEmail && sessionEmail !== configuredAdminEmail) {
        return {
          authorized: false,
          error: `Access Denied: Account (${sessionEmail}) is not the authorized owner email. Only ${configuredAdminEmail} is permitted.`,
        };
      }

      // 2. Enforce database-level verification in public.admin_users
      if (!supabase) {
        return { authorized: false, error: 'Database client not initialized.' };
      }

      try {
        const { data: adminRecord, error: dbError } = await supabase
          .from('admin_users')
          .select('role, email')
          .eq('user_id', sessionUser.id)
          .maybeSingle();

        if (dbError) {
          return {
            authorized: false,
            error: `Database authorization check failed: ${dbError.message}`,
          };
        }

        if (!adminRecord) {
          return {
            authorized: false,
            error:
              'Access Denied: Your account is authenticated with Supabase, but is not registered in the database admin_users table.',
          };
        }

        return {
          authorized: true,
          role: (adminRecord.role as 'super_admin' | 'admin' | 'manager') || 'super_admin',
        };
      } catch (err: any) {
        return {
          authorized: false,
          error: err.message || 'Failed to verify admin privileges with database.',
        };
      }
    },
    []
  );

  useEffect(() => {
    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const authCheck = await verifyAdminAccess(session.user);
          if (authCheck.authorized) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Store Administrator',
            });
            setAdminRole(authCheck.role || 'super_admin');
            setIsAdmin(true);
          } else {
            // Immediately terminate unauthorized sessions
            console.warn('[AdminAuth] Unauthorized session rejected:', authCheck.error);
            await supabase.auth.signOut();
            setUser(null);
            setAdminRole(null);
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error('[AdminAuth] Session initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const authCheck = await verifyAdminAccess(session.user);
          if (authCheck.authorized) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Store Administrator',
            });
            setAdminRole(authCheck.role || 'super_admin');
            setIsAdmin(true);
          } else {
            await supabase.auth.signOut();
            setUser(null);
            setAdminRole(null);
            setIsAdmin(false);
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
  }, [verifyAdminAccess]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error:
          'Supabase credentials missing! Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
      };
    }

    const inputEmail = email.trim().toLowerCase();

    if (!inputEmail || !password) {
      return { error: 'Both email and password are required.' };
    }

    // Client-side quick filter: Reject non-owner emails before generating session
    if (configuredAdminEmail && inputEmail !== configuredAdminEmail) {
      return {
        error: `Access Denied: Email "${inputEmail}" is not authorized. Only the configured administrator (${configuredAdminEmail}) can access this panel.`,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: inputEmail,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Authentication failed: No user record returned.' };
      }

      // Verify database authorization in admin_users
      const authCheck = await verifyAdminAccess(data.user);

      if (!authCheck.authorized) {
        // Immediately sign out unauthorized user
        await supabase.auth.signOut();
        setUser(null);
        setAdminRole(null);
        setIsAdmin(false);
        return { error: authCheck.error || 'Access Denied: Account not authorized as admin.' };
      }

      setUser({
        id: data.user.id,
        email: data.user.email || '',
        full_name: data.user.user_metadata?.full_name || 'Store Administrator',
      });
      setAdminRole(authCheck.role || 'super_admin');
      setIsAdmin(true);

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
        configuredAdminEmail: configuredAdminEmail || undefined,
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
