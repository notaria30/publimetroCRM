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
import { getComparativeReport, getReportClients, getReportExecutives } from "../../services/reportService";

// Importar recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ComparativeReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState({
    periodoBase: "anual",
    periodoComparativo: "anual",
    tipoCliente: "all",
    ejecutivoId: "all",
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

  // Ejecutar reporte
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = {
        periodoBase: filters.periodoBase,
        periodoComparativo: filters.periodoComparativo,
        tipoCliente: filters.tipoCliente,
        ejecutivoId: filters.ejecutivoId,
      };
      const res = await getComparativeReport(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda SIN decimales
  const formatMoney = (value) => {
    const roundedValue = Math.round(value || 0);
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedValue);
  };

  // Formatear porcentaje SIN decimales
  const formatPercent = (value) => {
    const sign = value > 0 ? "+" : "";
    const percentValue = Math.round(value * 100);
    return `${sign}${percentValue}%`;
  };

  // Color según variación
  const getVariacionColor = (variacionMonto, variacionPorcentaje) => {
    if (variacionMonto > 0 || variacionPorcentaje > 0) return "success";
    if (variacionMonto < 0 || variacionPorcentaje < 0) return "error";
    return "default";
  };

  // Obtener el año para mostrar según el período seleccionado
  const getPeriodoLabel = () => {
    const currentYear = new Date().getFullYear();
    if (filters.periodoBase === "anual" && filters.periodoComparativo === "anual") {
      return `Comparando ${currentYear - 1} vs ${currentYear}`;
    }
    if (filters.periodoBase === "mensual" && filters.periodoComparativo === "mensual") {
      const currentMonth = new Date().toLocaleString("es-MX", { month: "long" });
      return `Comparando ${currentMonth} de ${currentYear - 1} vs ${currentYear}`;
    }
    return `Comparando ${filters.periodoBase} vs ${filters.periodoComparativo}`;
  };

  // ============================================
  // PREPARAR DATOS PARA GRÁFICA DE BARRAS AGRUPADAS
  // ============================================

  // Agrupar datos por fecha (mes o año según filtro)
  const chartData = data.reduce((acc, item) => {
    const existing = acc.find(d => d.fecha === item.fecha);
    if (existing) {
      existing.periodoBase += item.periodoBase;
      existing.periodoComparativo += item.periodoComparativo;
      existing.variacionMonto += item.variacionMonto;
    } else {
      acc.push({
        fecha: item.fecha,
        periodoBase: item.periodoBase,
        periodoComparativo: item.periodoComparativo,
        variacionMonto: item.variacionMonto,
        variacionPorcentaje: item.variacionPorcentaje,
      });
    }
    return acc;
  }, []).sort((a, b) => {
    const dateA = new Date(a.fecha);
    const dateB = new Date(b.fecha);
    return dateA - dateB;
  });

  // Calcular resumen estadístico
  const totalBase = data.reduce((sum, item) => sum + item.periodoBase, 0);
  const totalComparativo = data.reduce((sum, item) => sum + item.periodoComparativo, 0);
  const variacionTotal = totalComparativo - totalBase;
  const variacionPorcentajeTotal = totalBase > 0 ? (variacionTotal / totalBase) * 100 : (totalComparativo > 0 ? 100 : 0);

  const clientesCrecimiento = data.filter(item => item.variacionMonto > 0).length;
  const clientesDecrecimiento = data.filter(item => item.variacionMonto < 0).length;
  const clientesNuevos = data.filter(item => item.periodoBase === 0 && item.periodoComparativo > 0).length;
  const clientesPerdidos = data.filter(item => item.periodoBase > 0 && item.periodoComparativo === 0).length;

  return (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Filtros del reporte
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Periodo base</InputLabel>
                <Select
                  value={filters.periodoBase}
                  label="Periodo base"
                  onChange={(e) => setFilters({ ...filters, periodoBase: e.target.value })}
                >
                  <MenuItem value="mensual">Mensual (compara mismo mes)</MenuItem>
                  <MenuItem value="anual">Anual (compara años completos)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Periodo comparativo</InputLabel>
                <Select
                  value={filters.periodoComparativo}
                  label="Periodo comparativo"
                  onChange={(e) => setFilters({ ...filters, periodoComparativo: e.target.value })}
                >
                  <MenuItem value="mensual">Mensual (compara mismo mes)</MenuItem>
                  <MenuItem value="anual">Anual (compara años completos)</MenuItem>
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
                <InputLabel>Ejecutivo</InputLabel>
                <Select
                  value={filters.ejecutivoId}
                  label="Ejecutivo"
                  onChange={(e) => setFilters({ ...filters, ejecutivoId: e.target.value })}
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

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            {getPeriodoLabel()}
          </Typography>
        </CardContent>
      </Card>

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="caption" color="text.secondary">Ventas periodo base</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalBase)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3e5f5" }}>
              <Typography variant="caption" color="text.secondary">Ventas periodo comparativo</Typography>
              <Typography variant="h6" fontWeight={700}>{formatMoney(totalComparativo)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: variacionTotal >= 0 ? "#e8f5e9" : "#ffebee" }}>
              <Typography variant="caption" color="text.secondary">Variación total</Typography>
              <Typography variant="h6" fontWeight={700} color={variacionTotal >= 0 ? "green" : "red"}>
                {variacionTotal > 0 ? "+" : ""}{formatMoney(variacionTotal)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: variacionPorcentajeTotal >= 0 ? "#e8f5e9" : "#ffebee" }}>
              <Typography variant="caption" color="text.secondary">Variación % total</Typography>
              <Typography variant="h6" fontWeight={700} color={variacionPorcentajeTotal >= 0 ? "green" : "red"}>
                {variacionPorcentajeTotal > 0 ? "+" : ""}{Math.round(variacionPorcentajeTotal)}%
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Segunda fila de KPI */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="caption" color="text.secondary">Clientes en crecimiento</Typography>
              <Typography variant="h6" fontWeight={700} color="green">{clientesCrecimiento}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#ffebee" }}>
              <Typography variant="caption" color="text.secondary">Clientes en decrecimiento</Typography>
              <Typography variant="h6" fontWeight={700} color="red">{clientesDecrecimiento}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
              <Typography variant="caption" color="text.secondary">Clientes nuevos</Typography>
              <Typography variant="h6" fontWeight={700}>{clientesNuevos}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
              <Typography variant="caption" color="text.secondary">Clientes perdidos</Typography>
              <Typography variant="h6" fontWeight={700}>{clientesPerdidos}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICA PRINCIPAL - Barras agrupadas */}
      {hasSearched && !loading && chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Comparación de ventas por período
            </Typography>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Comparación de ingresos entre {filters.periodoBase === "anual" ? "años" : "meses"} seleccionados
            </Typography>
            <Box sx={{ width: "100%", height: 450, mt: 2 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 12 }}
                    label={{ value: filters.periodoBase === "anual" ? "Año" : "Mes", position: "bottom", offset: 20 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: "Ventas (MXN)", angle: -90, position: "left", offset: 40 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "Periodo base") return [formatMoney(value), "Periodo base"];
                      if (name === "Periodo comparativo") return [formatMoney(value), "Periodo comparativo"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="periodoBase" name="Periodo base" fill="#007A3E" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="periodoComparativo" name="Periodo comparativo" fill="#FFB74D" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block", textAlign: "center" }}>
              Las barras verdes representan el período base, las naranjas el período comparativo
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Mensaje sin datos */}
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

      {/* Tabla de resultados */}
      {hasSearched && !loading && data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#007A3E" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Periodo base
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Periodo comparativo
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Variación $
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  Variación %
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Ejecutivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.fecha}</TableCell>
                  <TableCell>{row.cliente}</TableCell>
                  <TableCell align="right">{formatMoney(row.periodoBase)}</TableCell>
                  <TableCell align="right">{formatMoney(row.periodoComparativo)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: row.variacionMonto > 0 ? "green" : row.variacionMonto < 0 ? "red" : "inherit",
                      fontWeight: row.variacionMonto !== 0 ? 600 : 400
                    }}
                  >
                    {row.variacionMonto > 0 ? "+" : ""}{formatMoney(row.variacionMonto)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={formatPercent(row.variacionPorcentaje)}
                      color={getVariacionColor(row.variacionMonto, row.variacionPorcentaje)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{row.ejecutivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}