import { useEffect, useState } from 'react'
import api from '../api/client.js'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  function charger() {
    setLoading(true)
    api
      .get('/notifications')
      .then(({ data }) => setItems(data.notifications))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function toutLire() {
    await api.post('/notifications/lire-tout')
    charger()
  }

  async function lire(id) {
    await api.post(`/notifications/${id}/lu`)
    charger()
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <div className="page-head">
        <h1>Notifications</h1>
        {items.some((n) => !n.read_at) && (
          <button className="btn-ghost" onClick={toutLire}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {items.length === 0 && <p className="muted">Aucune notification.</p>}

      <div className="notif-list">
        {items.map((n) => {
          const valide = n.data.type === 'pre_commande_validee'
          return (
            <div
              key={n.id}
              className={`notif ${n.read_at ? '' : 'unread'}`}
              onClick={() => !n.read_at && lire(n.id)}
            >
              <span className={`tag ${valide ? 'ok' : 'danger'}`}>
                {valide ? 'Validée' : 'Rejetée'}
              </span>
              <div className="notif-body">
                <p>{n.data.message}</p>
                {n.data.code_validation && (
                  <p className="muted">
                    Code de retrait : <strong>{n.data.code_validation}</strong>
                  </p>
                )}
                {n.data.motif && <p className="muted">Motif : {n.data.motif}</p>}
              </div>
              {!n.read_at && <span className="dot" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
