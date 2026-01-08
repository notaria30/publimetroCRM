// src/pages/reports/ReportMetasPage.jsx

import { useEffect, useState } from "react";
import { getMetas } from "../../services/reportService";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
} from "@mui/material";

export default function ReportMetasPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await getMetas();
      setData(res.data.vendedores);
    }
    load();
  }, []);

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>

      {/* TÍTULO */}
      <Typography variant="h4" fontWeight={700} mb={3}>
        Metas por Vendedor
      </Typography>

      {/* TARJETA PRINCIPAL */}
      <Card elevation={3}>
        <CardContent>

          {/* CONTENIDO */}
          {data.length === 0 ? (
            <Paper
              elevation={2}
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: "#fafafa",
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No hay datos disponibles
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {data.map((v) => (
                <Grid item xs={12} md={6} key={v._id}>
                  <Card
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: "white",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                      height: "100%",
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      {v.name || v.email || v._id}
                    </Typography>

                    <Typography variant="body1" mt={1}>
                      <strong>Total de ventas:</strong>{" "}
                      <span style={{ color: "#1976d2", fontSize: "20px" }}>
                        ${v.totalVentas.toLocaleString("es-MX")}
                      </span>
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* BOTÓN VOLVER */}
          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.history.back()}
            >
              Volver
            </Button>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}
