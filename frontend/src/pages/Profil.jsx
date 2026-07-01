import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Profil() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ allergies: '', age: '', antecedents: '' })
  const [loading, setLoading] = useState(true)
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
    if (!window.confirm('Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.')) {
      return
    }
    await api.delete('/compte')
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    api
      .get('/profil')
      .then(({ data }) => {
        if (data) {
          setForm({
            allergies: data.allergies ?? '',
            age: data.age ?? '',
            antecedents: data.antecedents ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function maj(champ) {
    return (e) => setForm({ ...form, [champ]: e.target.value })
  }

  async function enregistrer(e) {
    e.preventDefault()
    setMessage(null)
    const payload = { ...form, age: form.age === '' ? null : Number(form.age) }
    await api.put('/profil', payload)
    setMessage('Profil enregistré.')
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <h1>Mon profil médical</h1>
      <p className="muted">
        Ces informations aident votre pharmacien à sécuriser la délivrance
        (détection des contre-indications).
      </p>

      <form className="card form-med" onSubmit={enregistrer}>
        {message && <div className="tag ok">{message}</div>}
        <label>
          Allergies connues
          <textarea
            rows="2"
            placeholder="Ex : pénicilline, paracétamol, aspirine"
            value={form.allergies}
            onChange={maj('allergies')}
          />
        </label>
        <p className="muted">Séparez plusieurs allergies par une virgule.</p>
        <label>
          Âge
          <input type="number" min="0" max="120" value={form.age} onChange={maj('age')} />
        </label>
        <label>
          Antécédents médicaux
          <textarea rows="3" value={form.antecedents} onChange={maj('antecedents')} />
        </label>
        <div className="actions">
          <button className="btn-primary">Enregistrer</button>
        </div>
      </form>

      <div className="card">
        <h3>Mes données personnelles (RGPD)</h3>
        <p className="muted">
          Vos données de santé sont chiffrées. Vous pouvez les exporter ou
          supprimer définitivement votre compte.
        </p>
        <div className="actions">
          <button type="button" className="btn-ghost" onClick={exporter}>
            Exporter mes données
          </button>
          <button type="button" className="btn-danger" onClick={supprimerCompte}>
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
