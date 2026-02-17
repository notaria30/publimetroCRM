import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInvoice } from "../../services/invoiceService";
import { getClients } from "../../services/clientService";
import { getQuotes } from "../../services/quoteService";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  FormControlLabel,
  Switch,
} from "@mui/material";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function InvoiceCreatePage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const isoToDayjs = (iso) => (iso ? dayjs(iso) : null);
  const dayjsToISO = (d) => (d ? d.toISOString() : "");
  const [paymentManuallyEdited, setPaymentManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    client: "",
    quote: "",
    numeroFactura: "",
    fechaFactura: "",
    metodoPago: "PUE",
    formaPago: "",
    importeSinIVA: "",
    importeConIVA: "",
    pagado: false,
    fechaPago: "",
    importePago: "",
  });

  /** CARGAR CLIENTES */
  useEffect(() => {
    async function loadClients() {
      const res = await getClients();
      setClients(res.data);
    }
    loadClients();
  }, []);

  /** CARGAR COTIZACIONES SEGÚN CLIENTE */
  useEffect(() => {
    if (!form.client) return;

    const cli = clients.find((c) => c._id === form.client);
    setSelectedClient(cli);

    async function loadQuotes() {
      const res = await getQuotes();
      const filtered = res.data.filter((q) => {
        const quoteClientId = q.client?._id || q.client;
        return quoteClientId === form.client;
      });
      setQuotes(filtered);
    }

    loadQuotes();
  }, [form.client, clients]);

  /** AUTOCOMPLETAR DATOS DE COTIZACION */
  useEffect(() => {
    if (!form.quote) {
      setForm((prev) => ({
        ...prev,
        formaPago: "",
        metodoPago: "PUE", // valor default si no hay cotización
      }));
      return;
    }

    const selectedQuote = quotes.find((q) => q._id === form.quote);
    if (!selectedQuote) return;

    const importe = selectedQuote.total || 0;

    setForm((prev) => ({
      ...prev,
      importeSinIVA: importe,
      importeConIVA: Number((importe * 1.16).toFixed(2)),
      formaPago: paymentManuallyEdited ? prev.formaPago : (selectedQuote.formaPago || ""),
      metodoPago: paymentManuallyEdited ? prev.metodoPago : (selectedQuote.metodoPago || "PUE"),
    }));
  }, [form.quote, quotes]);


  /** CALCULAR IVA AUTOMATICO SI IMPORTE SIN IVA CAMBIA */
  useEffect(() => {
    if (!form.importeSinIVA) return;

    const base = Number(form.importeSinIVA);
    const conIVA = Number((base * 1.16).toFixed(2));

    setForm((prev) => ({
      ...prev,
      importeConIVA: conIVA,
    }));
  }, [form.importeSinIVA]);


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "formaPago" || name === "metodoPago") {
      setPaymentManuallyEdited(true);
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createInvoice(form);
      navigate("/invoices");
    } catch (error) {
      alert(error.response?.data?.message || "Error al crear factura");
    }
  };

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Crear Factura
      </Typography>

      <Button variant="outlined" sx={{ mb: 3 }} onClick={() => navigate("/invoices")}>
        Volver
      </Button>

      <Card elevation={3}>
        <CardContent>
          <form onSubmit={handleSubmit}>

            {/* CLIENTE */}
            <Typography variant="h6" fontWeight={700} mb={2}>
              Cliente
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    name="client"
                    value={form.client}
                    label="Cliente"
                    onChange={handleChange}
                    required
                  >
                    {clients.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.nombreComercial}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedClient && (
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="RFC"
                    value={selectedClient.rfc}
                    disabled
                  />
                </Grid>
              )}
            </Grid>

            {/* COTIZACION */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Cotización Ligada
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Cotización</InputLabel>
                  <Select
                    name="quote"
                    value={form.quote}
                    label="Cotización"
                    onChange={handleChange}
                  >
                    {quotes.length === 0 && (
                      <MenuItem disabled>No hay cotizaciones</MenuItem>
                    )}

                    {quotes.map((q) => (
                      <MenuItem key={q._id} value={q._id}>
                        Folio {q.folio} – ${q.total}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* DATOS FACTURA */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Datos de Factura
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Número de factura"
                  name="numeroFactura"
                  value={form.numeroFactura}
                  onChange={handleChange}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Fecha factura"
                  value={isoToDayjs(form.fechaFactura)}
                  onChange={(newValue) => {
                    setForm((prev) => ({
                      ...prev,
                      fechaFactura: dayjsToISO(newValue),
                    }));
                  }}
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputLabelProps: { shrink: true },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Método de pago</InputLabel>
                  <Select
                    name="metodoPago"
                    value={form.metodoPago}
                    label="Método de pago"
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="PUE">PUE - Pago en una sola exhibición</MenuItem>
                    <MenuItem value="PPD">PPD - Pago en parcialidades o diferido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Forma de pago</InputLabel>
                  <Select
                    name="formaPago"
                    value={form.formaPago}
                    label="Forma de pago"
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="Efectivo">Efectivo</MenuItem>
                    <MenuItem value="Transferencia">Transferencia</MenuItem>
                    <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                    <MenuItem value="Cheque">Cheque</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Importe sin IVA"
                  name="importeSinIVA"
                  value={form.importeSinIVA}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Importe con IVA"
                  value={form.importeConIVA}
                  disabled
                />
              </Grid>
            </Grid>

            {/* PAGO */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Pago
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={form.pagado}
                  onChange={(e) => setForm({ ...form, pagado: e.target.checked })}
                />
              }
              label={form.pagado ? "Pagado" : "No pagado"}
            />

            {form.pagado && (
              <Grid container spacing={3} mt={1}>
                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Fecha pago"
                    value={isoToDayjs(form.fechaPago)}
                    onChange={(newValue) => {
                      setForm((prev) => ({
                        ...prev,
                        fechaPago: dayjsToISO(newValue),
                      }));
                    }}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputLabelProps: { shrink: true },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Importe pagado"
                    name="importePago"
                    value={form.importePago}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            )}

            {/* BOTONES */}
            <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="contained" size="large" type="submit">
                Guardar Factura
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/invoices")}
              >
                Cancelar
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
