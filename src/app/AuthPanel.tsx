import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button, Field, Input, Panel } from '@/components/ui';
import { Brand } from '@/components/Brand';
import { PageMetadata } from '@/app/PageMetadata';

type Mode = 'login' | 'register' | 'verify';

function authErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

export function AuthPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshUser() {
    await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  }

  async function handleLogin() {
    setBusy(true);
    setError(null);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      await refreshUser();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setBusy(true);
    setError(null);
    try {
      await base44.auth.register({ email, password });
      setNotice('Check your email for a verification code.');
      setMode('verify');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    try {
      await base44.auth.verifyOtp({ email, otpCode: otp });
      await base44.auth.loginViaEmailPassword(email, password);
      await refreshUser();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <PageMetadata title={mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify Your Email'} description="Sign in to your VensaOS workspace." />
      <Panel className="w-full max-w-sm p-8">
        <div className="mb-6"><Brand /></div>
        <h1 className="fi-display mb-2 text-2xl font-medium">{mode === 'login' ? 'Welcome to VensaOS' : mode === 'register' ? 'Create your VensaOS account' : 'Verify your email'}</h1>
        <p className="mb-6 text-sm text-ink-muted">{mode === 'verify' ? 'Enter your one-time code to continue.' : 'Feedback intelligence for product teams.'}</p>

        {mode === 'verify' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
          >
            <p className="text-sm text-ink-muted">Enter the code sent to {email}.</p>
            <Field label="Verification code" htmlFor="otp">
              <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" />
            </Field>
            {notice && <p className="text-xs text-ink-muted">{notice}</p>}
            {error && <p className="text-xs text-critical">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              Verify and sign in
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (mode === 'login' ? handleLogin() : handleRegister());
            }}
          >
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </Field>
            {error && <p className="text-xs text-critical">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => base44.auth.loginWithProvider('google', window.location.href)}
            >
              Continue with Google
            </Button>
            <p className="text-center text-xs text-ink-muted">
              {mode === 'login' ? "No account yet? " : 'Already have an account? '}
              <button
                type="button"
                className="text-ink underline"
                onClick={() => {
                  setError(null);
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </form>
        )}
      </Panel>
    </div>
  );
}
