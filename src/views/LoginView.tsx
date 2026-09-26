import { useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight, Sun, Moon, AlertCircle, KeyRound, Terminal, UserCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { signIn, isConfigured, configuredAdminEmail } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState(configuredAdminEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button
          className="theme-switch-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Clean White' : 'Pitch Black'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'White Theme' : 'Pitch Black'}</span>
        </button>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '2.25rem',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--text-main)',
              color: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              margin: '0 auto 1rem',
            }}
          >
            PB
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Poultry Bhai Admin
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Private Owner Portal & Catalog Management
          </p>

          {configuredAdminEmail && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.74rem',
                color: 'var(--primary)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                marginTop: '0.75rem',
              }}
            >
              <UserCheck size={13} />
              <span>Authorized Admin: {configuredAdminEmail}</span>
            </div>
          )}
        </div>

        {/* If Supabase is NOT configured, show clear configuration requirement */}
        {!isConfigured ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#EF4444' }}>
                  Supabase Environment Variables Missing
                </strong>
                The admin panel requires direct connection to the existing Poultry Bhai Supabase
                instance. No fake or placeholder credentials will be accepted.
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: '0.5rem',
                }}
              >
                <Terminal size={14} />
                <span>Required Configuration:</span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                Create a <code>.env</code> file in <code>poultrybhaiadmin/</code>:
              </p>
              <pre
                style={{
                  background: 'var(--bg-main)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key\nVITE_ADMIN_EMAIL=your-owner-email@example.com`}
              </pre>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                Use the exact same credentials as your customer Poultry Bhai frontend so products
                sync immediately.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Error message */}
            {errorMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Administrator Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-dim)',
                    }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="owner@poultrybhai.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-dim)',
                    }}
                  />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Enter Supabase account password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.65rem', marginTop: '0.4rem' }}
                disabled={loading}
              >
                {loading ? (
                  <span>Authenticating with Supabase...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Security badge */}
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5,
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}
        >
          <KeyRound size={13} />
          <span>Protected by Supabase Auth & PostgreSQL Row Level Security (RLS).</span>
        </div>
      </div>
    </div>
  );
};
