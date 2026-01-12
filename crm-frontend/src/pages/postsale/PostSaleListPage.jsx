// src/pages/postsale/PostSaleListPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPostSales } from "../../services/postSaleService";

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Divider,
} from "@mui/material";

export default function PostSaleListPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getPostSales();
      setList(res.data);
      setLoading(false);
    }
    load();
  }, []);

  // Etiquetas y colores por etapa (ajusta a tus stages reales si tienes otros)
  const stageMeta = {
    servicio_post_venta: { label: "Servicio Post-Venta", color: "info" },
    medicion_resultados: { label: "Medición de resultados", color: "primary" },
    encuesta_satisfaccion: { label: "Encuesta de satisfacción", color: "secondary" },
    renovacion: { label: "Renovación", color: "warning" },
    reportes: { label: "Reportes", color: "success" },
    cerrado: { label: "Cerrado", color: "default" },
  };


  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "—";

  const getStageChip = (stage) => {
    const key = stage || "";
    const meta = stageMeta[key];
    return {
      label: meta?.label || (key ? key.replace(/_/g, " ") : "Sin etapa"),
      color: meta?.color || "default",
    };
  };


  if (loading)
    return (
      <Typography variant="h6" textAlign="center" mt={4}>
        Cargando post-venta...
      </Typography>
    );

  return (
    <Box maxWidth="1300px" mx="auto" mt={4} px={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight={700} mb={3}>
          Post-Venta
        </Typography>

        <Button
          variant="contained"
          component={Link}
          to="/postsale/create"
          sx={{ fontWeight: 600 }}
        >
          Nueva Post-Venta
        </Button>
      </Stack>

      {list.length === 0 ? (
        <Typography variant="h6" textAlign="center" mt={5} opacity={0.6}>
          No hay registros post-venta
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {list.map((item) => {
            const stageChip = getStageChip(item.postSaleStage);

            // Si tu encuesta tiene estructura: { calificacion, comentarios }
            const rating =
              item?.encuestaSatisfaccion?.calificacion ??
              item?.encuestaSatisfaccion?.rating ??
              null;

            // Renovación: { requiereRenovacion, fechaPosibleRenovacion }
            const requiresRenewal =
              item?.renovacion?.requiereRenovacion ??
              item?.renovacion?.requiere ??
              false;

            const renewalDate =
              item?.renovacion?.fechaPosibleRenovacion ??
              item?.renovacion?.fecha ??
              null;

            // Venta/folio si viene poblada
            const saleFolio =
              item?.sale?.folio ||
              item?.sale?.folioVenta ||
              item?.sale?._id ||
              null;

            return (
              <Grid item xs={12} md={6} lg={4} key={item._id}>
                <Card
                  elevation={4}
                  sx={{
                    borderRadius: 3,
                    p: 2,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardContent sx={{ p: 0, flexGrow: 1 }}>
                    {/* HEADER */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          noWrap
                          title={item.client?.nombreComercial || "—"}
                        >
                          {item.client?.nombreComercial || "—"}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mt={0.5}
                        >
                          Ejecutivo:{" "}
                          <strong>{item.assignedTo?.name || "—"}</strong>
                        </Typography>
                      </Box>

                      <Chip
                        label={stageChip.label}
                        color={stageChip.color}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          textTransform: "capitalize",
                          mt: 0.5,
                        }}
                      />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* INFO EN DOS COLUMNAS */}
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Actualizado
                        </Typography>
                        <Typography fontWeight={700}>
                          {formatDate(item.updatedAt)}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Venta
                        </Typography>
                        <Typography fontWeight={700}>
                          {saleFolio ? String(saleFolio) : "—"}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Calificación
                        </Typography>
                        <Typography fontWeight={700}>
                          {rating !== null && rating !== undefined ? rating : "—"}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Renovación
                        </Typography>
                        <Typography fontWeight={700}>
                          {requiresRenewal ? "Sí" : "No"}
                        </Typography>
                      </Grid>

                      {requiresRenewal && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Fecha posible de renovación
                          </Typography>
                          <Typography fontWeight={700}>
                            {formatDate(renewalDate)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>

                    {/* (Opcional) preview de notas */}
                    {item?.notas?.trim?.() ? (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.notas}
                        </Typography>
                      </>
                    ) : null}
                  </CardContent>

                  {/* FOOTER BOTONES */}
                  <Stack direction="row" gap={1.5} mt={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      component={Link}
                      to={`/postsale/${item._id}`}
                      sx={{ fontWeight: 700 }}
                    >
                      Ver detalles
                    </Button>

                    {/* Si tienes ruta de editar, descomenta */}
                    {/*
                    <Button
                      fullWidth
                      variant="contained"
                      component={Link}
                      to={`/postsale/${item._id}/edit`}
                      sx={{ fontWeight: 700 }}
                    >
                      Editar
                    </Button>
                    */}
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
