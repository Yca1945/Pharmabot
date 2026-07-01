import { useEffect, useState } from 'react'
import api from '../api/client.js'

export default function Officine() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  function charger() {
    setLoading(true)
    api
      .get('/officine/pre-commandes')
      .then(({ data }) => setCommandes(data))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function valider(id) {
    setBusyId(id)
    try {
      await api.post(`/officine/pre-commandes/${id}/valider`)
      setCommandes((cs) => cs.filter((c) => c.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  async function rejeter(id) {
    const motif = window.prompt('Motif du rejet (facultatif) :') ?? ''
    setBusyId(id)
    try {
      await api.post(`/officine/pre-commandes/${id}/rejeter`, { motif })
      setCommandes((cs) => cs.filter((c) => c.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <div className="page-head">
        <h1>Pré-commandes à valider</h1>
        <button className="btn-ghost" onClick={charger}>
          Actualiser
        </button>
      </div>

      {commandes.length === 0 && (
        <p className="muted">Aucune pré-commande en attente. ✓</p>
      )}

      <div className="cards">
        {commandes.map((c) => (
          <div key={c.id} className="card">
            <div className="card-head">
              <strong>Commande #{c.id}</strong>
              <span className="tag faint">{c.patient?.name}</span>
            </div>
            {c.alertes?.length > 0 && (
              <div className="alerte-secu">
                ⚠ Contre-indication possible :
                {c.alertes.map((a, i) => (
                  <span key={i} className="tag danger">
                    {a.medicament} / allergie : {a.allergie}
                  </span>
                ))}
              </div>
            )}
            <ul className="lignes">
              {c.lignes?.map((l) => (
                <li key={l.id}>
                  {l.medicament?.designation} × {l.quantite_demandee}
                  {l.posologie_extraite && <em> — {l.posologie_extraite}</em>}
                  <span className="stock">
                    stock : {l.medicament?.quantite_stock ?? '?'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="hint">
              Vérifiez l'ordonnance avant validation. La délivrance reste sous votre responsabilité.
            </p>
            <div className="actions">
              <button
                className="btn-primary"
                disabled={busyId === c.id}
                onClick={() => valider(c.id)}
              >
                Valider
              </button>
              <button
                className="btn-danger"
                disabled={busyId === c.id}
                onClick={() => rejeter(c.id)}
              >
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
