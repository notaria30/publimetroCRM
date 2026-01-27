import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button
} from "@mui/material";
import Switch from "@mui/material/Switch";
import AddIcon from "@mui/icons-material/Add";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function QuotePosteoRedesSection({ form, setForm }) {
  const isoToDayjs = (iso) => (iso ? dayjs(iso, "YYYY-MM-DD", true) : null);
  const dayjsToISO = (d) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");
  const addFecha = () => {
    setForm(prev => {
      const fechas = [...prev.posteoRedesSociales.fechas];
      if (fechas.length < 5) fechas.push(""); // agrega una sola fecha
      return {
        ...prev,
        posteoRedesSociales: { ...prev.posteoRedesSociales, fechas }
      };
    });
  };

  const handleFechaChange = (index, value) => {
    setForm(prev => {
      const fechas = [...prev.posteoRedesSociales.fechas];
      fechas[index] = value;
      return {
        ...prev,
        posteoRedesSociales: { ...prev.posteoRedesSociales, fechas }
      };
    });
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6" fontWeight={700}>
            Posteo Redes Sociales
          </Typography>

          <Switch
            checked={form.posteoRedesSociales.activo}
            onChange={(e) =>
              setForm(prev => ({
                ...prev,
                posteoRedesSociales: {
                  ...prev.posteoRedesSociales,
                  activo: e.target.checked,
                },
              }))
            }
          />
        </Box>
        {/* CAMPOS SI ACTIVO */}
        {form.posteoRedesSociales.activo && (
          <Box mt={2}>
            <Grid container spacing={3}>
              {/* Cantidad */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  value={form.posteoRedesSociales.cantidad}
                  onChange={(e) =>
                    setForm(prev => ({
                      ...prev,
                      posteoRedesSociales: {
                        ...prev.posteoRedesSociales,
                        cantidad: e.target.value === "" ? "" : Number(e.target.value),
                      }
                    }))
                  }
                />
              </Grid>

              {/* FECHAS */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {form.posteoRedesSociales.fechas.map((fecha, i) => (
                    <Grid item xs={12} md={2.4} key={i}>
                      <DatePicker
                        label="Fecha"
                        value={isoToDayjs(fecha)}
                        onChange={(newValue) => handleFechaChange(i, dayjsToISO(newValue))}
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

                {/* BOTÓN AGREGAR */}
                {form.posteoRedesSociales.fechas.length < 5 && (
                  <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    startIcon={<AddIcon />}
                    onClick={addFecha}
                  >
                    Agregar fecha
                  </Button>
                )}
              </Grid>
            </Grid>
          </Box>
        )}

      </CardContent>
    </Card>
  );
}
