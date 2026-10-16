import React, { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import './AsistenteGerencial.css';

export default function AsistenteGerencial() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Inicializar Speech Recognition (Soporte nativo del navegador)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-CO'; // Español Colombia

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
           setInput(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Error en reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Tu navegador no soporta reconocimiento de voz. Te recomendamos usar Chrome, Edge o Safari.");
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetchApi('/ia/tools', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage.text, history: messages })
      });
      
      setMessages(prev => [...prev, { role: 'model', text: response.respuesta }]);
    } catch (err) {
      console.error('Error IA:', err);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, hubo un error al conectarme con la base de datos de tu empresa. Por favor intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asistente-gerencial">
      <div className="asistente-header">
        <h2>Centro de Control Gerencial - IA</h2>
        <p>Haz preguntas sobre producción, clima, empleados, maquinaria y estados de tu finca en lenguaje natural.</p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="ai-icon">🤖</div>
              <h3>Hola, soy tu asistente virtual</h3>
              <p>Puedes preguntarme cosas como:</p>
              <ul>
                <li>"¿Cuántos empleados están trabajando hoy?"</li>
                <li>"¿Qué misiones de dron hay programadas?"</li>
                <li>"Dame un resumen de alertas críticas"</li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message-bubble ${m.role}`}>
              <div className="message-content">
                {/* Un renderizador markdown simple o salida de texto */}
                {m.text.split('\n').map((line, idx) => (
                  <span key={idx}>{line}<br/></span>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-bubble model loading">
              <div className="dot-flashing"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe o dicta tu consulta gerencial aquí..."
            disabled={loading}
          />
          <button 
            type="button" 
            onClick={toggleListening}
            className={`mic-button ${isListening ? 'listening' : ''}`}
            title="Hablar por micrófono"
          >
            {isListening ? '🛑' : '🎤'}
          </button>
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Consultando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
