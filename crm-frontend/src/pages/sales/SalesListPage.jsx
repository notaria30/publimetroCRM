// src/pages/sales/SalesListPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSales } from "../../services/salesService";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from "@mui/material";

export default function SalesListPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

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


  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER IGUAL QUE COTIZACIONES */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Typography variant="h4" fontWeight={700}>
          Ventas
        </Typography>

        {/* En ventas no hay botón, pero si lo quieres solo descomenta esto */}
        {/*
        <Button variant="contained" color="primary">
          Nueva Venta
        </Button>
        */}
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
              <TableCell sx={{ color: "white", fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No hay ventas registradas aún
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale._id} hover>
                  <TableCell>{sale.folio || sale._id}</TableCell>

                  <TableCell>{sale.client?.nombreComercial || "—"}</TableCell>

                  <TableCell>
                    ${(sale.quote?.total || 0).toLocaleString("es-MX")}
                  </TableCell>

                  <TableCell>{getPipelineChip(sale.pipelineStage)}</TableCell>

                  <TableCell>{getPaidChip(sale.paid)}</TableCell>

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
