import { Box, Card, CardContent, Typography, Grid, TextField, IconButton, Button, FormControl, Select, MenuItem, InputLabel, Divider } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";


export default function QuoteTarifasSection({
  form,
  setForm,
  subtotalTarifas,
  handleTarifaField,
  handleTarifaFecha,
  handlePeriodicidadChange,
  addTarifa,
  removeTarifa,
}) {
  // ============================
  // AJUSTES DE PRECIOS (AUTO)
  // ============================

  const handlePorcentajeChange = (raw) => {
    // permitir borrar
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        ajustesPrecios: {
          ...prev.ajustesPrecios,
          porcentajeAjuste: "",
          valorAjuste: "",
        },
      }));
      return;
    }

    // solo números
    if (!/^\d+$/.test(raw)) return;

    const pct = Number(raw);
    const valor = Math.round((subtotalTarifas * pct) / 100);

    setForm((prev) => ({
      ...prev,
      ajustesPrecios: {
        ...prev.ajustesPrecios,
        porcentajeAjuste: pct,
        valorAjuste: valor,
      },
    }));
  };

  const handleValorChange = (raw) => {
    // permitir borrar
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        ajustesPrecios: {
          ...prev.ajustesPrecios,
          valorAjuste: "",
          porcentajeAjuste: "",
        },
      }));
      return;
    }

    if (!/^\d+$/.test(raw)) return;

    const val = Number(raw);
    const pct =
      subtotalTarifas > 0
        ? Math.round((val * 100) / subtotalTarifas)
        : 0;

    setForm((prev) => ({
      ...prev,
      ajustesPrecios: {
        ...prev.ajustesPrecios,
        valorAjuste: val,
        porcentajeAjuste: pct,
      },
    }));
  };

  const sanitizeDateTyping = (raw) => raw.replace(/[^\d-]/g, "").slice(0, 10);
  const isoToDayjs = (iso) => (iso ? dayjs(iso, "YYYY-MM-DD", true) : null);
  const dayjsToISO = (d) => (d && d.isValid() ? d.format("YYYY-MM-DD") : "");

  const normalizeToISO = (raw) => {
    if (!raw) return "";
    const s = String(raw).trim();

    // ya es ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // si viene DD/MM/YYYY
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }

    // si aún está incompleta, no la fuerces
    return s;
  };

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            gap: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ m: 0 }}>
            Tarifas
          </Typography>

          <Button variant="outlined" startIcon={<AddIcon />} onClick={addTarifa}>
            Agregar tarifa
          </Button>
        </Box>

        {/* LISTA DE TARIFAS */}
        {form.tarifas.map((tarifa, index) => (
          <Card
            key={index}
            variant="outlined"
            sx={{ p: 2, mb: 2, bgcolor: "#fafafa" }}
          >
            <Grid container spacing={2}>
              {/* NUMERO DE LINEA */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Línea {index + 1}
                </Typography>
              </Grid>

              {/* PERIODICIDAD */}
              <Grid size={{ xs: 12, md: 1.7 }}>
                <TextField
                  label="Periodicidad"
                  type="number"
                  fullWidth
                  value={tarifa.periodicidad}
                  onChange={(e) => handlePeriodicidadChange(index, e.target.value)}
                />
              </Grid>


              {/* FORMATO */}
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Formato</InputLabel>
                  <Select
                    label="Formato"
                    value={tarifa.formato}
                    onChange={(e) =>
                      handleTarifaField(index, "formato", e.target.value)
                    }
                  >
                    <MenuItem value="1/4 plana">1/4 plana</MenuItem>
                    <MenuItem value="1/2 plana">1/2 plana</MenuItem>
                    <MenuItem value="Plana">Plana</MenuItem>
                    <MenuItem value="Doble Plana Central">Doble Plana Central</MenuItem>
                    <MenuItem value="Contraportada">Contraportada</MenuItem>
                    <MenuItem value="Cintillo en portada">Cintillo en portada</MenuItem>
                    <MenuItem value="Cintillo interior">Cintillo interior</MenuItem>
                    <MenuItem value="Robaplana">Robaplana</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* COSTO */}
              <Grid item xs={12} md={3}>
                <TextField
                  label="Costo"
                  type="number"
                  fullWidth
                  value={tarifa.costo}
                  onChange={(e) =>
                    handleTarifaField(index, "costo", e.target.value)
                  }
                />
              </Grid>

              {/* TOTAL LINEA */}
              <Grid item xs={12} md={3}>
                <TextField
                  label="Total línea"
                  type="number"
                  fullWidth
                  value={tarifa.totalLinea}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* FECHAS */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {tarifa.fechas.map((f, iFecha) => (
                    <Grid item xs={12} md={3} key={iFecha}>
                      <DatePicker
                        label={`Fecha ${iFecha + 1}`}
                        value={isoToDayjs(f)}
                        onChange={(newValue) => {
                          handleTarifaFecha(index, iFecha, dayjsToISO(newValue));
                        }}
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
          </Card>
        ))}
        {/* AJUSTES DE PRECIOS */}
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          Ajustes de precios
        </Typography>

        <Grid container spacing={2}>
          {/* % Ajuste */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="% Ajuste"
              type="text"
              inputMode="numeric"
              value={form.ajustesPrecios.porcentajeAjuste}
              onChange={(e) => handlePorcentajeChange(e.target.value)}
            />
          </Grid>

          {/* VALOR ABSOLUTO */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Valor ajuste"
              type="text"
              inputMode="numeric"
              value={form.ajustesPrecios.valorAjuste}
              onChange={(e) => handleValorChange(e.target.value)}
            />
          </Grid>

          {/* TIPO ACCIÓN */}
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo acción</InputLabel>
              <Select
                label="Tipo acción"
                value={form.ajustesPrecios.tipoAccion}
                onChange={(e) => {
                  const nextTipo = e.target.value;

                  setForm((prev) => ({
                    ...prev,
                    ajustesPrecios: {
                      ...prev.ajustesPrecios,
                      tipoAccion: nextTipo,
                      porcentajeAjuste: nextTipo === "Ninguno" ? 0 : prev.ajustesPrecios.porcentajeAjuste,
                      valorAjuste: nextTipo === "Ninguno" ? 0 : prev.ajustesPrecios.valorAjuste,
                    },
                  }));
                }}
              >
                <MenuItem value="Ninguno">Ninguno</MenuItem>
                <MenuItem value="Aumentar">Aumentar</MenuItem>
                <MenuItem value="Reducir">Reducir</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}