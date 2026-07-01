import { createContext, useContext, useState } from 'react'
import api from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('phabot_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)

  function persist(data) {
    localStorage.setItem('phabot_token', data.token)
    localStorage.setItem('phabot_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function login(email, password) {
    setLoading(true)
    try {
      const { data } = await api.post('/login', { email, password })
      persist(data)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  async function register(payload) {
    setLoading(true)
    try {
      const { data } = await api.post('/register', payload)
      persist(data)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch {
      /* token déjà invalide : on ignore */
    }
    localStorage.removeItem('phabot_token')
    localStorage.removeItem('phabot_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
