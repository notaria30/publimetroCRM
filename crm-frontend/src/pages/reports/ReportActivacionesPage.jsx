// src/pages/reports/ReportActivacionesPage.jsx

import { useEffect, useState } from "react";
import { getActivacionesReport } from "../../services/reportService";

import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Chip,
  Stack,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

export default function ReportActivacionesPage() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ totalActivas: 0, totalPorVencer: 0, totalFinalizadas: 0 });
  const [filters, setFilters] = useState({ startDate: "", endDate: "", userId: "", estado: "", days: 7 });

  async function load(params = {}) {
    const res = await getActivacionesReport({ params });
    const data = res.data || {};
    setRows((data.activaciones || []).map((a, i) => ({ id: i, ...a })));
    setTotals({
      totalActivas: data.totalActivas || 0,
      totalPorVencer: data.totalPorVencer || 0,
      totalFinalizadas: data.totalFinalizadas || 0,
    });
  }

  useEffect(() => {
    load();
  }, []);

  const handleApply = () => {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.userId) params.userId = filters.userId;
    if (filters.estado) params.estado = filters.estado;
    if (filters.days) params.days = filters.days;
    load(params);
  };

  /** COLUMNAS PARA EL DATAGRID */
  const columns = [
    { field: "nombre", headerName: "Campaña", flex: 1 },
    { field: "cliente", headerName: "Cliente", flex: 1 },
    { field: "sellerName", headerName: "Vendedor", flex: 1 },
    {
      field: "fechas",
      headerName: "Fechas de espacios",
      flex: 1.3,
      renderCell: (params) => (params.row.fechas || []).join(", "),
    },
    { field: "fechaInicio", headerName: "Inicio", flex: 0.8, valueGetter: (p) => (p.row.fechaInicio ? new Date(p.row.fechaInicio).toLocaleDateString() : "-") },
    { field: "fechaFin", headerName: "Fin", flex: 0.8, valueGetter: (p) => (p.row.fechaFin ? new Date(p.row.fechaFin).toLocaleDateString() : "-") },
    { field: "cantidad", headerName: "Piezas", type: "number", flex: 0.6 },
    { field: "costo", headerName: "Costo", flex: 0.8, renderCell: (p) => `${Number(p.row.costo || 0).toLocaleString("es-MX")}` },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Activaciones
      </Typography>

      <Card elevation={3} sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha inicio (activación)"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha fin (activación)"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Vendedor (opcional)"
                placeholder="ID de usuario"
                value={filters.userId}
                onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={filters.estado}
                onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="active">Activas</MenuItem>
                <MenuItem value="upcoming">Por vencer</MenuItem>
                <MenuItem value="finished">Finalizadas</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={1}>
              <TextField
                fullWidth
                label="Días"
                type="number"
                value={filters.days}
                onChange={(e) => setFilters((f) => ({ ...f, days: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={12}>
              <Button variant="contained" onClick={handleApply}>Aplicar</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} mb={2}>
        <Chip label={`Activas: ${totals.totalActivas}`} color="success" />
        <Chip label={`Por vencer: ${totals.totalPorVencer}`} color="warning" />
        <Chip label={`Finalizadas: ${totals.totalFinalizadas}`} color="default" />
      </Stack>

      <Card elevation={4}>
        <CardContent>
          {rows.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No hay activaciones registradas con los filtros aplicados.
            </Typography>
          ) : (
            <Box sx={{ height: 520, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[5, 10, 20]}
                sx={{ borderRadius: 2, background: "white" }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Box mt={3}>
        <Button variant="outlined" color="primary" onClick={() => window.history.back()}>
          Volver
        </Button>
      </Box>
    </Container>
  );
}
