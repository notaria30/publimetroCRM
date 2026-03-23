import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Switch
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const FORMATOS_CORTESIA = [
  "1/4 plana",
  "1/2 plana",
  "Plana",
  "Doble Plana Central",
  "Contraportada",
  "Cintillo en portada",
  "Cintillo interior",
  "Robaplana",
];

export default function QuoteCortesiasSection({ form, setForm }) {
  const isoToDayjs = (iso) => (iso ? dayjs(iso, "YYYY-MM-DD", true) : null);
  const dayjsToISO = (d) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");
  const handleFechaChange = (index, value) => {
    setForm((prev) => {
      const fechas = [...prev.cortesias.fechas];
      fechas[index] = value;

      return {
        ...prev,
        cortesias: {
          ...prev.cortesias,
          fechas,
        },
      };
    });
  };

  const handleCantidadChange = (value) => {
    const raw = String(value ?? "").trim();

    // Permitir borrar el input sin crashear
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        cortesias: { ...prev.cortesias, cantidad: "", fechas: [] },
      }));
      return;
    }

    let n = Number(raw);
    if (!Number.isFinite(n)) return;

    n = Math.max(0, Math.floor(n));

    setForm((prev) => {
      const prevFechas = Array.isArray(prev.cortesias.fechas)
        ? prev.cortesias.fechas
        : [];

      // Ajustar tamaño: conserva las existentes y agrega "" si faltan
      const fechas = Array.from({ length: n }, (_, i) => prevFechas[i] || "");

      return {
        ...prev,
        cortesias: {
          ...prev.cortesias,
          cantidad: n,
          fechas,
        },
      };
    });
  };


  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Cortesías
          </Typography>
          <Switch
            checked={!!form.cortesias.activo}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                cortesias: {
                  ...prev.cortesias,
                  activo: e.target.checked,
                  // si apagas, puedes limpiar fechas (opcional)
                  ...(e.target.checked ? {} : { fechas: [], cantidad: 0, formato: "" }),
                },
              }))
            }
          />
        </Box>
        {form.cortesias.activo && (
          <Box mt={2}>
            <Grid container spacing={3}>
              {/* Cantidad */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={form.cortesias.cantidad}
                  onChange={(e) => handleCantidadChange(e.target.value)}
                />
              </Grid>
              {/* Formato */}
              <Grid size={{ xs: 12, md: 2.7 }}>
                <TextField
                  select
                  fullWidth
                  label="Formato"
                  value={form.cortesias.formato || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cortesias: {
                        ...prev.cortesias,
                        formato: e.target.value,
                      },
                    }))
                  }
                >
                  {FORMATOS_CORTESIA.map((f) => (
                    <MenuItem key={f} value={f}>
                      {f}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Fechas */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {form.cortesias.fechas.map((fecha, i) => (
                    <Grid item xs={12} md={3} key={i}>
                      <DatePicker
                        label="Fecha"
                        value={isoToDayjs(fecha)}
                        onChange={(newValue) => handleFechaChange(i, dayjsToISO(newValue))}
                        format="DD/MM/YYYY"
                        disablePast
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
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
