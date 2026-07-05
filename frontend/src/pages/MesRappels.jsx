import { useEffect, useState } from 'react'
import { PauseCircle, PlayCircle, Trash2, RefreshCw, Calendar, List } from 'lucide-react'
import api from '../api/client.js'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HEURES_GRILLE = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']

/* Couleurs cycliques pour distinguer les rappels */
const COULEURS = ['#0d9488','#7c3aed','#f59e0b','#dc2626','#0891b2','#16a34a','#db2777']

function heureToMin(h) {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm ?? 0)
}

function CalendrierSemaine({ rappels }) {
  /* Positionne chaque prise dans la grille heure × jour */
  return (
    <div className="cal-wrap">
      {/* En-tête jours */}
      <div className="cal-header">
        <div className="cal-gutter" />
        {JOURS.map((j) => <div key={j} className="cal-day-head">{j}</div>)}
      </div>

      {/* Grille horaire */}
      <div className="cal-grid">
        {HEURES_GRILLE.map((h) => {
          const hMin = heureToMin(h)
          return (
            <div key={h} className="cal-row">
              <div className="cal-hour">{h}</div>
              {JOURS.map((j, ji) => {
                /* Tous les rappels actifs ayant une prise dans ±30 min de cette heure */
                const prises = rappels.filter(
                  (r) => r.actif && (r.heures ?? []).some((rh) => Math.abs(heureToMin(rh) - hMin) < 30)
                )
                return (
                  <div key={ji} className="cal-cell">
                    {prises.map((r, ri) => (
                      <span
                        key={r.id}
                        className="cal-pill"
                        style={{ background: COULEURS[r.id % COULEURS.length] }}
                        title={`${r.libelle} — ${(r.heures ?? []).join(', ')}`}
                      >
                        {r.libelle.length > 14 ? r.libelle.slice(0, 13) + '…' : r.libelle}
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MesRappels() {
  const [rappels, setRappels] = useState([])
  const [loading, setLoading] = useState(true)
  const [vue, setVue] = useState('liste') // 'liste' | 'calendrier'

  function charger() {
    setLoading(true)
    api.get('/rappels').then(({ data }) => setRappels(data)).finally(() => setLoading(false))
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

  if (loading) return <div className="loader"><div className="spinner" /> Chargement…</div>

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Mes rappels de prise</h1>
          <p className="page-subtitle">
            {rappels.length > 0
              ? `${rappels.filter(r => r.actif).length} actif(s) sur ${rappels.length}`
              : 'Générés automatiquement après validation d\'une commande.'}
          </p>
        </div>
        {rappels.length > 0 && (
          <div className="page-actions">
            <button
              className={`btn-ghost btn-icon btn-sm ${vue === 'liste' ? 'active-tab' : ''}`}
              onClick={() => setVue('liste')}
            >
              <List size={14} /> Liste
            </button>
            <button
              className={`btn-ghost btn-icon btn-sm ${vue === 'calendrier' ? 'active-tab' : ''}`}
              onClick={() => setVue('calendrier')}
            >
              <Calendar size={14} /> Calendrier
            </button>
          </div>
        )}
      </div>

      {rappels.length === 0 && (
        <div className="empty-state">
          <RefreshCw size={48} />
          <p>Aucun rappel configuré pour le moment.<br />Ils seront créés automatiquement après validation d'une commande.</p>
        </div>
      )}

      {/* ── Vue Calendrier ── */}
      {vue === 'calendrier' && rappels.length > 0 && (
        <>
          <div className="cal-legende">
            {rappels.map((r) => (
              <span key={r.id} className="cal-legende-item">
                <span className="cal-dot" style={{ background: COULEURS[r.id % COULEURS.length] }} />
                {r.libelle}
                {!r.actif && <em className="muted"> (pause)</em>}
              </span>
            ))}
          </div>
          <CalendrierSemaine rappels={rappels} />
        </>
      )}

      {/* ── Vue Liste ── */}
      {vue === 'liste' && (
        <div className="cards">
          {rappels.map((r) => (
            <div key={r.id} className={`card ${r.actif ? '' : 'inactif'}`}>
              <div className="card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="cal-dot"
                    style={{ background: COULEURS[r.id % COULEURS.length], width: 10, height: 10, borderRadius: '50%', display: 'inline-block' }}
                  />
                  <strong>{r.libelle}</strong>
                </div>
                <span className={`tag ${r.actif ? 'ok' : 'faint'}`}>
                  {r.actif ? 'Actif' : 'En pause'}
                </span>
              </div>
              {r.posologie && <p className="muted" style={{ marginTop: 4 }}>Posologie : {r.posologie}</p>}
              <div className="heures">
                {(r.heures || []).map((h) => (
                  <span key={h} className="tag">{h}</span>
                ))}
              </div>
              <div className="actions">
                <button className="btn-ghost btn-icon" onClick={() => basculer(r.id)}>
                  {r.actif ? <><PauseCircle size={15} /> Mettre en pause</> : <><PlayCircle size={15} /> Réactiver</>}
                </button>
                <button className="btn-danger btn-icon" onClick={() => supprimer(r.id)}>
                  <Trash2 size={15} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
