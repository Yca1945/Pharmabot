import { useEffect, useState } from 'react'
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

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <h1>Retraits (Click &amp; Collect)</h1>
      <p className="muted">Commandes validées en attente de retrait par le patient.</p>

      {commandes.length === 0 && <p className="muted">Aucune commande à remettre.</p>}

      <div className="cards">
        {commandes.map((c) => (
          <div key={c.id} className="card">
            <div className="card-head">
              <strong>Commande #{c.id}</strong>
              <span className="tag ok">Code : {c.code_validation}</span>
            </div>
            <p className="muted">{c.patient?.name}</p>
            <ul className="lignes">
              {c.lignes?.map((l) => (
                <li key={l.id}>
                  {l.medicament?.designation} × {l.quantite_demandee}
                </li>
              ))}
            </ul>
            <div className="actions">
              <button
                className="btn-primary"
                disabled={busyId === c.id}
                onClick={() => recuperer(c.id)}
              >
                Marquer récupéré
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
