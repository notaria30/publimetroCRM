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

// Importar recharts
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

export default function ExecutiveReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [goalsMap, setGoalsMap] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

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
    setHasSearched(true);
    try {
      const goals = await loadGoals();
      
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clientId: filters.clientId,
        executiveId: filters.executiveId,
      };
      const res = await getExecutiveReport(params);
      const rawData = res.data.data;
      
      // Agrupar por mes y ejecutivo
      const groupedByMonth = {};
      
      rawData.forEach(item => {
        const [day, month, year] = item.fecha.split("/");
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const monthName = new Date(yearNum, monthNum - 1).toLocaleString("es-MX", { month: "long" });
        const key = `${yearNum}-${monthNum}-${item.ejecutivo}`;
        
        if (!groupedByMonth[key]) {
          const execFound = executives.find(e => e.name === item.ejecutivo);
          const execId = execFound?._id;
          const metaKey = `${yearNum}-${monthNum}-${execId}`;
          const meta = goals[metaKey] || 0;
          
          groupedByMonth[key] = {
            fecha: `${monthName} ${yearNum}`,
            fechaKey: `${yearNum}-${monthNum}`,
            ejecutivo: item.ejecutivo,
            totalVentasSinIVA: 0,
            meta: meta,
            cantidadVentas: 0,
          };
        }
        
        groupedByMonth[key].totalVentasSinIVA += item.ventasSinIVA;
        groupedByMonth[key].cantidadVentas += 1;
      });
      
      const result = Object.values(groupedByMonth).map(month => {
        // Calcular porcentaje limitado a 100% para gráfica
        let porcentajeCumplimiento = 0;
        if (month.meta > 0) {
          porcentajeCumplimiento = Math.min((month.totalVentasSinIVA / month.meta) * 100, 100);
        } else if (month.totalVentasSinIVA > 0) {
          porcentajeCumplimiento = 100;
        }
        
        // Guardar también el valor decimal para la tabla
        const porcentajeDecimal = month.meta > 0 
          ? (month.totalVentasSinIVA / month.meta) * 100 
          : 0;
        
        return {
          ...month,
          porcentajeCumplimiento: Math.round(porcentajeCumplimiento), // Para gráfica (entero, max 100)
          porcentajeCumplimientoDecimal: porcentajeDecimal, // Para tabla (con decimales)
        };
      });
      
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

  // Formatear moneda (sin decimales)
  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  // ============================================
  // PREPARAR DATOS PARA GRÁFICAS
  // ============================================
  
  // Gráfica 1: Total ventas por ejecutivo
  const salesByExecutive = data.reduce((acc, item) => {
    if (!acc[item.ejecutivo]) {
      acc[item.ejecutivo] = {
        ejecutivo: item.ejecutivo,
        totalVentas: 0,
        totalMeta: 0,
      };
    }
    acc[item.ejecutivo].totalVentas += item.totalVentasSinIVA;
    acc[item.ejecutivo].totalMeta += item.meta;
    return acc;
  }, {});

  const executiveChartData = Object.values(salesByExecutive).map(exec => ({
    nombre: exec.ejecutivo,
    ventas: exec.totalVentas,
    meta: exec.totalMeta,
  })).sort((a, b) => b.ventas - a.ventas);

  // Gráfica 2: Evolución de ventas por ejecutivo (si se selecciona uno específico)
  const selectedExecutive = executives.find(e => e._id === filters.executiveId)?.name;
  
  let evolutionChartData = [];
  if (selectedExecutive && filters.executiveId !== "all") {
    const executiveData = data.filter(item => item.ejecutivo === selectedExecutive);
    evolutionChartData = [...executiveData]
      .sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        return dateA - dateB;
      })
      .map(item => ({
        mes: item.fecha,
        ventas: item.totalVentasSinIVA,
        meta: item.meta,
        cumplimiento: item.porcentajeCumplimiento, // Usar entero para gráfica
      }));
  }

  // Calcular resumen estadístico
  const totalVentasGeneral = data.reduce((sum, item) => sum + item.totalVentasSinIVA, 0);
  const totalMetaGeneral = data.reduce((sum, item) => sum + item.meta, 0);
  const promedioCumplimientoGeneral = data.length > 0 
    ? data.reduce((sum, item) => sum + item.porcentajeCumplimientoDecimal, 0) / data.length 
    : 0;
  const ejecutivosActivos = new Set(data.map(item => item.ejecutivo)).size;

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

      {/* KPI Cards - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="caption" color="text.secondary">Total Ventas</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalVentasGeneral)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3e5f5" }}>
              <Typography variant="caption" color="text.secondary">Total Meta</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalMetaGeneral)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="caption" color="text.secondary">Promedio Cumplimiento</Typography>
              <Typography variant="h6" fontWeight={700} color={promedioCumplimientoGeneral >= 80 ? "green" : "orange"}>
                {formatPercentTable(promedioCumplimientoGeneral)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
              <Typography variant="caption" color="text.secondary">Ejecutivos activos</Typography>
              <Typography variant="h6" fontWeight={700}>{ejecutivosActivos}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICAS - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Gráfica 1: Ventas por ejecutivo */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Ventas por ejecutivo
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Total de ventas en el periodo seleccionado
                </Typography>
                <Box sx={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={executiveChartData} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nombre" width={80} />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Legend />
                      <Bar dataKey="ventas" name="Ventas totales" fill="#007A3E" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfica 2: Evolución de ventas */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {selectedExecutive && filters.executiveId !== "all" 
                    ? `Evolución de ventas - ${selectedExecutive}` 
                    : "Evolución de ventas"}
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  {selectedExecutive && filters.executiveId !== "all" 
                    ? "Ventas mensuales vs meta del ejecutivo seleccionado" 
                    : "Selecciona un ejecutivo para ver su evolución mensual"}
                </Typography>
                <Box sx={{ width: "100%", height: 320 }}>
                  {selectedExecutive && filters.executiveId !== "all" && evolutionChartData.length > 0 ? (
                    <ResponsiveContainer>
                      <LineChart data={evolutionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => formatMoney(value)} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="ventas" 
                          name="Ventas reales" 
                          stroke="#007A3E" 
                          strokeWidth={2}
                          dot={{ fill: "#007A3E", r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="meta" 
                          name="Meta" 
                          stroke="#FFB74D" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                      <Typography color="text.secondary" textAlign="center">
                        {selectedExecutive && filters.executiveId !== "all" 
                          ? "No hay datos para el ejecutivo seleccionado" 
                          : "Selecciona un ejecutivo en los filtros para ver su evolución mensual"}
                      </Typography>
                    </Box>
                  )}
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
                      label={formatPercentTable(row.porcentajeCumplimientoDecimal)}
                      color={getCumplimientoColor(row.porcentajeCumplimientoDecimal)}
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