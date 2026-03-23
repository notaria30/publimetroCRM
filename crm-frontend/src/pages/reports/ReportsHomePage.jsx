import { useState } from "react";
import { Box, Tabs, Tab, Paper, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import SalesMonthlyReport from "./SalesMonthlyReport";
import ExecutiveReport from "./ExecutiveReport";
import ComparativeReport from "./ComparativeReport";
import AdvertisingReport from "./AdvertisingReport";
import ActiveClientsReport from "./ActiveClientsReport";
import GoalsAdminPage from "./GoalsAdminPage";

export default function ReportsHomePage() {
  const { isOwner } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { label: "Ventas mensuales", component: <SalesMonthlyReport /> },
    { label: "Ventas por ejecutivo", component: <ExecutiveReport /> },
    { label: "Comparativo ventas", component: <ComparativeReport /> },
    { label: "Publicidad", component: <AdvertisingReport /> },
    { label: "Clientes activos", component: <ActiveClientsReport /> },
  ];

  // Solo para OWNER, agregar pestaña de administración de metas
  if (isOwner) {
    tabs.push({ label: "Administrar metas", component: <GoalsAdminPage /> });
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Reportes
      </Typography>

      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#f5f5f5" }}
        >
          {tabs.map((tab, i) => (
            <Tab key={i} label={tab.label} />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabs[tabValue]?.component}
        </Box>
      </Paper>
    </Box>
  );
}