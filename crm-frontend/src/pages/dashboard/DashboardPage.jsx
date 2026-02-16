// src/pages/dashboard/DashboardPage.jsx

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

import {
  getDashboardOverview,
  getDashboardPipeline,
  getDashboardBilling,
  getDashboardClients,
  getDashboardQuotes,
} from "../../services/dashboardService";

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [billing, setBilling] = useState(null);
  const [clientsStats, setClientsStats] = useState(null);
  const [quotesStats, setQuotesStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, plRes, biRes, clRes, quRes] = await Promise.all([
          getDashboardOverview(),
          getDashboardPipeline(),
          getDashboardBilling(),
          getDashboardClients(),
          getDashboardQuotes(),
        ]);

        setOverview(ovRes.data);
        setPipeline(plRes.data);
        setBilling(biRes.data);
        setClientsStats(clRes.data);
        setQuotesStats(quRes.data);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setError("No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return <Typography sx={{ p: 4 }}>Cargando dashboard...</Typography>;
  if (error) return <Typography sx={{ p: 4 }}>{error}</Typography>;

  const KPI_ITEMS = [
    { label: "Total Clientes", value: overview.totalClientes, color: "#00C26A", icon: "👥" },
    { label: "Ventas Cerradas", value: overview.ventasCerradas, color: "#008F4F", icon: "💼" },
    { label: "Total Cotizaciones", value: overview.totalCotizaciones, color: "#1976D2", icon: "🧾" },
{ 
  label: "Total Facturado", 
  value: `$${overview.totalFacturado.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`, 
  color: "#00663A", 
  icon: "💵" 
},
{ 
  label: "Pendiente de Pago", 
  value: `$${overview.totalPendiente.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`, 
  color: "#B00020", 
  icon: "⏳" 
},

  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* TITLE */}
      <Typography variant="h4" fontWeight={700} mb={4}>
        Dashboard General
      </Typography>

      {/* KPI GRID - Más pequeño */}
      <Grid container spacing={2} mb={4}>
        {KPI_ITEMS.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={i}>
            <Card
              sx={{
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${kpi.color}, #ffffff 130%)`,
                color: "white",
                minHeight: 110,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {kpi.icon} {kpi.label}
              </Typography>
              <Typography
                variant="h5"
                fontWeight={700}
                mt={0.5}
                sx={{ fontSize: "1.8rem" }}
              >
                {kpi.value}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* PIPELINE */}
      <Typography variant="h5" fontWeight={700} mb={2}>
        Pipeline de Ventas
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#008F4F" }}>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>
                Etapa
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>
                Cantidad
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow hover>
              <TableCell>Prospección</TableCell>
              <TableCell>{pipeline.prospeccion}</TableCell>
            </TableRow>

            <TableRow hover>
              <TableCell>Presentación</TableCell>
              <TableCell>{pipeline.presentacion}</TableCell>
            </TableRow>

            <TableRow hover>
              <TableCell>Propuesta</TableCell>
              <TableCell>{pipeline.propuesta}</TableCell>
            </TableRow>

            <TableRow hover>
              <TableCell>Cierre</TableCell>
              <TableCell>{pipeline.cierre}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* BILLING */}
      <Typography variant="h5" fontWeight={700} mb={2}>
        Facturación
      </Typography>

      <Card sx={{ p: 2, borderRadius: 2, mb: 4 }}>
        <Typography sx={{ fontSize: 18, mb: 1 }}>
          <strong style={{ color: "#008F4F" }}>Pagado:</strong>{" "}
          ${billing.pagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </Typography>

        <Typography sx={{ fontSize: 18, mb: 1 }}>
          <strong style={{ color: "#B00020" }}>Pendiente:</strong>{" "}
          ${billing.pendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </Typography>

        {billing.pagado + billing.pendiente > 0 && (
          <Typography sx={{ fontSize: 18 }}>
            <strong style={{ color: "#1976D2" }}>Porcentaje Cobrado:</strong>{" "}
            {(
              (billing.pagado / (billing.pagado + billing.pendiente)) *
              100
            ).toFixed(1)}
            %
          </Typography>
        )}
      </Card>

      {/* CLIENTES Y COTIZACIONES */}
      <Typography variant="h5" fontWeight={700} mb={2}>
        Clientes y Cotizaciones
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Clientes activos
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={1}>
              {clientsStats.activos}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Nuevos este mes
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={1}>
              {clientsStats.nuevosMes}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Cotizaciones del mes
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={1}>
              {quotesStats.cotizacionesMes}
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
