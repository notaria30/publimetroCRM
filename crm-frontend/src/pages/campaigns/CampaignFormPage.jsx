// src/pages/campaigns/CampaignFormPage.jsx

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { createCampaign, updateCampaign, getCampaignById } from "../../services/campaignService";
import { getClients } from "../../services/clientService";

export default function CampaignFormPage() {
  const { clientId, campId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(campId);

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState({
    nombre: "",
    client: "",
    fechaInicio: "",
    fechaFin: "",
    status: "planificada",
    descripcion: "",
    formatos: [],
    periodicidad: "",
    cortesias: "",
  });

  // Cargar clientes y campaña (si aplica)
  useEffect(() => {
    async function load() {
      try {
        const clientsRes = await getClients();
        setClients(clientsRes.data);

        if (isEdit) {
          const res = await getCampaignById(campId);

          const c = res.data;

          setForm({
            nombre: c.nombre || "",
            client: c.client?._id || "",
            fechaInicio: c.fechaInicio?.substring(0, 10) || "",
            fechaFin: c.fechaFin?.substring(0, 10) || "",
            status: c.status || "planificada",
            descripcion: c.descripcion || "",
            formatos: c.formatos || [],
            periodicidad: c.periodicidad || "",
            cortesias: c.cortesias || "",
          });
        }
      } catch (err) {
        console.error("Error cargando formulario:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [campId, isEdit]);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (!form.nombre.trim() || !form.client) {
        return alert("Completa nombre y cliente");
      }

      let res;

      if (isEdit) {
        res = await updateCampaign(campId, form);
        alert("Campaña actualizada");
      } else {
        // IMPORTANTE: usa el cliente seleccionado en el form
        // (si quieres forzar clientId de params, lo hacemos luego, pero esto es lo correcto)
        res = await createCampaign({ ...form, client: form.client || clientId });
        alert("Campaña creada");
      }

      // Normalizar: algunos backends responden {campaign: ...} y otros responden directamente la campaña
      const campaign = res?.data?.campaign ?? res?.data;

      if (!campaign?._id) {
        console.error("Respuesta inesperada al guardar campaña:", res?.data);
        return alert("La campaña se guardó, pero la respuesta del servidor no trae el ID.");
      }

      const resolvedClientId = campaign.client?._id ?? campaign.client ?? (form.client || clientId);

      navigate(`/clients/${resolvedClientId}/campaigns/${campaign._id}`);
    } catch (err) {
      console.error("Error guardando campaña:", err);
      alert("Error al guardar");
    }
  };


  if (loading)
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Cargando…</Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        {isEdit ? "Editar campaña" : "Nueva campaña"}
      </Typography>

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre de la campaña"
                name="nombre"
                fullWidth
                value={form.nombre}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2.6 }}>
              <TextField
                select
                label="Cliente"
                name="client"
                fullWidth
                value={form.client}
                onChange={handleChange}
              >
                {clients.map((cl) => (
                  <MenuItem key={cl._id} value={cl._id}>
                    {cl.nombreComercial}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField
                type="date"
                label="Fecha inicio"
                name="fechaInicio"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={form.fechaInicio}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={6} md={3}>
              <TextField
                type="date"
                label="Fecha fin"
                name="fechaFin"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={form.fechaFin}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2.2 }}>
              <TextField
                select
                label="Status"
                name="status"
                fullWidth
                value={form.status}
                onChange={handleChange}
              >
                <MenuItem value="planificada">Planificada</MenuItem>
                <MenuItem value="en_curso">En curso</MenuItem>
                <MenuItem value="finalizada">Finalizada</MenuItem>
                <MenuItem value="cancelada">Cancelada</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 10.5 }}>
              <TextField
                label="Descripción"
                name="descripcion"
                fullWidth
                multiline
                minRows={3}
                value={form.descripcion}
                onChange={handleChange}
              />
            </Grid>
            {/* FORMATOS */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Formatos"
                fullWidth
                name="formatos"
                value={form.formatos.join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    formatos: e.target.value.split(",").map(f => f.trim()),
                  })
                }
              />
            </Grid>

            {/* PERIODICIDAD */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Periodicidad"
                fullWidth
                name="periodicidad"
                value={form.periodicidad}
                onChange={handleChange}
              />
            </Grid>

            {/* CORTESIAS */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Cortesías"
                fullWidth
                name="cortesias"
                value={form.cortesias}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={handleSubmit}>
                {isEdit ? "Guardar cambios" : "Crear campaña"}
              </Button>

              <Button
                sx={{ ml: 2 }}
                variant="outlined"
                onClick={() => navigate(`/clients/${clientId}/campaigns`)}
              >
                Cancelar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
