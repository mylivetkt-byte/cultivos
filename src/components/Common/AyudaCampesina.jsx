// src/components/Common/AyudaCampesina.jsx
import React, { useState, useEffect } from 'react';
import { getAyudaCampesina, hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino.js';
import './AyudaCampesina.css';

export default function AyudaCampesina({ campo, textoCustom, ejemploCustom, audioCustom }) {
  const [hablando, setHablando] = useState(false);
  const data = getAyudaCampesina(campo);

  const textoAyuda = textoCustom || data.ayuda;
  const textoEjemplo = ejemploCustom || data.ejemplo;
  const textoAudio = audioCustom || data.audio || `${textoAyuda}. ${textoEjemplo}`;

  useEffect(() => {
    // Al desmontar, asegurar que no siga hablando
    return () => {
      pararVozCampesina();
    };
  }, []);

  const handleToggleVoz = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (hablando) {
      pararVozCampesina();
      setHablando(false);
    } else {
      setHablando(true);
      hablarEnVozCampesina(textoAudio);

      // Si el navegador soporta eventos de síntesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const checkSpeech = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setHablando(false);
            clearInterval(checkSpeech);
          }
        }, 300);
      } else {
        setTimeout(() => setHablando(false), 4500);
      }
    }
  };

  return (
    <div className="ayuda-campesina-box" title="Explicación en lenguaje campesino">
      <div className="ayuda-campesina-content">
        <div className="ayuda-campesina-texto">
          {data.icono && <span style={{ marginRight: '4px' }}>{data.icono}</span>}
          {textoAyuda}
        </div>
        {textoEjemplo && (
          <div className="ayuda-campesina-ejemplo">
            {textoEjemplo}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`btn-audio-campesino ${hablando ? 'reproduciendo' : ''}`}
        onClick={handleToggleVoz}
        aria-label={hablando ? 'Detener voz' : 'Escuchar explicación'}
        title={hablando ? 'Toca para silenciar' : 'Toca para que el teléfono te hable'}
      >
        {hablando ? '⏹️ Parar' : '🔊 Escuchar'}
      </button>
    </div>
  );
}
