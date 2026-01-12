// src/pages/reports/ReportsHomePage.jsx

import { Link } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";


export default function ReportsHomePage() {
  const { isOwner } = useAuth();
const reports = [
  { name: "Reporte de Ventas", path: "/reports/sales" },
  { name: "Proyecciones", path: "/reports/projections" },
  { name: "Clientes Activos", path: "/reports/clientes-activos" },
  { name: "Publicidad", path: "/reports/publicidad" },
  { name: "Activaciones", path: "/reports/activaciones" },
  { name: "Analítica", path: "/reports/analytics" },
  ...(isOwner ? [{ name: "Metas por Vendedor", path: "/reports/metas" }] : []),
  ...(isOwner ? [{ name: "Asignar metas (Admin)", path: "/reports/goals-admin" }] : []),
];


  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      {/* TÍTULO */}
      <Typography variant="h4" fontWeight={700} mb={3}>
        📊 Reportes
      </Typography>

      {/* GRID DE TARJETAS */}
      <Grid container spacing={3}>
        {reports.map((r) => (
          <Grid item xs={12} sm={6} md={4} key={r.path}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 2,
                minHeight: 140,
                transition: "0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea component={Link} to={r.path}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {r.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mt={1}
                  >
                    Ver más información →
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* BOTÓN VOLVER */}
      <Box mt={4}>
        <Button
          variant="outlined"
          component={Link}
          to="/dashboard"
          sx={{ fontWeight: 600 }}
        >
          Volver
        </Button>
      </Box>
    </Box>
  );
}
