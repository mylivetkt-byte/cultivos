import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function HojasDeVida({ tenantId }) {
  const [hojas, setHojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Ref for the hidden print container
  const printRef = useRef(null);
  
  // We only use state to render the hidden DOM, then immediately print it via iframe/window
  const [printState, setPrintState] = useState({ doc: null, data: null });

  useEffect(() => {
    const fetchHojas = async () => {
      try {
        const res = await axios.get(`/api/rrhh/hojas-vida?tenantId=${tenantId || 1}`);
        setHojas(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHojas();
  }, [tenantId]);

  // When printState changes and is populated, we execute the isolated print
  useEffect(() => {
    if (printState.data && printState.doc && printRef.current) {
      // Give React 100ms to update the DOM in printRef
      const timer = setTimeout(() => {
        executeIsolatedPrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [printState]);

  const triggerPrint = (type, data) => {
    setPrintState({ doc: type, data: data });
  };

  const executeIsolatedPrint = () => {
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=900,left=200,top=100');
    
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Documento Oficial - AgroPaccioli</title>
            <style>
              body { 
                margin: 0; 
                padding: 40px; 
                font-family: Arial, sans-serif; 
                background: white; 
                color: black;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @media print {
                @page { margin: 1.5cm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("Por favor habilita las ventanas emergentes (pop-ups) para imprimir documentos.");
    }
    
    // Clear state after triggering
    setPrintState({ doc: null, data: null });
  };

  const filteredHojas = hojas.filter(h => 
    h.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.documento.includes(searchTerm) ||
    h.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredHojas.length / itemsPerPage);
  const paginatedHojas = filteredHojas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando expedientes...</div>;
  }

  return (
    <>
      <div className="catalog-container">
        <div className="catalog-toolbar">
          <h2 className="catalog-title">Expedientes y Hojas de Vida</h2>
          
          <div className="catalog-search">
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input 
              type="text" 
              placeholder="Buscar empleado por nombre o cédula..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cédula</th>
                  <th>Cargo</th>
                  <th>Finca / Sede</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHojas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No se encontraron resultados para los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedHojas.map(h => (
                    <tr key={h.id_hoja_vida}>
                      <td style={{ fontWeight: 500, color: 'var(--sidebar-bg)' }}>{h.nombre_completo}</td>
                      <td>{h.documento}</td>
                      <td>{h.cargo}</td>
                      <td>{h.finca_nombre || 'No asignada'}</td>
                      <td>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          background: h.estado_hoja === 'Completa' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                          color: h.estado_hoja === 'Completa' ? 'var(--success)' : 'var(--warning)'
                        }}>
                          {h.estado_hoja}
                        </span>
                      </td>
                      <td>
                        <div className="cell-actions" style={{ justifyContent: 'center' }}>
                          <button 
                            className="btn btn-outline btn-sm btn-edit"
                            onClick={() => triggerPrint('resume', h)}
                            title="Hoja de Vida"
                          >
                            <span style={{ marginRight: '4px' }}>📄</span>
                            <span className="btn-text">CV</span>
                          </button>
                          
                          <button 
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'rgba(76, 175, 80, 0.3)', color: 'var(--success)' }}
                            onClick={() => triggerPrint('recommendation', h)}
                            title="Carta de Recomendación"
                          >
                            <span style={{ marginRight: '4px' }}>⭐</span>
                            <span className="btn-text">Carta</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '16px',
            fontSize: '13px',
            color: 'var(--text-muted)'
          }}>
            <span>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredHojas.length)} de {filteredHojas.length} registros
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline btn-sm"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline btn-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 
        ========================================================
        HIDDEN PRINT DOM: Captured and injected into a new window
        ======================================================== 
      */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {printState.data && (
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
              
              {/* HOJA DE VIDA TEMPLATE */}
              {printState.doc === 'resume' && (
                <div style={{ fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ borderBottom: '2px solid #222', paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                      <h1 style={{ fontSize: '28px', margin: '0 0 4px 0', color: '#111', textTransform: 'uppercase', lineHeight: '1.1' }}>{printState.data.nombre_completo}</h1>
                      <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>{printState.data.cargo}</h2>
                      
                      <div style={{ fontSize: '14px', lineHeight: '1.6', display: 'flex', gap: '24px' }}>
                        <div>
                          <p style={{ margin: 0 }}><strong>Cédula:</strong> {printState.data.documento}</p>
                          <p style={{ margin: 0 }}><strong>Sede:</strong> {printState.data.finca_nombre || 'AgroPaccioli'}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0 }}><strong>Teléfono:</strong> {printState.data.telefono || 'N/A'}</p>
                          <p style={{ margin: 0 }}><strong>Email:</strong> {printState.data.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      width: '113px', 
                      height: '151px', 
                      border: '2px solid #ccc', 
                      marginLeft: '20px', 
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f9f9f9',
                      overflow: 'hidden'
                    }}>
                      {printState.data.foto_url || printState.data.fotografia ? (
                        <img src={printState.data.foto_url || printState.data.fotografia} alt="Fotografía" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '12px', textAlign: 'center', padding: '10px' }}>Foto 3x4</span>
                      )}
                    </div>
                    
                  </div>

                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ flex: '0 0 250px' }}>
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: 'var(--text-primary)' }}>Perfil</h3>
                        <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}><strong>Nivel:</strong> {printState.data.nivel_academico || 'No especificado'}</p>
                        <p style={{ fontSize: '14px', margin: '0' }}><strong>Estado CV:</strong> {printState.data.estado_hoja}</p>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: 'var(--text-primary)' }}>Emergencia</h3>
                        <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}>{printState.data.contacto_emergencia_nombre || 'No registrado'}</p>
                        <p style={{ fontSize: '14px', margin: '0' }}>{printState.data.contacto_emergencia_telefono || '---'}</p>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', color: 'var(--text-primary)' }}>Dotación</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '1.8' }}>
                          <li><strong>Camisa:</strong> {printState.data.talla_camisa || '-'}</li>
                          <li><strong>Pantalón:</strong> {printState.data.talla_pantalon || '-'}</li>
                          <li><strong>Calzado:</strong> {printState.data.talla_calzado || '-'}</li>
                        </ul>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px', color: 'var(--text-primary)' }}>Experiencia</h3>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', textAlign: 'justify', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {printState.data.experiencia_previa || 'No se ha registrado experiencia previa.'}
                        </p>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '12px', color: 'var(--text-primary)' }}>Observaciones</h3>
                        <div style={{ backgroundColor: '#f9f9f9', padding: '16px', border: '1px solid var(--border-color)', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6' }}>
                          "{printState.data.observaciones_jefe || 'Sin observaciones registradas.'}"
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '60px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Generado por AgroPaccioli - {new Date().toLocaleDateString('es-CO')}
                  </div>
                </div>
              )}

              {/* CARTA DE RECOMENDACIÓN TEMPLATE */}
              {printState.doc === 'recommendation' && (
                <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>
                  <div style={{ textAlign: 'right', marginBottom: '60px', lineHeight: '1.6' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{printState.data.finca_nombre || 'AgroPaccioli'}</p>
                    <p style={{ margin: 0 }}>{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px', textTransform: 'uppercase', letterSpacing: '1px' }}>A Quien Interese</h2>
                  
                  <div style={{ textAlign: 'justify', lineHeight: '1.8', marginBottom: '60px' }}>
                    <p style={{ marginBottom: '20px' }}>
                      Por medio de la presente comunicación, certificamos formalmente que el(la) señor(a) <strong>{printState.data.nombre_completo}</strong>, 
                      identificado(a) con cédula de ciudadanía número <strong>{printState.data.documento}</strong>, se encuentra vinculado(a) laboralmente con 
                      nuestra compañía desempeñando el cargo de <strong>{printState.data.cargo}</strong>, con asignación operativa en el centro de trabajo <strong>{printState.data.finca_nombre || 'AgroPaccioli'}</strong>.
                    </p>
                    
                    <p style={{ marginBottom: '20px' }}>
                      Durante su tiempo de servicio, ha demostrado ser una persona con un alto sentido de la responsabilidad, honestidad y compromiso con las labores asignadas. 
                      Su nivel de desempeño ha sido de gran valor para alcanzar las metas de su equipo, mostrando excelentes aptitudes para el trabajo colaborativo.
                    </p>

                    <p>
                      Por lo anterior, expedimos esta certificación de recomendación laboral a solicitud de la persona interesada para los fines que estime convenientes.
                    </p>
                  </div>
                  
                  <div style={{ marginTop: '80px' }}>
                    <div style={{ width: '300px', borderTop: '1px solid #000', marginBottom: '8px' }}></div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}>Departamento de Recursos Humanos</p>
                    <p style={{ margin: 0, fontFamily: 'Arial, sans-serif', fontSize: '14px' }}>{printState.data.finca_nombre || 'AgroPaccioli'}</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
