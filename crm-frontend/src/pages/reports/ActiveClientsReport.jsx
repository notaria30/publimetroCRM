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

export default function ActiveClientsReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [search, setSearch] = useState("");

  const handleSearch = async () => {
    setLoading(true);
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

  useEffect(() => {
    handleSearch();
  }, []);

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

  return (
    <Box>
      {/* Tarjetas de resumen */}
      {resumen && !loading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
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

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: "#2E7D32", color: "white" }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Clientes activos
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {resumen.activos}
                </Typography>
                <Typography variant="caption">
                  Con ventas en últimos {resumen.periodoDias} días
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
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
        </Grid>
      )}

      {/* Filtro de búsqueda */}
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

      {/* Mensaje de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabla de resultados */}
      {!loading && filteredData.length > 0 && (
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

      {/* Mensaje sin datos */}
      {!loading && filteredData.length === 0 && !error && (
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