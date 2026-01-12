// src/pages/sales/SalesDetailPage.jsx

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Button,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  TextField,
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { getSaleById, updateSale, addSaleNote } from "../../services/salesService";
import { addSaleTask, completeSaleTask } from "../../services/salesService";
import Checkbox from "@mui/material/Checkbox";


export default function SalesDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  // Etapas oficiales del pipeline
  const STAGES = ["prospeccion", "presentacion", "propuesta", "cierre"];

  useEffect(() => {
    async function load() {
      try {
        const res = await getSaleById(id);
        setSale(res.data);
      } catch (err) {
        console.error("Error cargando venta:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading)
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Cargando venta...</Typography>
      </Box>
    );

  if (!sale)
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">No se encontró la venta.</Typography>
      </Box>
    );

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const formatStageLabel = (s) => (s ? s.replace(/_/g, " ") : "");

  // Colores para chip y pipeline
  const stageColor = {
    prospeccion: "warning",
    presentacion: "info",
    propuesta: "secondary",
    cierre: "success",
  };

  // Probabilidades de cierre por etapa (solo visual)
  const stageProbability = {
    prospeccion: 20,
    presentacion: 40,
    propuesta: 70,
    cierre: 100,
  };

  // Helpers de fechas para KPIs
  const daysBetween = (from) => {
    if (!from) return "—";
    const start = new Date(from);
    const now = new Date();
    const diffMs = now - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const daysSinceCreation = daysBetween(sale.createdAt);
  // Usamos updatedAt como “último cambio de etapa”
  const daysInCurrentStage = daysBetween(sale.updatedAt);
  const probability =
    stageProbability[sale.pipelineStage] ?? stageProbability["prospeccion"];

  // Cambiar etapa del pipeline
  const handleChangeStage = async (newStage) => {
    try {
      const res = await updateSale(id, newStage);
      alert("Etapa actualizada");
      setSale(res.data.updatedSale);
    } catch (err) {
      console.error("Error actualizando etapa:", err);
      alert("Error al actualizar la etapa del pipeline");
    }
  };

  const currentStageIndex = STAGES.indexOf(sale.pipelineStage);

  return (
    <Box sx={{ p: 3 }}>
      {/* ENCABEZADO */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={4}
        gap={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Venta #{sale.folio || sale._id}
        </Typography>

        <Button variant="outlined" component={RouterLink} to="/sales">
          Volver
        </Button>
      </Stack>

      {/* CARD PRINCIPAL / RESUMEN DE LA VENTA */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* Cliente */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Cliente
              </Typography>
              <Typography variant="h6" mt={0.5}>
                {sale.client?.nombreComercial || "—"}
              </Typography>
            </Grid>

            {/* Total cotización */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Total cotización
              </Typography>
              <Typography variant="h6" mt={0.5}>
                {sale.quote
                  ? `$${sale.quote.total?.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`
                  : "Sin cotización"}
              </Typography>
            </Grid>

            {/* Vendedor asignado */}
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Vendedor asignado
              </Typography>
              <Typography variant="h6" mt={0.5}>
                {sale.assignedTo?.name || "—"}
              </Typography>
            </Grid>

            {/* Pipeline actual */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Pipeline actual
              </Typography>
              <Chip
                label={formatStageLabel(sale.pipelineStage)}
                color={stageColor[sale.pipelineStage] || "default"}
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              />
            </Grid>

            {/* Fecha creación */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Fecha de creación
              </Typography>
              <Typography mt={0.5}>{formatDate(sale.createdAt)}</Typography>
            </Grid>

            {/* Última actualización */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Última actualización
              </Typography>
              <Typography mt={0.5}>{formatDate(sale.updatedAt)}</Typography>
            </Grid>

            {/* KPIs rápidos */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Probabilidad de cierre
              </Typography>
              <Typography mt={0.5} fontWeight={700}>
                {probability}%
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Días desde creación
              </Typography>
              <Typography mt={0.5}>{daysSinceCreation}</Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Días en etapa actual
              </Typography>
              <Typography mt={0.5}>{daysInCurrentStage}</Typography>
            </Grid>
            <Button
              variant="outlined"
              onClick={() => navigate(`/clients/${sale.client._id}/campaigns`)}
            >
              Ver campañas del cliente
            </Button>
          </Grid>
        </CardContent>
      </Card>

      {/* PIPELINE VISUAL + SELECTOR */}
      <Box sx={{ mb: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Pipeline de venta
            </Typography>

            {/* PIPELINE HORIZONTAL */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              {STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isActive = index === currentStageIndex;
                const isFuture = index > currentStageIndex;

                const circleBg = isCompleted
                  ? "success.main"
                  : isActive
                    ? "primary.main"
                    : "grey.300";

                const circleColor =
                  isCompleted || isActive ? "common.white" : "text.primary";

                return (
                  <Box
                    key={stage}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 120,
                      flexShrink: 0,
                    }}
                  >
                    {/* Círculo */}
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        bgcolor: circleBg,
                        color: circleColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: isActive ? 3 : 0,
                        border: isFuture ? "2px solid #ccc" : "none",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => handleChangeStage(stage)}
                    >
                      {index + 1}
                    </Box>

                    {/* Texto de la etapa */}
                    <Box sx={{ ml: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          textTransform: "capitalize",
                        }}
                      >
                        {formatStageLabel(stage)}
                      </Typography>
                    </Box>

                    {/* Conector hacia la siguiente etapa */}
                    {index < STAGES.length - 1 && (
                      <Box
                        sx={{
                          flexGrow: 1,
                          height: 2,
                          mx: 1.5,
                          bgcolor: isCompleted ? "success.main" : "grey.300",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* SELECTOR MANUAL */}
            <Box mt={3}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                mb={1}
              >
                Cambiar etapa manualmente
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Etapa</InputLabel>

                <Select
                  value={sale.pipelineStage}
                  label="Etapa"
                  onChange={(e) => handleChangeStage(e.target.value)}
                >
                  {STAGES.map((s) => (
                    <MenuItem
                      key={s}
                      value={s}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {formatStageLabel(s)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {/* HISTORIAL DEL PIPELINE */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Historial del Pipeline
        </Typography>

        {(!sale.history || sale.history.length === 0) ? (
          <Typography color="text.secondary">
            No hay movimientos registrados en el pipeline todavía.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ p: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#e0e0e0" }}>
                  <TableCell sx={{ fontWeight: 700 }}>De</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>A</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Usuario</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sale.history.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {h.fromStage?.replace(/_/g, " ") || "—"}
                    </TableCell>

                    <TableCell sx={{ textTransform: "capitalize" }}>
                      {h.toStage?.replace(/_/g, " ") || "—"}
                    </TableCell>

                    <TableCell>
                      {h.changedAt
                        ? new Date(h.changedAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "—"}
                    </TableCell>

                    <TableCell>
                      {h.changedBy?.name
                        ? h.changedBy.name
                        : "Usuario desconocido"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      {/* NOTAS DE SEGUIMIENTO */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Notas de seguimiento
        </Typography>

        {/* Formulario para agregar nota */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Agregar nota
          </Typography>

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Escribe una nota…"
              multiline
              minRows={2}
              value={noteText || ""}
              onChange={(e) => setNoteText(e.target.value)}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                if (!noteText?.trim()) return alert("La nota no puede estar vacía");

                try {
                  const res = await addSaleNote(id, noteText.trim());
                  setNoteText("");
                  // recargar notas localmente
                  setSale((prev) => ({
                    ...prev,
                    followUpNotes: res.data.notes,
                  }));
                } catch (e) {
                  console.error(e);
                  alert("Error al agregar nota");
                }
              }}
            >
              Guardar
            </Button>
          </Stack>
        </Paper>

        {/* Listado de notas */}
        {(!sale.followUpNotes || sale.followUpNotes.length === 0) ? (
          <Typography color="text.secondary">
            Aún no hay notas registradas.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {sale.followUpNotes.map((n, idx) => (
              <Paper key={idx} sx={{ p: 2 }}>
                <Typography sx={{ whiteSpace: "pre-line" }}>
                  {n.text}
                </Typography>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={2}
                >
                  <Typography variant="caption" color="text.secondary">
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleString("es-MX")
                      : "—"}
                  </Typography>

                  <Chip
                    size="small"
                    label={n.createdBy?.name || "Usuario desconocido"}
                    variant="outlined"
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
      {/* MINI DASHBOARD DE ACTIVIDAD */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Actividad de Seguimiento
        </Typography>

        <Grid container spacing={3}>
          {/* TAREAS VENCIDAS */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, textAlign: "center", bgcolor: "#ffebee" }}>
              <Typography variant="h6" fontWeight={700} color="error">
                {sale.tasks.filter(t => t.dueDate && !t.completed && new Date(t.dueDate) < new Date()).length}
              </Typography>
              <Typography variant="body2">Tareas vencidas</Typography>
            </Card>
          </Grid>

          {/* TAREAS POR VENCER (próximos 7 días) */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, textAlign: "center", bgcolor: "#fff8e1" }}>
              <Typography variant="h6" fontWeight={700} color="warning.main">
                {
                  sale.tasks.filter(t => {
                    if (!t.dueDate || t.completed) return false;
                    const diff = (new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 7;
                  }).length
                }
              </Typography>
              <Typography variant="body2">Próximos 7 días</Typography>
            </Card>
          </Grid>

          {/* TAREAS COMPLETADAS */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {sale.tasks.filter(t => t.completed).length}
              </Typography>
              <Typography variant="body2">Tareas completadas</Typography>
            </Card>
          </Grid>

          {/* PRÓXIMA ACTIVIDAD */}
          <Grid item xs={12} md={3}>
            <Card sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="h6" fontWeight={700} color="primary">
                {(() => {
                  const upcoming = sale.tasks
                    .filter(t => t.dueDate && !t.completed && new Date(t.dueDate) >= new Date())
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

                  return upcoming.length > 0
                    ? new Date(upcoming[0].dueDate).toLocaleDateString("es-MX")
                    : "Sin actividad";
                })()}
              </Typography>
              <Typography variant="body2">Próxima actividad</Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* TAREAS / TO-DO */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Tareas / Próximos pasos
        </Typography>

        {/* Formulario para agregar tarea */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Agregar nueva tarea
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título de la tarea"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Fecha límite"
                InputLabelProps={{ shrink: true }}
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={2} display="flex" alignItems="center">
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={async () => {
                  if (!taskTitle.trim()) {
                    return alert("El título de la tarea es obligatorio");
                  }
                  try {
                    const res = await addSaleTask(id, taskTitle, taskDue || null);
                    setTaskTitle("");
                    setTaskDue("");


                    setSale((prev) => ({
                      ...prev,
                      tasks: res.data.tasks,
                    }));
                  } catch (err) {
                    console.error(err);
                    alert("Error al agregar la tarea");
                  }
                }}
              >
                Crear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* LISTA DE TAREAS */}
        {(!sale.tasks || sale.tasks.length === 0) ? (
          <Typography color="text.secondary">
            No hay tareas aún. Crea una arriba.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {sale.tasks.map((t) => (
              <Paper
                key={t._id}
                sx={{
                  p: 2,
                  opacity: t.completed ? 0.6 : 1,
                  borderLeft: `5px solid ${t.completed ? "#4caf50" : "#ff9800"}`,
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={1}>
                    <Checkbox
                      checked={t.completed}
                      onChange={async () => {
                        if (!t.completed) {
                          const res = await completeSaleTask(id, t._id);
                          setSale((prev) => ({
                            ...prev,
                            tasks: res.data.tasks,
                          }));
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={11}>
                    <Typography fontWeight={600}>{t.title}</Typography>

                    <Typography variant="body2" color="text.secondary">
                      Fecha límite:{" "}
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString("es-MX")
                        : "No asignada"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Creada por: {t.createdBy?.name || "Usuario desconocido"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* INFO DE COTIZACIÓN */}
      <Box>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Información de Cotización
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Folio</Typography>
              <Typography fontWeight={600} mt={0.5}>
                {sale.quote?.folio || "—"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Total</Typography>
              <Typography fontWeight={600} mt={0.5}>
                {sale.quote
                  ? `$${sale.quote.total?.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`
                  : "—"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">Status</Typography>
              <Chip
                label={sale.quote?.status || "—"}
                color={
                  sale.quote?.status === "aprobado"
                    ? "success"
                    : sale.quote?.status === "pendiente"
                      ? "warning"
                      : "default"
                }
                sx={{ mt: 1, fontWeight: 600, textTransform: "capitalize" }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Box mt={5} />
    </Box>
  );
}
