// Real auth layer backed by Supabase Auth.
//
// Supabase handles sign-up/sign-in/session storage & refresh itself (it
// persists its own session in localStorage under a supabase-managed key).
// The FastAPI backend never sees a password — it only ever validates the
// JWT access token that Supabase issues, via the Authorization header.

import { supabase } from './supabaseClient'

function mapUser(session) {
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    since: new Date(session.user.created_at).getTime(),
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

export async function getCurrentUser() {
  const session = await getCurrentSession()
  return mapUser(session)
}

/**
 * Get the Supabase access token, waiting for the session if necessary.
 * Returns the access token string, or null if no session exists.
 * This ensures that API calls after login have a valid token, avoiding
 * 401 errors caused by the session not having propagated yet.
 */
export async function getAccessToken() {
  // Wait for a session to appear — this handles the post-login race
  // condition where the token isn't in storage yet.
  let session = await getCurrentSession()
  let retries = 0
  const maxRetries = 20 // ~2 seconds with 100ms intervals

  while (!session && retries < maxRetries) {
    await new Promise((r) => setTimeout(r, 100))
    session = await getCurrentSession()
    retries++
  }

  return session?.access_token ?? null
}

export async function signUp(email, password) {
  const normalizedEmail = String(email || '').trim()
  const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password })
  if (error) throw new Error(error.message)
  return mapUser(data.session)
}

export async function login(email, password) {
  const normalizedEmail = String(email || '').trim()
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
  if (error) {
    // Never surface the underlying auth error to the caller. Supabase may
    // return messages that reveal whether the email exists, the type of
    // failure, etc. We collapse every login failure into a single generic
    // message so the UI can't leak account state.
    throw new Error('Invalid credentials')
  }
  return mapUser(data.session)
}

export async function googleLogin() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profile`,
    },
  })

  if (error) throw new Error(error.message)
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// Subscribe to sign-in/sign-out/token-refresh events. Returns an unsubscribe
// function. `callback` is invoked with the mapped user (or null).
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapUser(session))
  })
  return () => data.subscription.unsubscribe()
}
