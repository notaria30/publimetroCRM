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
  dark: "#0D1F17",   // texto/oscuro
  darkMid: "#163829",
  grisOscuro: "#2D2D2D",   // texto principal
  grisMedio: "#6B7280",   // etiquetas / secundario
  grisClaro: "#F3F4F6",   // fondos alternos tabla / etiquetas de celda
  grisLinea: "#E5E7EB",   // separadores / bordes
  blanco: "#FFFFFF",
  negro: "#111111",
  acento: "#4ADE80",   // verde neón para highlights
};

// ─────────────────────────────────────────────────────────────
// NÚMERO A LETRAS (pesos MXN)
// ─────────────────────────────────────────────────────────────
const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DIECIS = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
const VEINTIS = { 0: "VEINTE", 1: "VEINTIUNO", 2: "VEINTIDÓS", 3: "VEINTITRÉS", 4: "VEINTICUATRO", 5: "VEINTICINCO", 6: "VEINTISÉIS", 7: "VEINTISIETE", 8: "VEINTIOCHO", 9: "VEINTINUEVE" };
const DECENAS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function convertirGrupo(n) {
  if (n === 100) return "CIEN";
  let str = "";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) str += CENTENAS[c] + " ";
  if (resto > 0) {
    if (resto < 10) str += UNIDADES[resto];
    else if (resto < 20) str += DIECIS[resto - 10];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d === 2) str += VEINTIS[u];
      else {
        str += DECENAS[d];
        if (u > 0) str += " Y " + UNIDADES[u];
      }
    }
  }
  return str.trim();
}

function convertirNumero(n) {
  n = Math.floor(n);
  if (n === 0) return "CERO";
  if (n < 1000) return convertirGrupo(n);

  let str = "";
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  if (millones > 0) str += millones === 1 ? "UN MILLÓN " : convertirGrupo(millones) + " MILLONES ";
  if (miles > 0) str += miles === 1 ? "MIL " : convertirGrupo(miles) + " MIL ";
  if (resto > 0) str += convertirGrupo(resto);

  return str.trim();
}

function totalEnLetras(amount) {
  const val = Number(amount) || 0;
  const pesosInt = Math.floor(val + 1e-6);
  const centavos = Math.round((val - pesosInt) * 100);
  return `${convertirNumero(pesosInt)} PESOS ${String(centavos).padStart(2, "0")}/100 M.N.`;
}

