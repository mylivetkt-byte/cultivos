const pptxgen = require('pptxgenjs');
let pres = new pptxgen();

// Layout and theme
pres.layout = 'LAYOUT_16x9';
pres.theme = { headFontFace: "Arial", bodyFontFace: "Calibri" };

// Master Slide
pres.defineSlideMaster({
  title: "MASTER_SLIDE",
  background: { color: "FFFFFF" },
  objects: [
    { rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: "1E4E79" } } },
    { text: { text: "SAS - Sistema de Administración y Seguimiento Agroindustrial", options: { x: 0.5, y: 0.15, w: 9, h: 0.5, color: "FFFFFF", fontSize: 18, bold: true } } }
  ]
});

// Title Slide
let slide = pres.addSlide();
slide.background = { color: "1E4E79" };
slide.addText("SAS", { x: 1, y: 1.5, w: 8, fontSize: 60, bold: true, color: "FFFFFF", align: "center" });
slide.addText("Sistema de Administración y Seguimiento Agroindustrial", { x: 1, y: 3, w: 8, fontSize: 24, color: "E6F0FA", align: "center" });
slide.addText("Control Total, Auditoría y Eficiencia Operativa 360°", { x: 1, y: 3.8, w: 8, fontSize: 18, color: "FFFFFF", align: "center" });

function addChapterSlide(title, points) {
  let s = pres.addSlide({ masterName: "MASTER_SLIDE" });
  s.addText(title, { x: 0.5, y: 1, w: 9, fontSize: 32, bold: true, color: "2E74B5" });
  
  let formattedPoints = points.map(p => ({
    text: p.text,
    options: { 
        bullet: true, 
        color: p.isBenefit ? "1E4E79" : "333333", 
        bold: p.isBenefit,
        fontSize: 20, 
        breakLine: true,
        margin: [0, 0, 15, 0] // bottom margin for spacing
    }
  }));

  s.addText(formattedPoints, { x: 0.5, y: 2, w: 9, h: 3, valign: "top" });
}

addChapterSlide("Capítulo 1: Centro de Control y Alertas", [
  { text: "Torre de Control unificada para notificaciones de toda la hacienda." },
  { text: "Gestión de requisiciones urgentes y alertas de stock mínimo." },
  { text: "Flujo de abastecimiento sin cuellos de botella." },
  { text: "Beneficio: Visibilidad gerencial del pulso diario de toda la operación.", isBenefit: true }
]);

addChapterSlide("Capítulo 2: Monitoreo Satelital y GPS", [
  { text: "Integración con cartografía satelital (GIS) y dispositivos GPS." },
  { text: "Mapa interactivo de cultivos (NDVI) y pivotes de riego." },
  { text: "Auditoría de rutas y velocidad de maquinaria agrícola." },
  { text: "Beneficio: Auditoría visual de la hacienda y prevención de fugas.", isBenefit: true }
]);

addChapterSlide("Capítulo 3: Gestión Agrícola y Semilleros", [
  { text: "Trazabilidad desde la semilla hasta el lote productivo." },
  { text: "Control fenológico y Manejo Integrado de Plagas (MIPE)." },
  { text: "Formulación agronómica respetando periodos de carencia." },
  { text: "Beneficio: Estandariza protocolos y audita el plan agronómico.", isBenefit: true }
]);

addChapterSlide("Capítulo 4: Sistema Automatizado de Cosecha", [
  { text: "Integración directa a básculas electrónicas." },
  { text: "Cero digitación manual en la recepción de la cosecha." },
  { text: "Control exacto de mermas y calidad en puerto de acopio." },
  { text: "Beneficio: Elimina el fraude ('dedo en la báscula') y pagos injustos.", isBenefit: true }
]);

addChapterSlide("Capítulo 5: Biofábrica y Producción de Bioles", [
  { text: "Gestión de fórmulas maestras y tiempos de fermentación." },
  { text: "Control de insumos (melaza, estiércol, microorganismos)." },
  { text: "Cálculo exacto del costo de producción por litro." },
  { text: "Beneficio: Transforma desechos en ahorros y estandariza la calidad.", isBenefit: true }
]);

