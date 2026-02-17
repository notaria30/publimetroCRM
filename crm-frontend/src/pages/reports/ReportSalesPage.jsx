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
import { getClients, getClientById } from "../../services/clientService";
import { getUsers } from "../../services/userService";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // Cambio normal
    setFilters((prev) => ({ ...prev, [name]: value }));

    // ✅ Si cambió el cliente, autollenar tipoCliente y ejecutivo
    if (name === "cliente") {
      if (!value) {
        // si eligen "Todos", limpiamos autollenados (opcional)
        setFilters((prev) => ({
          ...prev,
          cliente: "",
          tipoCliente: "",
          ejecutivo: "",
        }));
        return;
      }

      try {
        const res = await getClientById(value);
        const client = res.data;
        setFilters((prev) => ({
          ...prev,
          cliente: value,
          tipoCliente: client?.tipoCliente || "",
          ejecutivo: client?.assignedTo?._id || client?.assignedTo || "",
        }));
      } catch (err) {
        console.error("Error autollenando cliente:", err);
      }
    }
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
  const handleExportExcel = () => {
    // Hoja detalle
    const detalle = data.map((s) => ({
      Cliente: s.client?.nombreComercial || "",
      Ejecutivo: s.assignedTo?.name || "",
      "Folio cotización": s.quote?.folio || "",
      Etapa: s.pipelineStage || "",
      Fecha: s.createdAt ? s.createdAt.slice(0, 10) : "",
      Monto: s.monto || 0,
      Pagado:
        s.pagado === true ? "Pagado" : s.pagado === false ? "Pendiente" : "Sin factura",
    }));

    // Hoja por ejecutivo (desde stats)
    const porEjecutivo = Object.entries(stats?.porEjecutivo || {}).map(
      ([name, info]) => ({
        Ejecutivo: name,
        Operaciones: info?.count || 0,
        "Monto total": info?.totalMonto || 0,
      })
    );

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(detalle);
    const ws2 = XLSX.utils.json_to_sheet(porEjecutivo);

    XLSX.utils.book_append_sheet(wb, ws1, "Detalle");
    XLSX.utils.book_append_sheet(wb, ws2, "Por Ejecutivo");

    const file = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([file], { type: "application/octet-stream" }),
      `reporte_ventas_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const toChartDataNumber = (obj) =>
    Object.keys(obj || {}).map((key) => ({
      name: key,
      value: obj[key],
    }));

  const toChartDataAmount = (obj) =>
    Object.keys(obj || {}).map((key) => ({
      name: key,
      count: obj[key]?.count || 0,
      totalMonto: obj[key]?.totalMonto || 0,
    }));

  // Métricas simples derivadas de stats
  const kpis = useMemo(() => {
    if (!stats) return null;

    const totalOperaciones = data.length;
    const totalClientes = Object.keys(stats.porCliente || {}).length;
    const totalEjecutivos = Object.keys(stats.porEjecutivo || {}).length;

    const totalMonto = data.reduce((acc, s) => acc + (s.monto || 0), 0);
    const ticketPromedio = totalOperaciones ? totalMonto / totalOperaciones : 0;

    return {
      totalOperaciones,
      totalClientes,
      totalEjecutivos,
      totalMonto,
      ticketPromedio,
    };
  }, [stats, data]);


  return (
    <Box width="100%" maxWidth="1800px" mx="auto" mt={4} px={3} pb={6}>
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
        <CardContent sx={{ p: 3 }}>
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
            <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "stretch", md: "center" } }}>
              <Button variant="contained" onClick={handleSearch}>
                Aplicar filtros
              </Button>

              <Button
                variant="outlined"
                onClick={handleExportExcel}
                disabled={!data.length}
              >
                Exportar Excel
              </Button>
            </Stack>
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
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  gutterBottom
                >
                  Ventas registradas
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {kpis.totalOperaciones}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de operaciones consideradas en el periodo filtrado.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardContent sx={{ p: 3 }}>
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
              <CardContent sx={{ p: 3 }}>
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
        <Grid container spacing={4} mb={4}>
          {/* Ventas por Cliente */}
          <Grid item xs={12} md={7}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Cliente
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={toChartDataNumber(stats.porCliente)}
                      margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                      <XAxis
                        dataKey="name"
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Ventas por Ejecutivo */}
          <Grid item xs={12} md={7}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Ejecutivo
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <BarChart data={toChartDataAmount(stats.porEjecutivo)}
                      margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                      <XAxis
                        dataKey="name"
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalMonto" name="Monto total" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tipo de Cliente */}
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" mb={1.5}>
                  Distribución por Tipo de Cliente
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={toChartDataNumber(stats.porTipoCliente)}
                        dataKey="value"
                        nameKey="name"
                        label
                      >
                        {toChartDataNumber(stats.porTipoCliente).map((entry, i) => (
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
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" mb={1.5}>
                  Ventas por Mes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ width: "100%", height: 420 }}>
                  <ResponsiveContainer>
                    <LineChart data={toChartDataAmount(stats.porMes)}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="totalMonto" name="Monto total" />
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
        <CardContent sx={{ p: 3 }}>
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
                  <TableCell>Cotización</TableCell>
                  <TableCell>Etapa</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Pago</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No hay resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((sale) => (
                    <TableRow key={sale._id} hover>
                      <TableCell>{sale.client?.nombreComercial}</TableCell>
                      <TableCell>{sale.assignedTo?.name}</TableCell>
                      <TableCell>Folio {sale.quote?.folio}</TableCell>
                      <TableCell>{sale.pipelineStage}</TableCell>
                      <TableCell>
                        {sale.createdAt
                          ? sale.createdAt.slice(0, 10)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {typeof sale.monto === "number"
                          ? sale.monto.toLocaleString("es-MX", { style: "currency", currency: "MXN" })
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {sale.pagado === true && <Chip size="small" label="Pagado" />}
                        {sale.pagado === false && <Chip size="small" label="Pendiente" />}
                        {sale.pagado === null && <Chip size="small" label="Sin factura" />}
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