import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";

// Generación de PDF real en servidor (sección 4.3.7 y 9 del documento:
// "Generación de PDF: en servidor, no solo en cliente"), con membrete de
// la clínica (sección 1).
export async function generarPdfPresupuesto(
  presupuesto: {
    id: string;
    fecha: Date;
    lineas: Prisma.JsonValue;
    importeTotal: Prisma.Decimal;
    estado: string;
  },
  paciente: { nombre: string; apellidos: string; dniNie: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Membrete
    doc.fontSize(20).fillColor("#7A1F82").text("Odoclinics", { continued: false });
    doc
      .fontSize(9)
      .fillColor("#33103B")
      .text("Av. Rovira Roure 5, altell 5, Lleida (España) · Tel. +34 628 134 872");
    doc.moveDown(1.5);

    doc.fontSize(16).fillColor("#000").text("Presupuesto");
    doc.fontSize(10).fillColor("#333");
    doc.text(`Fecha: ${presupuesto.fecha.toLocaleDateString("es-ES")}`);
    doc.text(`Paciente: ${paciente.nombre} ${paciente.apellidos} (${paciente.dniNie})`);
    doc.text(`Estado: ${presupuesto.estado}`);
    doc.moveDown(1.5);

    const lineas = (presupuesto.lineas as { concepto: string; importe: number }[]) ?? [];

    const headerY = doc.y;
    doc.fontSize(11).fillColor("#000");
    doc.text("Concepto", 50, headerY, { width: 350 });
    doc.text("Importe", 400, headerY, { width: 145, align: "right" });
    doc.moveTo(50, headerY + 20).lineTo(545, headerY + 20).strokeColor("#E9CFEC").stroke();

    let y = headerY + 30;
    for (const linea of lineas) {
      doc.fontSize(10).fillColor("#000");
      doc.text(linea.concepto, 50, y, { width: 350 });
      doc.text(`${Number(linea.importe).toFixed(2)} €`, 400, y, { width: 145, align: "right" });
      y += 20;
    }
    doc.y = y + 10;

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E9CFEC").stroke();
    doc.moveDown(0.5);

    doc
      .fontSize(13)
      .fillColor("#7A1F82")
      .text(`Total: ${Number(presupuesto.importeTotal).toFixed(2)} €`, 50, doc.y, {
        width: 495,
        align: "right",
      });

    doc.end();
  });
}