addChapterSlide("Capítulo 6: Gestión Ganadera y Pecuaria", [
  { text: "Hoja de vida electrónica y trazabilidad de potreros." },
  { text: "Control genético, pesajes y producción lechera." },
  { text: "Identificación de animales improductivos." },
  { text: "Beneficio: Audita la ganancia de peso y optimiza el uso de pasturas.", isBenefit: true }
]);

addChapterSlide("Capítulo 7: Gestión Acuícola (Piscicultura)", [
  { text: "Control de piscinas: oxígeno, temperatura, biomasa." },
  { text: "Muestreos de peso y factor de conversión alimenticia (FCA)." },
  { text: "Programación automatizada de aireadores." },
  { text: "Beneficio: Minimiza mortalidad masiva y audita consumo de concentrado.", isBenefit: true }
]);

addChapterSlide("Capítulo 8: Control de Bodegas e Inventarios", [
  { text: "Gestión unificada (Agro, Veterinario, Repuestos)." },
  { text: "Control PEPS, lotes, caducidad y códigos de barras." },
  { text: "Traslados seguros entre haciendas." },
  { text: "Beneficio: Inventario blindado, evita el robo hormiga y vencimientos.", isBenefit: true }
]);

addChapterSlide("Capítulo 9: Logística y Compras", [
  { text: "Requisición -> Cotización paralela -> Aprobación gerencial." },
  { text: "Evaluación de proveedores y fluctuación de precios." },
  { text: "Bloqueo de compras no planificadas." },
  { text: "Beneficio: Negociaciones transparentes y reducción de costos operativos.", isBenefit: true }
]);

addChapterSlide("Capítulo 10: Maquinaria, Mantenimiento y Riego", [
  { text: "Hoja de vida técnica, control de horómetros y combustible." },
  { text: "Mantenimiento preventivo de tractores y bombas acuícolas." },
  { text: "Sincronización con órdenes de riego." },
  { text: "Beneficio: Previene daños costosos y audita consumos por GPS.", isBenefit: true }
]);

addChapterSlide("Capítulo 11: RRHH, Nómina y Geolocalización", [
  { text: "Pago de jornales y destajos conectados a básculas." },
  { text: "Asistencia mediante biometría o GPS móvil." },
  { text: "Cálculo automático de seguridad social y liquidaciones." },
  { text: "Beneficio: Blindaje laboral (UGPP) y pago exacto por lo producido.", isBenefit: true }
]);

addChapterSlide("Capítulo 12: Comercialización y Ventas", [
  { text: "Facturación electrónica directa a la DIAN." },
  { text: "Trazabilidad desde la finca hasta el exportador." },
  { text: "Gestión eficiente de cartera y despachos." },
  { text: "Beneficio: Acelera el flujo de caja y audita rentabilidad por cliente.", isBenefit: true }
]);

addChapterSlide("Capítulo 13: Contabilidad, Tributaria y DIAN", [
  { text: "Motor contable bajo normas NIIF en tiempo real." },
  { text: "Integración automática de nómina, compras y bodegas." },
  { text: "Retenciones y Medios Magnéticos automáticos." },
  { text: "Beneficio: Paz mental, evita multas y refleja la salud financiera exacta.", isBenefit: true }
]);

addChapterSlide("Capítulo 14: Auditoría y Revisoría Fiscal", [
  { text: "Logs inmutables y bloqueo estricto de periodos fiscales." },
  { text: "Drill-Down de Revisoría Fiscal (desde contabilidad hasta báscula)." },
  { text: "Motor de prorrateo (cruces de costos entre unidades)." },
  { text: "Beneficio: Máximo gobierno corporativo, desenmascara unidades improductivas.", isBenefit: true }
]);

addChapterSlide("¿Por qué SAS es la Única Opción?", [
  { text: "Gestión Multidimensional 360° (Agro, Ganadería, Peces, Biol)." },
  { text: "Auditoría Satelital y Electrónica Antifraude." },
  { text: "Rigor DIAN y Revisoría Fiscal Incorruptible." },
  { text: "Centro de Control: La Finca en su bolsillo." },
  { text: "Garantía absoluta para dueños e inversionistas.", isBenefit: true }
]);

pres.writeFile({ fileName: "Presentacion_SAS.pptx" }).then(fileName => {
  console.log("created file: " + fileName);
});
