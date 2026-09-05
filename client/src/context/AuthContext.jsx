import { useEffect, useMemo, useState } from 'react'
import * as authStore from '../lib/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    authStore.getCurrentUser().then((currentUser) => {
      if (active) {
        setUser(currentUser)
        setLoading(false)
      }
    })

    const unsubscribe = authStore.onAuthChange((nextUser) => {
      if (active) {
        setUser(nextUser)
        setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      signUp: (email, password) => authStore.signUp(email, password),
      login: (email, password) => authStore.login(email, password),
      googleLogin: () => authStore.googleLogin(),
      logout: () => authStore.logout(),
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
