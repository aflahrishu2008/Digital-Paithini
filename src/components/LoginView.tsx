import { useState, type FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, FolderHeart, Lock } from 'lucide-react';
import { InstallAppButton } from './InstallAppButton';

interface LoginViewProps {
  mode: 'supabase' | 'local-preview';
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginView({ mode, onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-header">
          <div className="brand-logo" aria-hidden="true">
            <FolderHeart size={28} />
          </div>
          <h1 className="brand-title">Digital Paithini</h1>
          <p className="brand-subtitle">
            Private shared files &amp; folders for authorized members
          </p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="field-group">
            <label className="field-label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              className="text-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <div className="input-wrap">
              <input
                id="login-password"
                className="text-input with-right-action"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            <Lock size={17} />
            <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
          </button>
        </form>

        {mode === 'local-preview' && (
          <div className="preview-note">
            <strong>Local Preview Mode</strong> (Supabase <code>.env</code> not set yet).
            <br />
            Try username <code>member1</code> and password <code>paithini123</code>.
          </div>
        )}
      </div>

      <InstallAppButton variant="card" />
    </div>
  );
}
