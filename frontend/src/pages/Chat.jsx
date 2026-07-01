import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Bonjour, je suis l'assistant de votre officine. Posez-moi une question sur un médicament (ex. posologie du Doliprane 1000).",
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('')
  const [ordering, setOrdering] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const question = input.trim()
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
          text: `Pré-commande #${data.pre_commande.id} créée et transmise au pharmacien pour validation.`,
          commandeCreee: true,
        },
      ])
    } catch (err) {
      const msg =
        err.response?.status === 422
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
      setMessages((ms) =>
        ms.map((m, i) => (i === msgIndex ? { ...m, feedback: valeur } : m))
      )
    } catch {
      // feedback silencieux — non bloquant
    }
  }

  // Propose la pré-commande si le dernier message bot a détecté des médicaments
  const last = messages[messages.length - 1]
  const proposerCommande =
    last?.from === 'bot' && last?.entites?.length > 0 && !last?.abstention

  return (
    <div className="chat">
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}${m.error ? ' error' : ''}`}>
            <p>{m.text}</p>
            {m.abstention && <span className="tag warn">Garde-fou : information non confirmée</span>}
            {m.from === 'bot' && !m.error && !m.abstention && m.logId && (
              <div className="feedback-row">
                <span className="muted">Cette réponse vous a été utile ?</span>
                <button
                  className={`btn-feedback ${m.feedback === 1 ? 'active' : ''}`}
                  onClick={() => donnerFeedback(i, 1)}
                  disabled={m.feedback !== null}
                  title="Utile"
                >
                  👍
                </button>
                <button
                  className={`btn-feedback ${m.feedback === -1 ? 'active' : ''}`}
                  onClick={() => donnerFeedback(i, -1)}
                  disabled={m.feedback !== null}
                  title="Pas utile"
                >
                  👎
                </button>
              </div>
            )}
            {m.commandeCreee && (
              <Link to="/commandes" className="tag ok">
                Voir mes commandes →
              </Link>
            )}
            {m.entites?.length > 0 && (
              <div className="sources">
                <span className="sources-title">Détecté :</span>
                {m.entites.map((e, j) => (
                  <span key={j} className="tag">
                    {e.medicament}
                    {e.dosage ? ` ${e.dosage}` : ''}
                    {e.frequence ? ` · ${e.frequence}` : ''}
                  </span>
                ))}
              </div>
            )}
            {m.sources?.length > 0 && (
              <div className="sources">
                <span className="sources-title">Sources :</span>
                {m.sources.map((s, j) => (
                  <span key={j} className="tag">
                    {s.medicament} ({Math.round(s.similarite * 100)}%)
                  </span>
                ))}
              </div>
            )}
            {typeof m.fidelite === 'number' && (
              <span className="tag faint">Fidélité estimée : {Math.round(m.fidelite * 100)}%</span>
            )}
          </div>
        ))}
        {sending && <div className="bubble bot typing">L'assistant rédige…</div>}
        <div ref={endRef} />
      </div>

      {proposerCommande && (
        <button className="btn-primary order-cta" onClick={creerPreCommande} disabled={ordering}>
          {ordering ? 'Création…' : 'Préparer une pré-commande avec ces médicaments'}
        </button>
      )}

      <form className="chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre question…"
          disabled={sending}
        />
        <button className="btn-primary" disabled={sending || !input.trim()}>
          Envoyer
        </button>
      </form>
      <p className="disclaimer">
        Les réponses sont informatives. Toute commande est validée par votre pharmacien avant
        délivrance.
      </p>
    </div>
  )
}
