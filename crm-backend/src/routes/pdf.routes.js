const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const Quote = require("../models/Quote");
const path = require("path");
const { auth } = require("../middlewares/auth.middleware");

router.get("/quote/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("client", "nombreComercial razonSocial rfc")
      .populate("createdBy", "name email role");

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
      .text(`Cotización`, { align: "left" });

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

    doc.moveDown(1.5);

    // ---------------------------
    // HELPERS PDF
    // ---------------------------
    const money = (n) =>
      (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    const fmtDate = (d) => {
      if (!d) return "—";
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "—";
      return dt.toLocaleDateString("es-MX");
    };
    const fmtDur = (d) => {
      const n = Number(d) || 0;
      if (!n) return "—";
      return `${n} ${n === 1 ? "mes" : "meses"}`;
    };
    const getCostosActivacion = (act) => {
      const costoActivacion =
        Number(act?.costoActivacion ?? act?.costo ?? 0) || 0; // ✅ si viene viejo "costo" úsalo
      const costoImpresion = Number(act?.costoImpresion ?? 0) || 0;
      return { costoActivacion, costoImpresion };
    };


    const ensureSpace = (doc, needed = 90) => {
      const bottomLimit = doc.page.height - 100;
      if (doc.y + needed > bottomLimit) doc.addPage();
    };

    const contentX = 50;
    const contentW = 500;

    const paragraph = (text, opts = {}) => {
      const width = opts.width ?? 500;
      const x = opts.x ?? 50;
      const lineGap = opts.lineGap ?? 2;
      const fontSize = opts.fontSize ?? 11;
      const color = opts.color ?? "black";

      // calcula alto y evita que se coma el footer
      const h = doc.heightOfString(text, { width, align: "justify" });
      ensureSpace(doc, h + 20);

      doc
        .fontSize(fontSize)
        .fillColor(color)
        .text(text, x, doc.y, {
          width,
          align: "justify",
          lineGap,
        });

      doc.moveDown(0.8);
      doc.x = 50; // importante para que no se vaya a la derecha
    };

    // dibuja el texto en la posición controlada
    paragraph(intro, { fontSize: 11, lineGap: 2 });
    doc.moveDown(1.5);

    const sectionTitle = (title) => {
      ensureSpace(doc, 60);
      const atTop = doc.y < 70; // evitar espacios extra al inicio de página
      if (!atTop) doc.moveDown(0.6);
      // Título subrayado (como Tarifas) y sin línea verde decorativa
      doc.fontSize(16).fillColor("#0A6A44").text(title, { underline: true });
      if (!atTop) doc.moveDown(0.6);
      doc.fillColor("black").fontSize(11);
    };
    const drawSimpleTable = (headers, rows, colWidths, options = {}) => {
      const startX = 50;

      const {
        headerBg = "#0A6A44",
        headerColor = "white",
        lineColor = "#CFCFCF",
        headerFontSize = 11,
        bodyFontSize = 12,
        cellPadding = 6,
        headerAlign = "center",
        bodyAlign = "center",
        headerH = 32,
        minRowHeight = 26,
      } = options;

      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // Control de espacio usando Y local
      let y = doc.y;
      const ensureSpaceY = (needed) => {
        const bottomLimit = doc.page.height - 100;
        if (y + needed > bottomLimit) {
          doc.addPage();
          y = doc.y;
        }
      };

      // Asegura espacio mínimo (header + 1 fila)
      ensureSpaceY(headerH + minRowHeight + 20);

      // ===== HEADER =====
      doc.save();
      doc.fillColor(headerBg).rect(startX, y, tableWidth, headerH).fill();
      doc.restore();

      doc.fontSize(headerFontSize).fillColor(headerColor);

      let x = startX;
      headers.forEach((h, i) => {
        doc.text(String(h), x + cellPadding, y + 9, {
          width: colWidths[i] - cellPadding * 2,
          align: headerAlign,
          lineBreak: true,
        });
        x += colWidths[i];
      });

      y += headerH;

      // línea debajo del header
      doc.save();
      doc.strokeColor(lineColor).lineWidth(1);
      doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
      doc.restore();

      // ===== BODY =====
      doc.fontSize(bodyFontSize).fillColor("black");

      rows.forEach((row) => {
        // 1) calcular alto real de la fila según la celda más alta
        let rowHeight = minRowHeight;

        row.forEach((cell, i) => {
          const txt = cell === null || cell === undefined || cell === "" ? "—" : String(cell);
          const h = doc.heightOfString(txt, {
            width: colWidths[i] - cellPadding * 2,
            align: bodyAlign,
          });
          rowHeight = Math.max(rowHeight, h + cellPadding * 2);
        });

        ensureSpaceY(rowHeight + 10);

        // 2) dibujar texto por celda
        x = startX;
        row.forEach((cell, i) => {
          const txt = cell === null || cell === undefined || cell === "" ? "—" : String(cell);

          doc.text(txt, x + cellPadding, y + cellPadding, {
            width: colWidths[i] - cellPadding * 2,
            align: bodyAlign,
            lineBreak: true,     // ✅ permite salto de línea
          });

          x += colWidths[i];
        });

        // 3) línea inferior de fila (ya NO se atraviesa)
        doc.save();
        doc.strokeColor(lineColor).lineWidth(1);
        doc.moveTo(startX, y + rowHeight).lineTo(startX + tableWidth, y + rowHeight).stroke();
        doc.restore();

        y += rowHeight;
      });

      // actualizar cursor del documento
      doc.y = y + 6;
      doc.x = startX;
    };

    const keyValue = (label, value, opts = {}) => {
      const x = opts.x ?? contentX;          // 50
      const width = opts.width ?? contentW;  // 500

      const labelW = opts.labelW ?? 160; // ✅ recomendado
      const gap = opts.gap ?? 10;
      const valueW = width - labelW - gap;

      const fontSize = opts.fontSize ?? 12;
      const lineGap = opts.lineGap ?? 2;

      const y = doc.y;

      const safeValue =
        value === null || value === undefined || value === ""
          ? "—"
          : String(value);

      const labelH = doc.heightOfString(label, { width: labelW, lineGap });
      const valueH = doc.heightOfString(safeValue, { width: valueW, lineGap });
      const rowH = Math.max(labelH, valueH);

      ensureSpace(doc, rowH + 12);

      // Etiqueta
      doc
        .fontSize(fontSize)
        .fillColor("#444")
        .text(label, x, y, { width: labelW, lineGap });

      // ✅ Valor alineado a la izquierda (bonito y ordenado)
      const valueAlign = opts.valueAlign ?? "left";

      doc
        .fontSize(fontSize)
        .fillColor("#000")
        .text(safeValue, x + labelW + gap, y, {
          width: valueW,
          lineGap,
          align: valueAlign,
          lineBreak: true,
        });

      doc.y = y + rowH + 6;
      doc.x = x;
    };

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

    // ===========================
    // DETALLES DE LA COTIZACIÓN (SOLO SI HAY DATOS)
    // ===========================
    sectionTitle("Detalles");
    doc.moveDown(0.2);

    keyValue("Folio:", quote.folio);
    keyValue("Cliente:", quote.client?.nombreComercial || "—");

    if (quote.client?.razonSocial) keyValue("Razón social:", quote.client.razonSocial);
    if (quote.client?.rfc) keyValue("RFC:", quote.client.rfc);

    if (quote.createdBy?.name) keyValue("Creada por:", quote.createdBy.name);
    if (quote.createdBy?.email) keyValue("Email:", quote.createdBy.email, { valueAlign: "left" });

    // PAGOS CFDI (solo si hay algo)
    const hasPagoInfo =
      !!quote.formaPago || !!quote.metodoPago || !!quote.usoCFDI || !!quote.facturacionEstado;

    if (hasPagoInfo) {
      sectionTitle("Datos de facturación");

      if (quote.formaPago) keyValue("Forma de pago:", quote.formaPago);
      if (quote.metodoPago) keyValue("Método de pago:", quote.metodoPago);
      if (quote.usoCFDI) keyValue("Uso CFDI:", quote.usoCFDI);

      if (quote.facturacionEstado) {
        keyValue(
          "Estado de facturación:",
          quote.facturacionEstado === "facturado" ? "Facturado" : "Por facturar"
        );
      }

      // Duración justo antes del título principal
      if (quote.duracion) {
        doc.moveDown(0.5);
        keyValue("Duración:", fmtDur(quote.duracion));
      }

      // Título centrado de la sección principal de la cotización
      doc.moveDown(1);
      doc.fontSize(18).fillColor("#0A6A44").text("Cotización de Servicios", {
        align: "center",
        underline: true,
      });
      doc.fillColor("black").fontSize(11);
      doc.moveDown(0.5);
    }

    // Duración (si no hubo datos de facturación)
    if (!hasPagoInfo && quote.duracion) {
      doc.moveDown(0.5);
      keyValue("Duración:", fmtDur(quote.duracion));
    }

    // ===========================
    // TABLA DE TARIFAS
    // ===========================
    ensureSpace(doc, 120);

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
        align: "center",
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

      const rowH = 28;
      const textY = y + 6;

      row.forEach((cell, i) => {
        doc.text(cell ?? "", xRow, textY, {
          width: colWidths[i] - 10,
          ellipsis: true,
          lineBreak: false,
          align: "center",
        });
        xRow += colWidths[i];
      });

      y += rowH;

      // ✅ línea separadora ya NO cae sobre el texto
      doc
        .moveTo(50, y)
        .lineTo(550, y)
        .strokeColor("#e0e0e0")
        .lineWidth(1)
        .stroke();

      y += 6;

    });

    // IMPORTANTE: al terminar la tabla, sincroniza doc.y con 'y' y RESETEA doc.x
    doc.y = y + 10;
    doc.x = 50;          // ✅ clave: vuelve al margen izquierdo
    doc.moveDown(1);

    // ===========================
    // ACTIVACIONES (múltiples)
    // ===========================

    const activacionesList =
      Array.isArray(quote.activaciones) && quote.activaciones.length
        ? quote.activaciones
        : (quote.activacion ? [quote.activacion] : []);

    // ✅ si tienes switch general, respétalo; si no existe, asume true si hay items
    const activacionesEnabled =
      typeof quote.activacionesActivo === "boolean"
        ? quote.activacionesActivo
        : activacionesList.length > 0;

    // ✅ NO filtres por a.activo (porque tus items no lo traen)
    const activas = activacionesEnabled ? activacionesList : [];

    if (activas.length) {
      sectionTitle("Activaciones");

      activas.forEach((act, idx) => {
        // Bloque atómico: título + tabla de 1 fila
        {
        const needed = 24 /*título*/ + 32 /*header*/ + 28 /*fila*/ + 18;
        const bottomLimit = doc.page.height - 100;
        if (doc.y + needed > bottomLimit) doc.addPage();
        }
        
        doc
        .fontSize(12)
        .fillColor("#0A6A44")
        .text(`Activación ${idx + 1}`);
        doc.fillColor("black").fontSize(11);
        doc.moveDown(0.3);

        const fechasAct = (act?.fechas || [])
          .filter(Boolean)
          .map(fmtDate)
          .join(", ");

        const { costoActivacion, costoImpresion } = getCostosActivacion(act);

        // ✅ Encabezados cortos + anchos bien distribuidos
        // ✅ drawSimpleTable debe manejar alto de fila dinámico (ver patch abajo)
        drawSimpleTable(
          ["Tipo", "Cant.", "Cant. tipo", "Activación", "Impresión", "Fechas", "Distribución"],
          [[
            act?.tipo || "—",
            String(act?.cantidad ?? 0),
            String(act?.cantidadTipo ?? 0),
            money(costoActivacion),
            money(costoImpresion),
            fechasAct || "—",
            act?.puntosDistribucion || "—",
          ]],
          [75, 40, 65, 75, 75, 70, 110],
          {
            headerFontSize: 11,
            bodyFontSize: 12,
            cellPadding: 6,
            headerAlign: "center",
            bodyAlign: "center",
          }
        );

        doc.moveDown(0.8);
      });
    }

    // ===========================
    // DESARROLLO INFORMATIVO
    // ===========================
    if (quote.desarrolloInformativo?.activo) {
      sectionTitle("Desarrollo informativo");

      drawSimpleTable(
        ["Fecha", "Formato"],
        [[
          quote.desarrolloInformativo?.fecha ? fmtDate(quote.desarrolloInformativo.fecha) : "—",
          quote.desarrolloInformativo?.formato || "—",
        ]],
        [160, 340]
      );
    }

    // ===========================
    // POSTEO REDES
    // ===========================
    if (quote.posteoRedesSociales?.activo) {
      sectionTitle("Posteo redes sociales");

      const fechasPost = (quote.posteoRedesSociales?.fechas || [])
        .filter(Boolean)
        .map(fmtDate)
        .join(", ");

      drawSimpleTable(
        ["Cantidad", "Fechas"],
        [[
          String(quote.posteoRedesSociales?.cantidad ?? 0),
          fechasPost || "—",
        ]],
        [120, 380]
      );
    }

    // ===========================
    // INTERCAMBIO
    // ===========================
    if (quote.intercambio?.activo) {
      sectionTitle("Intercambio");

      drawSimpleTable(
        ["% Efectivo", "% Especie"],
        [[
          `${quote.intercambio?.porcentajeEfectivo ?? 0}%`,
          `${quote.intercambio?.porcentajeEspecie ?? 0}%`,
        ]],
        [160, 340]
      );

      // Textos largos abajo (mejor legibilidad)
      if (quote.intercambio?.ofrecemos) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#444").text("Ofrecemos:");
        doc.fillColor("black").fontSize(10).text(quote.intercambio.ofrecemos, { width: 500 });
      }

      if (quote.intercambio?.nosOfrecen) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor("#444").text("Nos ofrecen:");
        doc.fillColor("black").fontSize(10).text(quote.intercambio.nosOfrecen, { width: 500 });
      }

      doc.moveDown(0.5);
    }

    // ===========================
    // CORTESÍAS
    // ===========================
    if (quote.cortesias?.activo) {
      sectionTitle("Cortesías");

      const fechasCor = (quote.cortesias?.fechas || [])
        .filter(Boolean)
        .map(fmtDate)
        .join(", ");

      drawSimpleTable(
        ["Cantidad", "Formato", "Fechas"],
        [[
          String(quote.cortesias?.cantidad ?? 0),
          quote.cortesias?.formato || "—",
          fechasCor || "—",
        ]],
        [120, 150, 230]
      );
    }

    // ===========================
    // AJUSTES DE PRECIOS (solo si no es Ninguno o hay valores)
    // ===========================
    const aj = quote.ajustesPrecios || {};
    const tieneAjustes =
      aj.tipoAccion && aj.tipoAccion !== "Ninguno" && ((aj.porcentajeAjuste || 0) !== 0 || (aj.valorAjuste || 0) !== 0);

    if (tieneAjustes) {
      sectionTitle("Ajustes de precios");

      drawSimpleTable(
        ["Tipo de acción", "% Ajuste", "Valor ajuste"],
        [[
          aj.tipoAccion || "—",
          `${aj.porcentajeAjuste || 0}%`,
          money(aj.valorAjuste || 0),
        ]],
        [200, 130, 170]
      );
    }

    // ===========================
    // TOTAL (siempre)
    // ===========================
    sectionTitle("Total");
    doc.moveUp(0.4);
    doc.fontSize(18).fillColor("#0A6A44")
      .text(money(quote.total), 50, doc.y, { width: 500, align: "right" });
    doc.fillColor("black").fontSize(11);
    doc.moveDown(1.2);
    doc.addPage();
    doc.x = 50;

    // ===========================
    // TEXTO FINAL (ANTES DEL FOOTER)
    // ===========================
    const textoFinal = `La celebración del presente instrumento es vinculante y surtirá plenos efectos en términos del Código Civil para el Estado de Querétaro y su correlativo en el orden federal, para la empresa que se describe en la carátula, a partir de la firma de autorización.
No obstante, lo anterior, en caso de que, a criterio de Medios Informativos de Querétaro, S.A. de C.V. (“Publimetro Querétaro”), considere necesario celebrar un contrato en términos de la Ley para la Transparencia, Prevención y Combate de Prácticas Indebidas en Materia de Contratación de Publicidad y cualquier otra disposición que resulte aplicable para la contratación de los servicios descritos en este instrumento, la empresa, se obliga a proporcionar todos los documentos que Publimetro Querétaro le solicite, así como a firmar dicho contrato; el cual, junto con la carátula y términos y condiciones descritos en este documento y el contrato serán consideramos como un mismo instrumento para su interpretación y aplicación.
La empresa, será en todo momento responsable de hacer llegar a Publimetro Querétaro el diseño, tal y como se solicita en las especificaciones que para efecto se harán llegar a través de los medios de contacto proporcionados; por lo que cualquier variación en éstos deberán de ser informados de manera inmediata a Publimetro Querétaro. Cualquier diseño deberá de ser entregado a Publimetro Querétaro por lo menos con 2 (dos) días de anticipación a cualquier publicación; así mismo, se considerará este plazo para cualquier cambio en los diseños. Para eventualidades de emergencia, se podrán recibir diseños para publicarse al día siguiente; siempre y cuando, el diseño cumpla con todas las especificaciones técnicas necesarias, que se haya reservado el espacio antes de las 12:00 p.m. del día anterior, y que el diseño llegue a más tardar a las 4:30 p.m. del día anterior.
En caso de que Publimetro Querétaro sea quien realice los diseños, éstos solo se podrán publicar en los medios de Publimetro Querétaro. Si la empresa quisiera utilizarlos para otros medios, deberá de solicitar autorización expresa y por escrito de Publimetro Querétaro, y deberá de tener liquidado el pago (cuando sea el caso). Así mismo, se necesitarán por lo menos 3 (tres) días hábiles una vez recibida toda la información para la elaboración del diseño y para poder entregarlo. La empresa podrá solicitar máximo 2 (dos) cambios importantes y 3 (tres) cambios sencillos. Solo se podrá generar un diseño por cada 6 (seis) publicaciones. En caso de que la empresa requiera adicionales, se podrá generar un cobro adicional.
La empresa será responsable en todo momento del contenido, promociones, etc., que solicite publicar a Publimetro Querétaro; en términos de las disposiciones vigentes y que resulten aplicables, en el claro entendido de que Publimetro Querétaro se reserva el derecho de no publicar o interrumpir de manera parcial o inmediata cualquier publicación que vulnere las normas y buenas costumbres, en México. Adicional, será la empresa quien libere en lo presente y para lo futuro a Publimetro Querétaro de cualquier publicidad que afecte de manera directa o indirecta a este último, así como a indemnizarlo y pagándole los daños y perjuicios que le pueda ocasionar dichas faltas u omisiones. El cliente es responsable de verificar que todos los datos en su diseño sean correctos.
Así mismo, Publimetro Querétaro se reserva el derecho en lo presente y para lo futuro a no publicar diseños que vayan en contra de la calidad necesaria, tanto en especificaciones técnicas, como de imagen, valores, etc.
Si Publimetro Querétaro solicita información adicional a la empresa para la contratación de los servicios, en términos de lo descrito en este instrumento, podrá suspender de manera temporal o definitiva sin perjuicio alguno cualquier servicio o producto, hasta que la empresa cumpla con sus obligaciones, perdiendo todo derecho a que le sea reembolsable cualquier monto que haya pagado por el o los servicios y/o productos.
Para todo lo relativo a la interpretación, validez, cumplimiento y ejecución del presente instrumento, las Partes se someten expresamente a lo dispuesto por las leyes federales vigentes y aplicables de México y a la jurisdicción de los tribunales competentes en la Ciudad de Querétaro, que serán los únicos competentes para conocer de cualquier conciliación y/o juicio y/o reclamación derivada de este documento, renunciando a cualquier otro fuero que por razón de sus domicilios presentes o futuros o por cualquier otro motivo pudiere corresponderles.
Leído que fue por ambas partes el presente instrumento y una vez enterados de su contenido y alcance, sabedores de las obligaciones que contraen, lo ratifican y firman por duplicado, quedando una copia en poder de cada una de las partes.
El presente documento se firma de conformidad en el lugar y fecha que ha quedado manifestado en la carátula que se encuentra al anverso.
`;

    // Texto final más compacto con letra aún más pequeña
    doc
      .fontSize(7)
      .fillColor("black")
      .text(textoFinal, 50, doc.y, {
        width: 500,
        align: "justify",
        lineGap: 0.4,
      });

    doc.moveDown(1);
    doc.fontSize(11);
    doc.x = 50;

    ensureSpace(doc, 220);
    // ===========================
    // BLOQUE DE FIRMA
    // ===========================
    doc.moveDown(2);
    // Título
    doc.fontSize(11)
      .fillColor("black")
      .text("FIRMANDO DE AUTORIZACIÓN DE PUBLIMETRO QUERÉTARO:", {
        underline: true,
      });

    doc.moveDown(2);

    // Coordenadas base
    const startX = 70;
    let currentY = doc.y;

    // Nombre completo
    doc.fontSize(11).text("Nombre Completo:", startX, currentY);

    doc.moveTo(200, currentY + 12)
      .lineTo(520, currentY + 12)
      .strokeColor("#000")
      .stroke();

    currentY += 40;

    // Firma Publimetro
    doc.fontSize(11).text("Firma:", startX, currentY);

    doc.moveTo(200, currentY + 12)
      .lineTo(520, currentY + 12)
      .stroke();

    currentY += 40;

    // ===========================
    // FIRMA DEL CLIENTE
    // ===========================

    // Nombre Cliente
    doc.fontSize(11).text("Nombre Cliente:", startX, currentY);

    doc.moveTo(200, currentY + 12)
      .lineTo(520, currentY + 12)
      .stroke();

    currentY += 40;

    // Firma Cliente
    doc.fontSize(11).text("Firma Cliente:", startX, currentY);

    doc.moveTo(200, currentY + 12)
      .lineTo(520, currentY + 12)
      .stroke();

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