import { Card, CardContent, Typography, Grid, TextField, MenuItem } from "@mui/material";

export default function QuoteGeneralSection({ clients, form, setForm }) {
  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Datos generales
        </Typography>

        <Grid container spacing={3}>

          {/* CLIENTE */}
          <Grid size={{ xs: 12, md: 3.5 }}>
            <TextField
              select
              fullWidth
              label="Cliente"
              value={form.client}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, client: e.target.value }))
              }
              required
            >
              <MenuItem value="">Seleccione cliente...</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.nombreComercial}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* DURACIÓN */}
          <Grid size={{ xs: 12, md: 1.5 }}>
            <TextField
              fullWidth
              label="Duración"
              placeholder="Ej: 3 meses"
              value={form.duracion}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, duracion: e.target.value }))
              }
            />
          </Grid>

          {/* FORMA DE PAGO */}
          <Grid size={{ xs: 12, md: 2.5 }}>
            <TextField
              select
              fullWidth
              label="Forma de pago"
              value={form.formaPago}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, formaPago: e.target.value }))
              }
            >
              <MenuItem value="Transferencia">Transferencia</MenuItem>
              <MenuItem value="Efectivo">Efectivo</MenuItem>
              <MenuItem value="Tarjeta">Tarjeta</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </TextField>
          </Grid>

          {/* USO DE CFDI */}
          <Grid size={{ xs: 12, md: 3.5 }}>
            <TextField
              select
              fullWidth
              label="Uso de CFDI"
              value={form.usoCFDI}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, usoCFDI: e.target.value }))
              }
            >
              <MenuItem value="G01">G01 - Adquisición de mercancías</MenuItem>
              <MenuItem value="G03">G03 - Gastos en general</MenuItem>
              <MenuItem value="P01">P01 - Por definir</MenuItem>
            </TextField>
          </Grid>

          {/* ESTADO DE FACTURACIÓN */}
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Estado de facturación"
              value={form.facturacionEstado}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  facturacionEstado: e.target.value,
                }))
              }
            >
              <MenuItem value="por_facturar">Por facturar</MenuItem>
              <MenuItem value="facturado">Facturado</MenuItem>
            </TextField>
          </Grid>

        </Grid>
      </CardContent>
    </Card>
  );
}
