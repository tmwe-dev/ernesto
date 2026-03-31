import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/LoginPage.css';

type AuthMode = 'signin' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, isLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!fullName.trim()) {
        setError('Full name is required');
        setIsSubmitting(false);
        return;
      }

      await signUp(email, password, fullName, inviteCode);
      setError('');
      setMode('signin');
      setEmail('');
      setPassword('');
      setFullName('');
      setInviteCode('');
      setError('Account created successfully. Please sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-panel">
        <div className="login-header">
          <img
            src="/ernesto-logo.png"
            alt="ERNESTO"
            className="w-20 h-20 mx-auto rounded-full ring-2 ring-cyan-500/40 object-contain mb-3"
          />
          <div className="login-logo">ERNESTO</div>
          <p className="login-subtitle text-slate-400 text-sm">
            AI Pricelist Engine — TMWE / FindAir
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {mode === 'signin'
              ? 'Accedi al tuo account'
              : 'Crea il tuo account'}
          </p>
        </div>

        {error && (
          <div
            className={`login-alert ${
              error.includes('successfully') ? 'success' : 'error'
            }`}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}
          className="login-form"
        >
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="inviteCode">Invite Code</label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter your invite code"
                required
                disabled={isSubmitting}
              />
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Loading...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="login-toggle"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              disabled={isSubmitting}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
