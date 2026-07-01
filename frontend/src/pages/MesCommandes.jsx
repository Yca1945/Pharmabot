import { useEffect, useState } from 'react'
import api from '../api/client.js'

const STATUT_LABEL = {
  en_attente: { label: 'En attente de validation', cls: 'warn' },
  valide: { label: 'Validée — prête au retrait', cls: 'ok' },
  rejete: { label: 'Rejetée', cls: 'danger' },
  recupere: { label: 'Récupérée', cls: 'faint' },
}

export default function MesCommandes() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/pre-commandes')
      .then(({ data }) => setCommandes(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <h1>Mes pré-commandes</h1>
      {commandes.length === 0 && <p className="muted">Aucune pré-commande pour le moment.</p>}
      <div className="cards">
        {commandes.map((c) => {
          const st = STATUT_LABEL[c.statut] || { label: c.statut, cls: 'faint' }
          return (
            <div key={c.id} className="card">
              <div className="card-head">
                <strong>Commande #{c.id}</strong>
                <span className={`tag ${st.cls}`}>{st.label}</span>
              </div>
              <ul className="lignes">
                {c.lignes?.map((l) => (
                  <li key={l.id}>
                    {l.medicament?.designation} × {l.quantite_demandee}
                    {l.posologie_extraite && <em> — {l.posologie_extraite}</em>}
                  </li>
                ))}
              </ul>
              {c.code_validation && (
                <p className="muted">Code de retrait : <strong>{c.code_validation}</strong></p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
