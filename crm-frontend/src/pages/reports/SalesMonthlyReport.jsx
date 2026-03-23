import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
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
import { 
  getSalesMonthlyReport, 
  getReportClients, 
  getSalesGoals 
} from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";

export default function SalesMonthlyReport() {
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [goalsMap, setGoalsMap] = useState({});

  // Filtros
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("year").toISOString(),
    endDate: dayjs().toISOString(),
    clientId: "all",
    tipoCliente: "all",
    statusPago: "all",
  });

  // Cargar clientes para filtros
  useEffect(() => {
    async function loadClients() {
      try {
        const res = await getReportClients();
        setClients(res.data);
      } catch (err) {
        console.error("Error cargando clientes:", err);
      }
    }
    loadClients();
  }, []);

  // Cargar metas existentes
  const loadGoals = async () => {
    try {
      const res = await getSalesGoals({});
      const goals = res.data;
      const map = {};
      goals.forEach(goal => {
        const key = `${goal.year}-${goal.month}`;
        map[key] = goal.goalAmount;
      });
      setGoalsMap(map);
    } catch (err) {
      console.error("Error cargando metas:", err);
    }
  };

  // Ejecutar reporte
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clientId: filters.clientId,
        tipoCliente: filters.tipoCliente,
        statusPago: filters.statusPago,
      };
      const res = await getSalesMonthlyReport(params);
      
      // Enriquecer datos con metas del mapa
      const dataWithGoals = res.data.data.map(item => {
        const [monthName, yearStr] = item.fecha.split(" ");
        const year = parseInt(yearStr);
        const monthIndex = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ].indexOf(monthName.toLowerCase()) + 1;
        const key = `${year}-${monthIndex}`;
        const meta = goalsMap[key] || 0;
        
        return {
          ...item,
          meta,
          diferencia: item.totalVentas - meta,
          porcentajeCumplimiento: meta > 0 ? (item.totalVentas / meta) * 100 : 0,
        };
      });
      
      setData(dataWithGoals);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda
  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Formatear porcentaje
  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Color según cumplimiento
  const getCumplimientoColor = (porcentaje) => {
    if (porcentaje >= 100) return "success";
    if (porcentaje >= 80) return "warning";
    return "error";
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadGoals();
    handleSearch();
  }, []);

  return (
    <Box>
      {/* Filtros */}
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
                <InputLabel>Tipo de cliente</InputLabel>
                <Select
                  value={filters.tipoCliente}
                  label="Tipo de cliente"
                  onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="iniciativa privada">IP</MenuItem>
                  <MenuItem value="gobierno">Gobierno</MenuItem>
                  <MenuItem value="corporativo">Corporativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status pago</InputLabel>
                <Select
                  value={filters.statusPago}
                  label="Status pago"
                  onChange={(e) => setFilters({ ...filters, statusPago: e.target.value })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pagadas">Pagadas</MenuItem>
                  <MenuItem value="pendiente">Pendiente de pago</MenuItem>
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

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de resultados */}
      {!loading && data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#007A3E" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Monto (con IVA)
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Meta
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Diferencia
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  % Cumplimiento
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Pagado
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.fecha}</TableCell>
                  <TableCell align="right">{formatMoney(row.totalVentas)}</TableCell>
                  <TableCell align="right">
                    {formatMoney(row.meta)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: row.diferencia >= 0 ? "green" : "red" }}
                  >
                    {formatMoney(row.diferencia)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatPercent(row.porcentajeCumplimiento)}
                      color={getCumplimientoColor(row.porcentajeCumplimiento)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{formatMoney(row.totalPagado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mensaje sin datos */}
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