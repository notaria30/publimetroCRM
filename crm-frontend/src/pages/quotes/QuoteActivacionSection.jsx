import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Button,
  Switch,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const EMPTY_ACTIVACION = {
  activo: true,
  cantidad: 0,
  costoActivacion: 0,
  costoImpresion: 0,
  tipo: "",
  cantidadTipo: 0,
  total: 0,
  fechas: [],
  puntosDistribucion: "",
};

export default function QuoteActivacionSection({ form, setForm }) {
  const isoToDayjs = (iso) => (iso ? dayjs(iso, "YYYY-MM-DD", true) : null);
  const dayjsToISO = (d) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");

  const resizeFechas = (prevFechas = [], newLen) => {
    const safeLen = Math.max(0, Number(newLen) || 0);
    const next = prevFechas.slice(0, safeLen);
    while (next.length < safeLen) next.push("");
    return next;
  };


  const activaciones = form.activaciones || [];
  const calcularTotalActivacion = (a) => {
    const cantidad = Number(a.cantidad) || 0;
    const costoActivacion = Number(a.costoActivacion) || 0;
    const costoImpresion = Number(a.costoImpresion) || 0;

    return (cantidad * costoActivacion) + costoImpresion;
  };

  const isEnabled = !!form.activacionesActivo;

  const addActivacion = () => {
    setForm((prev) => ({
      ...prev,
      activacionesActivo: true,
      activaciones: [...(prev.activaciones || []), { ...EMPTY_ACTIVACION, activo: true }],
    }));
  };

  const removeActivacion = (index) => {
    setForm((prev) => {
      const next = (prev.activaciones || []).filter((_, i) => i !== index);

      // si ya no queda ninguna, apaga la sección
      if (next.length === 0) {
        return {
          ...prev,
          activacionesActivo: false,
          activaciones: [],
        };
      }

      return {
        ...prev,
        activaciones: next,
      };
    });
  };

  const updateActivacion = (index, patch) => {
    setForm((prev) => {
      const next = [...(prev.activaciones || [])];
      const updated = { ...next[index], ...patch };

      const cantidad = Number(updated.cantidad) || 0;
      const costoActivacion = Number(updated.costoActivacion) || 0;
      const cantidadTipo = Number(updated.cantidadTipo) || 0;
      const costoImpresion = Number(updated.costoImpresion) || 0;

      updated.total =
        (cantidad * costoActivacion) +
        costoImpresion;

      next[index] = updated;

      return { ...prev, activaciones: next };
    });
  };

  const handleDateChange = (index, fechaIndex, value) => {
    setForm((prev) => {
      const next = [...(prev.activaciones || [])];
      const a = { ...next[index] };
      const fechas = [...(a.fechas || [])];

      fechas[fechaIndex] = value;
      a.fechas = fechas;

      next[index] = a;
      return { ...prev, activaciones: next };
    });
  };

  const toggleActivaciones = (checked) => {
    setForm((prev) => {
      if (checked) {
        return {
          ...prev,
          activacionesActivo: true,
          activaciones:
            prev.activaciones && prev.activaciones.length > 0
              ? prev.activaciones
              : [{ ...EMPTY_ACTIVACION, activo: true }],
        };
      }

      return {
        ...prev,
        activacionesActivo: false,
        activaciones: [],
      };
    });
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          {/* Título a la izquierda */}
          <Typography variant="h6" fontWeight={700}>
            Activaciones
          </Typography>

          {/* Controles a la derecha */}
          <Box display="flex" alignItems="center" gap={2}>
            {/* Botón solo si está encendido */}
            {isEnabled && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addActivacion}
              >
                Agregar activación
              </Button>
            )}

            {/* Switch general (después del botón) */}
            <Switch
              checked={isEnabled}
              onChange={(e) => toggleActivaciones(e.target.checked)}
            />
          </Box>
        </Box>

        {isEnabled && activaciones.map((act, idx) => (
          <Card key={idx} variant="outlined" sx={{ mb: 2, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography fontWeight={700}>Activación {idx + 1}</Typography>
              </Box>

              <IconButton
                onClick={() => removeActivacion(idx)}
                title="Eliminar activación"
              >
                <DeleteIcon />
              </IconButton>
            </Box>

            <Box mt={1}>
              <Grid container spacing={3} alignItems="center">
                {/* CANTIDAD */}
                <Grid size={{ xs: 12, md: 1.3 }}>
                  <TextField
                    fullWidth
                    label="Cantidad"
                    type="number"
                    value={act.cantidad}
                    onChange={(e) => {
                      const raw = e.target.value;

                      setForm((prev) => {
                        const next = [...(prev.activaciones || [])];
                        const a = { ...next[idx] };

                        if (raw === "") {
                          a.cantidad = "";
                          a.fechas = [];
                          next[idx] = a;
                          return { ...prev, activaciones: next };
                        }

                        const newCantidad = Math.max(0, Number(raw));
                        a.cantidad = newCantidad;
                        a.total =
                          (newCantidad * (Number(a.costoActivacion) || 0)) +
                          (Number(a.costoImpresion) || 0);
                        a.fechas = resizeFechas(a.fechas || [], newCantidad);

                        next[idx] = a;
                        return { ...prev, activaciones: next };
                      });
                    }}

                  />
                </Grid>

                {/* COSTO ACTIVACIÓN */}
                <Grid size={{ xs: 12, md: 1.7 }}>
                  <TextField
                    fullWidth
                    label="Costo activación"
                    type="number"
                    value={act.costoActivacion ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        costoActivacion: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </Grid>

                {/* TIPO */}
                <Grid size={{ xs: 12, md: 2.2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      label="Tipo"
                      value={act.tipo}
                      onChange={(e) => updateActivacion(idx, { tipo: e.target.value })}
                    >
                      <MenuItem value="Entrega simultanea">Entrega simultánea</MenuItem>
                      <MenuItem value="Encarte">Encarte</MenuItem>
                      <MenuItem value="Walking banner">Walking banner</MenuItem>
                      <MenuItem value="Fajillas">Fajillas</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* CANTIDAD DE TIPO */}
                <Grid size={{ xs: 12, md: 1.6 }}>
                  <TextField
                    fullWidth
                    label="Cantidad de tipo"
                    type="number"
                    value={act.cantidadTipo ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        cantidadTipo: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </Grid>

                {/* COSTO IMPRESIÓN */}
                <Grid size={{ xs: 12, md: 1.6 }}>
                  <TextField
                    fullWidth
                    label="Costo impresión"
                    type="number"
                    value={act.costoImpresion ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        costoImpresion: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </Grid>

                {/* TOTAL (AUTOMÁTICO) */}
                <Grid size={{ xs: 12, md: 1.8 }}>
                  <TextField
                    fullWidth
                    label="Total"
                    type="number"
                    value={calcularTotalActivacion(act)}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>

                {/* FECHAS */}
                <Grid size={{ xs: 12, md: 12 }}>
                  <Grid container spacing={2}>
                    {(act.fechas || []).map((fecha, i) => (
                      <Grid item xs={12} md={4} key={i}>
                        <DatePicker
                          label={`Fecha ${i + 1}`}
                          value={isoToDayjs(fecha)}
                          onChange={(newValue) =>
                            handleDateChange(idx, i, dayjsToISO(newValue))
                          }
                          format="DD/MM/YYYY"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              InputLabelProps: { shrink: true },
                            },
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* PUNTOS DISTRIBUCIÓN */}
                <Grid size={{ xs: 9, md: 8 }}>
                  <TextField
                    fullWidth
                    label="Puntos de distribución"
                    multiline
                    rows={4}
                    value={act.puntosDistribucion}
                    onChange={(e) =>
                      updateActivacion(idx, { puntosDistribucion: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
