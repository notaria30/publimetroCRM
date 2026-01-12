// src/pages/campaigns/CampaignDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
} from "@mui/material";
import { getCampaignById } from "../../services/campaignService";

export default function CampaignDetailPage() {
  const { clientId, campId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    async function load() {
      try {
        const res = await getCampaignById(campId);
        setCampaign(res.data);
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message;

        console.error("Error cargando campaña:", status, msg, err);

        if (status === 403) {
          setError("No tienes permiso para ver esta campaña.");
          return;
        }

        if (status === 404) {
          setError("Campaña no encontrada.");
          return;
        }

        setError("Error cargando campaña.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [campId]);

  if (loading)
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6">Cargando campaña…</Typography>
      </Box>
    );

  if (!campaign)
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error">
          Campaña no encontrada.
        </Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 4 }}>
      <Button
        variant="outlined"
        sx={{ mb: 3 }}
        onClick={() => navigate(`/clients/${clientId}/campaigns`)}
      >
        Volver a campañas
      </Button>
      {/* Título */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          alignItems: "center",
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          {campaign.nombre}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() =>
            navigate(`/clients/${clientId}/campaigns/${campId}/edit`)
          }
        >
          Editar campaña
        </Button>
      </Box>

      {/* Card principal */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Cliente
              </Typography>
              <Typography variant="h6">
                {campaign.client?.nombreComercial}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="h6">
                {campaign.status === "planificada" && "Planificada"}
                {campaign.status === "en_curso" && "En curso"}
                {campaign.status === "finalizada" && "Finalizada"}
                {campaign.status === "cancelada" && "Cancelada"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Fecha de inicio
              </Typography>
              <Typography variant="body1">
                {campaign.fechaInicio?.substring(0, 10) || "—"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Fecha de fin
              </Typography>
              <Typography variant="body1">
                {campaign.fechaFin?.substring(0, 10) || "—"}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Descripción
          </Typography>
          <Typography variant="body1">
            {campaign.descripcion || "Sin descripción"}
          </Typography>
          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Formatós
          </Typography>
          <Typography variant="body1">
            {campaign.formatos?.length ? campaign.formatos.join(", ") : "—"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Periodicidad
          </Typography>
          <Typography variant="body1">
            {campaign.periodicidad || "—"}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary">
            Cortesías
          </Typography>
          <Typography variant="body1">
            {campaign.cortesias || "—"}
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
}