router.get("/quote/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("client", "nombreComercial razonSocial rfc direccion")
      .populate("createdBy", "name email role");

    if (!quote) return res.status(404).send("Cotización no encontrada");

    if (req.user.role === "WORKER") {
      if (String(quote.createdBy?._id || quote.createdBy) !== String(req.user._id)) {
        return res.status(403).send("No tienes permiso para ver esta cotización");
      }
    }

    const doc = new PDFDocument({ margin: 0, size: "LETTER", bufferPages: true });

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
    const MARGIN = 32;
    const CONTENT_X = MARGIN;
    const CONTENT_W = PW - MARGIN * 2;
    const MARGIN_BOTTOM = 64;
    const logoPath = path.join(__dirname, "../../public/logopublimetro.png");
    const folioStr = `#${String(quote.folio || "—").padStart(4, "0")}`;

    const money = (n) =>
      (Number(n) || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

    const fmtDate = (d) => {
      if (!d) return "—";
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("es-MX");
    };

    // Parseo de fecha "solo día" en UTC para evitar corrimientos de zona horaria
    const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const parseFechaUTC = (d) => {
      if (!d) return null;
      const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    };
    const fmtDiaSemana = (d) => {
      const dt = parseFechaUTC(d);
      return dt ? DIAS_SEMANA[dt.getUTCDay()] : "—";
    };
    const fmtFechaTabla = (d) => {
      const dt = parseFechaUTC(d);
      return dt
        ? dt.toLocaleDateString("es-MX", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })
        : "—";
    };

    const fmtDur = (d) => {
      const n = Number(d) || 0;
      if (n) return `${n} ${n === 1 ? "mes" : "meses"}`;
      return d || "—";
    };

    const getCostosActivacion = (act) => ({
      costoActivacion: Number(act?.costoActivacion ?? act?.costo ?? 0) || 0,
      costoImpresion: Number(act?.costoImpresion ?? 0) || 0,
    });

    const clientDireccion = (c) => {
      const d = c?.direccion || {};
      const parts = [d.calleNumero, d.colonia, d.ciudad, d.estado, d.cp ? `C.P. ${d.cp}` : null].filter(Boolean);
      return parts.length ? parts.join(", ") : "—";
    };

    const resetX = () => { doc.x = CONTENT_X; };

    // ─────────────────────────────────────────────────────────
    // FOOTER (se dibuja al final de cada página)
    // ─────────────────────────────────────────────────────────
    const drawFooter = () => {
      const footerY = PH - 46;
      doc.rect(0, PH - 6, PW, 6).fill(C.verde);
      doc.moveTo(CONTENT_X, footerY).lineTo(PW - MARGIN, footerY)
        .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

      doc.fontSize(7).fillColor(C.grisMedio).font("Helvetica")
        .text(
          "Esta cotización es confidencial y para uso exclusivo del cliente destinatario. Los precios están sujetos a cambios sin previo aviso.",
          CONTENT_X, footerY + 8,
          { width: CONTENT_W - 130, lineBreak: true }
        );

      doc.fontSize(7).fillColor(C.verde).font("Helvetica-Bold")
        .text(`Cotización ${folioStr}`, CONTENT_X, footerY + 8, { width: CONTENT_W, align: "right" });
    };

    // ─────────────────────────────────────────────────────────
    // ENCABEZADO DE PÁGINAS DE CONTINUACIÓN
    // ─────────────────────────────────────────────────────────
    const drawContinuationHeader = () => {
      doc.rect(0, 0, PW, 44).fill(C.verde);
      try {
        doc.image(logoPath, MARGIN, 8, { width: 92 });
      } catch {
        doc.fontSize(13).fillColor(C.blanco).font("Helvetica-Bold").text("PUBLIMETRO", MARGIN, 14);
      }
      doc.fontSize(9).fillColor(C.blanco).font("Helvetica-Bold")
        .text(`Cotización ${folioStr} — continuación`, MARGIN, 17, { width: CONTENT_W, align: "right" });

      doc.y = 60;
      resetX();
    };

    // Verifica espacio y agrega página si es necesario
    const ensureSpace = (needed = 90) => {
      if (doc.y + needed > PH - MARGIN_BOTTOM) {
        drawFooter();
        doc.addPage();
        drawContinuationHeader();
      }
    };

    // ─────────────────────────────────────────────────────────
    // ENCABEZADO PRINCIPAL (solo primera página)
    // ─────────────────────────────────────────────────────────
    const drawMainHeader = () => {
      try {
        doc.image(logoPath, CONTENT_X, 26, { width: 150 });
      } catch {
        doc.roundedRect(CONTENT_X, 26, 150, 46, 4).fill(C.verde);
        doc.fontSize(17).fillColor(C.blanco).font("Helvetica-Bold")
          .text("PUBLIMETRO", CONTENT_X + 10, 42, { width: 130, lineBreak: false });
      }

      const rightX = CONTENT_X + 210;
      const rightW = PW - MARGIN - rightX;

      doc.fontSize(22).fillColor(C.verde).font("Helvetica-Bold")
        .text("Cotización", rightX, 26, { width: rightW, align: "right", lineBreak: false });

      doc.fontSize(8.5).fillColor(C.grisOscuro).font("Helvetica-Bold")
        .text("Publimetro Querétaro", rightX, 52, { width: rightW, align: "right", lineBreak: false });

      doc.fontSize(7.5).fillColor(C.grisMedio).font("Helvetica")
        .text("Av. de la Salvación 791-desp. 103, Balcones Coloniales\n76147 Querétaro, Qro. México",
          rightX, 63, { width: rightW, align: "right" });

      // ── Badge folio / fecha ──
      const badgeY = 98;
      const badgeW = 240;
      const badgeX = PW - MARGIN - badgeW;
      const badgeH = 40;
      const halfW = badgeW / 2;

      doc.rect(badgeX, badgeY, halfW, badgeH).fill(C.grisClaro);
      doc.rect(badgeX + halfW, badgeY, halfW, badgeH).fill(C.verdePale);
      doc.rect(badgeX, badgeY, badgeW, badgeH).strokeColor(C.grisLinea).lineWidth(0.8).stroke();
      doc.moveTo(badgeX + halfW, badgeY).lineTo(badgeX + halfW, badgeY + badgeH)
        .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

      doc.fontSize(6.5).fillColor(C.grisMedio).font("Helvetica-Bold")
        .text("NÚMERO DE COTIZACIÓN", badgeX + 10, badgeY + 7, { width: halfW - 20, lineBreak: false });
      doc.fontSize(14).fillColor(C.negro).font("Helvetica-Bold")
        .text(folioStr, badgeX + 10, badgeY + 18, { width: halfW - 20, lineBreak: false });

      doc.fontSize(6.5).fillColor(C.verde).font("Helvetica-Bold")
        .text("FECHA DE EMISIÓN", badgeX + halfW + 10, badgeY + 7, { width: halfW - 20, lineBreak: false });
      doc.fontSize(10.5).fillColor(C.negro).font("Helvetica-Bold")
        .text(new Date().toLocaleDateString("es-MX"), badgeX + halfW + 10, badgeY + 20, { width: halfW - 20, lineBreak: false });

      doc.y = badgeY + badgeH + 16;
      resetX();

      doc.moveTo(CONTENT_X, doc.y).lineTo(PW - MARGIN, doc.y)
        .strokeColor(C.verde).lineWidth(1.5).stroke();
      doc.circle(CONTENT_X, doc.y, 3).fill(C.verde);

      doc.y += 14;
      resetX();
    };

    // ─────────────────────────────────────────────────────────
    // SECTION TITLE (pill)
    // ─────────────────────────────────────────────────────────
    const sectionTitle = (title) => {
      ensureSpace(50);
      doc.moveDown(0.4);

      const ty = doc.y;
      doc.roundedRect(CONTENT_X, ty, CONTENT_W, 24, 4).fill(C.verdePale);
      doc.rect(CONTENT_X, ty, 4, 24).fill(C.verde);

      doc.fontSize(11).fillColor(C.verde).font("Helvetica-Bold")
        .text(title, CONTENT_X + 14, ty + 6, { width: CONTENT_W - 20, lineBreak: false });

      doc.y = ty + 32;
      resetX();
    };

    // ─────────────────────────────────────────────────────────
    // FORM ROW — celdas con etiqueta arriba / valor abajo (estilo formulario)
    // ─────────────────────────────────────────────────────────
    const formRow = (cells) => {
      const labelFS = 6.5;
      const valueFS = 8.5;
      const totalWeight = cells.reduce((s, c) => s + (c.weight || 1), 0);
      const widths = cells.map((c) => (CONTENT_W * (c.weight || 1)) / totalWeight);

      let rowH = 36;
      cells.forEach((c, i) => {
        const val = c.value === null || c.value === undefined || c.value === "" ? "—" : String(c.value);
        const h = doc.fontSize(valueFS).heightOfString(val, { width: widths[i] - 12 });
        rowH = Math.max(rowH, h + 24);
      });

      ensureSpace(rowH + 4);
      const y = doc.y;
      let x = CONTENT_X;

      cells.forEach((c, i) => {
        const w = widths[i];
        doc.rect(x, y, w, rowH).strokeColor(C.grisLinea).lineWidth(0.6).stroke();
        doc.rect(x, y, w, 14).fill(C.grisClaro);

        doc.fontSize(labelFS).fillColor(C.grisMedio).font("Helvetica-Bold")
          .text(String(c.label).toUpperCase(), x + 7, y + 4, { width: w - 14, lineBreak: false, ellipsis: true });

        const val = c.value === null || c.value === undefined || c.value === "" ? "—" : String(c.value);
        doc.fontSize(valueFS).fillColor(C.negro).font("Helvetica-Bold")
          .text(val, x + 7, y + 20, { width: w - 14, lineBreak: true });

        x += w;
      });

      doc.y = y + rowH;
      resetX();
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
        doc.roundedRect(startX, ty, totalW, headerH, 5).fill(headerBg);
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

      ensureSpace(headerH + minRowH + 10);
      let y = drawHeader(doc.y);

      doc.fontSize(bodyFontSize).fillColor(C.negro).font("Helvetica");

      rows.forEach((row, ri) => {
        let rowH = minRowH;
        row.forEach((cell, ci) => {
          const txt = cell == null || cell === "" ? "—" : String(cell);
          const h = doc.heightOfString(txt, { width: colWidths[ci] - cellPadding * 2 });
          rowH = Math.max(rowH, h + cellPadding * 2);
        });

        if (y + rowH > PH - MARGIN_BOTTOM) {
          drawFooter();
          doc.addPage();
          drawContinuationHeader();
          y = drawHeader(doc.y);
        }

        if (ri % 2 === 1) {
          doc.rect(startX, y, totalW, rowH).fill(altRowBg);
        }

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

        y += rowH;
        doc.moveTo(startX, y).lineTo(startX + totalW, y)
          .strokeColor(lineColor).lineWidth(0.5).stroke();
      });

      doc.y = y + 8;
      resetX();
    };

    // ─────────────────────────────────────────────────────────
    // ── INICIO DEL DOCUMENTO ─────────────────────────────────
    // ─────────────────────────────────────────────────────────
    drawMainHeader();

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
    doc.moveDown(0.8);
    resetX();

    // ── Ficha del cliente (estilo formulario) ────────────────
    formRow([{ label: "Cliente (Nombre Comercial):", value: quote.client?.nombreComercial, weight: 1 }]);
    formRow([
      { label: "Razón Social:", value: quote.client?.razonSocial, weight: 1 },
      { label: "RFC:", value: quote.client?.rfc, weight: 1 },
      { label: "Domicilio Comercial:", value: clientDireccion(quote.client), weight: 2 },
    ]);
    formRow([
      { label: "Teléfono:", value: quote.client?.direccion?.telefono, weight: 1 },
      { label: "Forma de Pago:", value: quote.formaPago, weight: 1 },
      { label: "Método de Pago:", value: quote.metodoPago, weight: 1 },
      { label: "Duración:", value: fmtDur(quote.duracion), weight: 1 },
    ]);
    formRow([
      { label: "Vendedor:", value: quote.createdBy?.name, weight: 1 },
      { label: "Correo de contacto:", value: quote.createdBy?.email, weight: 1.3 },
      { label: "Uso de CFDI:", value: quote.usoCFDI, weight: 0.8 },
      { label: "Estado de Facturación:", value: quote.facturacionEstado === "facturado" ? "Facturado" : "Por facturar", weight: 1 },
    ]);
    doc.moveDown(0.6);
    resetX();

    // ── Tabla de tarifas ─────────────────────────────────────
    sectionTitle("Cotización de Servicios — Tarifas");

    const tarifas = quote.tarifas || [];
    if (tarifas.length) {
      const headers = ["Cant.", "Formato", "Fecha de publicación", "Día", "Precio Unitario", "Subtotal"];
      const colWidths = [42, 125, 120, 90, 85, 86]; // suma = 548 = CONTENT_W

      // Una fila por cada publicación (fecha). Si faltan fechas, se muestra "Por definir".
      const rows = [];
      tarifas.forEach((t) => {
        const costo = Number(t.costo) || 0;
        const fechas = (t.fechas || []).filter(Boolean);
        const periodicidad = Number(t.periodicidad) || 0;
        const qty = periodicidad > 0 ? periodicidad : Math.max(1, fechas.length);
        for (let i = 0; i < qty; i++) {
          rows.push([
            "1",
            t.formato || "—",
            fechas[i] ? fmtFechaTabla(fechas[i]) : "Por definir",
            fechas[i] ? fmtDiaSemana(fechas[i]) : "—",
            money(costo),
            money(costo),
          ]);
        }
      });

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
          [70, 45, 65, 80, 80, 90, 118],
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
        [200, 348]
      );
    }

    // ── Posteo redes sociales ────────────────────────────────
    if (quote.posteoRedesSociales?.activo) {
      sectionTitle("Posteo en Redes Sociales");
      const fechasPost = (quote.posteoRedesSociales?.fechas || []).filter(Boolean).map(fmtDate).join(", ");
      drawTable(
        ["Cantidad", "Fechas"],
        [[String(quote.posteoRedesSociales?.cantidad ?? 0), fechasPost || "—"]],
        [140, 408]
      );
    }

    // ── Intercambio ──────────────────────────────────────────
    if (quote.intercambio?.activo) {
      sectionTitle("Intercambio");
      drawTable(
        ["% Efectivo", "% Especie"],
        [[`${quote.intercambio?.porcentajeEfectivo ?? 0}%`, `${quote.intercambio?.porcentajeEspecie ?? 0}%`]],
        [220, 328]
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
        [120, 180, 248]
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
        [220, 150, 178]
      );
    }

    // ── Observaciones ─────────────────────────────────────────
    if (quote.presentation && quote.presentation.trim()) {
      sectionTitle("Observaciones");
      const obsH = doc.fontSize(8.5).heightOfString(quote.presentation, { width: CONTENT_W - 24 }) + 20;
      ensureSpace(obsH + 10);
      const oy = doc.y;
      doc.rect(CONTENT_X, oy, CONTENT_W, obsH).strokeColor(C.grisLinea).lineWidth(0.6).stroke();
      doc.fontSize(8.5).fillColor(C.grisOscuro).font("Helvetica")
        .text(quote.presentation, CONTENT_X + 12, oy + 10, { width: CONTENT_W - 24 });
      doc.y = oy + obsH + 12;
      resetX();
    }

    // ─────────────────────────────────────────────────────────
    // RESUMEN FINANCIERO
    // ─────────────────────────────────────────────────────────
    const subtotalTarifas = tarifas.reduce((s, t) => s + (Number(t.totalLinea) || 0), 0);
    const subtotalActivaciones = activas.reduce((s, a) => s + (Number(a.total) || 0), 0);
    const subtotalGeneral = subtotalTarifas + subtotalActivaciones;

    // IVA — se aplica únicamente en el PDF. quote.total es la base gravable (subtotal).
    const IVA_RATE = 0.16;
    const baseGravable = Number(quote.total) || 0;
    const ivaMonto = Number((baseGravable * IVA_RATE).toFixed(2));
    const totalConIVA = Number((baseGravable + ivaMonto).toFixed(2));

    const summaryW = 260;
    const summaryX = PW - MARGIN - summaryW;
    const rowH = 20;
    const bigRowH = 40;
    const boxH = 8 + rowH + (tieneAjustes ? rowH : 0) + rowH + 12 + bigRowH + 8;

    ensureSpace(boxH + 20);
    doc.moveDown(0.4);

    let sy = doc.y;
    const boxTop = sy;

    const summaryRow = (label, value, opts = {}) => {
      const { big = false, bg = null } = opts;
      const h = big ? bigRowH : rowH;
      if (bg) doc.rect(summaryX, sy, summaryW, h).fill(bg);

      doc.fontSize(big ? 8.5 : 8.5).fillColor(bg ? C.verdePale : C.grisMedio).font("Helvetica-Bold")
        .text(label, summaryX + 12, sy + (big ? 8 : 5), { width: summaryW - 24, align: "left", lineBreak: false });

      doc.fontSize(big ? 17 : 9.5).fillColor(bg ? C.blanco : C.negro).font("Helvetica-Bold")
        .text(money(value), summaryX + 12, sy + (big ? 17 : 5), { width: summaryW - 24, align: "right", lineBreak: false });

      sy += h;
    };

    sy += 8;
    summaryRow("Subtotal", subtotalGeneral);
    if (tieneAjustes) {
      summaryRow(aj.tipoAccion === "Reducir" ? "Ajuste (descuento)" : "Ajuste", aj.valorAjuste || 0);
    }
    summaryRow("IVA (16%)", ivaMonto);
    sy += 4;
    doc.moveTo(summaryX + 12, sy).lineTo(summaryX + summaryW - 12, sy)
      .strokeColor(C.grisLinea).lineWidth(0.6).stroke();
    sy += 8;
    summaryRow("TOTAL", totalConIVA, { big: true, bg: C.verde });

    doc.roundedRect(summaryX, boxTop, summaryW, boxH, 6)
      .strokeColor(C.grisLinea).lineWidth(0.8).stroke();

    doc.y = boxTop + boxH + 10;
    resetX();

    // Total con letra
    ensureSpace(40);
    const letraY = doc.y;
    doc.rect(CONTENT_X, letraY, CONTENT_W, 30).fill(C.grisClaro);
    doc.fontSize(6.5).fillColor(C.grisMedio).font("Helvetica-Bold")
      .text("TOTAL CON LETRA", CONTENT_X + 10, letraY + 5, { width: CONTENT_W - 20 });
    doc.fontSize(8.5).fillColor(C.negro).font("Helvetica-Bold")
      .text(totalEnLetras(totalConIVA), CONTENT_X + 10, letraY + 15, { width: CONTENT_W - 20, lineBreak: false });
    doc.y = letraY + 40;
    resetX();

    doc.fontSize(7.5).fillColor(C.grisMedio).font("Helvetica-Oblique")
      .text("Precios en MXN. El total incluye IVA del 16%. Sujetos a disponibilidad de espacio.", CONTENT_X, doc.y);
    doc.moveDown(1);
    resetX();

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
    // SECCIÓN DE FIRMAS — estilo línea + leyenda
    // ─────────────────────────────────────────────────────────
    ensureSpace(160);
    doc.moveDown(0.8);

    sectionTitle("Autorización y Firmas");

    // Espacio en blanco por encima de la línea para que quepa la firma.
    // Si la sección quedó en una página con bastante espacio libre, se deja más aire.
    const firmaRoom = (PH - MARGIN_BOTTOM) - doc.y;
    const firmaGap = Math.max(55, Math.min(140, firmaRoom - 60));
    doc.y += firmaGap;

    const firmas = [
      { titulo: "Cliente / Conducto", sub: "Nombre completo y firma" },
      { titulo: "Vendedor", sub: "Nombre y firma" },
      { titulo: "Gerente de Ventas", sub: "" },
      { titulo: "Crédito y Cobranza", sub: "" },
    ];

    const firmaColW = CONTENT_W / firmas.length;
    const firmaLineY = doc.y;

    firmas.forEach((f, i) => {
      const fx = CONTENT_X + i * firmaColW;
      doc.moveTo(fx + 8, firmaLineY).lineTo(fx + firmaColW - 8, firmaLineY)
        .strokeColor(C.grisOscuro).lineWidth(0.8).stroke();

      doc.fontSize(8).fillColor(C.negro).font("Helvetica-Bold")
        .text(f.titulo, fx, firmaLineY + 6, { width: firmaColW, align: "center" });

      if (f.sub) {
        doc.fontSize(6.5).fillColor(C.grisMedio).font("Helvetica")
          .text(f.sub, fx, firmaLineY + 18, { width: firmaColW, align: "center" });
      }
    });

    doc.y = firmaLineY + 34;
    resetX();

    // Footer de la última página
    drawFooter();

    doc.end();

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error generando PDF");
  }
});

module.exports = router;
