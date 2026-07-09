import PDFDocument from 'pdfkit';

export async function generatePedidoPDF(pedidoData, detallesData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            doc.fontSize(20).text('Requisición de Pedido Interno', { align: 'center' });
            doc.moveDown();
            
            // Details
            doc.fontSize(12);
            doc.text(`ID Pedido: ${pedidoData.id_pedido}`);
            doc.text(`Fecha Solicitud: ${new Date(pedidoData.fecha_solicitud).toLocaleDateString()}`);
            doc.text(`Solicitante: ${pedidoData.nombre_solicitante}`);
            doc.text(`Área Origen: ${pedidoData.tipo_origen}`);
            doc.text(`Estado: ${pedidoData.estado}`);
            doc.moveDown();
            
            if (pedidoData.observaciones) {
                doc.text(`Observaciones: ${pedidoData.observaciones}`);
                doc.moveDown();
            }

            // Table Header
            doc.fontSize(14).text('Ítems Solicitados:', { underline: true });
            doc.moveDown(0.5);
            
            let y = doc.y;
            doc.fontSize(10);
            doc.text('Cód', 50, y);
            doc.text('Insumo', 160, y);
            doc.text('Cant. Solicitada', 350, y);
            doc.text('Cant. Aprobada', 450, y);
            
            doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
            y += 20;

            // Table Rows
            detallesData.forEach(item => {
                doc.text(item.codigo || '-', 50, y);
                doc.text(item.nombre || '-', 160, y, { width: 180 });
                doc.text(item.cantidad_solicitada?.toString() || '0', 350, y);
                doc.text(item.cantidad_aprobada?.toString() || '-', 450, y);
                y += 20;
                
                // Add page if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
