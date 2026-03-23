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

export default function ComparativeReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);

  const [filters, setFilters] = useState({
    periodoBase: "mensual",
    periodoComparativo: "mensual",
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
    const sign = value > 0 ? "+" : "";
    return `${sign}${(value * 100).toFixed(2)}%`;
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
      return `Comparando mismo mes de ${currentYear - 1} vs ${currentYear}`;
    }
    return `Comparando ${filters.periodoBase} vs ${filters.periodoComparativo}`;
  };

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

      {/* Tabla de resultados */}
      {!loading && data.length > 0 && (
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