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
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { getAdvertisingReport, getReportClients } from "../../services/reportService";

// Importar recharts
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function AdvertisingReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("year").toISOString(),
    endDate: dayjs().toISOString(),
    clientId: "all",
    tipoPublicidad: "all",
    formato: "all",
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

  // Ejecutar reporte
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        clientId: filters.clientId,
        tipoPublicidad: filters.tipoPublicidad,
        formato: filters.formato,
      };
      const res = await getAdvertisingReport(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de tipo de publicidad a colores
  const getTipoPublicidadColor = (tipo) => {
    switch (tipo) {
      case "pagada":
        return "success";
      case "intercambio":
        return "warning";
      case "cortesias":
        return "info";
      case "desarrollo_informativo":
        return "secondary";
      default:
        return "default";
    }
  };

  // Mapeo de tipo de publicidad a texto legible
  const getTipoPublicidadLabel = (tipo) => {
    switch (tipo) {
      case "pagada":
        return "Pagada";
      case "intercambio":
        return "Intercambio";
      case "cortesias":
        return "Cortesías";
      case "desarrollo_informativo":
        return "Desarrollo informativo";
      default:
        return tipo;
    }
  };

  // Mapeo de tipo a color para gráficas
  const getChartColor = (tipo) => {
    switch (tipo) {
      case "pagada":
        return "#4caf50";
      case "intercambio":
        return "#ff9800";
      case "cortesias":
        return "#2196f3";
      case "desarrollo_informativo":
        return "#9c27b0";
      default:
        return "#757575";
    }
  };

  // ============================================
  // PREPARAR DATOS PARA GRÁFICAS
  // ============================================

  // Gráfica 1: Distribución por tipo de publicidad
  const tipoCount = data.reduce((acc, item) => {
    const tipo = item.tipoPublicidad;
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {});

  const pieChartData = Object.entries(tipoCount).map(([tipo, count]) => ({
    name: getTipoPublicidadLabel(tipo),
    value: count,
    tipo,
  }));

  // Gráfica 2: Distribución por formato
  const formatoCount = data.reduce((acc, item) => {
    const formato = item.formato;
    acc[formato] = (acc[formato] || 0) + 1;
    return acc;
  }, {});

  const barChartData = Object.entries(formatoCount).map(([formato, count]) => ({
    name: formato,
    cantidad: count,
  })).sort((a, b) => b.cantidad - a.cantidad);

  // Calcular resumen estadístico
  const totalRegistros = data.length;
  const tiposUnicos = Object.keys(tipoCount).length;
  const formatosUnicos = Object.keys(formatoCount).length;
  
  // Top cliente con más publicidad
  const clienteCount = data.reduce((acc, item) => {
    acc[item.cliente] = (acc[item.cliente] || 0) + 1;
    return acc;
  }, {});
  const topCliente = Object.entries(clienteCount).sort((a, b) => b[1] - a[1])[0];

  // Distribución porcentual por tipo
  const tipoPorcentajes = pieChartData.map(item => ({
    ...item,
    porcentaje: ((item.value / totalRegistros) * 100).toFixed(1),
  }));

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
                <InputLabel>Tipo publicidad</InputLabel>
                <Select
                  value={filters.tipoPublicidad}
                  label="Tipo publicidad"
                  onChange={(e) => setFilters({ ...filters, tipoPublicidad: e.target.value })}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="pagada">Pagada</MenuItem>
                  <MenuItem value="intercambio">Intercambio</MenuItem>
                  <MenuItem value="cortesias">Cortesías</MenuItem>
                  <MenuItem value="desarrollo_informativo">Desarrollo informativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Formato</InputLabel>
                <Select
                  value={filters.formato}
                  label="Formato"
                  onChange={(e) => setFilters({ ...filters, formato: e.target.value })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="1/2 plana">1/2 plana</MenuItem>
                  <MenuItem value="cintillo">Cintillo</MenuItem>
                  <MenuItem value="1/4 plana">1/4 plana</MenuItem>
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
              <Typography variant="caption" color="text.secondary">Total publicaciones</Typography>
              <Typography variant="h6" fontWeight={700}>{totalRegistros}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3e5f5" }}>
              <Typography variant="caption" color="text.secondary">Tipos de publicidad</Typography>
              <Typography variant="h6" fontWeight={700}>{tiposUnicos}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
              <Typography variant="caption" color="text.secondary">Formatos utilizados</Typography>
              <Typography variant="h6" fontWeight={700}>{formatosUnicos}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
              <Typography variant="caption" color="text.secondary">Cliente más activo</Typography>
              <Typography variant="h6" fontWeight={700} noWrap title={topCliente?.[0] || "N/A"}>
                {topCliente ? (topCliente[0].length > 20 ? topCliente[0].substring(0, 20) + "..." : topCliente[0]) : "N/A"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {topCliente ? `${topCliente[1]} publicaciones` : ""}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICAS - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Gráfica 1: Distribución por tipo de publicidad (Pie) - CORREGIDA */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Distribución por tipo de publicidad
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Porcentaje de cada tipo sobre el total de publicaciones
                </Typography>
                <Box sx={{ width: "100%", height: 380 }}>
                  <ResponsiveContainer>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent, value }) => {
                          const percentValue = (percent * 100).toFixed(0);
                          return `${name}: ${percentValue}% (${value})`;
                        }}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getChartColor(entry.tipo)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => {
                        const total = pieChartData.reduce((sum, d) => sum + d.value, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return [`${value} publicaciones (${percentage}%)`, name];
                      }} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry) => {
                          const item = pieChartData.find(d => d.name === value);
                          const percentage = item ? ((item.value / totalRegistros) * 100).toFixed(1) : 0;
                          return `${value}: ${percentage}%`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                {/* Tabla de porcentajes - más legible */}
                <Box sx={{ mt: 2, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}>
                  <Grid container spacing={1}>
                    {tipoPorcentajes.map((item, idx) => (
                      <Grid size={{ xs: 12 }} key={idx}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: getChartColor(item.tipo) }} />
                            <Typography variant="body2" fontWeight={500}>
                              {item.name}:
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            <strong>{item.porcentaje}%</strong> ({item.value} publicaciones)
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfica 2: Distribución por formato (Barras) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Distribución por formato
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Cantidad de publicaciones por formato publicitario
                </Typography>
                <Box sx={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} publicaciones`, "Cantidad"]} />
                      <Legend />
                      <Bar dataKey="cantidad" name="Publicaciones" fill="#007A3E" radius={[8, 8, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#007A3E" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                  Total de publicaciones: {totalRegistros}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

      {/* Tabla de resultados - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#007A3E" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Tipo publicidad</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Formato</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.fecha}</TableCell>
                  <TableCell>{row.cliente}</TableCell>
                  <TableCell>
                    <Chip
                      label={getTipoPublicidadLabel(row.tipoPublicidad)}
                      color={getTipoPublicidadColor(row.tipoPublicidad)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.formato}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}