import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  ThumbsUp, ThumbsDown, Send, ShoppingCart,
  History, X, MessageSquare, ChevronRight, Mic, MicOff,
} from 'lucide-react'
import api from '../api/client.js'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

/* ── Suggestions de démarrage ── */
const SUGGESTIONS = [
  'Quels sont les effets secondaires du Doliprane ?',
  'Puis-je prendre ibuprofène avec du paracétamol ?',
  'Quelle est la posologie de l\'amoxicilline pour un adulte ?',
  'Y a-t-il des contre-indications pour les anticoagulants ?',
]

const MSG_INITIAL = {
  from: 'bot',
  text: "Bonjour ! Je suis l'assistant de votre officine. Comment puis-je vous aider aujourd'hui ?",
}

function shortDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function Chat() {
  const [messages, setMessages] = useState([MSG_INITIAL])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('')
  const [ordering, setOrdering] = useState(false)

  /* sidebar historique */
  const [showHistory, setShowHistory] = useState(false)
  const [historique, setHistorique] = useState([])
  const [histLoading, setHistLoading] = useState(false)

  const endRef = useRef(null)
  const { supported: micSupported, listening, interimText, error: micError, start: startMic, stop: stopMic } = useSpeechRecognition()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function toggleMic() {
    if (listening) {
      stopMic()
      return
    }
    startMic((transcript) => {
      setInput(transcript)
      send(null, transcript)
    })
  }

  const loadHistorique = useCallback(async () => {
    setHistLoading(true)
    try {
      const { data } = await api.get('/chat/historique')
      setHistorique(data)
    } finally {
      setHistLoading(false)
    }
  }, [])

  function openHistory() {
    setShowHistory(true)
    loadHistorique()
  }

  function restoreConversation(log) {
    setMessages([
      MSG_INITIAL,
      { from: 'user', text: log.message_utilisateur },
      {
        from: 'bot',
        text: log.reponse_ia,
        abstention: log.abstention,
        fidelite: log.fidelite_estimee,
        logId: log.id,
        feedback: log.feedback,
        sources: [],
        entites: [],
      },
    ])
    setShowHistory(false)
  }

  async function send(e, overrideText) {
    if (e) e.preventDefault()
    const question = (overrideText ?? input).trim()
    if (!question || sending) return

    setMessages((m) => [...m, { from: 'user', text: question }])
    setInput('')
    setSending(true)
    setLastQuestion(question)

    try {
      const { data } = await api.post('/chat', { message: question })
      setMessages((m) => [
        ...m,
        {
          from: 'bot',
          text: data.reponse,
          sources: data.sources || [],
          entites: data.entites || [],
          abstention: data.abstention,
          conversationnel: data.conversationnel ?? false,
          fidelite: data.fidelite_estimee,
          logId: data.log_id ?? null,
          feedback: null,
        },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'Une erreur est survenue. Réessayez plus tard.', error: true },
      ])
    } finally {
      setSending(false)
    }
  }

  async function creerPreCommande() {
    if (!lastQuestion || ordering) return
    setOrdering(true)
    try {
      const { data } = await api.post('/pre-commandes/depuis-chat', { message: lastQuestion })
      setMessages((m) => [
        ...m,
        {
          from: 'bot',
          text: `Pré-commande **#${data.pre_commande.id}** créée et transmise au pharmacien pour validation.`,
          commandeCreee: true,
        },
      ])
    } catch (err) {
      const msg = err.response?.status === 422
        ? err.response.data.message
        : 'Impossible de créer la pré-commande.'
      setMessages((m) => [...m, { from: 'bot', text: msg, error: true }])
    } finally {
      setOrdering(false)
    }
  }

  async function donnerFeedback(msgIndex, valeur) {
    const msg = messages[msgIndex]
    if (!msg?.logId) return
    try {
      await api.post(`/chat/${msg.logId}/feedback`, { feedback: valeur })
      setMessages((ms) => ms.map((m, i) => (i === msgIndex ? { ...m, feedback: valeur } : m)))
    } catch { /* silencieux */ }
  }

  const last = messages[messages.length - 1]
  const proposerCommande = last?.from === 'bot' && last?.entites?.length > 0 && !last?.abstention
  const showSuggestions = messages.length === 1 && !sending

  return (
    <div className="chat-layout">
      {/* ── Sidebar historique ── */}
      {showHistory && (
        <div className="chat-sidebar">
          <div className="chat-sidebar-head">
            <span className="chat-sidebar-title"><History size={15} /> Conversations récentes</span>
            <button className="btn-ghost btn-icon btn-sm" onClick={() => setShowHistory(false)}>
              <X size={14} />
            </button>
          </div>
          {histLoading ? (
            <div className="chat-sidebar-empty">Chargement…</div>
          ) : historique.length === 0 ? (
            <div className="chat-sidebar-empty">Aucune conversation enregistrée.</div>
          ) : (
            <ul className="chat-hist-list">
              {historique.map((log) => (
                <li key={log.id} className="chat-hist-item" onClick={() => restoreConversation(log)}>
                  <span className="chat-hist-msg">{log.message_utilisateur}</span>
                  <span className="chat-hist-date">{shortDate(log.created_at)}</span>
                  <ChevronRight size={13} className="chat-hist-arrow" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Zone principale ── */}
      <div className="chat">
        <div className="chat-window">

          {/* Suggestions */}
          {showSuggestions && (
            <div className="chat-suggestions">
              <p className="chat-suggestions-label">Questions fréquentes :</p>
              <div className="chat-suggestions-list">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chat-suggestion-chip" onClick={() => send(null, s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.from}${m.error ? ' error' : ''}`}>
              {m.from === 'bot' ? (
                <ReactMarkdown>{m.text}</ReactMarkdown>
              ) : (
                <p>{m.text}</p>
              )}
              {m.abstention && <span className="tag warn">Garde-fou : information non confirmée</span>}
              {m.from === 'bot' && !m.error && !m.abstention && !m.conversationnel && m.logId && (
                <div className="feedback-row">
                  <span className="muted">Cette réponse vous a été utile ?</span>
                  <button
                    className={`btn-feedback ${m.feedback === 1 ? 'active' : ''}`}
                    onClick={() => donnerFeedback(i, 1)}
                    disabled={m.feedback !== null}
                    title="Utile"
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <button
                    className={`btn-feedback ${m.feedback === -1 ? 'active' : ''}`}
                    onClick={() => donnerFeedback(i, -1)}
                    disabled={m.feedback !== null}
                    title="Pas utile"
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>
              )}
              {m.commandeCreee && (
                <Link to="/commandes" className="tag ok">Voir mes commandes →</Link>
              )}
              {m.entites?.length > 0 && (
                <div className="sources">
                  <span className="sources-title">Détecté :</span>
                  {m.entites.map((e, j) => (
                    <span key={j} className="tag">
                      {e.medicament}{e.dosage ? ` ${e.dosage}` : ''}{e.frequence ? ` · ${e.frequence}` : ''}
                    </span>
                  ))}
                </div>
              )}
              {m.sources?.length > 0 && (
                <div className="sources">
                  <span className="sources-title">Sources :</span>
                  {m.sources.map((s, j) => (
                    <span key={j} className="tag">{s.medicament} ({Math.round(s.similarite * 100)}%)</span>
                  ))}
                </div>
              )}
              {typeof m.fidelite === 'number' && (
                <span className="tag faint">Fidélité estimée : {Math.round(m.fidelite * 100)}%</span>
              )}
            </div>
          ))}
          {sending && <div className="bubble bot typing"><span className="dot-flashing" /></div>}
          <div ref={endRef} />
        </div>

        <div className="chat-bar">
          {proposerCommande && (
            <button className="btn-primary order-cta btn-icon" onClick={creerPreCommande} disabled={ordering}>
              <ShoppingCart size={15} /> {ordering ? 'Création en cours…' : 'Préparer une pré-commande'}
            </button>
          )}
          <form className="chat-input" onSubmit={send}>
            <button
              type="button"
              className="btn-ghost btn-icon btn-sm chat-hist-btn"
              onClick={openHistory}
              title="Historique"
            >
              <History size={16} />
            </button>
            <input
              value={listening ? (interimText || input) : input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Je vous écoute…' : 'Posez votre question à l\'assistant…'}
              disabled={sending || listening}
              autoFocus
            />
            {micSupported && (
              <button
                type="button"
                className={`btn-icon btn-mic ${listening ? 'btn-mic-active' : 'btn-ghost'}`}
                onClick={toggleMic}
                disabled={sending}
                title={listening ? 'Arrêter l\'écoute' : 'Dicter votre question'}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            )}
            <button className="btn-primary btn-icon" disabled={sending || listening || !input.trim()}>
              <Send size={15} /> Envoyer
            </button>
          </form>
          {micError && (
            <p className="disclaimer" style={{ color: 'var(--danger)' }}>
              {micError === 'not-allowed'
                ? "Micro refusé — autorisez l'accès dans les réglages du navigateur."
                : "Reconnaissance vocale indisponible, réessayez."}
            </p>
          )}
          <p className="disclaimer">
            Réponses informatives uniquement — toute commande est validée par votre pharmacien avant délivrance.
          </p>
        </div>
      </div>
    </div>
  )
}
