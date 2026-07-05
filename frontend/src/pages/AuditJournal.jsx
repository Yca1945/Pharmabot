import { useEffect, useState } from 'react'
import api from '../api/client.js'

const ACTION_LABEL = {
  'pre_commande.valider': 'Validation commande',
  'pre_commande.rejeter': 'Rejet commande',
  'pre_commande.recuperer': 'Récupération commande',
}

export default function AuditJournal({
  endpoint = '/admin/audit',
  titre = "Journal d'audit",
  sousTitre = 'traçabilité RGPD',
}) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtreAction, setFiltreAction] = useState('')
  const [depuis, setDepuis] = useState('')
  const [jusqu, setJusqu] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })

  function charger(p = 1) {
    setLoading(true)
    const params = { page: p, per_page: 20 }
    if (filtreAction) params.action = filtreAction
    if (depuis) params.depuis = depuis
    if (jusqu) params.jusqu = jusqu
    api
      .get(endpoint, { params })
      .then(({ data }) => {
        setLogs(data.data ?? data)
        setMeta({
          current_page: data.meta?.current_page ?? data.current_page ?? 1,
          last_page: data.meta?.last_page ?? data.last_page ?? 1,
          total: data.meta?.total ?? data.total ?? 0,
        })
        setPage(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger(1) }, [filtreAction, depuis, jusqu])

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">{titre}</h1>
          {meta.total > 0 && <p className="page-subtitle">{meta.total} entrée{meta.total > 1 ? 's' : ''} — {sousTitre}</p>}
        </div>
      </div>

      <div className="filters-row">
        <select value={filtreAction} onChange={(e) => setFiltreAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.keys(ACTION_LABEL).map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a]}</option>
          ))}
        </select>
        <label className="filter-date">
          Du
          <input type="date" value={depuis} onChange={(e) => setDepuis(e.target.value)} />
        </label>
        <label className="filter-date">
          Au
          <input type="date" value={jusqu} onChange={(e) => setJusqu(e.target.value)} />
        </label>
        {(filtreAction || depuis || jusqu) && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => { setFiltreAction(''); setDepuis(''); setJusqu('') }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="muted">Aucune entrée d'audit pour ces filtres.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Entité</th>
              <th>IP</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="muted">
                  {new Date(l.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
                <td>
                  {l.user ? (
                    <span>
                      <strong>{l.user.name}</strong>
                      <br />
                      <small className="muted">{l.user.email}</small>
                    </span>
                  ) : (
                    <em className="muted">Compte supprimé</em>
                  )}
                </td>
                <td>
                  <span className="tag">{ACTION_LABEL[l.action] ?? l.action}</span>
                </td>
                <td className="muted">
                  {l.entite_type && `${l.entite_type} #${l.entite_id}`}
                </td>
                <td className="muted">{l.ip ?? '—'}</td>
                <td>{l.meta?.motif && <em>{l.meta.motif}</em>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {meta.last_page > 1 && (
        <div className="pagination">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => charger(page - 1)}>
            Précédent
          </button>
          <span className="muted">Page {page} / {meta.last_page}</span>
          <button className="btn-ghost" disabled={page >= meta.last_page} onClick={() => charger(page + 1)}>
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
