import { useEffect, useRef, useState } from 'react'
import { ClipboardList, Clock, CheckCircle, XCircle, PackageCheck, Paperclip, FileCheck2, Loader2 } from 'lucide-react'
import api from '../api/client.js'

const STATUT = {
  en_attente: { label: 'En attente',          cls: 'warn',   Icon: Clock },
  valide:     { label: 'Validée — à retirer', cls: 'ok',     Icon: CheckCircle },
  rejete:     { label: 'Rejetée',             cls: 'danger', Icon: XCircle },
  recupere:   { label: 'Récupérée',           cls: 'faint',  Icon: PackageCheck },
}

export default function MesCommandes() {
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState(null)
  const [erreurUpload, setErreurUpload] = useState(null)
  const fileInputs = useRef({})

  function charger() {
    api.get('/pre-commandes').then(({ data }) => setCommandes(data)).finally(() => setLoading(false))
  }

  useEffect(charger, [])

  function ouvrirSelecteur(id) {
    setErreurUpload(null)
    fileInputs.current[id]?.click()
  }

  async function envoyerOrdonnance(id, e) {
    const fichier = e.target.files?.[0]
    e.target.value = '' // permet de resélectionner le même fichier plus tard
    if (!fichier) return

    setUploadingId(id)
    setErreurUpload(null)
    try {
      const form = new FormData()
      form.append('ordonnance', fichier)
      await api.post(`/pre-commandes/${id}/ordonnance`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      charger()
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(' ') : null)
        || "Impossible d'envoyer l'ordonnance."
      setErreurUpload({ id, msg })
    } finally {
      setUploadingId(null)
    }
  }

  async function voirOrdonnance(id) {
    const { data } = await api.get(`/pre-commandes/${id}/ordonnance`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  if (loading) return (
    <div className="loader"><div className="spinner" /> Chargement…</div>
  )

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Mes pré-commandes</h1>
          <p className="page-subtitle">Suivez l'avancement de vos demandes de médicaments.</p>
        </div>
      </div>

      {commandes.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>Vous n'avez pas encore de pré-commande.<br />Utilisez l'assistant pour en créer une.</p>
        </div>
      ) : (
        <div className="cards">
          {commandes.map((c) => {
            const st = STATUT[c.statut] || { label: c.statut, cls: 'faint', Icon: ClipboardList }
            const { Icon } = st
            const peutJoindre = c.statut === 'en_attente'
            const enCours = uploadingId === c.id
            const erreur = erreurUpload?.id === c.id ? erreurUpload.msg : null

            return (
              <div key={c.id} className="card">
                <div className="card-head">
                  <strong>Commande #{c.id}</strong>
                  <span className={`tag ${st.cls}`}>
                    <Icon size={11} /> {st.label}
                  </span>
                </div>

                <ul className="lignes">
                  {c.lignes?.map((l) => (
                    <li key={l.id}>
                      <span>{l.medicament?.designation} <strong>× {l.quantite_demandee}</strong></span>
                      {l.posologie_extraite && <em>{l.posologie_extraite}</em>}
                    </li>
                  ))}
                </ul>

                {c.code_validation && (
                  <div style={{ marginTop: 14 }}>
                    <span className="code-retrait">
                      <PackageCheck size={13} /> Code de retrait : {c.code_validation}
                    </span>
                  </div>
                )}
                {c.motif_rejet && (
                  <p className="muted" style={{ marginTop: 10 }}>Motif : {c.motif_rejet}</p>
                )}
                {c.date_creation && (
                  <p className="muted" style={{ marginTop: 8 }}>
                    {new Date(c.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}

                {/* ── Ordonnance ── */}
                <div className="ordonnance-zone">
                  <input
                    ref={(el) => { fileInputs.current[c.id] = el }}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => envoyerOrdonnance(c.id, e)}
                  />
                  {c.a_ordonnance ? (
                    <button type="button" className="btn-ghost btn-icon btn-sm" onClick={() => voirOrdonnance(c.id)}>
                      <FileCheck2 size={14} /> Voir l'ordonnance jointe
                      {peutJoindre && !enCours && (
                        <span className="ordonnance-remplacer" onClick={(e) => { e.stopPropagation(); ouvrirSelecteur(c.id) }}>
                          (remplacer)
                        </span>
                      )}
                    </button>
                  ) : peutJoindre ? (
                    <button
                      type="button"
                      className="btn-ghost btn-icon btn-sm"
                      onClick={() => ouvrirSelecteur(c.id)}
                      disabled={enCours}
                    >
                      {enCours ? <><Loader2 size={14} className="spin" /> Envoi…</> : <><Paperclip size={14} /> Joindre mon ordonnance</>}
                    </button>
                  ) : null}
                  {erreur && <p className="field-hint" style={{ color: 'var(--danger)', marginTop: 6 }}>{erreur}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
