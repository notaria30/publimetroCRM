// src/pages/reports/ReportMetasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { getMetas } from "../../services/reportService";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Divider,
  LinearProgress,
} from "@mui/material";

export default function ReportMetasPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await getMetas();

        // Acepta varias formas de respuesta para no romper:
        const vendedores =
          res?.data?.vendedores ||
          res?.data?.data ||
          res?.data ||
          [];

        setData(Array.isArray(vendedores) ? vendedores : []);
      } catch (e) {
        console.error(e);
        setErrorMsg(e?.response?.data?.message || "Error cargando metas");
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currencyMXN = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }),
    []
  );

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Metas por Vendedor
      </Typography>

      <Card elevation={3}>
        <CardContent>
          {loading ? (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography fontWeight={700} mb={2}>
                Cargando…
              </Typography>
              <LinearProgress />
            </Paper>
          ) : errorMsg ? (
            <Paper sx={{ p: 4, borderRadius: 2, bgcolor: "#fff3f3" }}>
              <Typography variant="h6" color="error" fontWeight={700}>
                {errorMsg}
              </Typography>
              <Typography color="text.secondary" mt={1}>
                Revisa el endpoint <strong>/reports/metas</strong> en backend.
              </Typography>
            </Paper>
          ) : data.length === 0 ? (
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
              {data.map((v) => {
                const totalVentas = Number(v?.totalVentas ?? 0) || 0;
                const totalMonto = Number(v?.totalMonto ?? 0) || 0;
                const ventasCerradas = Number(v?.ventasCerradas ?? 0) || 0;
                const montoCerrado = Number(v?.montoCerrado ?? 0) || 0;

                return (
                  <Grid item xs={12} md={6} key={v?._id || v?.email || v?.name}>
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
                      <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                          Ventas: <strong>{totalVentas}</strong> · Cerradas: <strong>{ventasCerradas}</strong>
                        </Typography>

                        <Typography variant="body1" mt={1}>
                          <strong>Total vendido:</strong>{" "}
                          <span style={{ color: "#1976d2", fontSize: "22px", fontWeight: 800 }}>
                            {currencyMXN.format(totalMonto)}
                          </span>
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Monto cerrado: <strong>{currencyMXN.format(montoCerrado)}</strong>
                        </Typography>

                      </Stack>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

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
