import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import api from '../api/client.js'

/* ── Palette ── */
const C_TEAL   = '#0d9488'
const C_WARN   = '#f59e0b'
const C_DANGER = '#dc2626'
const C_FAINT  = '#94a3b8'
const C_OK     = '#22c55e'
const C_VIOLET = '#7c3aed'

const STATUT_COLOR = {
  en_attente: C_WARN,
  valide:     C_TEAL,
  rejete:     C_DANGER,
  recupere:   C_FAINT,
}
const STATUT_LABEL = {
  en_attente: 'En attente',
  valide:     'Validé',
  rejete:     'Rejeté',
  recupere:   'Récupéré',
}

/* ── Label pie : "Nom\n42 (65%)" ── */
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent }) {
  if (percent < 0.04) return null          // masquer les tranches trop petites
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

/* ── Tooltip personnalisé ── */
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

export default function Statistiques() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/officine/statistiques').then(({ data }) => setStats(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loader"><div className="spinner" /> Chargement des statistiques…</div>
  if (!stats) return <p className="muted">Données indisponibles.</p>

  const { commandes, chatbot, stock } = stats
  const totalFeedback = chatbot.feedback_positif + chatbot.feedback_negatif
  const scoreSatisfaction = totalFeedback > 0
    ? Math.round((chatbot.feedback_positif / totalFeedback) * 100)
    : null

  /* Données graphique pie commandes par statut */
  const pieStatut = Object.entries(commandes.par_statut).map(([k, v]) => ({
    name: STATUT_LABEL[k] ?? k,
    value: v,
    color: STATUT_COLOR[k] ?? C_FAINT,
  }))

  /* Données graphique barres semaines — label lisible */
  const barSemaines = commandes.par_semaine.map((s) => ({
    semaine: `S${String(s.semaine).slice(-2)}`,
    total: s.total,
  }))

  /* Top médicaments — barres horizontales */
  const barTop = [...commandes.top_medicaments].reverse().map((m) => ({
    name: m.designation.length > 22 ? m.designation.slice(0, 20) + '…' : m.designation,
    total: Number(m.total),
  }))

  /* Feedback pie */
  const pieFeedback = [
    { name: 'Utiles', value: chatbot.feedback_positif, color: C_OK },
    { name: 'À améliorer', value: chatbot.feedback_negatif, color: C_DANGER },
  ].filter((d) => d.value > 0)

  /* Abstention pie */
  const total = chatbot.total_messages
  const abstentions = Math.round(total * chatbot.taux_abstention / 100)
  const pieAbstention = [
    { name: 'Réponses IA', value: total - abstentions, color: C_TEAL },
    { name: 'Abstentions', value: abstentions, color: C_WARN },
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Statistiques</h1>
          <p className="page-subtitle">Activité de l'officine en temps réel.</p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <section className="stats-section">
        <p className="stats-section-title">Vue d'ensemble</p>
        <div className="stats-grid">
          {Object.entries(commandes.par_statut).map(([statut, total]) => (
            <div key={statut} className="stat-card">
              <span className="stat-value" style={{ color: STATUT_COLOR[statut] }}>{total}</span>
              <span className="stat-label">{STATUT_LABEL[statut] ?? statut}</span>
            </div>
          ))}
          <div className="stat-card">
            <span className="stat-value">{chatbot.total_messages}</span>
            <span className="stat-label">Messages chatbot</span>
          </div>
          {stock.medicaments_bas > 0 && (
            <div className="stat-card danger">
              <span className="stat-value">{stock.medicaments_bas}</span>
              <span className="stat-label">Médicaments stock bas</span>
            </div>
          )}
          {scoreSatisfaction !== null && (
            <div className={`stat-card ${scoreSatisfaction < 60 ? 'warn' : 'ok'}`}>
              <span className="stat-value">{scoreSatisfaction}%</span>
              <span className="stat-label">Satisfaction ({totalFeedback} avis)</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Graphique 1 : Commandes par semaine (barres) ── */}
      {barSemaines.length > 0 && (
        <section className="stats-section">
          <p className="stats-section-title">Pré-commandes — 8 dernières semaines</p>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barSemaines} barSize={32} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="semaine" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" name="Commandes" fill={C_TEAL} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="total" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0f766e' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Graphiques 2 : Répartition commandes + Top médicaments ── */}
      <section className="stats-section">
        <p className="stats-section-title">Analyse des commandes</p>
        <div className="charts-row">
          {/* Pie statuts */}
          {pieStatut.length > 0 && (
            <div className="chart-card chart-card-half">
              <p className="chart-title">Répartition par statut</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieStatut}
                    cx="50%" cy="48%"
                    innerRadius={52} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    label={<PieLabel />}
                  >
                    {pieStatut.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top médicaments barres horizontales */}
          {barTop.length > 0 && (
            <div className="chart-card chart-card-half">
              <p className="chart-title">Top 5 médicaments commandés</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barTop} layout="vertical" barSize={18} margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip unit=" unité(s)" />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="total" name="Unités" fill={C_VIOLET} radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="total" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#6d28d9' }} />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ── Graphiques 3 : Chatbot ── */}
      <section className="stats-section">
        <p className="stats-section-title">Performance de l'assistant IA</p>
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <span className="stat-value">{chatbot.total_messages}</span>
            <span className="stat-label">Messages échangés</span>
          </div>
          <div className={`stat-card ${chatbot.taux_abstention > 30 ? 'warn' : ''}`}>
            <span className="stat-value">{chatbot.taux_abstention}%</span>
            <span className="stat-label">Taux d'abstention</span>
          </div>
          {chatbot.fidelite_moyenne !== null && (
            <div className="stat-card">
              <span className="stat-value">{Math.round(chatbot.fidelite_moyenne * 100)}%</span>
              <span className="stat-label">Fidélité estimée moy.</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-value stat-icon-val"><ThumbsUp size={18} /> {chatbot.feedback_positif}</span>
            <span className="stat-label">Réponses utiles</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-icon-val"><ThumbsDown size={18} /> {chatbot.feedback_negatif}</span>
            <span className="stat-label">À améliorer</span>
          </div>
        </div>

        <div className="charts-row">
          {/* Pie abstention */}
          <div className="chart-card chart-card-half">
            <p className="chart-title">Réponses IA vs abstentions</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieAbstention}
                  cx="50%" cy="48%"
                  innerRadius={50} outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  label={<PieLabel />}
                >
                  {pieAbstention.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pie feedback */}
          {pieFeedback.length > 0 && (
            <div className="chart-card chart-card-half">
              <p className="chart-title">Satisfaction patients</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieFeedback}
                    cx="50%" cy="48%"
                    innerRadius={50} outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    label={<PieLabel />}
                  >
                    {pieFeedback.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
