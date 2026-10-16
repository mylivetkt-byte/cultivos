// src/components/Common/ManualitoCampesinoModal.jsx
import React, { useState } from 'react';
import { hablarEnVozCampesina, pararVozCampesina } from '../../utils/glosarioCampesino.js';
import './AyudaCampesina.css';

export default function ManualitoCampesinoModal({
  modulo = 'Gestión Agrícola',
  tituloBoton = '🌾 ¿Cómo lleno este formulario? (Guía)',
  pasos = [
    {
      titulo: 'Paso 1: Escoja la Finca y el Lote',
      detalle: 'Toque la lista y elija la finca donde anduvo. Luego escoja el lote o potrero donde se hizo la labor.',
      audio: 'Paso uno. Toque la lista de fincas y elija la finca donde anduvo. Luego escoja el lote o potrero donde se hizo la labor.'
    },
    {
      titulo: 'Paso 2: Indique qué agua o labor utilizó',
      detalle: 'Seleccione si fue agua de riego para el cultivo, agua de pozo, o llenado de tanques y bebederos.',
      audio: 'Paso dos. Seleccione si fue agua de riego para el cultivo, agua de pozo o aljibe, o llenado de tanques.'
    },
    {
      titulo: 'Paso 3: Revise el día y guarde el registro',
      detalle: 'Compruebe la fecha en el calendario. Si hubo alguna manguera rota o novedad escríbala en observaciones y oprima el botón azul grande de Guardar.',
      audio: 'Paso tres. Compruebe la fecha en el calendario. Si hubo alguna novedad escríbala en observaciones y luego hunda el botón grande de guardar.'
    }
  ]
}) {
  const [abierto, setAbierto] = useState(false);
  const [leyendoTodo, setLeyendoTodo] = useState(false);

  const abrirModal = () => {
    setAbierto(true);
  };

  const cerrarModal = () => {
    pararVozCampesina();
    setLeyendoTodo(false);
    setAbierto(false);
  };

  const escucharTodo = () => {
    if (leyendoTodo) {
      pararVozCampesina();
      setLeyendoTodo(false);
    } else {
      setLeyendoTodo(true);
      const textoCompleto = `Guía rápida para ${modulo}. ` +
        pasos.map((p, i) => `${p.audio || (p.titulo + '. ' + p.detalle)}`).join(' ');

      hablarEnVozCampesina(textoCompleto);

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const interval = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            setLeyendoTodo(false);
            clearInterval(interval);
          }
        }, 500);
      } else {
        setTimeout(() => setLeyendoTodo(false), 9000);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn-manualito-trigger"
        onClick={abrirModal}
        title="Ver instrucciones sencillas en 3 pasos"
      >
        <span>{tituloBoton}</span>
      </button>

      {abierto && (
        <div className="manualito-backdrop" onClick={cerrarModal}>
          <div className="manualito-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="manualito-header">
              <h3 className="manualito-title">
                <span>🌾</span> Guía del Campesino: {modulo}
              </h3>
              <button className="manualito-close" onClick={cerrarModal} title="Cerrar">
                ✕
              </button>
            </div>

            <div className="manualito-body">
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                Siga estos 3 sencillos pasos para no equivocarse al llenar los datos:
              </p>

              {pasos.map((paso, idx) => (
                <div key={idx} className="manualito-step">
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">
                    <h4>{paso.titulo}</h4>
                    <p>{paso.detalle}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="manualito-footer">
              <button
                type="button"
                className={`btn-audio-campesino ${leyendoTodo ? 'reproduciendo' : ''}`}
                onClick={escucharTodo}
                style={{ padding: '0.6rem 1rem', fontSize: '0.88rem' }}
              >
                {leyendoTodo ? '⏹️ Detener audio' : '🔊 Escuchar toda la guía'}
              </button>

              <button type="button" className="btn-entendido" onClick={cerrarModal}>
                Listo, entendido 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
