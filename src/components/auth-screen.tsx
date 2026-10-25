'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, LibraryBig, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ShelfIllustration } from './cover';
export function AuthScreen({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const credentials = {
        email: String(data.get('email')),
        password: String(data.get('password')),
      };
      const result = signup
        ? await authClient.signUp.email({ ...credentials, name: String(data.get('name')) })
        : await authClient.signIn.email(credentials);
      if (result.error) throw new Error(result.error.message || 'Unable to sign in');
      await onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <LibraryBig size={26} />
          </span>
          <span>
            game shelf<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="auth-story-content">
          <span className="eyebrow">LESS SCROLLING. MORE PLAYING.</span>
          <h1>
            Every box holds
            <br />a good night.
          </h1>
          <p>
            A home for the games you love.
            <br />
            And the ones you haven’t met yet.
          </p>
          <ShelfIllustration />
        </div>
        <p className="auth-foot">YOUR COLLECTION. YOUR PEOPLE. YOUR NEXT ADVENTURE.</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">PULL UP A CHAIR</span>
          <h2>{signup ? 'Start your shelf.' : 'Welcome back.'}</h2>
          <p className="muted">
            {signup
              ? 'A little organization. A lot more game nights.'
              : 'Your next favorite evening is waiting on the shelf.'}
          </p>
          <form onSubmit={submit}>
            {signup && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={show ? 'text' : 'password'}
                  name="password"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  required
                  minLength={10}
                  maxLength={128}
                  placeholder={signup ? 'At least 10 characters' : 'Your password'}
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? 'Opening your shelf…' : signup ? 'Create my account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? 'Already have a shelf?' : 'New around here?'}{' '}
            <button
              className="text-button"
              onClick={() => {
                setSignup(!signup);
                setError('');
              }}
            >
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <div className="auth-privacy">
            <LockKeyhole size={18} />
            <p>
              Your collection is private. Sign in from any device to pick up where you left off. Use
              a trusted device for offline reading.
            </p>
          </div>
          <p className="field-help">
            No email recovery is configured. Keep your password safe; contact your administrator if
            you lose it.
          </p>
        </div>
      </section>
    </main>
  );
}
