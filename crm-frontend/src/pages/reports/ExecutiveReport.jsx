import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { getExecutiveReport, getReportClients, getReportExecutives, getSalesGoals } from "../../services/reportService";

export default function ExecutiveReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [goalsMap, setGoalsMap] = useState({});

  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("year").toISOString(),
    endDate: dayjs().toISOString(),
    clientId: "all",
    executiveId: "all",
  });

  // Cargar clientes y ejecutivos para filtros
  useEffect(() => {
    async function loadFilters() {
      try {
        const [clientsRes, execsRes] = await Promise.all([
          getReportClients(),
          getReportExecutives(),
        ]);
        setClients(clientsRes.data);
        setExecutives(execsRes.data);
      } catch (err) {
        console.error("Error cargando filtros:", err);
      }
    }
    loadFilters();
  }, []);

  // Cargar metas por ejecutivo
  const loadGoals = async () => {
    try {
      const res = await getSalesGoals({});
      const goals = res.data;
      const map = {};
      goals.forEach(goal => {
        const execId = goal.assignedTo?._id || goal.assignedTo;
        if (execId) {
          const key = `${goal.year}-${goal.month}-${execId}`;
          map[key] = goal.goalAmount;
        }
      });
      setGoalsMap(map);
      return map;
    } catch (err) {
      console.error("Error cargando metas:", err);
      return {};
    }
  };

  // Ejecutar reporte
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar metas
      const goals = await loadGoals();
      
      // 2. Obtener datos del reporte (facturas individuales)
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clientId: filters.clientId,
        executiveId: filters.executiveId,
      };
      const res = await getExecutiveReport(params);
      const rawData = res.data.data;
      
      // 3. Agrupar por mes y ejecutivo
      const groupedByMonth = {};
      
      rawData.forEach(item => {
        const [day, month, year] = item.fecha.split("/");
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const monthName = new Date(yearNum, monthNum - 1).toLocaleString("es-MX", { month: "long" });
        const key = `${yearNum}-${monthNum}-${item.ejecutivo}`;
        
        if (!groupedByMonth[key]) {
          // Buscar el ID del ejecutivo
          const execFound = executives.find(e => e.name === item.ejecutivo);
          const execId = execFound?._id;
          const metaKey = `${yearNum}-${monthNum}-${execId}`;
          const meta = goals[metaKey] || 0;
          
          groupedByMonth[key] = {
            fecha: `${monthName} ${yearNum}`,
            ejecutivo: item.ejecutivo,
            totalVentasSinIVA: 0,
            meta: meta,
            cantidadVentas: 0,
          };
        }
        
        groupedByMonth[key].totalVentasSinIVA += item.ventasSinIVA;
        groupedByMonth[key].cantidadVentas += 1;
      });
      
      // 4. Convertir a array y calcular porcentajes
      const result = Object.values(groupedByMonth).map(month => {
        const porcentajeCumplimiento = month.meta > 0 
          ? (month.totalVentasSinIVA / month.meta) * 100 
          : 0;
        
        return {
          ...month,
          porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
        };
      });
      
      // Ordenar por fecha descendente
      result.sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        return dateB - dateA;
      });
      
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getCumplimientoColor = (porcentaje) => {
    if (porcentaje >= 100) return "success";
    if (porcentaje >= 80) return "warning";
    return "error";
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Filtros de búsqueda
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <DatePicker
                label="Fecha inicio"
                value={dayjs(filters.startDate)}
                onChange={(newValue) =>
                  setFilters({ ...filters, startDate: newValue?.toISOString() || "" })
                }
                slotProps={{ textField: { fullWidth: true, size: "small" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <DatePicker
                label="Fecha fin"
                value={dayjs(filters.endDate)}
                onChange={(newValue) =>
                  setFilters({ ...filters, endDate: newValue?.toISOString() || "" })
                }
                slotProps={{ textField: { fullWidth: true, size: "small" } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={filters.clientId}
                  label="Cliente"
                  onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client._id} value={client._id}>
                      {client.nombreComercial}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ejecutivo</InputLabel>
                <Select
                  value={filters.executiveId}
                  label="Ejecutivo"
                  onChange={(e) => setFilters({ ...filters, executiveId: e.target.value })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {executives.map((exec) => (
                    <MenuItem key={exec._id} value={exec._id}>
                      {exec.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }} display="flex" alignItems="center">
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                fullWidth
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : "Generar reporte"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#007A3E" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Mes</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Ejecutivo</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Total ventas (mes)
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Meta mensual
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  % Cumplimiento
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  N° ventas
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.fecha}</TableCell>
                  <TableCell>{row.ejecutivo}</TableCell>
                  <TableCell align="right">{formatMoney(row.totalVentasSinIVA)}</TableCell>
                  <TableCell align="right">{formatMoney(row.meta)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatPercent(row.porcentajeCumplimiento)}
                      color={getCumplimientoColor(row.porcentajeCumplimiento)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={row.cantidadVentas} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && data.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No hay datos para los filtros seleccionados
          </Typography>
        </Paper>
      )}
    </Box>
  );
}