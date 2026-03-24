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

// Importar recharts para gráficas
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function SalesMonthlyReport() {
  const { isOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [goalsMap, setGoalsMap] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

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
    setHasSearched(true);
    try {
      const goals = await loadGoals();
      
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clientId: filters.clientId,
        tipoCliente: filters.tipoCliente,
        statusPago: filters.statusPago,
      };
      const res = await getSalesMonthlyReport(params);
      
      const dataWithGoals = res.data.data.map(item => {
        const [monthName, yearStr] = item.fecha.split(" ");
        const year = parseInt(yearStr);
        const monthIndex = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ].indexOf(monthName.toLowerCase()) + 1;
        const key = `${year}-${monthIndex}`;
        const meta = goals[key] || 0;
        
        // Calcular porcentaje - limitado a 100% para la gráfica
        let porcentajeCumplimiento = 0;
        if (meta > 0) {
          porcentajeCumplimiento = Math.min((item.totalVentas / meta) * 100, 100);
        } else if (item.totalVentas > 0) {
          porcentajeCumplimiento = 100; // Si hay ventas pero no hay meta, mostrar 100%
        }
        
        return {
          ...item,
          meta,
          diferencia: item.totalVentas - meta,
          porcentajeCumplimiento: Math.round(porcentajeCumplimiento), // Redondear a entero
          porcentajeCumplimientoDecimal: (meta > 0 ? (item.totalVentas / meta) * 100 : 0), // Para tabla
          mesCorto: monthName.substring(0, 3),
          anio: year,
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

  // Formatear porcentaje para tabla (con decimales)
  const formatPercentTable = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Formatear porcentaje para gráfica (sin decimales)
  const formatPercentChart = (value) => {
    return `${Math.round(value || 0)}%`;
  };

  // Color según cumplimiento
  const getCumplimientoColor = (porcentaje) => {
    if (porcentaje >= 100) return "success";
    if (porcentaje >= 80) return "warning";
    return "error";
  };

  // Preparar datos para gráficas (invertir orden para mostrar cronológico)
  const chartData = [...data].reverse().map(item => ({
    nombre: item.fecha.split(" ")[0],
    mesCompleto: item.fecha,
    ventas: item.totalVentas,
    meta: item.meta,
    cumplimiento: item.porcentajeCumplimiento, // Usar entero para gráfica
  }));

  // Calcular resumen estadístico
  const totalVentas = data.reduce((sum, item) => sum + item.totalVentas, 0);
  const totalMeta = data.reduce((sum, item) => sum + item.meta, 0);
  const promedioCumplimiento = data.length > 0 
    ? data.reduce((sum, item) => sum + item.porcentajeCumplimientoDecimal, 0) / data.length 
    : 0;
  const mesesConMeta = data.filter(item => item.meta > 0).length;
  const mesesCumplidos = data.filter(item => item.porcentajeCumplimientoDecimal >= 100).length;

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

      {/* KPI Cards - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="caption" color="text.secondary">Total Ventas</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalVentas)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3e5f5" }}>
              <Typography variant="caption" color="text.secondary">Total Meta</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalMeta)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="caption" color="text.secondary">Promedio Cumplimiento</Typography>
              <Typography variant="h6" fontWeight={700} color={promedioCumplimiento >= 80 ? "green" : "orange"}>
                {formatPercentTable(promedioCumplimiento)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
              <Typography variant="caption" color="text.secondary">Meses con meta cumplida</Typography>
              <Typography variant="h6" fontWeight={700}>
                {mesesCumplidos} / {mesesConMeta}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICAS - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Gráfica 1: Ventas vs Meta */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Ventas vs Meta mensual
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Comparación de ventas reales contra meta establecida
                </Typography>
                <Box sx={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value) => formatMoney(value)}
                        labelFormatter={(label) => `Mes: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="ventas" name="Ventas reales" fill="#007A3E" />
                      <Bar dataKey="meta" name="Meta" fill="#FFB74D" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfica 2: % Cumplimiento - CORREGIDA */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Evolución del % de cumplimiento
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Porcentaje de meta alcanzada por mes
                </Typography>
                <Box sx={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`} 
                        domain={[0, 100]} 
                        ticks={[0, 25, 50, 75, 100]}
                      />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cumplimiento" 
                        name="% Cumplimiento" 
                        stroke="#007A3E" 
                        strokeWidth={2}
                        dot={{ fill: "#007A3E", r: 4 }}
                      />
                      <ReferenceLine 
                        y={100} 
                        stroke="red" 
                        strokeDasharray="3 3" 
                        label={{ value: "Meta", position: "right", fill: "red", fontSize: 10 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabla de resultados - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
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
                  <TableCell align="right">{formatMoney(row.meta)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: row.diferencia >= 0 ? "green" : "red" }}
                  >
                    {formatMoney(row.diferencia)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatPercentTable(row.porcentajeCumplimientoDecimal)}
                      color={getCumplimientoColor(row.porcentajeCumplimientoDecimal)}
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

      {/* Mensaje sin datos - solo si ya se buscó y no hay datos */}
      {hasSearched && !loading && data.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No hay datos para los filtros seleccionados
          </Typography>
        </Paper>
      )}

      {/* Mensaje cuando no se ha generado reporte */}
      {!hasSearched && !loading && (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
          <Typography color="text.secondary">
            Selecciona los filtros y haz clic en "Generar reporte" para ver los datos
          </Typography>
        </Paper>
      )}
    </Box>
  );
}