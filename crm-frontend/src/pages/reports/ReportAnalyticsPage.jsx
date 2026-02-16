import { useEffect, useState } from "react";
import { getAnalytics } from "../../services/reportService";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Chip,
  TextField,
} from "@mui/material";

export default function ReportAnalyticsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", userId: "" });
  const [loading, setLoading] = useState(false);

  async function load(params) {
    try {
      setLoading(true);
      const res = await getAnalytics({ params });
      setData(res.data);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const handleApply = () => {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.userId) params.userId = filters.userId;
    load(params);
  };

  useEffect(() => {
    // No cargar sin rango de fechas (es obligatorio). El usuario debe aplicar filtros.
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Analítica de Ventas
      </Typography>

      <Card elevation={3} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Vendedor (opcional)"
                placeholder="ID de usuario"
                value={filters.userId}
                onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2} display="flex" alignItems="center">
              <Button variant="contained" onClick={handleApply}>Aplicar</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!data ? (
        <Typography variant="body1" color="text.secondary">
          Selecciona un rango de fechas y aplica filtros para ver la analítica.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {/* Funnel Comercial */}
          <Grid item xs={12} md={6}>
            <Card elevation={4} sx={{ borderRadius: 3, p: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Funnel Comercial</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Cotizaciones</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.funnel.totalQuotes || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Aprobadas</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.funnel.approvedQuotes || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Ventas Cerradas</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.funnel.closedSales || 0)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Conversión</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.funnel.conversionRate || 0).toFixed(1)}%</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Cancelación</Typography>
                    <Typography variant="h6" fontWeight={700}>{Number(data.funnel.cancelRate || 0).toFixed(1)}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Tiempo promedio de cierre */}
          <Grid item xs={12} md={6}>
            <Card elevation={4} sx={{ borderRadius: 3, p: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Tiempo Promedio de Cierre</Typography>
                <Typography variant="h3" fontWeight={800}>{Number(data.avgCloseTimeDays || 0).toFixed(1)} días</Typography>
                <Typography variant="body2" color="text.secondary">Promedio entre creación de la cotización y creación de la venta.</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Retención */}
          <Grid item xs={12}>
            <Card elevation={4} sx={{ borderRadius: 3, p: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Retención de Clientes</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Clientes retenidos</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.retention.clientesRetenidos || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Clientes activos</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.retention.totalClientesActivos || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Tasa de Retención</Typography>
                    <Typography variant="h5" fontWeight={700}>{Number(data.retention.retentionRate || 0).toFixed(1)}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box mt={4}>
        <Button variant="outlined" size="large" onClick={() => window.history.back()}>
          Volver
        </Button>
      </Box>
    </Box>
  );
}
