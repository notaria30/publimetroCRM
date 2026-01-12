import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkers, upsertGoal, getGoals } from "../../services/goalsService";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Stack,
  Divider,
  LinearProgress,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";


function monthToLabel(ym) {
  // ym: "YYYY-MM"
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "long" });
}

function getCurrentMonthYM() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportGoalsAdminPage() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    user: "",
    month: getCurrentMonthYM(),
    goalAmount: "",
    goalClosedDeals: "",
  });

  const currencyMXN = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }),
    []
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, gRes] = await Promise.all([getWorkers(), getGoals()]);
      setWorkers(wRes.data.workers || []);
      setGoals(gRes.data.goals || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOwner) {
      navigate("/reports"); // o "/dashboard"
    }
  }, [isOwner, navigate]);


  // Si ya existe meta para user+month, precarga inputs
  useEffect(() => {
    if (!form.user || !form.month) return;

    const existing = goals.find(
      (g) =>
        (g.user?._id || g.user) === form.user &&
        g.month === form.month
    );

    if (existing) {
      setForm((prev) => ({
        ...prev,
        goalAmount: String(existing.goalAmount ?? ""),
        goalClosedDeals: String(existing.goalClosedDeals ?? ""),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        goalAmount: "",
        goalClosedDeals: "",
      }));
    }
  }, [form.user, form.month, goals]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.user) return alert("Selecciona un vendedor");
    if (!form.month) return alert("Selecciona el mes");

    setSaving(true);
    try {
      await upsertGoal({
        user: form.user,
        month: form.month,
        goalAmount: Number(form.goalAmount || 0),
        goalClosedDeals: Number(form.goalClosedDeals || 0),
      });
      await loadAll();
      alert("Meta guardada ✅");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Error guardando meta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Asignar metas a vendedores
        </Typography>

        <Button variant="outlined" onClick={() => navigate("/reports")}>
          Volver
        </Button>
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
          ) : (
            <>
              <Typography variant="h6" fontWeight={800} mb={2}>
                Nueva meta / Actualizar meta
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Vendedor</InputLabel>
                    <Select
                      name="user"
                      value={form.user}
                      label="Vendedor"
                      onChange={handleChange}
                    >
                      {workers.map((u) => (
                        <MenuItem key={u._id} value={u._id}>
                          {u.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Mes"
                    views={["year", "month"]}
                    value={form.month ? dayjs(`${form.month}-01`) : null}
                    onChange={(newValue) => {
                      // newValue es dayjs
                      const ym = newValue ? newValue.format("YYYY-MM") : "";
                      setForm((p) => ({ ...p, month: ym }));
                    }}
                    format="MM/YYYY" // ✅ como se ve al usuario
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: form.month ? monthToLabel(form.month) : "Selecciona un mes",
                        InputLabelProps: { shrink: true },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Meta $ (MXN)"
                    name="goalAmount"
                    value={form.goalAmount}
                    onChange={handleChange}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Meta cerradas"
                    name="goalClosedDeals"
                    value={form.goalClosedDeals}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>

              <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar meta"}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={800} mb={2}>
                Metas existentes
              </Typography>

              {goals.length === 0 ? (
                <Paper sx={{ p: 3, borderRadius: 2, bgcolor: "#fafafa" }}>
                  <Typography color="text.secondary">
                    Aún no hay metas guardadas.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={2}>
                  {goals
                    .slice()
                    .sort((a, b) => (b.month || "").localeCompare(a.month || ""))
                    .map((g) => (
                      <Grid item xs={12} md={6} key={g._id}>
                        <Paper sx={{ p: 2, borderRadius: 2 }}>
                          <Typography fontWeight={800}>
                            {g.user?.name || "—"}{" "}
                            <span style={{ fontWeight: 500, color: "#666" }}>
                              ({monthToLabel(g.month)})
                            </span>
                          </Typography>

                          <Typography color="text.secondary" mt={1}>
                            Meta $: <strong>{currencyMXN.format(g.goalAmount || 0)}</strong>{" "}
                            · Meta cerradas: <strong>{g.goalClosedDeals || 0}</strong>
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
