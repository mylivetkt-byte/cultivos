CREATE TABLE IF NOT EXISTS costos_operacion (
  id_operacion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL,
  id_finca INT NULL,
  id_lote INT NOT NULL,
  concepto VARCHAR(100) NOT NULL,
  importe DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant) ON DELETE CASCADE,
  INDEX idx_tenant_lote (id_tenant, id_lote)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;