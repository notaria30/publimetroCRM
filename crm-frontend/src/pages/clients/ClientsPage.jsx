// src/pages/clients/ClientsPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClients } from "../../services/clientService";
import { useAuth } from "../../context/AuthContext";

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
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function ClientsPage() {
  const { isOwner, isWorker } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Buscador
  const [search, setSearch] = useState("");

  const loadClients = async () => {
    try {
      const res = await getClients();
      setClients(res.data);
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Normaliza texto para buscar (minúsculas + sin acentos)
  const normalize = (str = "") =>
    String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // MISMA PALETA QUE COTIZACIONES (chips)
  const getStatusChip = (status) => {
    const value = status || "prospeccion";
    const label = value.charAt(0).toUpperCase() + value.slice(1);

    const colors = {
      prospeccion: "#F28C0F",
      presentacion: "#007BFF",
      negociacion: "#6C63FF",
      cerrado: "#2E7D32",
    };

    return (
      <Chip
        label={label}
        sx={{
          backgroundColor: colors[value] || "#9e9e9e",
          color: "white",
          fontWeight: 600,
        }}
      />
    );
  };

  // ✅ Importante: hooks SIEMPRE arriba, antes de returns condicionales
  const filteredClients = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return clients;

    return clients.filter((client) => {
      const haystack = [
        client.nombreComercial,
        client.razonSocial,
        client.rfc,
        client.status,
        client.assignedTo?.name,
      ]
        .filter(Boolean)
        .map(normalize)
        .join(" ");

      return haystack.includes(q);
    });
  }, [clients, search]);

  // ✅ Ahora sí, return condicional al final
  if (loading)
    return (
      <Typography variant="body1" sx={{ p: 4 }}>
        Cargando clientes...
      </Typography>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        gap={2}
        flexWrap="wrap"
      >
        <Typography variant="h4" fontWeight={700}>
          Clientes
        </Typography>

        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          {/* ✅ BUSCADOR */}
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente (nombre, razón social, RFC, estatus, ejecutivo)…"
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

          {(isOwner || isWorker) && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#007BFF",
                textTransform: "none",
                fontSize: 15,
                px: 3,
                py: 1,
                borderRadius: "8px",
              }}
              component={Link}
              to="/clients/new"
            >
              Nuevo Cliente
            </Button>
          )}
        </Box>
      </Box>

      {/* contador */}
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.75 }}>
        Mostrando {filteredClients.length} de {clients.length}
      </Typography>

      {/* TABLA */}
      <TableContainer
        component={Paper}
        elevation={2}
        sx={{ borderRadius: "12px", overflow: "hidden" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#0C8F44" }}>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Nombre Comercial
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Razón Social
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                RFC
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Estatus
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Ejecutivo Asignado
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredClients.map((client) => (
              <TableRow
                key={client._id}
                hover
                sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}
              >
                <TableCell>{client.nombreComercial}</TableCell>
                <TableCell>{client.razonSocial}</TableCell>
                <TableCell>{client.rfc}</TableCell>

                <TableCell>{getStatusChip(client.status)}</TableCell>
                <TableCell>{client.assignedTo?.name || "N/A"}</TableCell>

                <TableCell>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: "none", borderRadius: "8px", px: 2 }}
                      component={Link}
                      to={`/clients/${client._id}`}
                    >
                      Ver
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: "none", borderRadius: "8px", px: 2 }}
                      component={Link}
                      to={`/clients/${client._id}/campaigns`}
                    >
                      Campañas
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 4 }}>
                  <Typography align="center" sx={{ opacity: 0.7 }}>
                    No se encontraron clientes con ese criterio.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
