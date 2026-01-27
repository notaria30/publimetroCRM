import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { Switch } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function QuoteDesarrolloInformativoSection({ form, setForm }) {
  const isoToDayjs = (iso) => (iso ? dayjs(iso, "YYYY-MM-DD", true) : null);
  const dayjsToISO = (d) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");
  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Desarrollo Informativo
        </Typography>

        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Switch
            checked={form.desarrolloInformativo.activo}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                desarrolloInformativo: {
                  ...prev.desarrolloInformativo,
                  activo: e.target.checked,
                },
              }))
            }
          />
        </Box>
        {/* CAMPOS SOLO SI ESTÁ ACTIVO */}
        {form.desarrolloInformativo.activo && (
          <Box mt={2}>
            <Grid container spacing={3}>
              {/* FECHA */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Fecha"
                  value={isoToDayjs(form.desarrolloInformativo.fecha)}
                  onChange={(newValue) =>
                    setForm((prev) => ({
                      ...prev,
                      desarrolloInformativo: {
                        ...prev.desarrolloInformativo,
                        fecha: dayjsToISO(newValue),
                      },
                    }))
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

              {/* FORMATO */}
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Formato</InputLabel>
                  <Select
                    label="Formato"
                    value={form.desarrolloInformativo.formato}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        desarrolloInformativo: {
                          ...prev.desarrolloInformativo,
                          formato: e.target.value,
                        },
                      }))
                    }
                  >
                    <MenuItem value="1/4 plana">1/4 plana</MenuItem>
                    <MenuItem value="1/2 plana">1/2 plana</MenuItem>
                    {/* Puedes agregar más si los manejas */}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
