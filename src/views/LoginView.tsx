import { useState } from 'react';
import { Lock, Mail, ShieldAlert, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { signIn, loginAsDemoAdmin } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
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
          maxWidth: '420px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '2.25rem',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--text-main)',
              color: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.15rem',
              margin: '0 auto 1rem',
            }}
          >
            PB
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Poultry Bhai Admin
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Store Operations & Dashboard
          </p>
        </div>

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
                placeholder="admin@poultrybhai.com"
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
                placeholder="Enter password"
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
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              margin: '1rem 0',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                right: 0,
                height: '1px',
                background: 'var(--border-subtle)',
              }}
            />
            <span
              style={{
                position: 'relative',
                background: 'var(--bg-card)',
                padding: '0 0.75rem',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
              }}
            >
              Instant Access
            </span>
          </div>

          <button
            type="button"
            onClick={loginAsDemoAdmin}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem' }}
          >
            <ShieldCheck size={15} color="var(--primary)" />
            <span>Launch as Super Admin (Local Evaluation)</span>
          </button>
        </div>

        {/* Security badge */}
        <div
          style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}
        >
          Protected by Supabase Auth and PostgreSQL Row Level Security (RLS).
        </div>
      </div>
    </div>
  );
};
