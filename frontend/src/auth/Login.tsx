import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {

  // 1. Form state
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 3. Form submission
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setLoading(true);
    setError('');
    setMessage('');

    try {

      if (mode === 'signup') {

        // Create a Supabase account
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,

          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            'Check your email for a confirmation link, then sign in.'
          );
        }

      } else {

        // Log in to an existing account
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      }

    } catch (err) {

      setError(
        err instanceof Error ? err.message : 'Authentication failed'
      );

    } finally {

      setLoading(false);

    }
  }

  return (
    <div className="auth-page">

      <div className="auth-card">

        <h1>DucKGP 🦆</h1>

        <p>Your IIT Kharagpur AI Assistant</p>

        <h2>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>

        <form onSubmit={handleSubmit}>

          <label htmlFor="auth-email">Email</label>

          <input
            id="auth-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="auth-password">Password</label>

          <input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          {message && <p className="auth-message">{message}</p>}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login'
                : 'Create Account'}
          </button>

        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
            setMessage('');
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Login'}
        </button>

      </div>

    </div>
  );
}