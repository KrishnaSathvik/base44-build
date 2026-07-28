import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button, Field, Input, Panel } from '@/components/ui';
import { Brand } from '@/components/Brand';
import { ConvergenceVisual } from '@/components/ConvergenceVisual';
import { PageMetadata } from '@/app/PageMetadata';

type Mode = 'login' | 'register' | 'verify';

const PASSWORD_HINT = 'At least 8 characters. Use a mix of letters and numbers.';

function authErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

function passwordRequirementError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include both letters and numbers.';
  }
  return null;
}

export function AuthPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    const requirement = passwordRequirementError(password);
    if (requirement) {
      setError(requirement);
      return;
    }
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

  const title =
    mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your workspace' : 'Verify your email';
  const subtitle =
    mode === 'login'
      ? 'Open your VensaOS workspace and see what needs attention.'
      : mode === 'register'
        ? 'Set up your feedback board and share your public link in a few steps.'
        : 'Enter your one-time code to continue.';

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-2">
      <PageMetadata
        title={mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify Your Email'}
        description="Sign in to your VensaOS workspace."
      />
      <aside className="relative hidden min-h-screen flex-col justify-between gap-10 overflow-y-auto border-r border-line bg-surface px-10 py-10 lg:flex xl:px-14">
        <div>
          <Brand />
          <h2 className="fi-display mt-14 max-w-md text-4xl font-medium leading-[1.05]">
            Turn scattered reports into clear decisions.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
            VensaOS groups related feedback, keeps original evidence attached, and helps your team decide what to fix next.
          </p>
        </div>
        <div className="pb-2">
          <ConvergenceVisual compact />
        </div>
      </aside>

      <div className="flex flex-col px-4 py-8 sm:px-8 lg:items-center lg:justify-center lg:py-12">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Brand />
          <Link to="/" className="text-sm text-ink-muted hover:text-ink">
            Back to home
          </Link>
        </div>

        <Panel className="w-full max-w-md p-5 sm:p-8 lg:shadow-sheet">
          <Link to="/" className="mb-6 hidden text-sm text-ink-muted hover:text-ink lg:inline-flex">
            ← Back to home
          </Link>
          <h1 className="fi-display mb-2 text-2xl font-medium">{title}</h1>
          <p className="mb-6 text-sm text-ink-muted">{subtitle}</p>

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
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" />
              </Field>
              {notice && <p className="text-xs text-ink-muted">{notice}</p>}
              {error && <p role="alert" className="text-sm text-critical">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Verifying…' : 'Verify and sign in'}
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
              <Field
                label="Password"
                htmlFor="password"
                hint={mode === 'register' ? PASSWORD_HINT : undefined}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-ink-muted hover:text-ink"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              {error && <p role="alert" className="text-sm text-critical">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
              <p className="text-center text-xs text-ink-muted">
                {mode === 'login' ? 'No account yet? ' : 'Already have an account? '}
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
    </div>
  );
}
