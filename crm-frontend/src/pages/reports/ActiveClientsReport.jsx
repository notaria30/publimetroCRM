import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
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
  Button,
  TextField,
  InputAdornment,
} from "@mui/material";
import { getActiveClientsReport } from "../../services/reportService";
import SearchIcon from "@mui/icons-material/Search";

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

export default function ActiveClientsReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false); // 👈 NUEVO

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true); // 👈 MARCA QUE YA SE BUSCÓ
    try {
      const res = await getActiveClientsReport();
      setData(res.data.data);
      setResumen(res.data.resumen);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  };

  // 👈 ELIMINADO: useEffect que llamaba handleSearch automáticamente

  // Filtrar clientes por búsqueda
  const filteredData = data.filter((client) =>
    client.cliente.toLowerCase().includes(search.toLowerCase()) ||
    client.rfc?.toLowerCase().includes(search.toLowerCase())
  );

  // Formatear moneda
  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Color según estado
  const getEstadoColor = (estado) => {
    return estado === "Activo" ? "success" : "error";
  };

  // ============================================
  // PREPARAR DATOS PARA GRÁFICAS
  // ============================================

  // Gráfica 1: Distribución activos vs inactivos
  const pieChartData = [
    { name: "Activos", value: resumen?.activos || 0, color: "#2E7D32" },
    { name: "Inactivos", value: resumen?.inactivos || 0, color: "#D32F2F" },
  ];

  // Gráfica 2: Top 10 clientes por monto de ventas
  const topClientsBySales = [...data]
    .sort((a, b) => b.totalVentas - a.totalVentas)
    .slice(0, 10)
    .map(client => ({
      nombre: client.cliente.length > 20 ? client.cliente.substring(0, 20) + "..." : client.cliente,
      ventas: client.totalVentas,
      estado: client.estado,
      cantidadVentas: client.cantidadVentas,
    }));

  // Calcular estadísticas adicionales
  const totalVentasActivos = data
    .filter(c => c.estado === "Activo")
    .reduce((sum, c) => sum + c.totalVentas, 0);
  
  const promedioVentasActivos = resumen?.activos > 0 
    ? totalVentasActivos / resumen.activos 
    : 0;
  
  const clienteTop = topClientsBySales[0];
  const porcentajeActivos = resumen?.totalClientes > 0 
    ? (resumen.activos / resumen.totalClientes) * 100 
    : 0;

  return (
    <Box>
      {/* Botón para generar reporte */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading}
          sx={{ backgroundColor: "#007A3E" }}
        >
          {loading ? <CircularProgress size={24} /> : "Generar reporte"}
        </Button>
      </Box>

      {/* Tarjetas de resumen - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && resumen && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: "#007A3E", color: "white" }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Total clientes
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {resumen.totalClientes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: "#2E7D32", color: "white" }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Clientes activos
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {resumen.activos}
                </Typography>
                <Typography variant="caption">
                  {porcentajeActivos.toFixed(1)}% del total
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: "#D32F2F", color: "white" }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Clientes inactivos
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {resumen.inactivos}
                </Typography>
                <Typography variant="caption">
                  Sin ventas en últimos {resumen.periodoDias} días
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: "#FF9800", color: "white" }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Promedio por activo
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {formatMoney(promedioVentasActivos)}
                </Typography>
                <Typography variant="caption">
                  Ventas promedio clientes activos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICAS - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && data.length > 0 && resumen && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Gráfica 1: Distribución Activos vs Inactivos */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Distribución de clientes
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Activos vs Inactivos en últimos {resumen.periodoDias} días
                </Typography>
                <Box sx={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} clientes`, "Cantidad"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {resumen.activos} clientes activos generaron {formatMoney(totalVentasActivos)} en ventas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfica 2: Top 10 clientes por ventas */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Top 10 clientes por ventas
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Clientes con mayor facturación en últimos {resumen?.periodoDias || 90} días
                </Typography>
                <Box sx={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={topClientsBySales} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nombre" width={80} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === "ventas") return [formatMoney(value), "Ventas totales"];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Cliente: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="ventas" name="Ventas totales" fill="#007A3E">
                        {topClientsBySales.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.estado === "Activo" ? "#2E7D32" : "#D32F2F"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                {clienteTop && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                    🏆 Cliente líder: <strong>{clienteTop.nombre}</strong> con {formatMoney(clienteTop.ventas)} en ventas
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mensaje cuando no se ha generado reporte */}
      {!hasSearched && !loading && (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#f5f5f5" }}>
          <Typography color="text.secondary">
            Haz clic en "Generar reporte" para ver el análisis de clientes activos
          </Typography>
        </Paper>
      )}

      {/* Filtro de búsqueda - solo si ya se buscó */}
      {hasSearched && !loading && data.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre o RFC..."
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de resultados - solo si ya se buscó y hay datos */}
      {hasSearched && !loading && filteredData.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: "#007A3E" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>RFC</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Tipo de cliente</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  Estado
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Última venta</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="right">
                  Total ventas (90 días)
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">
                  N° ventas
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((client, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{client.cliente}</TableCell>
                  <TableCell>{client.rfc || "—"}</TableCell>
                  <TableCell>
                    <Chip 
                      label={client.tipoCliente} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={client.estado}
                      color={getEstadoColor(client.estado)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{client.ultimaVenta}</TableCell>
                  <TableCell align="right">{formatMoney(client.totalVentas)}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={client.cantidadVentas} 
                      size="small" 
                      color={client.cantidadVentas > 0 ? "primary" : "default"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mensaje sin datos después de buscar */}
      {hasSearched && !loading && filteredData.length === 0 && !error && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            {search ? "No se encontraron clientes con ese criterio" : "No hay clientes registrados"}
          </Typography>
        </Paper>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}