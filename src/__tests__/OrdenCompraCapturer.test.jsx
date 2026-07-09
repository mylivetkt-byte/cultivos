import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OrdenCompraCapturer from '../components/Bodegas/OrdenCompraCapturer';
import '@testing-library/jest-dom';

jest.mock('../utils/api', () => ({
  authFetch: jest.fn()
}));

test('renders form fields and adds detalle', async () => {
  const mockFetch = require('../utils/api').authFetch;
  mockFetch
    .mockResolvedValueOnce({
      json: async () => [{ id_tercero: 1, documento: '123', nombre_completo: 'Proveedor A', es_proveedor: 1 }]
    })
    .mockResolvedValueOnce({
      json: async () => ({ data: [{ id_insumo: 1, codigo: 'I01', nombre: 'Insumo A', unidad_medida: 'kg' }] })
    });

  render(<OrdenCompraCapturer tenantId={1} />);

  // Select provider
  const provSelect = await screen.findByText(/Buscar proveedor.../i);
  fireEvent.keyDown(provSelect, { key: 'ArrowDown' });
  const provOption = await screen.findByText(/123 - Proveedor A/i);
  fireEvent.click(provOption);

  // Select insumo
  const insumoSelect = await screen.findByText(/Buscar insumo.../i);
  fireEvent.keyDown(insumoSelect, { key: 'ArrowDown' });
  const insumoOption = await screen.findByText(/I01 - Insumo A \(kg\)/i);
  fireEvent.click(insumoOption);

  // Fill quantity and price
  fireEvent.change(screen.getByLabelText(/Cantidad Pedida/i), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText(/Precio Unitario Negociado \(\$\)/i), { target: { value: '5' } });

  // Add detail
  fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));
  expect(await screen.findByText(/Insumo A/i)).toBeInTheDocument();
});
