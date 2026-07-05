import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Info, X, FileCheck2, FileWarning } from 'lucide-react'
import api from '../api/client.js'

const MOTIFS_SUGGERES = [
  'Ordonnance manquante ou invalide',
  'Contre-indication détectée',
  'Stock insuffisant',
  'Posologie incohérente',
  'Doute sur l\'identité du patient',
]

function ModalRejet({ commande, onCancel, onConfirm, busy }) {
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState(null)

  function confirmer() {
    if (!motif.trim()) {
      setErreur('Veuillez indiquer un motif de rejet.')
      return
    }
    onConfirm(motif.trim())
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><XCircle size={18} style={{ color: 'var(--danger)' }} /> Rejeter la commande #{commande.id}</h3>
          <button className="btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>

        <p className="muted" style={{ marginBottom: 12 }}>
          Patient : <strong>{commande.patient?.name}</strong>. Merci de préciser le motif du rejet
          — le patient en sera informé.
        </p>

        <div className="field-group">
          <textarea
            rows={3}
            autoFocus
            placeholder="Ex : ordonnance non fournie, contre-indication détectée…"
            value={motif}
            onChange={(e) => { setMotif(e.target.value); setErreur(null) }}
            className="field-input field-textarea"
          />
          {erreur && <span className="field-hint" style={{ color: 'var(--danger)' }}>{erreur}</span>}
        </div>

        <div className="modal-motifs-suggeres">
          {MOTIFS_SUGGERES.map((m) => (
            <button
              key={m}
              type="button"
              className="chat-suggestion-chip"
              onClick={() => { setMotif(m); setErreur(null) }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="actions" style={{ marginTop: 20 }}>
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>Annuler</button>
          <button className="btn-danger btn-icon" onClick={confirmer} disabled={busy}>
            <XCircle size={15} /> {busy ? 'Rejet en cours…' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Officine() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [commandeARejeter, setCommandeARejeter] = useState(null)

  function charger() {
    setLoading(true)
    api
      .get('/officine/pre-commandes')
      .then(({ data }) => setCommandes(data))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function voirOrdonnance(id) {
    const { data } = await api.get(`/pre-commandes/${id}/ordonnance`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  async function valider(id) {
    setBusyId(id)
    try {
      await api.post(`/officine/pre-commandes/${id}/valider`)
      setCommandes((cs) => cs.filter((c) => c.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmerRejet(motif) {
    const id = commandeARejeter.id
    setBusyId(id)
    try {
      await api.post(`/officine/pre-commandes/${id}/rejeter`, { motif })
      setCommandes((cs) => cs.filter((c) => c.id !== id))
      setCommandeARejeter(null)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className="muted">Chargement…</p>

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Pré-commandes à valider</h1>
          <p className="page-subtitle">{commandes.length} commande{commandes.length !== 1 ? 's' : ''} en attente de décision</p>
        </div>
        <div className="page-actions">
          <button className="btn-ghost btn-sm btn-icon" onClick={charger}>
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {commandes.length === 0 && (
        <div className="empty-state">
          <CheckCircle size={48} />
          <p>Toutes les commandes ont été traitées.</p>
        </div>
      )}

      <div className="cards">
        {commandes.map((c) => (
          <div key={c.id} className="card">
            <div className="card-head">
              <strong>Commande #{c.id}</strong>
              <span className="tag faint">{c.patient?.name}</span>
            </div>
            {c.alertes?.length > 0 && (
              <div className="alerte-secu">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> Contre-indication possible :
                {c.alertes.map((a, i) => (
                  <span key={i} className="tag danger">
                    {a.medicament} / allergie : {a.allergie}
                  </span>
                ))}
              </div>
            )}
            <ul className="lignes">
              {c.lignes?.map((l) => (
                <li key={l.id}>
                  {l.medicament?.designation} × {l.quantite_demandee}
                  {l.posologie_extraite && <em> — {l.posologie_extraite}</em>}
                  <span className="stock">
                    stock : {l.medicament?.quantite_stock ?? '?'}
                  </span>
                </li>
              ))}
            </ul>
            {c.a_ordonnance ? (
              <button type="button" className="btn-ghost btn-icon btn-sm ordonnance-lien" onClick={() => voirOrdonnance(c.id)}>
                <FileCheck2 size={14} style={{ color: 'var(--ok)' }} /> Voir l'ordonnance jointe
              </button>
            ) : (
              <p className="hint hint-warn">
                <FileWarning size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Aucune ordonnance jointe — demandez-la au patient avant délivrance.
              </p>
            )}
            <p className="hint">
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Vérifiez l'ordonnance avant validation. La délivrance reste sous votre responsabilité.
            </p>
            <div className="actions">
              <button
                className="btn-primary btn-icon"
                disabled={busyId === c.id}
                onClick={() => valider(c.id)}
              >
                <CheckCircle size={15} /> Valider
              </button>
              <button
                className="btn-danger btn-icon"
                disabled={busyId === c.id}
                onClick={() => setCommandeARejeter(c)}
              >
                <XCircle size={15} /> Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>

      {commandeARejeter && (
        <ModalRejet
          commande={commandeARejeter}
          busy={busyId === commandeARejeter.id}
          onCancel={() => setCommandeARejeter(null)}
          onConfirm={confirmerRejet}
        />
      )}
    </div>
  )
}
