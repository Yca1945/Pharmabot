import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Reconnaissance vocale via l'API Web Speech native du navigateur (Chrome/Edge).
 * Aucune donnée audio n'est envoyée à un backend tiers : la transcription
 * est faite par le moteur du navigateur.
 */
export function useSpeechRecognition({ lang = 'fr-FR' } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const supported = !!SpeechRecognition

  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onResultRef = useRef(null)

  useEffect(() => {
    if (!supported) return
    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += transcript
        else interim += transcript
      }
      if (finalText) {
        onResultRef.current?.(finalText.trim())
        setInterimText('')
      } else {
        setInterimText(interim)
      }
    }

    recognition.onerror = (event) => {
      setError(event.error)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setInterimText('')
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [supported, lang])

  const start = useCallback((onResult) => {
    if (!supported || listening) return
    setError(null)
    onResultRef.current = onResult
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      // déjà démarré — ignoré
    }
  }, [supported, listening])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { supported, listening, interimText, error, start, stop }
}
