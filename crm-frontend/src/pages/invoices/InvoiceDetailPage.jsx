import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoiceById } from "../../services/invoiceService";

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
} from "@mui/material";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await getInvoiceById(id);
      setInvoice(res.data);
    }
    load();
  }, [id]);

  if (!invoice)
    return (
      <Typography variant="h6" textAlign="center" mt={4}>
        Cargando factura...
      </Typography>
    );

  return (
    <Box maxWidth="1100px" mx="auto" mt={4} px={3}>
      {/* TÍTULO */}
      <Typography variant="h4" fontWeight={700} mb={3}>
        Factura #{invoice.numeroFactura}
      </Typography>

      <Button variant="outlined" sx={{ mb: 3 }} onClick={() => navigate("/invoices")}>
        Volver
      </Button>

      <Card elevation={3}>
        <CardContent>
          {/* DATOS DEL CLIENTE */}
          <Typography variant="h6" fontWeight={700} mb={2}>
            Datos del Cliente
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Cliente</Typography>
              <Typography>{invoice.client?.nombreComercial}</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>RFC</Typography>
              <Typography>{invoice.client?.rfc}</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Folio Cotización</Typography>
              <Typography>Folio {invoice.quote?.folio}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* IMPORTES */}
          <Typography variant="h6" fontWeight={700} mb={2}>
            Importes
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Fecha Factura</Typography>
              <Typography>{invoice.fechaFactura?.slice(0, 10)}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Importe sin IVA</Typography>
              <Typography>${invoice.importeSinIVA}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Importe con IVA</Typography>
              <Typography>${invoice.importeConIVA}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* ESTATUS DE PAGO */}
          <Typography variant="h6" fontWeight={700} mb={2}>
            Pago
          </Typography>
          
          <Grid item xs={12} md={4}>
            <Typography fontWeight={600}>Método de pago</Typography>
            <Typography>{invoice.metodoPago || "—"}</Typography>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Pagado</Typography>
              <Chip
                label={invoice.pagado ? "Pagado" : "Pendiente"}
                color={invoice.pagado ? "success" : "warning"}
              />
            </Grid>

            {invoice.pagado && (
              <>
                <Grid item xs={12} md={4}>
                  <Typography fontWeight={600}>Fecha de Pago</Typography>
                  <Typography>{invoice.fechaPago?.slice(0, 10)}</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography fontWeight={600}>Importe Pagado</Typography>
                  <Typography>${invoice.importePago}</Typography>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
