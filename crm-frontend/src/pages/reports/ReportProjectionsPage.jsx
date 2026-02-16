// src/pages/reports/ReportProjectionsPage.jsx
import { useEffect, useState } from "react";
import { getProjections } from "../../services/reportService";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";

export default function ReportProjectionsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "",
  });

  async function load(params = {}) {
    const res = await getProjections({ params });
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

  if (!data) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6">Cargando proyecciones...</Typography>
      </Box>
    );
  }

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Proyecciones de Ventas
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

      {/* Tarjetas de Métricas */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Ventas Reales
              </Typography>
              <Typography variant="h3" color="success.main" fontWeight={700} mt={1}>
                ${Number(data.realSales || 0).toLocaleString("es-MX")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Suma de ventas cerradas en el rango seleccionado.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Pipeline (Propuestas activas)
              </Typography>
              <Typography variant="h3" color="primary" fontWeight={700} mt={1}>
                ${Number((data.pipeline ?? data.totalPotencial) || 0).toLocaleString("es-MX")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Estados: sent, approved, negotiation. Total propuestas: {data.totalPropuestas}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Meta del Mes
              </Typography>
              <Typography variant="h3" color="text.primary" fontWeight={700} mt={1}>
                ${Number(data.goal || 0).toLocaleString("es-MX")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Mes: {data?.filters?.month || "-"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                Proyección
              </Typography>
              <Typography variant="h3" color="success.main" fontWeight={700} mt={1}>
                ${Number(data.projection || ((data.realSales||0) + (data.pipeline||data.totalPotencial||0))).toLocaleString("es-MX")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                real + pipeline
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                % Cumplimiento
              </Typography>
              <Typography variant="h3" color="secondary" fontWeight={700} mt={1}>
                {Number(data.compliance || ((
                  ((data.projection || ((data.realSales||0) + (data.pipeline||data.totalPotencial||0))) / (data.goal || 0 || 1)) * 100
                ))).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                (proyección / meta) * 100
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="outlined"
          size="large"
          onClick={() => window.history.back()}
        >
          Volver
        </Button>
      </Box>
    </Box>
  );
}
