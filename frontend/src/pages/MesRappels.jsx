import { useEffect, useState } from 'react'
import api from '../api/client.js'

export default function MesRappels() {
  const [rappels, setRappels] = useState([])
  const [loading, setLoading] = useState(true)

  function charger() {
    setLoading(true)
    api
      .get('/rappels')
      .then(({ data }) => setRappels(data))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function basculer(id) {
    await api.post(`/rappels/${id}/basculer`)
    charger()
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer ce rappel ?')) return
    await api.delete(`/rappels/${id}`)
    charger()
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <h1>Mes rappels de prise</h1>
      <p className="muted">
        Générés automatiquement à partir de la posologie validée par votre pharmacien.
      </p>

      {rappels.length === 0 && <p className="muted">Aucun rappel pour le moment.</p>}

      <div className="cards">
        {rappels.map((r) => (
          <div key={r.id} className={`card ${r.actif ? '' : 'inactif'}`}>
            <div className="card-head">
              <strong>{r.libelle}</strong>
              <span className={`tag ${r.actif ? 'ok' : 'faint'}`}>
                {r.actif ? 'Actif' : 'En pause'}
              </span>
            </div>
            {r.posologie && <p className="muted">Posologie : {r.posologie}</p>}
            <div className="heures">
              {(r.heures || []).map((h) => (
                <span key={h} className="tag">
                  {h}
                </span>
              ))}
            </div>
            <div className="actions">
              <button className="btn-ghost" onClick={() => basculer(r.id)}>
                {r.actif ? 'Mettre en pause' : 'Réactiver'}
              </button>
              <button className="btn-danger" onClick={() => supprimer(r.id)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
