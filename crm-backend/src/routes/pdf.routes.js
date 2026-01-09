const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const Quote = require("../models/Quote");
const path = require("path");
const { auth } = require("../middlewares/auth.middleware");




router.get("/quote/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("client", "nombreComercial assignedTo")
      .populate("createdBy", "_id role");

    if (!quote) return res.status(404).send("Cotización no encontrada");

    // 🔐 Permisos
    if (req.user.role === "WORKER") {
      // solo puede ver PDFs de cotizaciones creadas por él
      if (String(quote.createdBy?._id || quote.createdBy) !== String(req.user._id)) {
        return res.status(403).send("No tienes permiso para ver esta cotización");
      }
    }


    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=cotizacion-${quote.folio}-${Date.now()}.pdf`
    );

    doc.pipe(res);

    // ===========================
    // HEADER CON LOGO
    // ===========================
    const logoPath = path.join(__dirname, "../../public/logopublimetro.png");

    doc.image(logoPath, 50, 20, { width: 140 });

    doc
      .fontSize(10)
      .fillColor("#555")
      .text(
        "Av. de la Salvación 791-despacho 103, Balcones Coloniales,\n76147 Santiago de Querétaro, Qro., México",
        380,
        30,
        { align: "right" }
      );

    doc.moveDown(4);

    // TÍTULO
    doc
      .fontSize(22)
      .fillColor("#0A6A44")
      .text(`Cotización #${quote.folio}`, { align: "left" });

    doc
      .moveDown()
      .fontSize(12)
      .fillColor("black")
      .text(`Fecha de emisión: ${new Date().toLocaleDateString("es-MX")}`)
      .text(`Vigencia: 15 días naturales a partir de la fecha de emisión.`);

    doc.moveDown();

    // ===========================
    // PRESENTACIÓN / INTRODUCCIÓN
    // ===========================
    const dirigidoA = (req.query.dirigidoA || "").trim();
    const clientName = dirigidoA || quote.client?.nombreComercial || "Cliente";


    const intro = `Estimado(a) ${clientName}

Agradecemos la oportunidad de presentarles esta propuesta comercial de Publimetro Querétaro. Nuestro objetivo es ofrecer una solución de comunicación alineada a sus necesidades, que permita conectar su marca con una audiencia local activa, informada y de alto valor.

Como medio líder en alcance, Publimetro Querétaro combina credibilidad editorial, visibilidad estratégica y presencia multicanal, generando un entorno ideal para fortalecer el posicionamiento y la recordación de marca.

La propuesta que presentamos a continuación ha sido diseñada de manera flexible, considerando sus objetivos de comunicación y buscando maximizar el impacto de su inversión.

Quedamos a su disposición para ampliar cualquier información y acompañarlos en el desarrollo de una estrategia efectiva.

Atentamente,`;

    doc.fontSize(11).fillColor("black");

    // área donde queremos el texto (debajo de Fecha/Vigencia)
    const introX = 50;
    const introY = doc.y;              // donde vas después del moveDown()
    const introWidth = 500;

    // calcula alto necesario
    const introHeight = doc.heightOfString(intro, { width: introWidth });

    // si no cabe en la página actual, crea nueva página
    const bottomLimit = doc.page.height - 120; // deja espacio para footer
    if (introY + introHeight > bottomLimit) {
      doc.addPage();
    }

    // dibuja el texto en la posición controlada
    doc.text(intro, introX, doc.y, {
      width: introWidth,
      align: "left",
      lineGap: 2,
    });

    doc.moveDown(1.5);



    // ===========================
    // INFORMACIÓN DEL CLIENTE
    // ===========================
    const boxTop = doc.y;
    const boxX = 50;
    const boxW = 500;
    const boxH = 95;

    // Fondo suave
    doc
      .rect(boxX, boxTop, boxW, boxH)
      .fillColor("#F4FBF7")
      .fill();

    // Borde
    doc
      .rect(boxX, boxTop, boxW, boxH)
      .strokeColor("#0A6A44")
      .lineWidth(1.2)
      .stroke();

    doc
      .fontSize(13)
      .fillColor("#0A6A44")
      .text("Información del Cliente", boxX + 14, boxTop + 12);

    const labelX = boxX + 14;
    const valueX = boxX + 95;

    doc.fontSize(11).fillColor("#333");
    doc.text("Cliente:", labelX, boxTop + 36);
    doc.text("Status:", labelX, boxTop + 54);
    doc.text("Total:", labelX, boxTop + 72);

    const totalFmt = (quote.total || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

    doc.fillColor("#000");
    doc.text(`${quote.client?.nombreComercial || "N/A"}`, valueX, boxTop + 36);
    doc.text(`${quote.status || "N/A"}`, valueX, boxTop + 54);
    doc.text(`${totalFmt}`, valueX, boxTop + 72);

    doc.moveDown(5);


    doc.addPage();

    // ===========================
    // TABLA DE TARIFAS
    // ===========================
    doc.fontSize(16).fillColor("#0A6A44").text("Tarifas", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;

    const headers = ["Formato", "Periodicidad", "Costo", "Fechas", "Total Línea"];
    const colWidths = [90, 95, 75, 150, 90];
    // === HEADER (fondo + textos) ===
    const headerH = 26;

    // Fondo verde
    doc
      .rect(50, tableTop, 500, headerH)
      .fill("#0A6A44");

    // Textos del header
    doc
      .fontSize(11)
      .fillColor("white");

    let x = 55;
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop + 8, {
        width: colWidths[i] - 10,
        lineBreak: false,
        ellipsis: true,
      });
      x += colWidths[i];
    });

    // Regresar a negro para el contenido
    doc.fillColor("black");


    let y = tableTop + 32;

    const tarifas = quote.tarifas || [];

    tarifas.forEach((t) => {
      const pageBottom = doc.page.height - 120; // espacio para pie
      if (y + 30 > pageBottom) {
        doc.addPage();

        // Redibujar encabezado en la nueva página
        doc.fontSize(16).fillColor("#0A6A44").text("Tarifas", { underline: true });
        doc.moveDown(0.5);

        const newTableTop = doc.y;
        // === HEADER (fondo + textos) en nueva página ===
        const headerH = 26;

        // Fondo verde
        doc
          .rect(50, newTableTop, 500, headerH)
          .fill("#0A6A44");

        // Textos del header
        doc
          .fontSize(11)
          .fillColor("white");

        let x2 = 55;
        headers.forEach((h, i) => {
          doc.text(h, x2, newTableTop + 8, {
            width: colWidths[i] - 10,
            lineBreak: false,
            ellipsis: true,
          });
          x2 += colWidths[i];
        });

        // Regresar a negro
        doc.fillColor("black");

        // Ajusta y para arrancar filas justo debajo del header
        y = newTableTop + headerH + 6;

      }

      const fechas = (t.fechas || [])
        .map((f) => new Date(f).toLocaleDateString("es-MX"))
        .join(", ");

      const row = [
        t.formato,
        t.periodicidad,
        `$${t.costo}`,
        fechas,
        `$${t.totalLinea}`,
      ];

      let xRow = 55;

      row.forEach((cell, i) => {
        doc.text(cell ?? "", xRow, y, {
          width: colWidths[i] - 10,
          height: 18,
          ellipsis: true,
          lineBreak: false,
        });
        xRow += colWidths[i];
      });

      y += 20;

      doc
        .moveTo(50, y)
        .lineTo(550, y)
        .strokeColor("#ccc")
        .stroke();
    });

    doc.moveDown(3);

    // ===========================
    // PIE DE PÁGINA
    // ===========================
    const bottom = doc.page.height - 80;

    doc
      .fontSize(10)
      .fillColor("#888")
      .text(
        "Esta cotización es confidencial y para uso exclusivo del cliente destinatario.\n" +
        "Los precios están sujetos a cambios sin previo aviso.",
        50,
        bottom,
        { align: "center", width: 500 }
      );

    doc.end();
  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error generando PDF");
  }
});

module.exports = router;
