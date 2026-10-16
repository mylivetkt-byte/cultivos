import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User } from 'lucide-react';
import { authFetch } from '../utils/api';

export default function ChatPlaceholder() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente IA de la finca. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', text: input };
    const currentHistory = [...messages];
    
    setMessages([...currentHistory, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Formatear historial para el servidor (obviar el mensaje de bienvenida)
      const historyToSend = currentHistory.slice(1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text }));
      
      const res = await authFetch('/api/ia/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text, history: historyToSend })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.respuesta }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Lo siento, hubo un error procesando tu solicitud.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Hubo un error de conexión con la IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {!isOpen ? (
        <div 
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '56px', height: '56px', borderRadius: '50%', background: '#6366f1', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', cursor: 'pointer'
          }}
        >
          <Bot size={28} />
        </div>
      ) : (
        <div style={{ 
          width: '350px', height: '500px', background: 'white', borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', background: '#6366f1', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={24} />
              <span style={{ fontWeight: '600' }}>Asistente Finca IA</span>
            </div>
            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Bot size={16} />
                  </div>
                )}
                <div style={{ 
                  background: msg.role === 'user' ? '#6366f1' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  padding: '10px 14px', borderRadius: '16px', maxWidth: '240px',
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                  fontSize: '14px', whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#94a3b8', fontSize: '13px' }}>
                <Bot size={16} /> Escribiendo...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div style={{ padding: '12px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu mensaje..."
              style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6366f1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
