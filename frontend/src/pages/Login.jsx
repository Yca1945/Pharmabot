import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      const user = await login(email, password)
      navigate(user.role === 'pharmacien' ? '/officine' : user.role === 'admin' ? '/admin' : '/chat')
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects.')
    }
  }

  return (
    <div className="auth-split">
      {/* ── Panneau gauche : branding ── */}
      <div className="auth-panel-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <span className="brand-mark brand-mark-lg">℞</span>
            <span className="auth-brand-name">Pharmabot</span>
          </div>
          <p className="auth-brand-tagline">
            Votre assistant pharmaceutique intelligent
          </p>
          <ul className="auth-features">
            <li>Conseils médicamenteux par IA</li>
            <li>Pré-commandes en ligne</li>
            <li>Rappels thérapeutiques personnalisés</li>
          </ul>
        </div>
        <div className="auth-panel-pattern" aria-hidden="true" />
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="auth-panel-form">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-title">Connexion</h1>
            <p className="auth-subtitle">Bienvenue, entrez vos identifiants pour accéder à votre espace.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-fields">
            {error && <div className="alert">{error}</div>}

            <div className="field-group">
              <label className="field-label" htmlFor="email">Adresse e-mail</label>
              <div className="field-icon-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoFocus
                  className="field-input field-input-icon"
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Mot de passe</label>
              <div className="field-icon-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="field-input field-input-icon field-input-action"
                />
                <button
                  type="button"
                  className="field-action-btn"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-icon btn-full"
              disabled={loading}
            >
              <LogIn size={16} />
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="auth-footer-link">
            Pas encore de compte ?{' '}
            <Link to="/register">Créer un compte patient</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
