import { useEffect, useState } from 'react'
import { PackageCheck, Package } from 'lucide-react'
import api from '../api/client.js'

export default function Retraits() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  function charger() {
    setLoading(true)
    api
      .get('/officine/pre-commandes/validees')
      .then(({ data }) => setCommandes(data))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function recuperer(id) {
    setBusyId(id)
    try {
      await api.post(`/officine/pre-commandes/${id}/recuperer`)
      setCommandes((cs) => cs.filter((c) => c.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="loader"><div className="spinner" /> Chargement…</div>

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Retraits — Click &amp; Collect</h1>
          <p className="page-subtitle">Commandes validées en attente de retrait.</p>
        </div>
      </div>

      {commandes.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>Aucune commande en attente de retrait.</p>
        </div>
      ) : (
        <div className="cards">
          {commandes.map((c) => (
            <div key={c.id} className="card">
              <div className="card-head">
                <strong>Commande #{c.id}</strong>
                <span className="code-retrait">
                  <PackageCheck size={12} /> {c.code_validation}
                </span>
              </div>
              <p className="muted" style={{ marginBottom: 10 }}>{c.patient?.name}</p>
              <ul className="lignes">
                {c.lignes?.map((l) => (
                  <li key={l.id}>
                    <span>{l.medicament?.designation} <strong>× {l.quantite_demandee}</strong></span>
                  </li>
                ))}
              </ul>
              <div className="actions">
                <button
                  className="btn-primary btn-icon"
                  disabled={busyId === c.id}
                  onClick={() => recuperer(c.id)}
                >
                  <PackageCheck size={15} /> {busyId === c.id ? 'Traitement…' : 'Marquer récupéré'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
