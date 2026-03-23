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

export default function AdvertisingReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);

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

      {/* Tabla de resultados */}
      {!loading && data.length > 0 && (
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