import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ThumbsUp, ThumbsDown, Users, Users2 } from 'lucide-react'
import api from '../api/client.js'

/* ── Palette ── */
const C_TEAL   = '#0d9488'
const C_VIOLET = '#7c3aed'
const C_DANGER = '#dc2626'
const C_WARN   = '#f59e0b'
const C_OK     = '#22c55e'
const C_SLATE  = '#94a3b8'

const ACTION_LABEL = {
  'pre_commande.valider':    'Validation',
  'pre_commande.rejeter':    'Rejet',
  'pre_commande.recuperer':  'Récupération',
}

const ROLE_LABEL = { patient: 'Patients', pharmacien: 'Pharmaciens', admin: 'Admins' }
const ROLE_COLOR = { patient: C_TEAL, pharmacien: C_VIOLET, admin: C_DANGER }

/* ── Label pie externe ── */
function PieLabel({ cx, cy, midAngle, outerRadius, value, percent }) {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const r = outerRadius + 22
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const anchor = x > cx ? 'start' : 'end'
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 12, fill: '#334155' }}>
      <tspan x={x} dy="-0.4em" fontWeight={700}>{value}</tspan>
      <tspan x={x} dy="1.2em" style={{ fill: '#94a3b8', fontSize: 11 }}>{Math.round(percent * 100)}%</tspan>
    </text>
  )
}

/* ── Tooltip ── */
function CustomTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '8px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,.08)',
    }}>
      <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '3px 0 0', color: p.color ?? C_TEAL }}>
          {p.name ? `${p.name} : ` : ''}<strong>{p.value}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

/* ── KPI card ── */
function KPI({ value, label, sous, variant }) {
  return (
    <div className={`stat-card ${variant ?? ''}`}>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {sous && <span className="stat-sous">{sous}</span>}
    </div>
  )
}

