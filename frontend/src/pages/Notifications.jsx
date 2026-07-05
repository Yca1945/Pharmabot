import { useEffect, useState } from 'react'
import { Bell, CheckCheck, CheckCircle, XCircle, PackageCheck } from 'lucide-react'
import api from '../api/client.js'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  function charger() {
    setLoading(true)
    api.get('/notifications').then(({ data }) => setItems(data.notifications)).finally(() => setLoading(false))
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

  if (loading) return <div className="loader"><div className="spinner" /> Chargement…</div>

  const nonLues = items.filter((n) => !n.read_at).length

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Notifications</h1>
          {nonLues > 0 && <p className="page-subtitle">{nonLues} non lue{nonLues > 1 ? 's' : ''}</p>}
        </div>
        {nonLues > 0 && (
          <div className="page-actions">
            <button className="btn-ghost btn-sm btn-icon" onClick={toutLire}>
              <CheckCheck size={14} /> Tout marquer comme lu
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <p>Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="notif-list">
          {items.map((n) => {
            const valide = n.data.type === 'pre_commande_validee'
            return (
              <div
                key={n.id}
                className={`notif ${n.read_at ? '' : 'unread'}`}
                onClick={() => !n.read_at && lire(n.id)}
              >
                {valide
                  ? <CheckCircle size={18} style={{ color: 'var(--ok-fg)', flexShrink: 0, marginTop: 2 }} />
                  : <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                }
                <div className="notif-body">
                  <p>{n.data.message}</p>
                  {n.data.code_validation && (
                    <span className="code-retrait" style={{ marginTop: 6, display: 'inline-flex' }}>
                      <PackageCheck size={13} /> Code de retrait : {n.data.code_validation}
                    </span>
                  )}
                  {n.data.motif && <p className="muted" style={{ marginTop: 4 }}>Motif : {n.data.motif}</p>}
                  <p className="notif-time">{new Date(n.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {!n.read_at && <span className="notif-dot" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
