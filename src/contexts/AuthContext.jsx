import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Synchronously stamp a sessionStorage flag when the page loads with an explicit
// invite/recovery URL marker. We intentionally DO NOT stamp on a plain `?code=`
// because that collides with normal OAuth/magic-link codes and risks redirecting
// password-authenticated users to /set-password.
;(function stampInviteFlag() {
  try {
    const search = window.location.search
    const hash = window.location.hash
    const isInvite =
      search.includes('type=invite') ||
      search.includes('type=recovery') ||
      hash.includes('type=invite') ||
      hash.includes('type=recovery')
    if (isInvite) {
      sessionStorage.setItem('neboa_invite_pending', '1')
    }
  } catch (_) {
    // sessionStorage unavailable (private browsing restrictions) — degrade gracefully
  }
})()

// PKCE invite flows strip the `type` marker from the URL before the app mounts.
// To recognise a just-accepted invite we compare the user's last_sign_in_at to
// their created_at: if they're within this threshold, the current SIGNED_IN event
// is the very first sign-in (the invite acceptance itself).
const FIRST_SIGNIN_WINDOW_MS = 60 * 1000

const isFirstTimeSignIn = (user) => {
  if (!user?.created_at || !user?.last_sign_in_at) return false
  const created = new Date(user.created_at).getTime()
  const lastSignIn = new Date(user.last_sign_in_at).getTime()
  return Math.abs(lastSignIn - created) <= FIRST_SIGNIN_WINDOW_MS
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined) // undefined = loading, null = not authed
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setRole(session?.user?.app_metadata?.role ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setRole(session?.user?.app_metadata?.role ?? null)

      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.removeItem('neboa_invite_pending')
        setNeedsPasswordSetup(true)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const invitePending = sessionStorage.getItem('neboa_invite_pending') === '1'
        // Redirect only if we have an explicit invite marker from the URL OR
        // the user's sign-in looks like the first-time invite acceptance.
        // Guarding on first-time-signin prevents a stale flag from hijacking
        // a legitimate password login.
        if (invitePending || isFirstTimeSignIn(session.user)) {
          sessionStorage.removeItem('neboa_invite_pending')
          setNeedsPasswordSetup(true)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, user, role, needsPasswordSetup, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
