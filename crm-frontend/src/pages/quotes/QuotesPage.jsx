// src/pages/quotes/QuotesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { getQuotes, approveQuote, rejectQuote } from "../../services/quoteService";
import { useAuth } from "../../context/AuthContext";

export default function QuotesPage() {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState("todas");
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: buscador
  const [search, setSearch] = useState("");

  const loadQuotes = async () => {
    try {
      const res = await getQuotes();
      setQuotes(res.data);
    } catch (err) {
      console.error("Error cargando cotizaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveQuote(id);
      loadQuotes();
    } catch (err) {
      alert("Error al aprobar cotización");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectQuote(id);
      loadQuotes();
    } catch (err) {
      alert("Error al rechazar cotización");
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  // Normaliza texto para buscar (minúsculas + sin acentos)
  const normalize = (str = "") =>
    String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Colors para chips
  const statusChip = {
    aprobado: { label: "Aprobada", color: "success" },
    pendiente: { label: "Pendiente", color: "warning" },
    rechazado: { label: "Rechazada", color: "error" },
  };

  // ✅ Primero filtra por TAB
  const tabFiltered = useMemo(() => {
    if (tab === "todas") return quotes;
    return quotes.filter((q) => q.status === tab);
  }, [quotes, tab]);

  // ✅ Luego aplica buscador dentro del TAB
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return tabFiltered;

    return tabFiltered.filter((item) => {
      const createdStr = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString()
        : "";

      const haystack = [
        item.folio,
        item.client?.nombreComercial,
        item.client?.razonSocial,
        item.total != null ? Number(item.total).toFixed(2) : "",
        statusChip[item.status]?.label || item.status,
        createdStr,
      ]
        .filter(Boolean)
        .map(normalize)
        .join(" ");

      return haystack.includes(q);
    });
  }, [tabFiltered, search]);

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Cotizaciones
        </Typography>
        <Typography>Cargando...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Typography variant="h4" fontWeight={700}>
          Cotizaciones
        </Typography>

        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          {/* ✅ BUSCADOR */}
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (folio, cliente, total, status, fecha)…"
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
            component={Link}
            to="/quotes/new"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Nueva cotización
          </Button>
        </Box>
      </Box>

      {/* ✅ contador opcional (dentro del tab) */}
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.75 }}>
        Mostrando {filtered.length} de {tabFiltered.length} en "{tab === "todas" ? "Todas" : (statusChip[tab]?.label || tab)}"
      </Typography>

      {/* TABS */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            label={`Todas (${quotes.length})`}
            value="todas"
          />
          <Tab
            label={`Pendientes (${quotes.filter((q) => q.status === "pendiente").length})`}
            value="pendiente"
          />
          <Tab
            label={`Aprobadas (${quotes.filter((q) => q.status === "aprobado").length})`}
            value="aprobado"
          />
          <Tab
            label={`Rechazadas (${quotes.filter((q) => q.status === "rechazado").length})`}
            value="rechazado"
          />
        </Tabs>
      </Box>

      {/* TABLE */}
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#038449" }}>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Folio</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Cliente</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Total</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Creada</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Acciones</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filtered.map((q) => (
            <TableRow key={q._id} hover>
              <TableCell>{q.folio}</TableCell>
              <TableCell>{q.client?.nombreComercial || "—"}</TableCell>
              <TableCell>${q.total?.toFixed(2)}</TableCell>

              <TableCell>
                <Chip
                  label={statusChip[q.status]?.label || q.status}
                  color={statusChip[q.status]?.color || "default"}
                  size="small"
                />
              </TableCell>

              <TableCell>{new Date(q.createdAt).toLocaleDateString()}</TableCell>

              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    component={Link}
                    to={`/quotes/${q._id}`}
                    variant="outlined"
                    size="small"
                  >
                    Ver
                  </Button>

                  {isOwner && q.status === "pendiente" && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleApprove(q._id)}
                      >
                        Aprobar
                      </Button>

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleReject(q._id)}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}

          {/* ✅ estado vacío */}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} sx={{ py: 4 }}>
                <Typography align="center" sx={{ opacity: 0.7 }}>
                  No se encontraron cotizaciones con ese criterio en este tab.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Container>
  );
}
