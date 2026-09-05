import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Icon } from '../components/ui'
import { useAuth } from '../context/useAuth'

export function Login() {
  const { login, signUp, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = location.state?.from || '/profile'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    const normalizedEmail = email.trim()

    try {
      if (mode === 'signup') {
        const user = await signUp(normalizedEmail, password)
        if (user) {
          navigate(redirectTo, { replace: true })
        } else {
          // Supabase requires email confirmation before a session exists.
          setInfo('Account created. Check your email to confirm it, then log in.')
          setMode('login')
        }
      } else {
        await login(normalizedEmail, password)
        navigate(redirectTo, { replace: true })
      }
    } catch (submitError) {
      // In login mode we never show the raw underlying error — it could
      // leak whether the email exists or what kind of auth failure
      // happened. Always display the generic "Invalid credentials".
      if (mode === 'login') {
        setError('Invalid credentials')
      } else {
        setError(submitError.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await googleLogin()
    } catch (submitError) {
      setError(submitError.message || 'Google login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-on-surface">
            {mode === 'signup' ? 'Create an account' : 'Log in'}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
            {mode === 'signup'
              ? 'Sign up to keep your generated summaries tied to your account.'
              : 'Sign in to keep your generated summaries tied to your account.'}
          </p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <label htmlFor="password" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-alt px-3.5 py-2.5 pr-11 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md p-1 text-on-surface-variant hover:text-primary pointer-events-auto"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[16px]" />
            </button>
          </div>

          {error ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm font-medium text-danger">
              <Icon name="error" className="text-[16px]" />
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm font-medium text-on-surface">
              <Icon name="info" className="text-[16px] text-primary" />
              {info}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name={submitting ? 'progress_activity' : 'login'} className={`text-[16px] ${submitting ? 'animate-spin' : ''}`} />
            {submitting ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Log in'}
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-on-surface-variant">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="google" className="text-[16px]" />
            Continue with Google
          </button>

          <p className="mt-4 text-center text-xs text-on-surface-variant">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup')
                setError('')
                setInfo('')
                setShowPassword(false)
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === 'signup' ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-on-surface-variant">
          <Link to="/" className="font-semibold text-primary hover:underline">
            Back to Dashboard
          </Link>
        </p>
      </div>
    </section>
  )
}
