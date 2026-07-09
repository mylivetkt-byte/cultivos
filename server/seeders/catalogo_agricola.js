import mysql from 'mysql2/promise';

async function seed() {
  const p = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const tenantId = 1;

  try {
    console.log("Iniciando seeder AMPLIADO de Catálogo Agrícola...");

    const conn = await p.getConnection();
    await conn.beginTransaction();

    const grupos = [
      { codigo: 'FERT', nombre: 'Fertilizantes', subgrupos: ['Edáficos', 'Foliares', 'Orgánicos', 'Enmiendas', 'Producción de Fertilizantes'] },
      { codigo: 'FITO', nombre: 'Fitosanitarios', subgrupos: ['Herbicidas', 'Insecticidas', 'Fungicidas', 'Coadyuvantes', 'Nematicidas', 'Acaricidas'] },
      { codigo: 'HERR', nombre: 'Herramientas y Equipos', subgrupos: ['Manuales', 'Mecánicos', 'Protección Personal (EPP)', 'Instrumentos de Medición'] },
      { codigo: 'SEM',  nombre: 'Semillas y Material Vegetal', subgrupos: ['Certificadas', 'Vivero', 'Patrones', 'Producción de Vivero'] },
      { codigo: 'COMB', nombre: 'Combustibles y Lubricantes', subgrupos: ['Combustibles', 'Aceites de Motor', 'Grasas', 'Fluidos Hidráulicos'] },
      { codigo: 'CONS', nombre: 'Materiales de Construcción', subgrupos: ['Obra Civil', 'Eléctricos', 'Plomería y Riego', 'Maderas y Cerramientos'] },
      { codigo: 'VET',  nombre: 'Insumos Veterinarios (Ganado)', subgrupos: ['Vacunas', 'Desparasitantes', 'Vitaminas y Minerales', 'Antibióticos'] },
      { codigo: 'EMP',  nombre: 'Empaques y Embalajes', subgrupos: ['Cajas', 'Sacos', 'Bolsas', 'Zunchos'] }
    ];

    let groupMap = {};
    let subGroupMap = {};

    for (let g of grupos) {
      // Intentar crear el grupo (o usar existente)
      await conn.query("INSERT IGNORE INTO inv_grupos (id_tenant, codigo, nombre) VALUES (?, ?, ?)", [tenantId, g.codigo, g.nombre]);
      const [resG] = await conn.query("SELECT id_grupo FROM inv_grupos WHERE codigo = ? AND id_tenant = ?", [g.codigo, tenantId]);
      const idG = resG[0].id_grupo;
      groupMap[g.codigo] = idG;

      for (let i = 0; i < g.subgrupos.length; i++) {
        let subN = g.subgrupos[i];
        let subC = `${g.codigo}${(i+1).toString().padStart(2, '0')}`;
        await conn.query("INSERT IGNORE INTO inv_subgrupos (id_grupo, id_tenant, codigo, nombre) VALUES (?, ?, ?, ?)", [idG, tenantId, subC, subN]);
        const [resSub] = await conn.query("SELECT id_subgrupo FROM inv_subgrupos WHERE codigo = ? AND id_tenant = ?", [subC, tenantId]);
        subGroupMap[subN] = resSub[0].id_subgrupo;
      }
    }

    const insumos = [
      // Fertilizantes Edáficos
      { cod: 'F-UREA', nom: 'Urea 46%', un: 'KG', g: 'Fertilizantes', sg: 'Edáficos', p1: 2500 },
      { cod: 'F-TRIP', nom: 'Triple 15 (15-15-15)', un: 'KG', g: 'Fertilizantes', sg: 'Edáficos', p1: 3200 },
      { cod: 'F-DAP',  nom: 'DAP 18-46-0', un: 'KG', g: 'Fertilizantes', sg: 'Edáficos', p1: 4000 },
      { cod: 'F-KCL',  nom: 'Cloruro de Potasio (KCl)', un: 'KG', g: 'Fertilizantes', sg: 'Edáficos', p1: 3500 },
      { cod: 'F-SULF', nom: 'Sulfato de Amonio', un: 'KG', g: 'Fertilizantes', sg: 'Edáficos', p1: 2800 },
      // Fertilizantes Foliares
      { cod: 'F-CALB', nom: 'Calcio + Boro Foliar', un: 'LT', g: 'Fertilizantes', sg: 'Foliares', p1: 35000 },
      { cod: 'F-ZINC', nom: 'Zinc Foliar 20%', un: 'LT', g: 'Fertilizantes', sg: 'Foliares', p1: 42000 },
      { cod: 'F-AMIN', nom: 'Aminoácidos 80%', un: 'LT', g: 'Fertilizantes', sg: 'Foliares', p1: 55000 },
      // Fertilizantes Orgánicos / Enmiendas / Producción
      { cod: 'F-GALL', nom: 'Gallinaza Compostada', un: 'BTO', g: 'Fertilizantes', sg: 'Orgánicos', p1: 15000 },
      { cod: 'F-COMP', nom: 'Compost Orgánico Finca', un: 'BTO', g: 'Fertilizantes', sg: 'Producción de Fertilizantes', p1: 8000 },
      { cod: 'F-CALD', nom: 'Cal Dolomita', un: 'BTO', g: 'Fertilizantes', sg: 'Enmiendas', p1: 12000 },
      { cod: 'F-CALS', nom: 'Cal Viva (Agrícola)', un: 'BTO', g: 'Fertilizantes', sg: 'Enmiendas', p1: 14000 },
      { cod: 'F-ROCF', nom: 'Roca Fosfórica', un: 'BTO', g: 'Fertilizantes', sg: 'Enmiendas', p1: 18000 },
      
      // Fitosanitarios - Herbicidas
      { cod: 'Q-GLIF', nom: 'Glifosato 480 SL', un: 'LT', g: 'Fitosanitarios', sg: 'Herbicidas', p1: 28000, nocivo: 1 },
      { cod: 'Q-PARA', nom: 'Paraquat 200 SL', un: 'LT', g: 'Fitosanitarios', sg: 'Herbicidas', p1: 32000, nocivo: 1 },
      { cod: 'Q-24D',  nom: '2,4-D Amina', un: 'LT', g: 'Fitosanitarios', sg: 'Herbicidas', p1: 25000, nocivo: 1 },
      // Fitosanitarios - Insecticidas / Acaricidas / Nematicidas
      { cod: 'Q-CLOR', nom: 'Clorpirifos 480 EC', un: 'LT', g: 'Fitosanitarios', sg: 'Insecticidas', p1: 45000, nocivo: 1 },
      { cod: 'Q-CYPM', nom: 'Cipermetrina 20 EC', un: 'LT', g: 'Fitosanitarios', sg: 'Insecticidas', p1: 38000, nocivo: 1 },
      { cod: 'Q-IMID', nom: 'Imidacloprid 35 SC', un: 'LT', g: 'Fitosanitarios', sg: 'Insecticidas', p1: 65000, nocivo: 1 },
      { cod: 'Q-ABAM', nom: 'Abamectina 1.8 EC', un: 'LT', g: 'Fitosanitarios', sg: 'Acaricidas', p1: 55000, nocivo: 1 },
      { cod: 'Q-CARB', nom: 'Carbofuran 3 GR', un: 'KG', g: 'Fitosanitarios', sg: 'Nematicidas', p1: 42000, nocivo: 1 },
      // Fitosanitarios - Fungicidas
      { cod: 'Q-MANC', nom: 'Mancozeb 80 WP', un: 'KG', g: 'Fitosanitarios', sg: 'Fungicidas', p1: 35000, nocivo: 1 },
      { cod: 'Q-AZOX', nom: 'Azoxystrobin 25 SC', un: 'LT', g: 'Fitosanitarios', sg: 'Fungicidas', p1: 120000, nocivo: 1 },
      { cod: 'Q-COBR', nom: 'Oxicloruro de Cobre', un: 'KG', g: 'Fitosanitarios', sg: 'Fungicidas', p1: 28000, nocivo: 1 },
      { cod: 'Q-COAD', nom: 'Adherente / Coadyuvante', un: 'LT', g: 'Fitosanitarios', sg: 'Coadyuvantes', p1: 15000 },

      // Herramientas y Equipos
      { cod: 'H-MACH', nom: 'Machete 22 Pulgadas', un: 'UND', g: 'Herramientas y Equipos', sg: 'Manuales', p1: 18000 },
      { cod: 'H-PALA', nom: 'Pala Cuadrada', un: 'UND', g: 'Herramientas y Equipos', sg: 'Manuales', p1: 25000 },
      { cod: 'H-PALD', nom: 'Paladraga / Hoyadora Manual', un: 'UND', g: 'Herramientas y Equipos', sg: 'Manuales', p1: 45000 },
      { cod: 'H-TIJE', nom: 'Tijera Podadora', un: 'UND', g: 'Herramientas y Equipos', sg: 'Manuales', p1: 35000 },
      { cod: 'H-FUMI', nom: 'Fumigadora de Espalda 20L', un: 'UND', g: 'Herramientas y Equipos', sg: 'Manuales', p1: 120000 },
      { cod: 'H-MOTG', nom: 'Motoguadaña 2T', un: 'UND', g: 'Herramientas y Equipos', sg: 'Mecánicos', p1: 850000 },
      { cod: 'H-MOTO', nom: 'Motosierra 18"', un: 'UND', g: 'Herramientas y Equipos', sg: 'Mecánicos', p1: 1200000 },
      { cod: 'H-GUA',  nom: 'Guantes de Nitrilo', un: 'PAR', g: 'Herramientas y Equipos', sg: 'Protección Personal (EPP)', p1: 8000 },
      { cod: 'H-MAS',  nom: 'Mascarilla Doble Filtro', un: 'UND', g: 'Herramientas y Equipos', sg: 'Protección Personal (EPP)', p1: 35000 },
      { cod: 'H-BOT',  nom: 'Botas Caucho Pantaneras', un: 'PAR', g: 'Herramientas y Equipos', sg: 'Protección Personal (EPP)', p1: 45000 },
      { cod: 'H-PLUV', nom: 'Pluviómetro Agrícola', un: 'UND', g: 'Herramientas y Equipos', sg: 'Instrumentos de Medición', p1: 25000 },
      
      // Combustibles y Lubricantes
      { cod: 'C-ACPM', nom: 'ACPM (Diésel)', un: 'GL', g: 'Combustibles y Lubricantes', sg: 'Combustibles', p1: 9500 },
      { cod: 'C-GAS',  nom: 'Gasolina Corriente', un: 'GL', g: 'Combustibles y Lubricantes', sg: 'Combustibles', p1: 15400 },
      { cod: 'C-A25',  nom: 'Aceite Motor Diésel 25W50', un: 'GL', g: 'Combustibles y Lubricantes', sg: 'Aceites de Motor', p1: 85000 },
      { cod: 'C-A2T',  nom: 'Aceite 2 Tiempos (Guadañas)', un: 'LT', g: 'Combustibles y Lubricantes', sg: 'Aceites de Motor', p1: 20000 },
      { cod: 'C-GRA',  nom: 'Grasa Litio', un: 'LB', g: 'Combustibles y Lubricantes', sg: 'Grasas', p1: 22000 },
      { cod: 'C-HID68',nom: 'Aceite Hidráulico ISO 68', un: 'GL', g: 'Combustibles y Lubricantes', sg: 'Fluidos Hidráulicos', p1: 75000 },

      // Materiales de Construcción
      { cod: 'O-CEM',  nom: 'Cemento Gris Tipo Uso General', un: 'BTO', g: 'Materiales de Construcción', sg: 'Obra Civil', p1: 32000 },
      { cod: 'O-LAD',  nom: 'Ladrillo Farol', un: 'UND', g: 'Materiales de Construcción', sg: 'Obra Civil', p1: 1500 },
      { cod: 'O-VAR',  nom: 'Varilla Corrugada 1/2"', un: 'UND', g: 'Materiales de Construcción', sg: 'Obra Civil', p1: 35000 },
      { cod: 'O-PVC',  nom: 'Tubo PVC 2" Presión Riego', un: 'UND', g: 'Materiales de Construcción', sg: 'Plomería y Riego', p1: 45000 },
      { cod: 'O-UCPV', nom: 'Unión PVC 2"', un: 'UND', g: 'Materiales de Construcción', sg: 'Plomería y Riego', p1: 3000 },
      { cod: 'O-ALAM', nom: 'Alambre de Púas x 400m', un: 'ROLLO', g: 'Materiales de Construcción', sg: 'Maderas y Cerramientos', p1: 135000 },
      { cod: 'O-POST', nom: 'Poste Madera Inmunizada 2m', un: 'UND', g: 'Materiales de Construcción', sg: 'Maderas y Cerramientos', p1: 18000 },

      // Semillas y Material Vegetal
      { cod: 'S-MAIZ', nom: 'Semilla Maíz Híbrido', un: 'BTO', g: 'Semillas y Material Vegetal', sg: 'Certificadas', p1: 350000 },
      { cod: 'S-ARROZ',nom: 'Semilla Arroz Certificada', un: 'BTO', g: 'Semillas y Material Vegetal', sg: 'Certificadas', p1: 180000 },
      { cod: 'S-PATR', nom: 'Patrón Limón Volcameriana', un: 'UND', g: 'Semillas y Material Vegetal', sg: 'Patrones', p1: 2500 },
      { cod: 'S-VIV',  nom: 'Chapola de Café', un: 'UND', g: 'Semillas y Material Vegetal', sg: 'Producción de Vivero', p1: 500 },
      { cod: 'S-BOLV', nom: 'Bolsa Vivero 1Kg', un: 'MILL', g: 'Semillas y Material Vegetal', sg: 'Vivero', p1: 45000 },
      { cod: 'S-TURA', nom: 'Turba / Sustrato Germinación', un: 'PACA', g: 'Semillas y Material Vegetal', sg: 'Vivero', p1: 120000 },

      // Veterinaria
      { cod: 'V-AFT',  nom: 'Vacuna Fiebre Aftosa', un: 'DS', g: 'Insumos Veterinarios (Ganado)', sg: 'Vacunas', p1: 1500 },
      { cod: 'V-IVER', nom: 'Ivermectina 1%', un: 'FCO', g: 'Insumos Veterinarios (Ganado)', sg: 'Desparasitantes', p1: 45000 },
      { cod: 'V-SALB', nom: 'Sal Blanca', un: 'BTO', g: 'Insumos Veterinarios (Ganado)', sg: 'Vitaminas y Minerales', p1: 25000 },
      { cod: 'V-SALM', nom: 'Sal Mineralizada 8%', un: 'BTO', g: 'Insumos Veterinarios (Ganado)', sg: 'Vitaminas y Minerales', p1: 75000 },
      { cod: 'V-OXI',  nom: 'Oxitetraciclina L.A.', un: 'FCO', g: 'Insumos Veterinarios (Ganado)', sg: 'Antibióticos', p1: 35000 },

      // Empaques
      { cod: 'E-CAJC', nom: 'Caja Cartón Corrugado Export', un: 'UND', g: 'Empaques y Embalajes', sg: 'Cajas', p1: 3500 },
      { cod: 'E-SACO', nom: 'Saco Polipropileno 50Kg', un: 'UND', g: 'Empaques y Embalajes', sg: 'Sacos', p1: 1200 },
      { cod: 'E-CINT', nom: 'Cinta Pegante Transparente', un: 'ROLLO', g: 'Empaques y Embalajes', sg: 'Zunchos', p1: 5000 }
    ];

    for (let ins of insumos) {
      let id_grupo = null;
      let id_subgrupo = subGroupMap[ins.sg];
      
      for (let g of grupos) {
        if (g.nombre === ins.g) {
          id_grupo = groupMap[g.codigo];
          break;
        }
      }

      await conn.query(`
        INSERT IGNORE INTO insumos (id_tenant, id_grupo, id_subgrupo, codigo, nombre, unidad_medida, precio_venta_1, es_nocivo, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo')
      `, [tenantId, id_grupo, id_subgrupo, ins.cod, ins.nom, ins.un, ins.p1, ins.nocivo || 0]);
    }

    await conn.commit();
    conn.release();
    console.log("Seeder AMPLIADO ejecutado con éxito. ¡Catálogo masivo inyectado!");
  } catch (err) {
    console.error("Error en seeder:", err);
  }
  process.exit(0);
}
seed();
