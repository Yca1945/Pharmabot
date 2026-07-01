import { useEffect, useState } from 'react'
import api from '../api/client.js'

const STATUT_LABEL = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
  recupere: 'Récupéré',
}

export default function Statistiques() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/officine/statistiques')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">Chargement des statistiques…</p>
  if (!stats) return <p className="muted">Données indisponibles.</p>

  const { commandes, chatbot, stock } = stats
  const totalFeedback = chatbot.feedback_positif + chatbot.feedback_negatif
  const scoreSatisfaction =
    totalFeedback > 0
      ? Math.round((chatbot.feedback_positif / totalFeedback) * 100)
      : null

  return (
    <div className="page">
      <div className="page-head">
        <h1>Tableau de bord — Statistiques</h1>
      </div>

      {/* --- Commandes --- */}
      <section className="stats-section">
        <h2>Pré-commandes</h2>
        <div className="stats-grid">
          {Object.entries(commandes.par_statut).map(([statut, total]) => (
            <div key={statut} className="stat-card">
              <span className="stat-value">{total}</span>
              <span className="stat-label">{STATUT_LABEL[statut] ?? statut}</span>
            </div>
          ))}
          {stock.medicaments_bas > 0 && (
            <div className="stat-card danger">
              <span className="stat-value">{stock.medicaments_bas}</span>
              <span className="stat-label">Médicaments stock bas</span>
            </div>
          )}
        </div>

        {commandes.par_semaine.length > 0 && (
          <div className="chart-bar">
            <h3>Commandes — 8 dernières semaines</h3>
            <div className="bars">
              {commandes.par_semaine.map((s) => (
                <div key={s.semaine} className="bar-col">
                  <div
                    className="bar"
                    style={{
                      height: `${Math.round(
                        (s.total / Math.max(...commandes.par_semaine.map((x) => x.total))) * 100
                      )}%`,
                    }}
                  />
                  <span className="bar-label">{String(s.semaine).slice(-2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {commandes.top_medicaments.length > 0 && (
          <div className="top-list">
            <h3>Top 5 médicaments commandés</h3>
            <ol>
              {commandes.top_medicaments.map((m, i) => (
                <li key={i}>
                  <strong>{m.designation}</strong> — {m.total} unité(s)
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* --- Chatbot --- */}
      <section className="stats-section">
        <h2>Performance du chatbot</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{chatbot.total_messages}</span>
            <span className="stat-label">Messages échangés</span>
          </div>
          <div className={`stat-card ${chatbot.taux_abstention > 30 ? 'warn' : ''}`}>
            <span className="stat-value">{chatbot.taux_abstention}%</span>
            <span className="stat-label">Taux d'abstention (garde-fou)</span>
          </div>
          {chatbot.fidelite_moyenne !== null && (
            <div className="stat-card">
              <span className="stat-value">
                {Math.round(chatbot.fidelite_moyenne * 100)}%
              </span>
              <span className="stat-label">Fidélité estimée moyenne</span>
            </div>
          )}
          {scoreSatisfaction !== null && (
            <div className={`stat-card ${scoreSatisfaction < 60 ? 'warn' : 'ok'}`}>
              <span className="stat-value">{scoreSatisfaction}%</span>
              <span className="stat-label">
                Satisfaction patients ({totalFeedback} avis)
              </span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-value">👍 {chatbot.feedback_positif}</span>
            <span className="stat-label">Réponses utiles</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">👎 {chatbot.feedback_negatif}</span>
            <span className="stat-label">Réponses à améliorer</span>
          </div>
        </div>
      </section>
    </div>
  )
}
