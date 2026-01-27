// src/pages/sales/SalesListPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/salesService";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [facturadoFilter, setFacturadoFilter] = useState("all"); // all | yes | no
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await getSales();
        setSales(res.data);
      } catch (err) {
        console.error("Error cargando ventas:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);


  const getPaidChip = (paid) => {
    return paid ? (
      <Chip label="Sí" color="success" />
    ) : (
      <Chip label="No" color="error" />
    );
  };
  const PIPELINE_LABELS = {
    prospeccion: "Prospección",
    acercamiento: "Acercamiento",
    presentacion_contacto_indicado: "Presentación",
    propuesta_comercial: "Propuesta comercial",
    negociacion_cierre: "Negociación",
    documentacion_contrato: "Contrato",
    facturacion: "Facturación",
    pago: "Pago",
    cierre: "Cierre",
    servicio_post_venta: "Post-venta",
  };

  const PIPELINE_COLORS = {
    prospeccion: "warning",
    acercamiento: "info",
    presentacion_contacto_indicado: "info",
    propuesta_comercial: "secondary",
    negociacion_cierre: "secondary",
    documentacion_contrato: "primary",
    facturacion: "primary",
    pago: "success",
    cierre: "success",
    servicio_post_venta: "success",
  };

  const getPipelineChip = (stage) => {
    return (
      <Chip
        label={PIPELINE_LABELS[stage] || stage}
        color={PIPELINE_COLORS[stage] || "default"}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const getFacturadoChip = (fact) =>
    fact ? <Chip label="Sí" color="success" /> : <Chip label="No" color="error" />;

  const isFacturado = (sale) => Boolean(sale.facturado);
  const filteredSales = sales.filter((s) => {
    // ✅ 1) filtro facturado
    const fact = isFacturado(s);
    if (facturadoFilter === "yes" && fact !== true) return false;
    if (facturadoFilter === "no" && fact !== false) return false;

    // ✅ 2) filtro buscador
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const folio = String(s.folio || s._id || "").toLowerCase();
    const cliente = String(s.client?.nombreComercial || "").toLowerCase();
    const total = String(s.quote?.total ?? "").toLowerCase();
    const pipeline = String(PIPELINE_LABELS[s.pipelineStage] || s.pipelineStage || "").toLowerCase();

    // Si quieres buscar también por “Sí/No” de pagada/facturado:
    const pagada = s.paid ? "si" : "no";
    const facturadoTxt = isFacturado(s) ? "si" : "no";

    return (
      folio.includes(q) ||
      cliente.includes(q) ||
      total.includes(q) ||
      pipeline.includes(q) ||
      pagada.includes(q) ||
      facturadoTxt.includes(q)
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Ventas
        </Typography>

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          {/* ✅ BUSCADOR */}
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (folio, cliente, total, pipeline)…"
            size="small"
            sx={{
              width: { xs: "100%", sm: 420 },
              backgroundColor: "white",
              borderRadius: "10px",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {/* ✅ FILTRO FACTURADO (se queda) */}
          <FormControl size="small" sx={{ minWidth: 180, backgroundColor: "white", borderRadius: "10px" }}>
            <InputLabel>Facturado</InputLabel>
            <Select
              label="Facturado"
              value={facturadoFilter}
              onChange={(e) => setFacturadoFilter(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="yes">Sí</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* TABLA ESTILO COTIZACIONES */}
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead sx={{ backgroundColor: "#007A3E" }}>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Cliente</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Total</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Pipeline</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Pagada</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Facturado</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No hay ventas registradas aún
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale._id} hover>
                  <TableCell>{sale.folio || sale._id}</TableCell>

                  <TableCell>{sale.client?.nombreComercial || "—"}</TableCell>

                  <TableCell>
                    ${(sale.quote?.total || 0).toLocaleString("es-MX")}
                  </TableCell>

                  <TableCell>{getPipelineChip(sale.pipelineStage)}</TableCell>

                  <TableCell>{getPaidChip(sale.paid)}</TableCell>

                  <TableCell>{getFacturadoChip(isFacturado(sale))}</TableCell>

                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/sales/${sale._id}`}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
