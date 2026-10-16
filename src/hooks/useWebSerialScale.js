import { useState, useRef, useEffect, useCallback } from 'react';

export function useWebSerialScale() {
  const [port, setPort] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [weight, setWeight] = useState(0);
  const [error, setError] = useState('');
  
  const readerRef = useRef(null);
  const keepReadingRef = useRef(true);
  const pollingIntervalRef = useRef(null);
  
  const connect = async (basculaConfig) => {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API no es soportada por este navegador. Use Chrome o Edge.');
      }

      // Prompt user to select port
      const selectedPort = await navigator.serial.requestPort();
      
      // Configure port according to bascula config
      await selectedPort.open({
        baudRate: basculaConfig.baud_rate || 9600,
        dataBits: basculaConfig.data_bits || 8,
        stopBits: basculaConfig.stop_bits || 1,
        parity: basculaConfig.paridad || 'none',
      });
      
      setPort(selectedPort);
      setIsConnected(true);
      setError('');
      keepReadingRef.current = true;
      
      // Start reading loop
      readLoop(selectedPort, basculaConfig);
      
      // If it requires a polling command (e.g. 'P' for Torrey)
      if (basculaConfig.modo_lectura === 'peticion' && basculaConfig.comando_peticion) {
        startPolling(selectedPort, basculaConfig.comando_peticion);
      }
      
      return true;
    } catch (e) {
      console.error('Error connecting to scale:', e);
      let errorMsg = e.message || 'Error al conectar báscula';
      
      // Traducir errores técnicos del navegador a español amigable
      if (errorMsg.includes('No port selected by the user')) {
        errorMsg = 'No seleccionaste ningún puerto. Por favor, haz clic en "Conectar" y elige un puerto de la lista.';
      } else if (errorMsg.includes('Failed to execute \'requestPort\' on \'Serial\'')) {
        errorMsg = 'No se pudo abrir la ventana de puertos. Verifica que tengas los permisos necesarios.';
      } else if (errorMsg.includes('Failed to open serial port')) {
        errorMsg = 'El puerto está ocupado por otro programa o no se puede acceder. Desconecta y vuelve a conectar el cable.';
      } else if (errorMsg.includes('NetworkError')) {
        errorMsg = 'Error de conexión física con la báscula. Revisa el cable USB.';
      }

      setError(errorMsg);
      return false;
    }
  };
  
  const startPolling = (activePort, command) => {
    // Send command every 500ms
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (activePort && activePort.writable) {
          const writer = activePort.writable.getWriter();
          const encoder = new TextEncoder();
          await writer.write(encoder.encode(command + '\r\n'));
          writer.releaseLock();
        }
      } catch (e) {
        console.error("Error sending poll command", e);
      }
    }, 500);
  };
  
  const readLoop = async (activePort, config) => {
    while (activePort.readable && keepReadingRef.current) {
      readerRef.current = activePort.readable.getReader();
      try {
        let buffer = '';
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await readerRef.current.read();
          if (done) break;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            // Extract weight from buffer
            // Standard scale output is usually a number followed by kg or spaces and a newline
            const lines = buffer.split(/\r?\n/);
            if (lines.length > 1) {
              // We have a full line
              const lastFullLine = lines[lines.length - 2].trim();
              parseWeightLine(lastFullLine);
              // Keep the last incomplete part
              buffer = lines[lines.length - 1];
            }
          }
        }
      } catch (error) {
        console.error('Error reading from scale:', error);
        setError('Error al leer báscula');
      } finally {
        readerRef.current.releaseLock();
      }
    }
  };
  
  const parseWeightLine = (line) => {
    // Extracts numbers (including decimals) from the string
    const match = line.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      const w = parseFloat(match[0]);
      if (!isNaN(w)) setWeight(w);
    }
  };
  
  const disconnect = async () => {
    keepReadingRef.current = false;
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    if (port) {
      try {
        await port.close();
      } catch (e) {
        console.error("Error closing port", e);
      }
    }
    setPort(null);
    setIsConnected(false);
  };

  return { connect, disconnect, isConnected, weight, error };
}
