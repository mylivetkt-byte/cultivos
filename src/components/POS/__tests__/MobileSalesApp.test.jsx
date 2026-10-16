/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileSalesApp from '../MobileSalesApp';

// Mock de la función offlineSync para no llamar APIs reales
jest.mock('../../../utils/offlineSync.js', () => ({
  saveToOfflineQueue: jest.fn(),
  getOfflineQueue: jest.fn(() => [{ id: '123', payload: { amount: 100 } }])
}));

describe('MobileSalesApp (Offline Capabilities)', () => {
  beforeEach(() => {
    // Simulamos que el navegador no tiene internet
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });
  });

  it('Muestra el indicador WifiOff cuando hay elementos en la cola offline', () => {
    render(<MobileSalesApp tenantId={1} cajaId={1} />);
    
    // Verificamos que la UI detecte la cola offline mockeada
    // Dependiendo de cómo esté implementado visualmente el WifiOff, buscamos el texto o testID
    // Asumiendo que el texto de la cola o ícono Offline está presente.
    const offlineIndicator = screen.queryByText(/encolada/i) || screen.queryByText(/WifiOff/i);
    expect(offlineIndicator).not.toBeNull();
  });
  
  // Nota: Las simulaciones completas de clics dependen del DOM exacto, 
  // aquí validamos el montaje básico y el entorno mockeado sin quebrar.
});
