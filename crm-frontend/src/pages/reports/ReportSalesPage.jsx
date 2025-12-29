import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getSalesReport } from "../../services/reportService";
import { getClients } from "../../services/clientService";
import { getUsers } from "../../services/userService";

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
} from "@mui/material";

function ReportSalesPage() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    cliente: "",
    tipoCliente: "",
    formato: "",
    ejecutivo: "",
    fechaInicio: "",
    fechaFin: "",
    pagado: "",
  });
  const [stats, setStats] = useState(null);

  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);

  useEffect(() => {
    async function loadFilters() {
      try {
        const c = await getClients();
        setClients(c.data || []);

        const u = await getUsers();
        setExecutives(u.data || []);
      } catch (err) {
        console.error("Error cargando filtros:", err);
      }
    }
    loadFilters();
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async () => {
    try {
      const res = await getSalesReport(filters);
      setData(res.data.ventas || []);
      setStats(res.data.stats || null);
    } catch (err) {
      console.error("Error cargando reporte de ventas:", err);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0"];

  const toChartData = (obj) =>
    Object.keys(obj || {}).map((key) => ({
      name: key,
      value: obj[key],
    }));

  const sumValues = (obj) =>
    Object.values(obj || {}).reduce((acc, v) => acc + v, 0);

  // Métricas simples derivadas de stats
  const kpis = useMemo(() => {
    if (!stats) return null;

    const totalVentas = sumValues(stats.porCliente || {});
    const totalClientes = Object.keys(stats.porCliente || {}).length;
    const totalEjecutivos = Object.keys(stats.porEjecutivo || {}).length;

    return {
      totalVentas,
      totalClientes,
      totalEjecutivos,
    };
  }, [stats]);

  return (
    <Box maxWidth="1400px" mx="auto" mt={4} px={3} pb={6}>
      {/* HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Reporte de Ventas
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Explora el desempeño comercial por cliente, ejecutivo y periodo.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => window.history.back()}
          sx={{ fontWeight: 600 }}
        >
          Volver
        </Button>
      </Box>

      {/* FILTROS */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            flexDirection={{ xs: "column", md: "row" }}
            mb={2}
            gap={1}
          >
            <Typography variant="h6" fontWeight={700}>
              Filtros
            </Typography>
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{ alignSelf: { xs: "stretch", md: "center" } }}
            >
              Aplicar filtros
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Cliente"
                name="cliente"
                value={filters.cliente}
                onChange={handleChange}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {clients.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.nombreComercial}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2.5 }}>
              <TextField
                select
                fullWidth
                label="Tipo de cliente"
                name="tipoCliente"
                value={filters.tipoCliente}
                onChange={handleChange}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="iniciativa privada">
                  Iniciativa Privada
                </MenuItem>
                <MenuItem value="gobierno">Gobierno</MenuItem>
                <MenuItem value="corporativo">Corporativo</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Ejecutivo"
                name="ejecutivo"
                value={filters.ejecutivo}
                onChange={handleChange}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {executives.map((e) => (
                  <MenuItem key={e._id} value={e._id}>
                    {e.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Formato"
                name="formato"
                placeholder="Ej: banner, página, extra"
                value={filters.formato}
                onChange={handleChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Fecha inicio"
                name="fechaInicio"
                value={filters.fechaInicio}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Fecha fin"
                name="fechaFin"
                value={filters.fechaFin}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label="Estado de pago"
                name="pagado"
                value={filters.pagado}
                onChange={handleChange}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="true">Pagado</MenuItem>
                <MenuItem value="false">Pendiente</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* MÉTRICAS RESUMEN */}
      {kpis && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardContent>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  gutterBottom
                >
                  Ventas registradas
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {kpis.totalVentas}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de operaciones consideradas en el periodo filtrado.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardContent>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  gutterBottom
                >
                  Clientes con ventas
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {kpis.totalClientes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Número de clientes que registran al menos una venta.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardContent>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  gutterBottom
                >
                  Ejecutivos activos
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {kpis.totalEjecutivos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ejecutivos con actividad en el periodo.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* GRÁFICAS */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          {/* Ventas por Cliente */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Cliente
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={toChartData(stats.porCliente)}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Ventas por Ejecutivo */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Ejecutivo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={toChartData(stats.porEjecutivo)}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tipo de Cliente */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" mb={1.5}>
                  Distribución por Tipo de Cliente
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={toChartData(stats.porTipoCliente)}
                        dataKey="value"
                        nameKey="name"
                        label
                      >
                        {toChartData(stats.porTipoCliente).map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            // colores default de recharts, dejamos que se encargue
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Ventas por Mes */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Mes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={toChartData(stats.porMes)}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TABLA DETALLE */}
      <Card elevation={3}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" fontWeight={700}>
              Detalle de ventas
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`${data.length} registro${data.length === 1 ? "" : "s"}`}
                size="small"
              />
            </Stack>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Ejecutivo</TableCell>
                  <TableCell>Formato</TableCell>
                  <TableCell>Cotización</TableCell>
                  <TableCell>Etapa</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No hay resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((sale) => (
                    <TableRow key={sale._id} hover>
                      <TableCell>{sale.client?.nombreComercial}</TableCell>
                      <TableCell>{sale.assignedTo?.name}</TableCell>
                      <TableCell>
                        {sale.quote?.tarifas
                          ?.map((t) => t.formato)
                          .join(", ")}
                      </TableCell>
                      <TableCell>Folio {sale.quote?.folio}</TableCell>
                      <TableCell>{sale.pipelineStage}</TableCell>
                      <TableCell>
                        {sale.createdAt
                          ? sale.createdAt.slice(0, 10)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ReportSalesPage;
