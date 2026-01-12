// src/pages/reports/ReportMetasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMetas } from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

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
  Chip,
} from "@mui/material";

function ymNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthToLabel(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "long" });
}

export default function ReportMetasPage() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const [month, setMonth] = useState(ymNow());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 🔐 Solo OWNER
  useEffect(() => {
    if (!isOwner) navigate("/reports");
  }, [isOwner, navigate]);

  if (!isOwner) return null;

  const currencyMXN = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }),
    []
  );

  const load = async (ym) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await getMetas({ month: ym });

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
  };

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // KPIs globales (sumando a todos)
  const summary = useMemo(() => {
    const totals = data.reduce(
      (acc, v) => {
        acc.totalVentas += Number(v?.totalVentas || 0);
        acc.totalMonto += Number(v?.totalMonto || 0);
        acc.ventasCerradas += Number(v?.ventasCerradas || 0);
        acc.montoCerrado += Number(v?.montoCerrado || 0);

        acc.goalAmount += Number(v?.goal?.goalAmount || 0);
        acc.goalDeals += Number(v?.goal?.goalClosedDeals || 0);
        return acc;
      },
      {
        totalVentas: 0,
        totalMonto: 0,
        ventasCerradas: 0,
        montoCerrado: 0,
        goalAmount: 0,
        goalDeals: 0,
      }
    );

    const ticketPromedio = totals.totalVentas > 0 ? totals.totalMonto / totals.totalVentas : 0;
    const closeRate = totals.totalVentas > 0 ? (totals.ventasCerradas / totals.totalVentas) * 100 : 0;

    const progressAmount = totals.goalAmount > 0 ? Math.min(100, (totals.montoCerrado / totals.goalAmount) * 100) : 0;
    const progressDeals = totals.goalDeals > 0 ? Math.min(100, (totals.ventasCerradas / totals.goalDeals) * 100) : 0;

    return { ...totals, ticketPromedio, closeRate, progressAmount, progressDeals };
  }, [data]);

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight={800}>
          Metas por Vendedor
        </Typography>

        <Button variant="outlined" onClick={() => navigate("/reports")}>
          Volver
        </Button>
      </Stack>

      {/* Selector de mes */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        mb={3}
      >
        <DatePicker
          label="Mes"
          views={["year", "month"]}
          value={month ? dayjs(`${month}-01`) : null}
          onChange={(newValue) => setMonth(newValue ? newValue.format("YYYY-MM") : ymNow())}
          format="MM/YYYY"
          slotProps={{
            textField: {
              fullWidth: true,
              helperText: monthToLabel(month),
              InputLabelProps: { shrink: true },
            },
          }}
        />

        <Chip label={`Mes: ${monthToLabel(month)}`} />
      </Stack>

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
            </Paper>
          ) : (
            <>
              {/* Resumen */}
              <Typography variant="h6" fontWeight={800} mb={2}>
                Resumen del mes
              </Typography>

              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography color="text.secondary">Total vendido</Typography>
                    <Typography fontWeight={900} fontSize={22}>
                      {currencyMXN.format(summary.totalMonto)}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      Ticket promedio: <strong>{currencyMXN.format(summary.ticketPromedio)}</strong>
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography color="text.secondary">Monto cerrado</Typography>
                    <Typography fontWeight={900} fontSize={22}>
                      {currencyMXN.format(summary.montoCerrado)}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      % cierre: <strong>{summary.closeRate.toFixed(1)}%</strong>
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography color="text.secondary">Ventas</Typography>
                    <Typography fontWeight={900} fontSize={22}>
                      {summary.totalVentas}
                    </Typography>
                    <Typography color="text.secondary" mt={1}>
                      Cerradas: <strong>{summary.ventasCerradas}</strong>
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography color="text.secondary">Progreso vs metas</Typography>

                    <Typography variant="body2" mt={1}>
                      Monto: <strong>{summary.progressAmount.toFixed(0)}%</strong>
                    </Typography>
                    <LinearProgress variant="determinate" value={summary.progressAmount} />

                    <Typography variant="body2" mt={2}>
                      Cerradas: <strong>{summary.progressDeals.toFixed(0)}%</strong>
                    </Typography>
                    <LinearProgress variant="determinate" value={summary.progressDeals} />
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Vendedores */}
              <Typography variant="h6" fontWeight={800} mb={2}>
                Vendedores
              </Typography>

              {data.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, bgcolor: "#fafafa" }}>
                  <Typography color="text.secondary">No hay datos disponibles</Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {data.map((v) => {
                    const name = v?.name || "—";

                    const totalVentas = Number(v?.totalVentas || 0);
                    const totalMonto = Number(v?.totalMonto || 0);
                    const ventasCerradas = Number(v?.ventasCerradas || 0);
                    const montoCerrado = Number(v?.montoCerrado || 0);

                    const goalAmount = Number(v?.goal?.goalAmount || 0);
                    const goalDeals = Number(v?.goal?.goalClosedDeals || 0);

                    const pAmount = goalAmount > 0 ? Math.min(100, (montoCerrado / goalAmount) * 100) : 0;
                    const pDeals = goalDeals > 0 ? Math.min(100, (ventasCerradas / goalDeals) * 100) : 0;

                    return (
                      <Grid item xs={12} md={6} key={v?._id || name}>
                        <Paper sx={{ p: 2, borderRadius: 2 }}>
                          <Typography fontWeight={900} fontSize={18}>
                            {name}
                          </Typography>

                          <Typography color="text.secondary" mt={1}>
                            Ventas: <strong>{totalVentas}</strong> · Cerradas: <strong>{ventasCerradas}</strong>
                          </Typography>

                          <Typography mt={1}>
                            <strong>Total vendido:</strong> {currencyMXN.format(totalMonto)}
                          </Typography>

                          <Typography color="text.secondary" mt={0.5}>
                            Monto cerrado: <strong>{currencyMXN.format(montoCerrado)}</strong>
                          </Typography>

                          <Divider sx={{ my: 1.5 }} />

                          <Typography variant="body2">
                            Meta monto: <strong>{currencyMXN.format(goalAmount)}</strong>{" "}
                            <span style={{ color: "#666" }}>({pAmount.toFixed(0)}%)</span>
                          </Typography>
                          <LinearProgress variant="determinate" value={pAmount} />

                          <Typography variant="body2" mt={1.5}>
                            Meta cerradas: <strong>{goalDeals}</strong>{" "}
                            <span style={{ color: "#666" }}>({pDeals.toFixed(0)}%)</span>
                          </Typography>
                          <LinearProgress variant="determinate" value={pDeals} />
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
