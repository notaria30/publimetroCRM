const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const Quote = require("../models/Quote");
const path = require("path");
const { auth } = require("../middlewares/auth.middleware");

// ─────────────────────────────────────────────────────────────
// PALETA DE COLORES — Publimetro Querétaro
// ─────────────────────────────────────────────────────────────
const C = {
  verde: "#0A6A44",   // verde corporativo principal
  verdeLight: "#12A067",   // verde claro para acentos
  verdePale: "#E8F5EE",   // fondo muy suave verde
  dark: "#0D1F17",   // sidebar oscuro
  darkMid: "#163829",   // sidebar secundario
  grisOscuro: "#2D2D2D",   // texto principal
  grisMedio: "#6B7280",   // etiquetas / secundario
  grisClaro: "#F3F4F6",   // fondos alternos tabla
  grisLinea: "#E5E7EB",   // separadores
  blanco: "#FFFFFF",
  negro: "#111111",
  acento: "#4ADE80",   // verde neón para highlights
};

router.get("/quote/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("client", "nombreComercial razonSocial rfc")
      .populate("createdBy", "name email role");

    if (!quote) return res.status(404).send("Cotización no encontrada");

    if (req.user.role === "WORKER") {
      if (String(quote.createdBy?._id || quote.createdBy) !== String(req.user._id)) {
        return res.status(403).send("No tienes permiso para ver esta cotización");
      }
    }

    const doc = new PDFDocument({ margin: 0, size: "LETTER" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=cotizacion-${quote.folio}-${Date.now()}.pdf`
    );
    doc.pipe(res);

    // ─────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────
    const PW = doc.page.width;   // 612
    const PH = doc.page.height;  // 792
    const SIDEBAR_W = 185;
    const CONTENT_X = SIDEBAR_W + 28;
    const CONTENT_W = PW - CONTENT_X - 28;
    const MARGIN_BOTTOM = 80;

    const money = (n) =>
      (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    const fmtDate = (d) => {
      if (!d) return "—";
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("es-MX");
    };

    const fmtDur = (d) => {
      const n = Number(d) || 0;
      return n ? `${n} ${n === 1 ? "mes" : "meses"}` : "—";
    };

    const getCostosActivacion = (act) => ({
      costoActivacion: Number(act?.costoActivacion ?? act?.costo ?? 0) || 0,
      costoImpresion: Number(act?.costoImpresion ?? 0) || 0,
    });

    // Verifica espacio y agrega página si es necesario
    // También redibuja sidebar en nueva página
    const ensureSpace = (needed = 90) => {
      if (doc.y + needed > PH - MARGIN_BOTTOM) {
        doc.addPage();
        drawSidebar();           // redibuja sidebar en la nueva página
        doc.y = 48;
        doc.x = CONTENT_X;
      }
    };

    // Resetea X al margen de contenido
    const resetX = () => { doc.x = CONTENT_X; };

    // ─────────────────────────────────────────────────────────
    // SIDEBAR — se llama en cada página nueva
    // ─────────────────────────────────────────────────────────
    const drawSidebar = () => {
      // Fondo principal del sidebar
      doc.rect(0, 0, SIDEBAR_W, PH).fill(C.dark);

      // Banda verde superior del sidebar
      doc.rect(0, 0, SIDEBAR_W, 110).fill(C.verde);

      // Línea decorativa lateral interna
      doc.rect(SIDEBAR_W - 3, 0, 3, PH).fill(C.verdeLight);

      // Logo textual dentro del sidebar
      const logoPath = path.join(__dirname, "../../public/logopublimetro.png");
      try {
        doc.image(logoPath, 16, 14, { width: 130, opacity: 1 });
      } catch {
        // Si no encuentra el logo dibuja texto
        doc.fontSize(16).fillColor(C.blanco).font("Helvetica-Bold")
          .text("PUBLIMETRO", 16, 20, { width: 155 });
        doc.fontSize(8).fillColor(C.acento)
          .text("QUERÉTARO", 16, 40);
      }

      // Línea divisoria bajo el logo
      doc.moveTo(16, 104).lineTo(SIDEBAR_W - 16, 104)
        .strokeColor(C.acento).lineWidth(1.5).stroke();

      // ── Folio / badge ──
      doc.roundedRect(16, 114, SIDEBAR_W - 32, 32, 6)
        .fill(C.darkMid);
      doc.fontSize(7).fillColor(C.acento).font("Helvetica-Bold")
        .text("COTIZACIÓN", 24, 120, { width: SIDEBAR_W - 40 });
      doc.fontSize(13).fillColor(C.blanco)
        .text(`#${String(quote.folio || "—").padStart(4, "0")}`, 24, 130, { width: SIDEBAR_W - 40 });

      // ── Items del sidebar ──
      const items = [
        { label: "Fecha de emisión", value: new Date().toLocaleDateString("es-MX") },
        { label: "Vigencia", value: "15 días naturales" },
        { label: "Cliente", value: quote.client?.nombreComercial || "N/A" },
        { label: "Vendedor", value: quote.createdBy?.name || "—" },
        { label: "Email", value: quote.createdBy?.email || "—" },
        { label: "Forma de pago", value: quote.formaPago || "—" },
        { label: "Método de pago", value: quote.metodoPago || "—" },
        { label: "Duración", value: fmtDur(quote.duracion) },
        { label: "Estado de fact.", value: quote.facturacionEstado === "facturado" ? "Facturado" : "Por facturar" },
      ];

      let sy = 158;
      items.forEach(({ label, value }) => {
        if (sy + 36 > PH - 90) return; // no sale del sidebar

        doc.fontSize(6.5).fillColor(C.acento).font("Helvetica-Bold")
          .text(label.toUpperCase(), 16, sy, { width: SIDEBAR_W - 28, lineBreak: false, ellipsis: true });

        sy += 11;

        // Ajustar tamaño si el valor es largo
        const fs = value.length > 24 ? 7.5 : 9;
        doc.fontSize(fs).fillColor(C.blanco).font("Helvetica")
          .text(value, 16, sy, { width: SIDEBAR_W - 28, lineBreak: false, ellipsis: true });

        sy += 13;

        // Separador
        doc.moveTo(16, sy).lineTo(SIDEBAR_W - 16, sy)
          .strokeColor(C.darkMid).lineWidth(0.5).stroke();
        sy += 8;
      });

      // ── Dirección al pie ──
      doc.fontSize(6.5).fillColor(C.grisMedio).font("Helvetica")
        .text(
          "Av. de la Salvación 791-desp. 103\nBalcones Coloniales\n76147 Querétaro, Qro. México",
          10, PH - 50,
          { width: SIDEBAR_W - 18, lineBreak: true }
        );
    };

    // ─────────────────────────────────────────────────────────
    // SECTION TITLE
    // ─────────────────────────────────────────────────────────
    const sectionTitle = (title) => {
      ensureSpace(50);
      doc.moveDown(0.5);

      const ty = doc.y;
      // Fondo pill
      doc.roundedRect(CONTENT_X, ty, CONTENT_W, 24, 4).fill(C.verdePale);
      // Acento izquierdo
      doc.rect(CONTENT_X, ty, 4, 24).fill(C.verde);

      doc.fontSize(11).fillColor(C.verde).font("Helvetica-Bold")
        .text(title, CONTENT_X + 14, ty + 6, { width: CONTENT_W - 20, lineBreak: false });

      doc.y = ty + 32;
      resetX();
    };

    // ─────────────────────────────────────────────────────────
    // KEY-VALUE ROW
    // ─────────────────────────────────────────────────────────
    const keyValue = (label, value, opts = {}) => {
      const fs = opts.fontSize ?? 9.5;
      const labelW = opts.labelW ?? 155;
      const gap = 8;
      const valueW = CONTENT_W - labelW - gap;
      const lineGap = 1.5;
      const y = doc.y;

      const safe = (value === null || value === undefined || value === "") ? "—" : String(value);
      const lh = doc.heightOfString(label, { width: labelW, lineGap });
      const vh = doc.heightOfString(safe, { width: valueW, lineGap });
      const rowH = Math.max(lh, vh);

      ensureSpace(rowH + 10);

      const currentY = doc.y;

      doc.fontSize(fs).fillColor(C.grisMedio).font("Helvetica")
        .text(label, CONTENT_X, currentY, { width: labelW, lineGap });

      doc.fontSize(fs).fillColor(C.negro).font("Helvetica-Bold")
        .text(safe, CONTENT_X + labelW + gap, currentY, { width: valueW, lineGap, lineBreak: true });

      doc.y = currentY + rowH + 7;
      resetX();

      // Separador suave
      doc.moveTo(CONTENT_X, doc.y - 3).lineTo(CONTENT_X + CONTENT_W, doc.y - 3)
        .strokeColor(C.grisLinea).lineWidth(0.4).stroke();
    };

    // ─────────────────────────────────────────────────────────
    // TABLA MODERNA
    // ─────────────────────────────────────────────────────────
    const drawTable = (headers, rows, colWidths, opts = {}) => {
      const {
        headerBg = C.verde,
        headerColor = C.blanco,
        altRowBg = C.verdePale,
        lineColor = C.grisLinea,
        headerFontSize = 8,
        bodyFontSize = 8.5,
        cellPadding = 7,
        headerH = 28,
        minRowH = 24,
        align = "center",
      } = opts;

      const totalW = colWidths.reduce((a, b) => a + b, 0);
      const startX = CONTENT_X;

      const drawHeader = (ty) => {
        // Header con bordes redondeados superiores
        doc.roundedRect(startX, ty, totalW, headerH, 5).fill(headerBg);
        // Rectángulo inferior para "aplanar" las esquinas de abajo del rounded
        doc.rect(startX, ty + headerH / 2, totalW, headerH / 2).fill(headerBg);

        doc.fontSize(headerFontSize).fillColor(headerColor).font("Helvetica-Bold");
        let hx = startX;
        headers.forEach((h, i) => {
          doc.text(String(h), hx + cellPadding, ty + 9, {
            width: colWidths[i] - cellPadding * 2,
            align,
            lineBreak: false,
            ellipsis: true,
          });
          hx += colWidths[i];
        });
        return ty + headerH;
      };

      // Primera vez: asegura espacio para header + 1 fila
      ensureSpace(headerH + minRowH + 10);
      let y = drawHeader(doc.y);

      doc.fontSize(bodyFontSize).fillColor(C.negro).font("Helvetica");

      rows.forEach((row, ri) => {
        // Calcular altura real de la fila
        let rowH = minRowH;
        row.forEach((cell, ci) => {
          const txt = cell == null || cell === "" ? "—" : String(cell);
          const h = doc.heightOfString(txt, {
            width: colWidths[ci] - cellPadding * 2,
          });
          rowH = Math.max(rowH, h + cellPadding * 2);
        });

        // ¿Necesita nueva página?
        if (y + rowH > PH - MARGIN_BOTTOM) {
          doc.addPage();
          drawSidebar();
          doc.y = 48;
          y = drawHeader(doc.y);
        }

        // Fondo alterno
        if (ri % 2 === 1) {
          doc.rect(startX, y, totalW, rowH).fill(altRowBg);
        }

        // Texto de cada celda
        doc.fontSize(bodyFontSize).fillColor(C.negro).font("Helvetica");
        let cx = startX;
        row.forEach((cell, ci) => {
          const txt = cell == null || cell === "" ? "—" : String(cell);
          doc.text(txt, cx + cellPadding, y + cellPadding, {
            width: colWidths[ci] - cellPadding * 2,
            align,
            lineBreak: true,
          });
          cx += colWidths[ci];
        });

        // Borde inferior de fila
        y += rowH;
        doc.moveTo(startX, y).lineTo(startX + totalW, y)
          .strokeColor(lineColor).lineWidth(0.5).stroke();
      });

      // Borde exterior de la tabla completa
      const tableTop = doc.y; // aproximado — solo borde visual si quieres
      doc.y = y + 8;
      resetX();
    };

    // ─────────────────────────────────────────────────────────
    // ── INICIO DEL DOCUMENTO ─────────────────────────────────
    // ─────────────────────────────────────────────────────────
    drawSidebar();

    // ── Encabezado de contenido ──────────────────────────────
    const hdrY = 28;

    // Título grande
    doc.fontSize(22).fillColor(C.verde).font("Helvetica-Bold")
      .text("Cotización", CONTENT_X, hdrY, { lineBreak: false });

    // Subtítulo / cliente
    const clientLabel = quote.client?.nombreComercial || "Cliente";
    doc.fontSize(10).fillColor(C.grisMedio).font("Helvetica")
      .text(`Para: ${clientLabel}`, CONTENT_X, hdrY + 30, { lineBreak: false });

    // Fecha alineada a la derecha del contenido
    const dateStr = new Date().toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric",
    });
    doc.fontSize(8).fillColor(C.grisMedio).font("Helvetica")
      .text(dateStr, CONTENT_X, hdrY + 46, { width: CONTENT_W, align: "right" });

    // Línea decorativa bajo el título
    const lineY = hdrY + 64;
    doc.moveTo(CONTENT_X, lineY).lineTo(CONTENT_X + CONTENT_W, lineY)
      .strokeColor(C.verdeLight).lineWidth(1.5).stroke();
    // Puntito verde
    doc.circle(CONTENT_X, lineY, 3).fill(C.verde);

    doc.y = lineY + 16;
    resetX();

    // ── Carta de presentación ────────────────────────────────
    const dirigidoA = (req.query.dirigidoA || "").trim();
    const contacto = dirigidoA || quote.client?.nombreComercial || "Cliente";

    doc.fontSize(9.5).fillColor(C.grisOscuro).font("Helvetica")
      .text(`Estimado(a) ${contacto},`, CONTENT_X, doc.y);
    doc.moveDown(0.5);

    const introLines = [
      "Agradecemos la oportunidad de presentarles esta propuesta comercial de Publimetro Querétaro. Nuestro objetivo es ofrecer una solución de comunicación alineada a sus necesidades, que permita conectar su marca con una audiencia local activa, informada y de alto valor.",
      "Como medio líder en alcance, Publimetro Querétaro combina credibilidad editorial, visibilidad estratégica y presencia multicanal, generando un entorno ideal para fortalecer el posicionamiento y la recordación de marca.",
      "La propuesta que presentamos a continuación ha sido diseñada de manera flexible, considerando sus objetivos de comunicación y buscando maximizar el impacto de su inversión.",
    ];

    introLines.forEach((line) => {
      ensureSpace(30);
      doc.fontSize(8.5).fillColor(C.grisOscuro).font("Helvetica")
        .text(line, CONTENT_X, doc.y, { width: CONTENT_W, align: "justify", lineGap: 1.5 });
      doc.moveDown(0.5);
      resetX();
    });

    doc.fontSize(8.5).fillColor(C.grisMedio).font("Helvetica-Oblique")
      .text("Atentamente, el equipo de Publimetro Querétaro.", CONTENT_X, doc.y);
    doc.moveDown(1);
    resetX();

    // ── Detalles generales ───────────────────────────────────
    sectionTitle("Detalles de la Cotización");

    keyValue("Folio:", quote.folio || "—");
    keyValue("Cliente:", quote.client?.nombreComercial || "—");
    if (quote.client?.razonSocial) keyValue("Razón social:", quote.client.razonSocial);
    if (quote.client?.rfc) keyValue("RFC:", quote.client.rfc);
    if (quote.createdBy?.name) keyValue("Creada por:", quote.createdBy.name);
    if (quote.createdBy?.email) keyValue("Email:", quote.createdBy.email);

    // ── Datos de facturación ─────────────────────────────────
    const hasPagoInfo = !!quote.formaPago || !!quote.metodoPago || !!quote.usoCFDI || !!quote.facturacionEstado;
    if (hasPagoInfo) {
      sectionTitle("Datos de Facturación");
      if (quote.formaPago) keyValue("Forma de pago:", quote.formaPago);
      if (quote.metodoPago) keyValue("Método de pago:", quote.metodoPago);
      if (quote.usoCFDI) keyValue("Uso CFDI:", quote.usoCFDI);
      if (quote.facturacionEstado) keyValue("Estado de facturación:",
        quote.facturacionEstado === "facturado" ? "Facturado ✓" : "Por facturar");
      if (quote.duracion) keyValue("Duración:", fmtDur(quote.duracion));
    } else if (quote.duracion) {
      keyValue("Duración:", fmtDur(quote.duracion));
    }

    // ── Tabla de tarifas ─────────────────────────────────────
    sectionTitle("Cotización de Servicios — Tarifas");

    const tarifas = quote.tarifas || [];
    if (tarifas.length) {
      const headers = ["Formato", "Periodicidad", "Costo", "Fechas", "Total"];
      const colWidths = [72, 80, 62, 120, 72];

      const rows = tarifas.map((t) => [
        t.formato || "—",
        t.periodicidad || "—",
        `$${t.costo ?? 0}`,
        (t.fechas || []).map((f) => new Date(f).toLocaleDateString("es-MX")).join(", ") || "—",
        `$${t.totalLinea ?? 0}`,
      ]);

      drawTable(headers, rows, colWidths);
    } else {
      doc.fontSize(9).fillColor(C.grisMedio).text("Sin tarifas registradas.", CONTENT_X, doc.y);
      doc.moveDown(1); resetX();
    }

    // ── Activaciones ─────────────────────────────────────────
    const activacionesList =
      Array.isArray(quote.activaciones) && quote.activaciones.length
        ? quote.activaciones
        : quote.activacion ? [quote.activacion] : [];

    const activacionesEnabled =
      typeof quote.activacionesActivo === "boolean"
        ? quote.activacionesActivo
        : activacionesList.length > 0;

    const activas = activacionesEnabled ? activacionesList : [];

    if (activas.length) {
      sectionTitle("Activaciones");

      activas.forEach((act, idx) => {
        ensureSpace(80);

        doc.fontSize(9.5).fillColor(C.verde).font("Helvetica-Bold")
          .text(`Activación ${idx + 1}`, CONTENT_X, doc.y);
        doc.moveDown(0.3); resetX();

        const { costoActivacion, costoImpresion } = getCostosActivacion(act);
        const fechasAct = (act?.fechas || []).filter(Boolean).map(fmtDate).join(", ");

        drawTable(
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
          [52, 32, 52, 62, 62, 64, 82],
          { headerFontSize: 7, bodyFontSize: 7.5, cellPadding: 5, minRowH: 20 }
        );
        doc.moveDown(0.5);
      });
    }

    // ── Desarrollo informativo ───────────────────────────────
    if (quote.desarrolloInformativo?.activo) {
      sectionTitle("Desarrollo Informativo");
      drawTable(
        ["Fecha", "Formato"],
        [[
          quote.desarrolloInformativo?.fecha ? fmtDate(quote.desarrolloInformativo.fecha) : "—",
          quote.desarrolloInformativo?.formato || "—",
        ]],
        [160, 246]
      );
    }

    // ── Posteo redes sociales ────────────────────────────────
    if (quote.posteoRedesSociales?.activo) {
      sectionTitle("Posteo en Redes Sociales");
      const fechasPost = (quote.posteoRedesSociales?.fechas || []).filter(Boolean).map(fmtDate).join(", ");
      drawTable(
        ["Cantidad", "Fechas"],
        [[String(quote.posteoRedesSociales?.cantidad ?? 0), fechasPost || "—"]],
        [100, 306]
      );
    }

    // ── Intercambio ──────────────────────────────────────────
    if (quote.intercambio?.activo) {
      sectionTitle("Intercambio");
      drawTable(
        ["% Efectivo", "% Especie"],
        [[`${quote.intercambio?.porcentajeEfectivo ?? 0}%`, `${quote.intercambio?.porcentajeEspecie ?? 0}%`]],
        [153, 253]
      );

      if (quote.intercambio?.ofrecemos) {
        doc.fontSize(8).fillColor(C.grisMedio).font("Helvetica").text("Ofrecemos:", CONTENT_X, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(8.5).fillColor(C.negro).text(quote.intercambio.ofrecemos, CONTENT_X, doc.y, { width: CONTENT_W });
        doc.moveDown(0.5); resetX();
      }
      if (quote.intercambio?.nosOfrecen) {
        doc.fontSize(8).fillColor(C.grisMedio).font("Helvetica").text("Nos ofrecen:", CONTENT_X, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(8.5).fillColor(C.negro).text(quote.intercambio.nosOfrecen, CONTENT_X, doc.y, { width: CONTENT_W });
        doc.moveDown(0.5); resetX();
      }
    }

    // ── Cortesías ────────────────────────────────────────────
    if (quote.cortesias?.activo) {
      sectionTitle("Cortesías");
      const fechasCor = (quote.cortesias?.fechas || []).filter(Boolean).map(fmtDate).join(", ");
      drawTable(
        ["Cantidad", "Formato", "Fechas"],
        [[String(quote.cortesias?.cantidad ?? 0), quote.cortesias?.formato || "—", fechasCor || "—"]],
        [90, 130, 186]
      );
    }

    // ── Ajustes de precios ───────────────────────────────────
    const aj = quote.ajustesPrecios || {};
    const tieneAjustes =
      aj.tipoAccion && aj.tipoAccion !== "Ninguno" &&
      ((aj.porcentajeAjuste || 0) !== 0 || (aj.valorAjuste || 0) !== 0);

    if (tieneAjustes) {
      sectionTitle("Ajustes de Precios");
      drawTable(
        ["Tipo de acción", "% Ajuste", "Valor ajuste"],
        [[aj.tipoAccion || "—", `${aj.porcentajeAjuste || 0}%`, money(aj.valorAjuste || 0)]],
        [180, 110, 116]
      );
    }

    // ── Bloque TOTAL destacado ───────────────────────────────
    ensureSpace(70);
    doc.moveDown(0.5);
    const totalBoxY = doc.y;
    const totalBoxW = CONTENT_W;

    doc.roundedRect(CONTENT_X, totalBoxY, totalBoxW, 52, 8).fill(C.verde);
    doc.rect(CONTENT_X, totalBoxY + 26, totalBoxW, 26).fill(C.verde);   // aplana bordes inf

    doc.fontSize(9).fillColor(C.verdePale).font("Helvetica")
      .text("TOTAL DE LA COTIZACIÓN", CONTENT_X + 16, totalBoxY + 9, { width: totalBoxW - 32, align: "left" });

    doc.fontSize(20).fillColor(C.blanco).font("Helvetica-Bold")
      .text(money(quote.total || 0), CONTENT_X + 16, totalBoxY + 22, { width: totalBoxW - 32, align: "right" });

    doc.fontSize(7.5).fillColor(C.acento).font("Helvetica")
      .text("Precios en MXN • Sin IVA", CONTENT_X + 16, totalBoxY + 42, { width: totalBoxW - 32, align: "right" });

    doc.y = totalBoxY + 62;
    resetX();
    doc.moveDown(1);

    // ─────────────────────────────────────────────────────────
    // TÉRMINOS Y CONDICIONES
    // ─────────────────────────────────────────────────────────
    sectionTitle("Términos y Condiciones");

    const terminos = [
      "La celebración del presente instrumento es vinculante y surtirá plenos efectos en términos del Código Civil para el Estado de Querétaro y su correlativo en el orden federal, para la empresa que se describe en la carátula, a partir de la firma de autorización.",
      'No obstante lo anterior, en caso de que, a criterio de Medios Informativos de Querétaro, S.A. de C.V. ("Publimetro Querétaro"), considere necesario celebrar un contrato en términos de la Ley para la Transparencia, Prevención y Combate de Prácticas Indebidas en Materia de Contratación de Publicidad, la empresa se obliga a proporcionar todos los documentos solicitados y a firmar dicho contrato.',
      "La empresa será en todo momento responsable de hacer llegar a Publimetro Querétaro el diseño con las especificaciones requeridas. Cualquier diseño deberá entregarse con al menos 2 días de anticipación. Para emergencias, el diseño deberá llegar antes de las 4:30 p.m. del día anterior.",
      "En caso de que Publimetro Querétaro realice los diseños, éstos solo podrán publicarse en sus medios. La empresa podrá solicitar máximo 2 cambios importantes y 3 cambios sencillos por diseño.",
      "La empresa será responsable del contenido que solicite publicar. Publimetro Querétaro se reserva el derecho de no publicar o interrumpir cualquier publicación que vulnere las normas y buenas costumbres en México.",
      "Para todo lo relativo a interpretación y cumplimiento, las Partes se someten a los tribunales competentes en la Ciudad de Querétaro, renunciando a cualquier otro fuero.",
      "El presente documento se firma de conformidad en el lugar y fecha manifestado en la carátula.",
    ];

    terminos.forEach((t) => {
      ensureSpace(25);
      doc.fontSize(7).fillColor(C.grisOscuro).font("Helvetica")
        .text(t, CONTENT_X, doc.y, { width: CONTENT_W, align: "justify", lineGap: 1 });
      doc.moveDown(0.6);
      resetX();
    });

    // ─────────────────────────────────────────────────────────
    // SECCIÓN DE FIRMAS
    // ─────────────────────────────────────────────────────────
    ensureSpace(200);
    doc.moveDown(1);

    sectionTitle("Autorización y Firmas");
    doc.moveDown(0.5);

    const firmaBoxW = (CONTENT_W - 20) / 2;
    const firmaBoxH = 90;
    const firmaY = doc.y;

    // Caja izquierda — Publimetro
    doc.roundedRect(CONTENT_X, firmaY, firmaBoxW, firmaBoxH, 6)
      .strokeColor(C.grisLinea).lineWidth(1).stroke();
    doc.roundedRect(CONTENT_X, firmaY, firmaBoxW, 20, 6).fill(C.verde);
    doc.rect(CONTENT_X, firmaY + 10, firmaBoxW, 10).fill(C.verde);   // aplana parte baja del header

    doc.fontSize(7.5).fillColor(C.blanco).font("Helvetica-Bold")
      .text("PUBLIMETRO QUERÉTARO", CONTENT_X + 8, firmaY + 5, { width: firmaBoxW - 16 });

    doc.fontSize(7.5).fillColor(C.grisMedio).font("Helvetica")
      .text("Nombre:", CONTENT_X + 8, firmaY + 28, { width: firmaBoxW - 16 });
    doc.moveTo(CONTENT_X + 55, firmaY + 38).lineTo(CONTENT_X + firmaBoxW - 12, firmaY + 38)
      .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

    doc.fontSize(7.5).fillColor(C.grisMedio)
      .text("Firma:", CONTENT_X + 8, firmaY + 55, { width: firmaBoxW - 16 });
    doc.moveTo(CONTENT_X + 55, firmaY + 78).lineTo(CONTENT_X + firmaBoxW - 12, firmaY + 78)
      .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

    // Caja derecha — Cliente
    const firmaRX = CONTENT_X + firmaBoxW + 20;
    doc.roundedRect(firmaRX, firmaY, firmaBoxW, firmaBoxH, 6)
      .strokeColor(C.grisLinea).lineWidth(1).stroke();
    doc.roundedRect(firmaRX, firmaY, firmaBoxW, 20, 6).fill(C.verde);
    doc.rect(firmaRX, firmaY + 10, firmaBoxW, 10).fill(C.verde);

    const clientName2 = quote.client?.nombreComercial || "CLIENTE";
    doc.fontSize(7.5).fillColor(C.blanco).font("Helvetica-Bold")
      .text(clientName2.toUpperCase().substring(0, 30), firmaRX + 8, firmaY + 5, { width: firmaBoxW - 16 });

    doc.fontSize(7.5).fillColor(C.grisMedio).font("Helvetica")
      .text("Nombre:", firmaRX + 8, firmaY + 28, { width: firmaBoxW - 16 });
    doc.moveTo(firmaRX + 55, firmaY + 38).lineTo(firmaRX + firmaBoxW - 12, firmaY + 38)
      .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

    doc.fontSize(7.5).fillColor(C.grisMedio)
      .text("Firma:", firmaRX + 8, firmaY + 55, { width: firmaBoxW - 16 });
    doc.moveTo(firmaRX + 55, firmaY + 78).lineTo(firmaRX + firmaBoxW - 12, firmaY + 78)
      .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

    doc.y = firmaY + firmaBoxH + 20;
    resetX();

    // ─────────────────────────────────────────────────────────
    // FOOTER DE TODAS LAS PÁGINAS (se dibuja al finalizar)
    // ─────────────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
    const drawFooter = () => {
      const footerY = PH - 58;
      // Línea superior del footer
      doc.moveTo(CONTENT_X, footerY)
        .lineTo(PW - 28, footerY)
        .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

      doc.fontSize(7).fillColor(C.grisMedio).font("Helvetica")
        .text(
          "Esta cotización es confidencial y para uso exclusivo del cliente destinatario. Los precios están sujetos a cambios sin previo aviso.",
          CONTENT_X, footerY + 8,
          { width: CONTENT_W - 60, lineBreak: true }
        );

      // Número de página
      doc.fontSize(7).fillColor(C.verde).font("Helvetica-Bold")
        .text(`Cotización #${String(quote.folio || "—").padStart(4, "0")}`,
          CONTENT_X, footerY + 8,
          { width: CONTENT_W, align: "right" }
        );
    };

    // Dibuja footer en la página actual antes de cerrar
    drawFooter();

    doc.end();

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error generando PDF");
  }
});

module.exports = router;