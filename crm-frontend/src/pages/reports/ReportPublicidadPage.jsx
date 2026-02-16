import { useEffect, useState } from "react";
import { getPublicidadReport } from "../../services/reportService";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Divider,
  Grid,
  TextField,
} from "@mui/material";

export default function ReportPublicidadPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", userId: "" });

  async function load(params = {}) {
    const res = await getPublicidadReport({ params });
    setData(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  const handleApply = () => {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.userId) params.userId = filters.userId;
    load(params);
  };

  if (!data)
    return (
      <Typography variant="h6" textAlign="center" mt={4}>
        Cargando reporte...
      </Typography>
    );

  return (
    <Box maxWidth="1200px" mx="auto" mt={4}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        📢 Reporte de Publicidad
      </Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Fecha inicio"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.startDate}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Fecha fin"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.endDate}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Usuario (opcional)"
            placeholder="ID de usuario"
            value={filters.userId}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} md={3} display="flex" alignItems="center">
          <Button variant="contained" onClick={handleApply}>Aplicar</Button>
        </Grid>
      </Grid>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Resumen de Ingresos por Publicidad
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h3" color="success.main" fontWeight={700}>
            ${Number(data.ingresosPublicidad || 0).toLocaleString("es-MX")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Ventas relacionadas con campañas en el período seleccionado.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={700} mb={1}>
            Rendimiento por Campaña
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaña</TableCell>
                <TableCell align="right">Total vendido</TableCell>
                <TableCell align="right">Anuncios vendidos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.rendimientoPorCampana || []).map((c) => (
                <TableRow key={c._id}>
                  <TableCell>{c.campaignName || c._id}</TableCell>
                  <TableCell align="right">${Number(c.totalVendido || 0).toLocaleString("es-MX")}</TableCell>
                  <TableCell align="right">{Number(c.anunciosVendidos || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={700} mb={1}>
            Rendimiento por Tipo de Campaña
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Total vendido</TableCell>
                <TableCell align="right">Anuncios vendidos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.rendimientoPorTipo || []).map((t) => (
                <TableRow key={t._id}>
                  <TableCell>{t._id}</TableCell>
                  <TableCell align="right">${Number(t.totalVendido || 0).toLocaleString("es-MX")}</TableCell>
                  <TableCell align="right">{Number(t.anunciosVendidos || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={700} mb={1}>
            Ocupación por Campaña
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaña</TableCell>
                <TableCell align="right">Vendidos</TableCell>
                <TableCell align="right">Capacidad</TableCell>
                <TableCell align="right">Ocupación</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.ocupacion || []).map((o) => (
                <TableRow key={o._id}>
                  <TableCell>{o.name || o._id}</TableCell>
                  <TableCell align="right">{Number(o.vendidos || 0)}</TableCell>
                  <TableCell align="right">{Number(o.capacity || 0)}</TableCell>
                  <TableCell align="right">{Number(o.ocupacion || 0).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 3 }} />

          <Typography variant="caption" color="text.secondary">
            Compatibilidad: totales por periodo (no aplican con la nueva lógica) — Diario: ${Number(data.totalPorDia || 0).toLocaleString("es-MX")} · Semanal: ${Number(data.totalPorSemana || 0).toLocaleString("es-MX")} · Mensual: ${Number(data.totalPorMes || 0).toLocaleString("es-MX")}
          </Typography>

          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.history.back()}
            >
              Volver
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
