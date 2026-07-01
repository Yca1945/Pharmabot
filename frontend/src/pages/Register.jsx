import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState(null)

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await register(form)
      navigate('/chat')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : 'Inscription impossible.')
    }
  }

  return (
    <div className="auth-card">
      <h1>Créer un compte</h1>
      <p className="muted">Espace patient.</p>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert">{error}</div>}
        <label>
          Nom complet
          <input value={form.name} onChange={update('name')} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          Mot de passe
          <input type="password" value={form.password} onChange={update('password')} required />
        </label>
        <label>
          Confirmer le mot de passe
          <input
            type="password"
            value={form.password_confirmation}
            onChange={update('password_confirmation')}
            required
          />
        </label>
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="muted">
        Déjà inscrit ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  )
}
