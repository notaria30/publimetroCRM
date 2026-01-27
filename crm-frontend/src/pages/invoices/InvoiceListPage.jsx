// src/pages/invoices/InvoiceListPage.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInvoices } from "../../services/invoiceService";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getInvoices();
        setInvoices(res.data);
      } catch (error) {
        console.error("Error cargando facturas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading)
    return (
      <Typography sx={{ p: 4 }} variant="body1">
        Cargando facturas...
      </Typography>
    );

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    const cliente = String(inv.client?.nombreComercial || "").toLowerCase();
    const folio = String(inv.quote?.folio || "").toLowerCase();
    const numFactura = String(inv.numeroFactura || "").toLowerCase();
    const fecha = String(inv.fechaFactura?.slice(0, 10) || "").toLowerCase();
    const importe = String(inv.importeConIVA ?? "").toLowerCase();

    // si quieres que también busque "si/no" por pagado:
    const pagado = inv.pagado ? "si" : "no";

    return (
      cliente.includes(q) ||
      folio.includes(q) ||
      numFactura.includes(q) ||
      fecha.includes(q) ||
      importe.includes(q) ||
      pagado.includes(q)
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h4" fontWeight={700}>
          Facturación
        </Typography>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          {/* ✅ BUSCADOR */}
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (cliente, folio, factura, fecha, importe)…"
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
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/invoices/new"
            sx={{ textTransform: "none" }}
          >
            Crear nueva factura
          </Button>
        </Box>
      </Box>

      {/* TABLA */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#0B8A42" }}>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Cliente
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Folio Cotización
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Número Factura
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Fecha
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Importe
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Pagado
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No hay facturas registradas
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv._id} hover>
                  <TableCell>{inv.client?.nombreComercial}</TableCell>
                  <TableCell>{inv.quote?.folio}</TableCell>
                  <TableCell>{inv.numeroFactura}</TableCell>
                  <TableCell>
                    {inv.fechaFactura?.slice(0, 10) || "—"}
                  </TableCell>
                  <TableCell>
                    ${inv.importeConIVA?.toLocaleString("es-MX")}
                  </TableCell>

                  <TableCell>
                    {inv.pagado ? (
                      <Chip label="Sí" color="success" size="small" />
                    ) : (
                      <Chip label="No" color="error" size="small" />
                    )}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      component={Link}
                      to={`/invoices/${inv._id}`}
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
