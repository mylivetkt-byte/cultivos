import express from 'express';
import { getStatus, logoutWhatsApp, sendTextMessage, sendDocumentMessage } from '../services/whatsappService.js';
import db from '../db.js';
import { getDb } from '../utils/db.js';
import { generatePedidoPDF } from '../utils/pdfGenerator.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const status = await getStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(503).json({ success: false, error: error.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        await logoutWhatsApp();
        res.json({ success: true, message: 'Sesión cerrada.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/test', async (req, res) => {
    try {
        const { phone, text } = req.body;
        if (!phone || !text) {
            return res.status(400).json({ success: false, error: 'Falta teléfono o texto.' });
        }
        
        // Asumimos prefijo 57 si no tiene código de país (muy básico, asume 10 dígitos es Colombia)
        let formattedPhone = phone.replace(/\\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '57' + formattedPhone;
        }

        await sendTextMessage(formattedPhone, text);
        res.json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/send-pedido', async (req, res) => {
    try {
        const { id_pedido, phone, tenantId } = req.body;
        if (!id_pedido || !phone) {
            return res.status(400).json({ success: false, error: 'Faltan datos de envío.' });
        }

        // Fetch Pedido Data
        const [pedidos] = await getDb(req).query(`SELECT * FROM inv_pedidos WHERE id_pedido = ?`, [id_pedido]);
        if (pedidos.length === 0) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
        const pedidoData = pedidos[0];

        // Fetch Detalles
        const [detallesData] = await getDb(req).query(`
            SELECT pd.*, i.nombre, i.codigo 
            FROM inv_pedidos_detalle pd
            JOIN insumos i ON pd.id_insumo = i.id_insumo
            WHERE pd.id_pedido = ?
        `, [id_pedido]);

        // Generate PDF
        const pdfBuffer = await generatePedidoPDF(pedidoData, detallesData);

        // Formato del teléfono
        let formattedPhone = phone.replace(/\\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

        const caption = `📋 *Requisición Interna #${id_pedido}*\nAdjuntamos el PDF con los detalles del pedido solicitado por ${pedidoData.nombre_solicitante}.`;
        
        // Enviar
        await sendDocumentMessage(formattedPhone, pdfBuffer, `Pedido_${id_pedido}.pdf`, caption);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/send-ot', async (req, res) => {
    try {
        const { id_ot, phone, tenantId } = req.body;
        if (!id_ot || !phone) {
            return res.status(400).json({ success: false, error: 'Faltan datos de envío.' });
        }

        const [ots] = await getDb(req).query(`
            SELECT ot.*, m.marca_modelo as maquina_nombre, m.placa, 
                   e.nombres as mecanico_nombre, e.apellidos as mecanico_apellido
            FROM ordenes_trabajo_mantenimiento ot
            LEFT JOIN agroind_maquinaria_equipo m ON ot.id_activo = m.id_maq_agro
            LEFT JOIN rrhh_empleados e ON ot.id_tecnico_asignado = e.id_empleado
            WHERE ot.id_orden_trabajo = ?
        `, [id_ot]);
        if (ots.length === 0) return res.status(404).json({ success: false, error: 'OT no encontrada' });
        const otData = ots[0];

        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

        const textMessage = `*ORDEN DE TRABAJO #${otData.numero_orden}*
🚜 *Máquina:* [${otData.placa}] ${otData.maquina_nombre}
🔧 *Técnico:* ${otData.mecanico_nombre} ${otData.mecanico_apellido}
📅 *Programada:* ${new Date(otData.fecha_programada).toLocaleDateString()}
⚠️ *Problema:* ${otData.descripcion_problema}

Por favor, proceda con la ejecución de esta OT.`;
        
        await sendTextMessage(formattedPhone, textMessage);

        res.json({ success: true, message: 'OT enviada por WhatsApp' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/solicitar-repuestos', async (req, res) => {
    try {
        const { id_ot, phone, repuestos, tenantId } = req.body;
        if (!id_ot || !phone || !repuestos) {
            return res.status(400).json({ success: false, error: 'Faltan datos de envío.' });
        }

        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

        const textMessage = `📦 *SOLICITUD DE REPUESTOS - TALLER*
*Para OT:* #${id_ot}
Requerimos los siguientes insumos de bodega:
${repuestos}

Por favor despachar al taller. Gracias.`;
        
        await sendTextMessage(formattedPhone, textMessage);

        res.json({ success: true, message: 'Solicitud enviada a Bodega' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/send-oc', async (req, res) => {
    try {
        const { telefono, texto_orden, numero_orden } = req.body;
        if (!telefono || !texto_orden) {
            return res.status(400).json({ success: false, error: 'Faltan datos de envío.' });
        }

        let formattedPhone = telefono.replace(/\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

        const textMessage = `🛒 *NUEVA ORDEN DE COMPRA: ${numero_orden || ''}*\n\n${texto_orden}`;
        
        await sendTextMessage(formattedPhone, textMessage);

        res.json({ success: true, message: 'Orden de Compra enviada por WhatsApp' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/solicitar-abastecimiento', async (req, res) => {
    try {
        const { insumo_id, nombre_insumo, cantidad_requerida, origen, is_viol } = req.body;
        const [emps] = await getDb(req).query(`
            SELECT telefono FROM rrhh_empleados e
            JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
            WHERE rc.descripcion LIKE ? OR rc.descripcion LIKE ?
            LIMIT 1`
        , [
            is_viol ? '%Planta%' : '%Compras%', is_viol ? '%Vivero%' : '%Administra%'
        ]);
        if (emps.length === 0) return res.status(404).json({ success: false, error: 'No se encontró responsable.' });
        let phone = emps[0].telefono;
        if (!phone) return res.status(404).json({ success: false, error: 'Responsable sin teléfono.' });
        
        let formattedPhone = phone.replace(/\\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;
        
        const textMessage = is_viol 
            ? `🌱 *ALERTA DE DESABASTECIMIENTO - BIOFÁBRICA*\nEl agrónomo en campo requiere: *${nombre_insumo}*\nCantidad faltante estimada: *${cantidad_requerida}*\n\n⚠️ Por favor, iniciar orden de preparación (Receta de Viol) inmediatamente.` 
            : `🛒 *SOLICITUD DE COMPRA URGENTE - CULTIVOS*\nEl agrónomo en campo reporta falta de stock de: *${nombre_insumo}*\nCantidad requerida: *${cantidad_requerida}*\n\n⚠️ Por favor, gestionar el pedido con los proveedores a la brevedad.`;
            
        await sendTextMessage(formattedPhone, textMessage);
        res.json({ success: true, message: 'Alerta enviada correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/alertar-gerencia', async (req, res) => {
    try {
        const { diagnostico, nivel_riesgo, accion_recomendada, ubicacion, detalles } = req.body;
        const [emps] = await getDb(req).query(`
            SELECT telefono FROM rrhh_empleados e
            JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
            WHERE rc.descripcion LIKE '%Administra%' OR rc.descripcion LIKE '%Gerent%'
            LIMIT 1`
        );
        if (emps.length === 0) return res.status(404).json({ success: false, error: 'Gerencia no encontrada.' });
        let phone = emps[0].telefono;
        let formattedPhone = phone.replace(/\\D/g, '');
        if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;
        
        let riskIcon = '🟢';
        if(nivel_riesgo.toLowerCase().includes('medio')) riskIcon = '🟡';
        if(nivel_riesgo.toLowerCase().includes('alto')) riskIcon = '🟠';
        if(nivel_riesgo.toLowerCase().includes('crítico') || nivel_riesgo.toLowerCase().includes('critico')) riskIcon = '🔴';
        
        const textMessage = `🚨 *ALERTA AGRONÓMICA - ALTA GERENCIA*\n\n📍 *Ubicación:* ${ubicacion}\n🔬 *Diagnóstico (IA):* ${diagnostico}\n${riskIcon} *Nivel de Riesgo:* ${nivel_riesgo}\n\n📝 *Detalles:* ${detalles}\n🛠️ *Acción Inmediata a tomar:* ${accion_recomendada}\n\n⚠️ Notificación automática generada por el Agrónomo en campo.`;
        
        await sendTextMessage(formattedPhone, textMessage);
        res.json({ success: true, message: 'Gerencia alertada correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/alertar-novedad-equipo', async (req, res) => {
    try {
        const { lote, codigo_arbol, diagnostico, nombre_cientifico, tratamiento, reportado_por } = req.body;
        
        // Buscar a todos los dueños, administradores, agrónomos y técnicos
        const [emps] = await getDb(req).query(`
            SELECT telefono FROM rrhh_empleados e
            JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
            WHERE rc.descripcion LIKE '%Dueño%' 
               OR rc.descripcion LIKE '%Administrad%'
               OR rc.descripcion LIKE '%Agrónomo%'
               OR rc.descripcion LIKE '%Agronomo%'
               OR rc.descripcion LIKE '%Técnico%'
               OR rc.descripcion LIKE '%Tecnico%'
        `);
        
        if (emps.length === 0) return res.status(404).json({ success: false, error: 'No hay personal registrado en la cadena de mando.' });
        
        const uniquePhones = [...new Set(emps.map(e => e.telefono).filter(Boolean))];
        
        const textMessage = `🚨 *NUEVA ALERTA FITOSANITARIA* 🚨
📍 *Lote/Área:* ${lote}
🌳 *Árbol (Placa):* ${codigo_arbol}

🔬 *Diagnóstico:* ${diagnostico}
${nombre_cientifico && nombre_cientifico !== 'Indeterminado' ? `🧬 *Nombre Científico:* ${nombre_cientifico}\n` : ''}
🛠️ *Tratamiento / Acción:* ${tratamiento || 'Solo reporte, sin receta aún.'}

👤 *Reportado por:* ${reportado_por || 'Personal de Campo / Oficina'}

⚠️ Por favor tomar las medidas preventivas correspondientes en la zona.`;

        // Enviar a todos de manera asíncrona (sin bloquear)
        uniquePhones.forEach(async (phone) => {
            try {
                let formattedPhone = phone.replace(/\\D/g, '');
                if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;
                await sendTextMessage(formattedPhone, textMessage);
            } catch(e) {
                console.error(`Error enviando WhatsApp a ${phone}`, e);
            }
        });
        
        res.json({ success: true, message: `Alerta enviada a ${uniquePhones.length} personas.` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
