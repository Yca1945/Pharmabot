import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Download, Trash2, User, AlertTriangle, HeartPulse, Stethoscope } from 'lucide-react'
import api from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const VIDE = { allergies: '', antecedents: '', age: '', poids: '', sexe: '', groupe_sanguin: '' }

export default function Profil() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(VIDE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function exporter() {
    const { data } = await api.get('/compte/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mes-donnees-pharmabot.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function supprimerCompte() {
    if (!window.confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) return
    await api.delete('/compte')
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    api.get('/profil').then(({ data }) => {
      if (data) {
        setForm({
          allergies:      data.allergies      ?? '',
          antecedents:    data.antecedents    ?? '',
          age:            data.age            ?? '',
          poids:          data.poids          ?? '',
          sexe:           data.sexe           ?? '',
          groupe_sanguin: data.groupe_sanguin ?? '',
        })
      }
    }).finally(() => setLoading(false))
  }, [])

  function maj(champ) {
    return (e) => setForm((f) => ({ ...f, [champ]: e.target.value }))
  }

  async function enregistrer(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const payload = {
      ...form,
      age:   form.age   === '' ? null : Number(form.age),
      poids: form.poids === '' ? null : Number(form.poids),
    }
    await api.put('/profil', payload)
    setMessage('Profil enregistré avec succès.')
    setSaving(false)
  }

  if (loading) return <div className="loader"><div className="spinner" /> Chargement…</div>

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Mon profil médical</h1>
          <p className="page-subtitle">Ces données aident votre pharmacien à détecter les contre-indications et personnalisent les conseils de l'assistant IA.</p>
        </div>
      </div>

      <form onSubmit={enregistrer}>
        {message && <div className="alert-ok" style={{ marginBottom: 16 }}>{message}</div>}

        {/* ── Section 1 : Informations générales ── */}
        <div className="profil-section">
          <div className="profil-section-head">
            <User size={16} />
            <span>Informations générales</span>
          </div>
          <div className="card form-med">
            <div className="grid2">
              <div className="field-group">
                <label className="field-label" htmlFor="age">Âge (ans)</label>
                <input
                  id="age"
                  type="number" min="0" max="130"
                  value={form.age}
                  onChange={maj('age')}
                  placeholder="Ex : 35"
                  className="field-input"
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="poids">Poids (kg)</label>
                <input
                  id="poids"
                  type="number" min="1" max="500" step="0.1"
                  value={form.poids}
                  onChange={maj('poids')}
                  placeholder="Ex : 72.5"
                  className="field-input"
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="sexe">Sexe</label>
                <select id="sexe" value={form.sexe} onChange={maj('sexe')} className="field-input">
                  <option value="">— Non renseigné —</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="groupe">Groupe sanguin</label>
                <select id="groupe" value={form.groupe_sanguin} onChange={maj('groupe_sanguin')} className="field-input">
                  <option value="">— Inconnu —</option>
                  {GROUPES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2 : Allergies ── */}
        <div className="profil-section">
          <div className="profil-section-head">
            <AlertTriangle size={16} />
            <span>Allergies connues</span>
          </div>
          <div className="card form-med">
            <div className="field-group">
              <textarea
                rows={3}
                placeholder="Ex : pénicilline, ibuprofène, arachides…"
                value={form.allergies}
                onChange={maj('allergies')}
                className="field-input field-textarea"
              />
              <span className="field-hint">Séparez les allergies par des virgules. Ces informations déclenchent des alertes automatiques chez votre pharmacien.</span>
            </div>
          </div>
        </div>

        {/* ── Section 3 : Antécédents ── */}
        <div className="profil-section">
          <div className="profil-section-head">
            <Stethoscope size={16} />
            <span>Antécédents médicaux</span>
          </div>
          <div className="card form-med">
            <div className="field-group">
              <textarea
                rows={4}
                placeholder="Ex : diabète type 2, hypertension, asthme, insuffisance rénale…"
                value={form.antecedents}
                onChange={maj('antecedents')}
                className="field-input field-textarea"
              />
              <span className="field-hint">Ces informations permettent à l'assistant IA de personnaliser ses conseils.</span>
            </div>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 0 }}>
          <button className="btn-primary btn-icon" disabled={saving}>
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </div>
      </form>

      {/* ── RGPD ── */}
      <div className="card" style={{ marginTop: 32 }}>
        <div className="profil-section-head" style={{ marginBottom: 8 }}>
          <HeartPulse size={16} />
          <span style={{ fontWeight: 600 }}>Mes données personnelles (RGPD)</span>
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          Vos données de santé sont chiffrées AES en base. Vous pouvez les exporter ou supprimer définitivement votre compte.
        </p>
        <div className="actions">
          <button type="button" className="btn-ghost btn-icon" onClick={exporter}>
            <Download size={15} /> Exporter mes données
          </button>
          <button type="button" className="btn-danger btn-icon" onClick={supprimerCompte}>
            <Trash2 size={15} /> Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
