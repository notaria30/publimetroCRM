// src/pages/postsale/PostSaleCreatePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPostSale } from "../../services/postSaleService";
import { getSales } from "../../services/salesService";

import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
} from "@mui/material";

export default function PostSaleCreatePage() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);

  const [form, setForm] = useState({
    sale: "",
    postSaleStage: "servicio_post_venta",
    medicionResultados: "",
    encuestaSatisfaccion: {
      calificacion: "",
      comentarios: "",
    },
    renovacion: {
      requiereRenovacion: false,
      fechaPosibleRenovacion: "",
    },
    notas: "",
  });

  const STAGES = [
    "prospeccion",
    "acercamiento",
    "presentacion_contacto_indicado",
    "propuesta_comercial",
    "negociacion_cierre",
    "documentacion_contrato",
    "facturacion",
    "pago",
    "servicio_post_venta",
    "reportes",
  ];

  /** Cargar ventas */
  useEffect(() => {
    async function loadSales() {
      const res = await getSales();
      setSales(res.data);
    }
    loadSales();
  }, []);

  /** Handler general */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // encuesta
    if (["calificacion", "comentarios"].includes(name)) {
      setForm({
        ...form,
        encuestaSatisfaccion: {
          ...form.encuestaSatisfaccion,
          [name]: value,
        },
      });
      return;
    }

    // renovación
    if (name === "requiereRenovacion") {
      setForm({
        ...form,
        renovacion: {
          ...form.renovacion,
          requiereRenovacion: e.target.checked,
        },
      });
      return;
    }

    if (name === "fechaPosibleRenovacion") {
      setForm({
        ...form,
        renovacion: {
          ...form.renovacion,
          fechaPosibleRenovacion: value,
        },
      });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  /** Guardar */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPostSale(form);
      navigate("/postsale");
    } catch (error) {
      alert("Error al crear registro");
      console.error(error);
    }
  };

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Crear Post-Venta
      </Typography>

      <Button variant="outlined" sx={{ mb: 3 }} onClick={() => navigate("/postsale")}>
        Volver
      </Button>

      <Card elevation={3}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            
            {/* SECCIÓN: Venta */}
            <Typography variant="h6" fontWeight={700} mb={2}>
              Venta Asociada
            </Typography>

            <Grid container spacing={3}>
               <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Venta</InputLabel>
                  <Select
                    name="sale"
                    value={form.sale}
                    label="Venta"
                    onChange={handleChange}
                  >
                    {sales.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s._id} — {s.client?.nombreComercial}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

               <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Etapa</InputLabel>
                  <Select
                    name="postSaleStage"
                    value={form.postSaleStage}
                    label="Etapa"
                    onChange={handleChange}
                  >
                    {STAGES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* SECCIÓN: Medición */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Medición de resultados
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={3}
              name="medicionResultados"
              value={form.medicionResultados}
              onChange={handleChange}
              placeholder="Describe KPIs, cumplimiento, desempeño…"
            />

            {/* SECCIÓN: Encuesta */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Encuesta de satisfacción
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Calificación (1–10)"
                  type="number"
                  fullWidth
                  name="calificacion"
                  value={form.encuestaSatisfaccion.calificacion}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  label="Comentarios"
                  fullWidth
                  multiline
                  rows={3}
                  name="comentarios"
                  value={form.encuestaSatisfaccion.comentarios}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* SECCIÓN: Renovación */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Renovación
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={form.renovacion.requiereRenovacion}
                  name="requiereRenovacion"
                  onChange={handleChange}
                />
              }
              label={
                form.renovacion.requiereRenovacion
                  ? "Requiere renovación"
                  : "No requiere renovación"
              }
            />

            {form.renovacion.requiereRenovacion && (
              <Grid container spacing={3} mt={1}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha posible de renovación"
                    InputLabelProps={{ shrink: true }}
                    name="fechaPosibleRenovacion"
                    value={form.renovacion.fechaPosibleRenovacion}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            )}

            {/* SECCIÓN: Notas */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Notas
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={3}
              name="notas"
              value={form.notas}
              onChange={handleChange}
              placeholder="Notas adicionales del ejecutivo…"
            />

            {/* BOTONES */}
            <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="contained" size="large" type="submit">
                Guardar Post-Venta
              </Button>

              <Button variant="outlined" size="large" onClick={() => navigate("/postsale")}>
                Cancelar
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
