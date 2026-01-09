// src/pages/quotes/QuoteDetailPage.jsx

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getQuoteById, deleteQuote } from "../../services/quoteService";
import { createSaleFromQuote } from "../../services/salesService";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [dirigidoA, setDirigidoA] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);


  useEffect(() => {
    async function load() {
      try {
        const res = await getQuoteById(id);
        setQuote(res.data);
        setDirigidoA(res.data?.client?.nombreComercial || "");
      } catch (error) {
        console.error("Error cargando cotización:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      : "—";

  const handleCreateSale = async () => {
    try {
      const res = await createSaleFromQuote(quote._id);
      navigate(`/sales/${res.data.sale._id}`);
    } catch (error) {
      alert(error.response?.data?.message || "Error al crear venta");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuote(quote._id);
      navigate("/quotes");
    } catch (error) {
      alert(
        error.response?.data?.message || "Error al eliminar la cotización"
      );
    }
  };

  const handleOpenPdfDialog = () => {
    if (!quote?._id) return;
    setOpenPdfDialog(true);
  };
  const handleDownloadPdf = async () => {
    if (!quote?._id) return;

    try {
      setPdfLoading(true);

      const params = {};
      if (dirigidoA?.trim()) params.dirigidoA = dirigidoA.trim();

      const res = await api.get(`/pdf/quote/${quote._id}`, {
        params,
        responseType: "blob",
      });

      const file = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);

      // abrir en nueva pestaña
      window.open(url, "_blank");

      // opcional: si quieres descargar directo, usa <a download>
      // const a = document.createElement("a");
      // a.href = url;
      // a.download = `cotizacion-${quote.folio}.pdf`;
      // a.click();

      setOpenPdfDialog(false);
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert(error.response?.data || "No se pudo generar el PDF");
    } finally {
      setPdfLoading(false);
    }
  };


  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Cargando cotización...</Typography>
      </Box>
    );
  }

  if (!quote) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          No se pudo cargar la información de la cotización.
        </Typography>
      </Box>
    );
  }

  const statusColorMap = {
    aprobado: "success",
    pendiente: "warning",
    rechazado: "error",
  };

  const statusLabelMap = {
    aprobado: "Aprobada",
    pendiente: "Pendiente",
    rechazado: "Rechazada",
  };

  const statusColor = statusColorMap[quote.status] || "default";
  const statusLabel =
    statusLabelMap[quote.status] || (quote.status || "Desconocido");

  const ajustes = quote.ajustesPrecios || {};
  const tieneAjustes =
    ajustes &&
    ajustes.tipoAccion &&
    ajustes.tipoAccion !== "Ninguno" &&
    ((ajustes.porcentajeAjuste || 0) !== 0 ||
      (ajustes.valorAjuste || 0) !== 0);

  const InfoItem = ({ label, value }) => (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600} sx={{ mt: 0.3 }}>
        {value ?? "—"}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER + ACCIONES */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={4}
        gap={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Cotización #{quote.folio}
        </Typography>

        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          justifyContent="flex-end"
        >
          <Button
            variant="outlined"
            component={RouterLink}
            to="/quotes"
          >
            Volver
          </Button>

          <Button variant="outlined" onClick={handleOpenPdfDialog}>
            Imprimir PDF
          </Button>


          {quote.status === "aprobado" && (
            <Button
              variant="contained"
              color="success"
              onClick={handleCreateSale}
            >
              Crear venta desde esta cotización
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to={`/quotes/${quote._id}/edit`}
          >
            Editar
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDeleteDialog(true)}
          >
            Eliminar
          </Button>
        </Stack>
      </Stack>

      {/* RESUMEN PRINCIPAL */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* FILA 1 */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Cliente
              </Typography>
              <Typography variant="h6" fontWeight={700} mt={0.5}>
                {quote.client?.nombreComercial || "—"}
              </Typography>

              {quote.client?.razonSocial && (
                <Typography mt={0.5}>Razón social: {quote.client.razonSocial}</Typography>
              )}
              {quote.client?.rfc && <Typography mt={0.5}>RFC: {quote.client.rfc}</Typography>}
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem
                label="Total"
                value={
                  "$" +
                  (quote.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) ||
                    "0.00")
                }
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Stack direction="row" alignItems="center" sx={{ mt: 0.7 }}>
                <Chip label={statusLabel} color={statusColor} sx={{ fontWeight: 700 }} />
              </Stack>
            </Grid>

            {/* DIVISOR */}
            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* FILA 2 (datos) */}
            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Creada" value={formatDate(quote.createdAt)} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Última actualización" value={formatDate(quote.updatedAt)} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Folio interno" value={quote.folio} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Estado cliente" value={quote.estadoCliente || "—"} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Forma de pago" value={quote.formaPago || "—"} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem label="Uso CFDI" value={quote.usoCFDI || "—"} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <InfoItem
                label="Estado de facturación"
                value={quote.facturacionEstado === "facturado" ? "Facturado" : "Por facturar"}
              />
            </Grid>

            {/* FILA 3 */}
            <Grid item xs={12} md={6}>
              <InfoItem label="Creada por" value={quote.createdBy?.name || "—"} />
              {quote.createdBy?.email && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {quote.createdBy.email}
                </Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <InfoItem
                label="Aprobada / revisada por"
                value={quote.approvedBy?.name || "—"}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {quote.approvedAt ? `El ${formatDate(quote.approvedAt)}` : ""}
              </Typography>
            </Grid>
          </Grid>

        </CardContent>
      </Card>

      {/* DURACIÓN */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Duración
        </Typography>
        {quote.duracion ? (
          <Card>
            <CardContent>
              <Typography>{quote.duracion}</Typography>
            </CardContent>
          </Card>
        ) : (
          <Typography color="text.secondary">
            No se capturó duración para esta cotización.
          </Typography>
        )}
      </Box>

      {/* TARIFAS */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Tarifas
        </Typography>

        {!Array.isArray(quote.tarifas) || quote.tarifas.length === 0 ? (
          <Typography color="text.secondary">
            No hay tarifas registradas.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#008F4F" }}>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    Formato
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    Periodicidad
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    Costo
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    Fechas
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    Total línea
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {quote.tarifas.map((t, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{t.formato || "—"}</TableCell>
                    <TableCell>{t.periodicidad || "—"}</TableCell>
                    <TableCell>
                      $
                      {t.costo?.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      }) || "0.00"}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(t.fechas) && t.fechas.length > 0
                        ? t.fechas.map((f) => formatDate(f)).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      $
                      {(t.totalLinea || t.totaLinea || 0).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ACTIVACIÓN */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Activación
        </Typography>

        {!quote.activacion?.activo ? (
          <Typography color="text.secondary">
            No hay activación para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tipo
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.activacion?.tipo || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cantidad
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.activacion?.cantidad ?? 0}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Costo
                  </Typography>
                  <Typography mt={0.5}>
                    $
                    {(quote.activacion?.costo || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fechas
                  </Typography>
                  <Typography mt={0.5}>
                    {Array.isArray(quote.activacion?.fechas) &&
                      quote.activacion.fechas.length > 0
                      ? quote.activacion.fechas
                        .map((f) => formatDate(f))
                        .join(", ")
                      : "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    mb={0.5}
                  >
                    Puntos de distribución
                  </Typography>
                  <Typography>
                    {quote.activacion?.puntosDistribucion || "N/A"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* DESARROLLO INFORMATIVO */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Desarrollo informativo
        </Typography>

        {!quote.desarrolloInformativo?.activo ? (
          <Typography color="text.secondary">
            No hay desarrollo informativo para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fecha
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.desarrolloInformativo?.fecha
                      ? formatDate(quote.desarrolloInformativo.fecha)
                      : "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Formato
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.desarrolloInformativo?.formato || "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* POSTEO REDES SOCIALES */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Posteo redes sociales
        </Typography>

        {!quote.posteoRedesSociales?.activo ? (
          <Typography color="text.secondary">
            No hay posteos en redes sociales para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cantidad de posteos
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.posteoRedesSociales?.cantidad ?? 0}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fechas
                  </Typography>
                  <Typography mt={0.5}>
                    {Array.isArray(quote.posteoRedesSociales?.fechas) &&
                      quote.posteoRedesSociales.fechas.length > 0
                      ? quote.posteoRedesSociales.fechas
                        .map((f) => formatDate(f))
                        .join(", ")
                      : "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* FAJILLAS */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Fajillas
        </Typography>

        {!quote.fajillas?.activo ? (
          <Typography color="text.secondary">
            No hay fajillas para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cantidad
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.fajillas?.cantidad ?? 0}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Precio
                  </Typography>
                  <Typography mt={0.5}>
                    $
                    {(quote.fajillas?.precio || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Puntos de distribución
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.fajillas?.puntosDistribucion || "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* INTERCAMBIO */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Intercambio
        </Typography>

        {!quote.intercambio?.activo ? (
          <Typography color="text.secondary">
            No hay intercambio para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    % Efectivo
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.intercambio?.porcentajeEfectivo ?? 0}%
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    % Especie
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.intercambio?.porcentajeEspecie ?? 0}%
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ofrecemos
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.intercambio?.ofrecemos || "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nos ofrecen
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.intercambio?.nosOfrecen || "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* CORTESÍAS */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Cortesías
        </Typography>

        {!quote.cortesias?.activo ? (
          <Typography color="text.secondary">
            No hay cortesías para esta cotización.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cantidad
                  </Typography>
                  <Typography mt={0.5}>
                    {quote.cortesias?.cantidad ?? 0}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={9}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fechas
                  </Typography>
                  <Typography mt={0.5}>
                    {Array.isArray(quote.cortesias?.fechas) &&
                      quote.cortesias.fechas.length > 0
                      ? quote.cortesias.fechas
                        .map((f) => formatDate(f))
                        .join(", ")
                      : "—"}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* AJUSTES DE PRECIOS */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Ajustes de precios
        </Typography>

        {!tieneAjustes ? (
          <Typography color="text.secondary">
            Sin ajustes registrados.
          </Typography>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tipo de acción
                  </Typography>
                  <Typography mt={0.5}>
                    {ajustes.tipoAccion || "Ninguno"}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    % Ajuste
                  </Typography>
                  <Typography mt={0.5}>
                    {ajustes.porcentajeAjuste || 0}%
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Valor ajuste
                  </Typography>
                  <Typography mt={0.5}>
                    $
                    {(ajustes.valorAjuste || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>

      <Divider sx={{ mt: 4 }} />

      {/* DIALOG ELIMINAR COTIZACIÓN */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1.4rem", fontWeight: 700, pb: 1 }}>
          Eliminar cotización
        </DialogTitle>

        <DialogContent sx={{ pb: 2 }}>
          <Typography sx={{ fontSize: "1rem", color: "grey.700" }}>
            ¿Seguro que deseas eliminar esta cotización? Esta acción no se
            puede deshacer.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      {/* DIALOG PDF */}
      <Dialog
        open={openPdfDialog}
        onClose={() => setOpenPdfDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1.5 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Generar PDF de cotización
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Puedes editar a quién va dirigida la cotización (por ejemplo: el dueño o un contacto específico).
          </Typography>

          <TextField
            fullWidth
            label="Dirigido a"
            value={dirigidoA}
            onChange={(e) => setDirigidoA(e.target.value)}
            placeholder="Ej. Carlos Pérez (Director General)"
            size="small"
            autoFocus
          />
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenPdfDialog(false)} disabled={pdfLoading}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            sx={{ fontWeight: 700 }}
          >
            {pdfLoading ? "Generando..." : "Abrir PDF"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
