import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserPlus, Eye, EyeOff, User, Mail, Lock, ShieldCheck,
  ChevronRight, ChevronLeft, Stethoscope,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const INIT = {
  name: '', email: '', password: '', password_confirmation: '',
  age: '', poids: '', sexe: '', groupe_sanguin: '',
  allergies: '', antecedents: '',
}

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INIT)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function nextStep(e) {
    e.preventDefault()
    setError(null)
    if (form.password !== form.password_confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      if (err.response?.data?.errors?.email || err.response?.data?.errors?.password) {
        setStep(1)
      }
    }
  }

  return (
    <div className="auth-split">
      {/* ── Panneau gauche ── */}
      <div className="auth-panel-brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <span className="brand-mark brand-mark-lg">℞</span>
            <span className="auth-brand-name">Pharmabot</span>
          </div>
          <p className="auth-brand-tagline">
            Rejoignez des milliers de patients qui gèrent leur santé plus sereinement.
          </p>
          <ul className="auth-features">
            <li>Créez votre profil médical sécurisé</li>
            <li>Posez vos questions à l'assistant IA</li>
            <li>Pré-commandez vos médicaments en ligne</li>
            <li>Recevez vos rappels de prise personnalisés</li>
          </ul>
        </div>
        <div className="auth-panel-pattern" aria-hidden="true" />
      </div>

      {/* ── Panneau droit ── */}
      <div className="auth-panel-form">
        <div className="auth-form-inner auth-form-inner-wide">

          {/* Indicateur d'étapes */}
          <div className="auth-steps">
            <div className={`auth-step ${step >= 1 ? 'active' : ''}`}>
              <span className="auth-step-num">1</span>
              <span className="auth-step-label">Compte</span>
            </div>
            <div className="auth-step-line" />
            <div className={`auth-step ${step >= 2 ? 'active' : ''}`}>
              <span className="auth-step-num">2</span>
              <span className="auth-step-label">Fiche médicale</span>
            </div>
          </div>

          {/* ── Étape 1 : informations du compte ── */}
          {step === 1 && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-title">Créer un compte</h1>
                <p className="auth-subtitle">Vos informations de connexion.</p>
              </div>

              <form onSubmit={nextStep} className="auth-form-fields">
                {error && <div className="alert">{error}</div>}

                <div className="field-group">
                  <label className="field-label" htmlFor="name">Nom complet</label>
                  <div className="field-icon-wrap">
                    <User size={16} className="field-icon" />
                    <input
                      id="name"
                      value={form.name}
                      onChange={update('name')}
                      placeholder="Jean Dupont"
                      required
                      autoFocus
                      className="field-input field-input-icon"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="email">Adresse e-mail</label>
                  <div className="field-icon-wrap">
                    <Mail size={16} className="field-icon" />
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="vous@exemple.com"
                      required
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
                      value={form.password}
                      onChange={update('password')}
                      placeholder="8 caractères minimum"
                      required
                      minLength={8}
                      className="field-input field-input-icon field-input-action"
                    />
                    <button type="button" className="field-action-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="confirm">Confirmer le mot de passe</label>
                  <div className="field-icon-wrap">
                    <ShieldCheck size={16} className="field-icon" />
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.password_confirmation}
                      onChange={update('password_confirmation')}
                      placeholder="••••••••"
                      required
                      className="field-input field-input-icon field-input-action"
                    />
                    <button type="button" className="field-action-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary btn-icon btn-full">
                  Suivant <ChevronRight size={16} />
                </button>
              </form>
            </>
          )}

          {/* ── Étape 2 : fiche médicale ── */}
          {step === 2 && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-title">Fiche médicale</h1>
                <p className="auth-subtitle">
                  Ces informations aident l'assistant à vous donner des conseils adaptés.
                  Tous les champs sont facultatifs et chiffrés.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form-fields">
                {error && <div className="alert">{error}</div>}

                <div className="field-row-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="age">Âge (ans)</label>
                    <input
                      id="age"
                      type="number"
                      min="0" max="130"
                      value={form.age}
                      onChange={update('age')}
                      placeholder="Ex : 35"
                      className="field-input"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="poids">Poids (kg)</label>
                    <input
                      id="poids"
                      type="number"
                      min="1" max="500"
                      step="0.1"
                      value={form.poids}
                      onChange={update('poids')}
                      placeholder="Ex : 72.5"
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-row-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="sexe">Sexe</label>
                    <select id="sexe" value={form.sexe} onChange={update('sexe')} className="field-input">
                      <option value="">— Non renseigné —</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="groupe">Groupe sanguin</label>
                    <select id="groupe" value={form.groupe_sanguin} onChange={update('groupe_sanguin')} className="field-input">
                      <option value="">— Inconnu —</option>
                      {GROUPES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="allergies">Allergies connues</label>
                  <textarea
                    id="allergies"
                    rows={3}
                    value={form.allergies}
                    onChange={update('allergies')}
                    placeholder="Ex : pénicilline, ibuprofène, arachides…"
                    className="field-input field-textarea"
                  />
                  <span className="field-hint">Séparez par des virgules ou des retours à la ligne.</span>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="antecedents">Antécédents médicaux</label>
                  <textarea
                    id="antecedents"
                    rows={3}
                    value={form.antecedents}
                    onChange={update('antecedents')}
                    placeholder="Ex : diabète type 2, hypertension, asthme…"
                    className="field-input field-textarea"
                  />
                </div>

                <div className="field-row-2">
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    onClick={() => { setStep(1); setError(null) }}
                  >
                    <ChevronLeft size={16} /> Retour
                  </button>
                  <button type="submit" className="btn-primary btn-icon btn-full" disabled={loading}>
                    <UserPlus size={16} />
                    {loading ? 'Création…' : 'Créer mon compte'}
                  </button>
                </div>
              </form>
            </>
          )}

          <p className="auth-footer-link">
            Déjà inscrit ? <Link to="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
