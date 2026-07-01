import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'

const ACTION_LABEL = {
  'pre_commande.valider': 'Validation commande',
  'pre_commande.rejeter': 'Rejet commande',
  'pre_commande.recuperer': 'Récupération commande',
}

const ROLE_LABEL = { patient: 'Patients', pharmacien: 'Pharmaciens', admin: 'Admins' }
const ROLE_COLOR = { patient: 'var(--teal)', pharmacien: '#7c3aed', admin: '#dc2626' }

function KPI({ value, label, sous, variant }) {
  return (
    <div className={`stat-card ${variant ?? ''}`}>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {sous && <span className="stat-sous">{sous}</span>}
    </div>
  )
}

function MiniBar({ data, keyField, valueField, maxOverride }) {
  if (!data || data.length === 0) return <p className="muted">Aucune donnée.</p>
  const max = maxOverride ?? Math.max(...data.map((d) => d[valueField] ?? 0), 1)
  return (
    <div className="bars bars-sm">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          <div className="bar" style={{ height: `${Math.round(((d[valueField] ?? 0) / max) * 100)}%` }} />
          <span className="bar-label">{d[keyField]}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => setErreur('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted" style={{ padding: '2rem' }}>Chargement…</p>
  if (erreur) return <p className="alert">{erreur}</p>
  if (!stats) return null

  const { utilisateurs, commandes, chatbot, catalogue, audit_recent } = stats
  const totalFeedback = chatbot.feedback_positif + chatbot.feedback_negatif

  return (
    <div className="page">
      <div className="page-head">
        <h1>Tableau de bord administrateur</h1>
        <div className="page-actions">
          <Link to="/admin/users" className="btn-ghost">Utilisateurs</Link>
          <Link to="/admin/audit" className="btn-ghost">Journal d'audit</Link>
        </div>
      </div>

      {/* ====== UTILISATEURS ====== */}
      <section className="stats-section">
        <h2>Utilisateurs</h2>
        <div className="stats-grid">
          <KPI
            value={utilisateurs.total}
            label="Comptes total"
            sous={`+${utilisateurs.nouveaux_cette_semaine} cette semaine`}
          />
          {Object.entries(utilisateurs.par_role).map(([role, total]) => (
            <KPI
              key={role}
              value={total}
              label={ROLE_LABEL[role] ?? role}
              sous={`+${utilisateurs.nouveaux_ce_mois} ce mois (all roles)`}
            />
          ))}
        </div>

        {utilisateurs.inscriptions_par_jour.length > 0 && (
          <div className="chart-bar">
            <h3>Inscriptions — 30 derniers jours</h3>
            <MiniBar
              data={utilisateurs.inscriptions_par_jour}
              keyField="jour"
              valueField="total"
            />
          </div>
        )}
      </section>

      {/* ====== COMMANDES ====== */}
      <section className="stats-section">
        <h2>Pré-commandes</h2>
        <div className="stats-grid">
          <KPI value={commandes.total} label="Total commandes" sous={`${commandes.ce_mois} ce mois`} />
          <KPI
            value={`${commandes.taux_validation}%`}
            label="Taux de validation"
            variant={commandes.taux_validation < 50 ? 'warn' : 'ok'}
          />
          <KPI value={commandes.validees} label="Validées" />
          <KPI value={commandes.rejetees} label="Rejetées" />
          {commandes.par_statut.en_attente > 0 && (
            <KPI
              value={commandes.par_statut.en_attente}
              label="En attente"
              variant="warn"
            />
          )}
        </div>
      </section>

      {/* ====== CHATBOT ====== */}
      <section className="stats-section">
        <h2>Assistant IA</h2>
        <div className="stats-grid">
          <KPI
            value={chatbot.total_messages}
            label="Messages total"
            sous={`${chatbot.messages_ce_mois} ce mois`}
          />
          <KPI
            value={`${chatbot.taux_abstention}%`}
            label="Taux d'abstention"
            variant={chatbot.taux_abstention > 40 ? 'warn' : ''}
            sous="Garde-fou anti-hallucination"
          />
          {chatbot.score_satisfaction !== null && (
            <KPI
              value={`${chatbot.score_satisfaction}%`}
              label="Satisfaction patients"
              variant={chatbot.score_satisfaction < 60 ? 'warn' : 'ok'}
              sous={`${totalFeedback} avis`}
            />
          )}
          <KPI value={`👍 ${chatbot.feedback_positif}`} label="Réponses utiles" />
          <KPI value={`👎 ${chatbot.feedback_negatif}`} label="À améliorer" />
        </div>

        {chatbot.messages_par_jour.length > 0 && (
          <div className="chart-bar">
            <h3>Activité chatbot — 30 derniers jours</h3>
            <MiniBar
              data={chatbot.messages_par_jour}
              keyField="jour"
              valueField="total"
            />
          </div>
        )}
      </section>

      {/* ====== CATALOGUE ====== */}
      <section className="stats-section">
        <h2>Catalogue médicaments</h2>
        <div className="stats-grid">
          <KPI value={catalogue.total_medicaments} label="Médicaments référencés" />
          <KPI
            value={catalogue.stock_bas}
            label="Stock bas (≤ 5 unités)"
            variant={catalogue.stock_bas > 0 ? 'warn' : ''}
          />
          <KPI
            value={catalogue.ruptures}
            label="Ruptures de stock"
            variant={catalogue.ruptures > 0 ? 'danger' : ''}
          />
        </div>
      </section>

      {/* ====== ACTIVITÉ RÉCENTE (AUDIT) ====== */}
      <section className="stats-section">
        <div className="section-head">
          <h2>Activité récente</h2>
          <Link to="/admin/audit" className="btn-ghost btn-sm">Voir tout →</Link>
        </div>
        {audit_recent.length === 0 ? (
          <p className="muted">Aucune activité enregistrée.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {audit_recent.map((l) => (
                <tr key={l.id}>
                  <td className="muted">
                    {new Date(l.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{l.user?.name ?? <em className="muted">—</em>}</td>
                  <td>
                    <span className="tag">{ACTION_LABEL[l.action] ?? l.action}</span>
                  </td>
                  <td className="muted">
                    {l.meta?.motif
                      ? <em>{l.meta.motif}</em>
                      : l.entite_type
                      ? `${l.entite_type} #${l.entite_id}`
                      : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