/* ── Format date courte ── */
function shortDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => setErreur('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loader"><div className="spinner" /> Chargement…</div>
  if (erreur) return <div className="alert">{erreur}</div>
  if (!stats) return null

  const { utilisateurs, commandes, chatbot, catalogue, audit_recent } = stats
  const totalFeedback = chatbot.feedback_positif + chatbot.feedback_negatif

  /* ── Données graphiques ── */

  // Inscriptions : area chart 30j
  const areaInscriptions = utilisateurs.inscriptions_par_jour.map((d) => ({
    date: shortDate(d.jour),
    total: d.total,
  }))

  // Activité chatbot : area chart 30j
  const areaChatbot = chatbot.messages_par_jour.map((d) => ({
    date: shortDate(d.jour),
    total: d.total,
  }))

  // Commandes par statut : pie
  const STATUT_LABEL = { en_attente: 'En attente', valide: 'Validées', rejete: 'Rejetées', recupere: 'Récupérées' }
  const STATUT_COLOR = { en_attente: C_WARN, valide: C_TEAL, rejete: C_DANGER, recupere: C_SLATE }
  const pieStatut = Object.entries(commandes.par_statut)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUT_LABEL[k] ?? k, value: v, color: STATUT_COLOR[k] ?? C_SLATE }))

  // Utilisateurs par rôle : pie
  const pieRoles = Object.entries(utilisateurs.par_role)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: ROLE_LABEL[k] ?? k, value: v, color: ROLE_COLOR[k] ?? C_SLATE }))

  // Feedback pie
  const pieFeedback = [
    { name: 'Utiles', value: chatbot.feedback_positif, color: C_OK },
    { name: 'À améliorer', value: chatbot.feedback_negatif, color: C_DANGER },
  ].filter((d) => d.value > 0)

  // Abstention pie
  const abstentions = Math.round(chatbot.total_messages * chatbot.taux_abstention / 100)
  const pieAbstention = [
    { name: 'Réponses IA', value: chatbot.total_messages - abstentions, color: C_TEAL },
    { name: 'Abstentions', value: abstentions, color: C_WARN },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Vue globale de la plateforme Pharmabot.</p>
        </div>
        <div className="page-actions">
          <Link to="/admin/users" className="btn-ghost btn-sm btn-icon"><Users size={14} /> Utilisateurs</Link>
          <Link to="/admin/audit" className="btn-ghost btn-sm">Journal d'audit</Link>
        </div>
      </div>

      {/* ══════════════════════════════════
          SECTION 1 : UTILISATEURS
      ══════════════════════════════════ */}
      <section className="stats-section">
        <p className="stats-section-title">Utilisateurs</p>
        <div className="stats-grid">
          <KPI value={utilisateurs.total} label="Total comptes" sous={`+${utilisateurs.nouveaux_cette_semaine} cette semaine`} />
          {Object.entries(utilisateurs.par_role).map(([role, total]) => (
            <KPI key={role} value={total} label={ROLE_LABEL[role] ?? role} />
          ))}
          <KPI value={utilisateurs.nouveaux_ce_mois} label="Nouveaux ce mois" />
        </div>

        <div className="charts-row" style={{ marginTop: 16 }}>
          {/* Area : inscriptions 30j */}
          {areaInscriptions.length > 0 && (
            <div className="chart-card chart-card-two-thirds">
              <p className="chart-title">Inscriptions — 30 derniers jours</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaInscriptions} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradInscriptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C_TEAL} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C_TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C_SLATE }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C_SLATE }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Inscriptions" stroke={C_TEAL} strokeWidth={2} fill="url(#gradInscriptions)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie : répartition rôles */}
          {pieRoles.length > 0 && (
            <div className="chart-card chart-card-third">
              <p className="chart-title">Répartition des rôles</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieRoles}
                    cx="50%" cy="46%"
                    innerRadius={40} outerRadius={64}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    label={<PieLabel />}
                  >
                    {pieRoles.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          SECTION 2 : COMMANDES
      ══════════════════════════════════ */}
      <section className="stats-section">
        <p className="stats-section-title">Pré-commandes</p>
        <div className="stats-grid">
          <KPI value={commandes.total} label="Total" sous={`${commandes.ce_mois} ce mois`} />
          <KPI value={`${commandes.taux_validation}%`} label="Taux de validation" variant={commandes.taux_validation < 50 ? 'warn' : 'ok'} />
          <KPI value={commandes.validees} label="Validées" />
          <KPI value={commandes.rejetees} label="Rejetées" />
          {commandes.par_statut.en_attente > 0 && (
            <KPI value={commandes.par_statut.en_attente} label="En attente" variant="warn" />
          )}
        </div>

        {pieStatut.length > 0 && (
          <div className="chart-card" style={{ marginTop: 16, maxWidth: 480 }}>
            <p className="chart-title">Répartition par statut</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieStatut}
                  cx="50%" cy="46%"
                  innerRadius={50} outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  label={<PieLabel />}
                >
                  {pieStatut.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════
          SECTION 3 : CHATBOT
      ══════════════════════════════════ */}
      <section className="stats-section">
        <p className="stats-section-title">Assistant IA</p>
        <div className="stats-grid">
          <KPI value={chatbot.total_messages} label="Messages total" sous={`${chatbot.messages_ce_mois} ce mois`} />
          <KPI value={`${chatbot.taux_abstention}%`} label="Taux d'abstention" variant={chatbot.taux_abstention > 40 ? 'warn' : ''} sous="Garde-fou actif" />
          {chatbot.score_satisfaction !== null && (
            <KPI value={`${chatbot.score_satisfaction}%`} label="Satisfaction" variant={chatbot.score_satisfaction < 60 ? 'warn' : 'ok'} sous={`${totalFeedback} avis`} />
          )}
          <KPI value={<span className="stat-icon-val"><ThumbsUp size={18} /> {chatbot.feedback_positif}</span>} label="Réponses utiles" />
          <KPI value={<span className="stat-icon-val"><ThumbsDown size={18} /> {chatbot.feedback_negatif}</span>} label="À améliorer" />
        </div>

        <div className="charts-row" style={{ marginTop: 16 }}>
          {/* Area : activité chatbot 30j */}
          {areaChatbot.length > 0 && (
            <div className="chart-card chart-card-two-thirds">
              <p className="chart-title">Activité de l'assistant — 30 derniers jours</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaChatbot} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradChatbot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C_VIOLET} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C_VIOLET} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C_SLATE }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C_SLATE }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Messages" stroke={C_VIOLET} strokeWidth={2} fill="url(#gradChatbot)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="chart-card chart-card-third">
            {/* Pie : abstention */}
            <p className="chart-title">Réponses vs abstentions</p>
            <ResponsiveContainer width="100%" height={90}>
              <PieChart>
                <Pie data={pieAbstention} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="value">
                  {pieAbstention.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: -8, fontSize: 12 }}>
              {pieAbstention.map((d, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <strong style={{ color: '#0f172a' }}>{d.value}</strong> {d.name}
                </span>
              ))}
            </div>

            {/* Pie : satisfaction */}
            {pieFeedback.length > 0 && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '12px 0 8px' }} />
                <p className="chart-title">Satisfaction patients</p>
                <ResponsiveContainer width="100%" height={90}>
                  <PieChart>
                    <Pie data={pieFeedback} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={36} outerRadius={58} paddingAngle={2} dataKey="value">
                      {pieFeedback.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: -8, fontSize: 12 }}>
                  {pieFeedback.map((d, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      <strong style={{ color: '#0f172a' }}>{d.value}</strong> {d.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          SECTION 4 : CATALOGUE
      ══════════════════════════════════ */}
      <section className="stats-section">
        <p className="stats-section-title">Catalogue médicaments</p>
        <div className="stats-grid">
          <KPI value={catalogue.total_medicaments} label="Médicaments référencés" />
          <KPI value={catalogue.stock_bas} label="Stock bas (≤ 5 unités)" variant={catalogue.stock_bas > 0 ? 'warn' : ''} />
          <KPI value={catalogue.ruptures} label="Ruptures de stock" variant={catalogue.ruptures > 0 ? 'danger' : ''} />
        </div>
      </section>

      {/* ══════════════════════════════════
          SECTION 5 : AUDIT RÉCENT
      ══════════════════════════════════ */}
      <section className="stats-section">
        <div className="section-head">
          <p className="stats-section-title" style={{ margin: 0 }}>Activité récente</p>
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
                    {new Date(l.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>{l.user?.name ?? <em className="muted">—</em>}</td>
                  <td><span className="tag">{ACTION_LABEL[l.action] ?? l.action}</span></td>
                  <td className="muted">
                    {l.meta?.motif ? <em>{l.meta.motif}</em> : l.entite_type ? `${l.entite_type} #${l.entite_id}` : null}
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
