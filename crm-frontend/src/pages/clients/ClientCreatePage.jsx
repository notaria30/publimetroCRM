import { useState, useEffect } from "react";
import { getUsers } from "../../services/userService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Grid, TextField, Typography, MenuItem, FormControl, Select, InputLabel, Button, Card, CardContent, Box, FormControlLabel, Switch, Alert, Snackbar, IconButton } from "@mui/material";
import { createClient, checkRFC, checkClientName } from "../../services/clientService";
import CloseIcon from "@mui/icons-material/Close";


function ClientCreatePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const { isOwner, isWorker, user } = useAuth();
  const [rfcInfo, setRfcInfo] = useState(null);
  const [nameInfo, setNameInfo] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });


  const [form, setForm] = useState({
    nombreComercial: "",
    razonSocial: "",
    rfc: "",
    curp: "",
    direccion: {
      calleNumero: "",
      colonia: "",
      ciudad: "",
      estado: "",
      pais: "",
      cp: "",
      telefono: "",
    },
    regimen: "",
    agenciaODirecto: "",
    tipoCliente: "",
    tipoIndustria: "",
    contactos: {
      mercadotecnia: { nombre: "", email: "", celular: "" },
      diseno: { nombre: "", email: "", celular: "" },
      facturacion: { nombre: "", email: "", celular: "" },
    },
    clienteActivo: true,
    status: "prospeccion",
    assignedTo: "",
  });

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await getUsers();
        setUsers(res.data);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    }
    loadUsers();
  }, []);
  const INDUSTRIAS = [
    "autos",
    "inmobiliaria",
    "restaurantes",
    "hoteles",
    "tiendas departamentales",
    "tiendas de conveniencia",
    "hospitales",
    "opticas",
    "farmacias",
    "gimnasios",
    "clinicas",
    "escuelas",
    "universidades",
    "clubs deportivos",
    "eventos o espectaculos",
    "servicios financieros",
    "aseguradoras",
    "notarias",
    "talleres mecanicos",
    "distribuidoras de autos",
    "cursos o diplomados",
    "laboratorios medicos",
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "rfc") {
      setRfcInfo(null);
    }
    if (e.target.name === "nombreComercial") {
      setNameInfo(null);
    }
  };

  const handleDireccion = (e) => {
    setForm({
      ...form,
      direccion: { ...form.direccion, [e.target.name]: e.target.value },
    });
  };

  const handleContacto = (area, e) => {
    setForm({
      ...form,
      contactos: {
        ...form.contactos,
        [area]: {
          ...form.contactos[area],
          [e.target.name]: e.target.value,
        },
      },
    });
  };

  const handleRFCBlur = async () => {
    if (!form.rfc) return;

    try {
      const res = await checkRFC(form.rfc);
      setRfcInfo(res.data); // { exists, workerName }
    } catch (error) {
      console.error("Error validando RFC:", error);
    }
  };

  const handleNameBlur = async () => {
    if (!form.nombreComercial) return;

    try {
      const res = await checkClientName(form.nombreComercial);
      setNameInfo(res.data); // { exists, workerName }
    } catch (error) {
      console.error("Error validando Nombre Comercial:", error);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.regimen || !form.agenciaODirecto || !form.tipoCliente || !form.tipoIndustria) {
      alert("Completa Régimen, Agencia/Directo, Tipo de Cliente e Industria");
      return;
    }
    // Si RFC ya existe, bloqueamos el envío
    if (rfcInfo?.exists) {
      alert("Este RFC ya existe. No puedes registrar este cliente.");
      return;
    }
    if (nameInfo?.exists) {
      alert("Este Nombre Comercial ya existe. No puedes registrar este cliente.");
      return;
    }
    const payload = { ...form };
    if (isWorker) {
      payload.assignedTo = user._id;
    }
    try {
      await createClient(payload);

      setSnackbar({
        open: true,
        message: "Cliente creado correctamente",
        severity: "success",
      });

      setTimeout(() => {
        navigate("/clients");
      }, 1200);

    } catch (error) {
      console.error("Error creando cliente:", error);
      alert("Error creando cliente");
    }

  };

  return (
    <Box maxWidth="1200px" mx="auto" mt={4} px={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Nuevo Cliente
      </Typography>
      <Box mb={2}>
        <Button
          variant="outlined"
          onClick={() => navigate("/clients")}
          sx={{ fontWeight: 600 }}
        >
          Volver
        </Button>
      </Box>
      <Card elevation={3}>
        <CardContent>
          <form onSubmit={handleSubmit}>

            {/* DATOS GENERALES */}
            <Typography variant="h6" fontWeight={700} mt={2} mb={2}>
              Datos Generales
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Nombre Comercial"
                  fullWidth
                  name="nombreComercial"
                  value={form.nombreComercial}
                  onChange={handleChange}
                  onBlur={handleNameBlur}
                />
              </Grid>
              {/* ALERTA SI EL NOMBRE COMERCIAL YA EXISTE */}
              {nameInfo?.exists && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ fontWeight: 600 }}>
                    Este <strong>Nombre Comercial</strong> ya pertenece al Usuario:{" "}
                    <strong>{nameInfo.workerName}</strong>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <TextField
                  label="Razón Social"
                  fullWidth
                  name="razonSocial"
                  value={form.razonSocial}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="RFC"
                  fullWidth
                  name="rfc"
                  value={form.rfc}
                  onChange={handleChange}
                  onBlur={handleRFCBlur}
                />
              </Grid>

              {/* ⚠️ ALERTA SI EL RFC YA EXISTE */}
              {rfcInfo?.exists && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ fontWeight: 600 }}>
                    Este CLIENTE ya esta registrado con el Usuario:
                    {" "}
                    <strong>{rfcInfo.workerName}</strong>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <TextField
                  label="CURP"
                  fullWidth
                  name="curp"
                  value={form.curp}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* DIRECCIÓN */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Dirección
            </Typography>

            <Grid container spacing={3}>
              {[
                ["Calle y Número", "calleNumero"],
                ["Colonia", "colonia"],
                ["Ciudad", "ciudad"],
                ["Estado", "estado"],
                ["País", "pais"],
                ["CP", "cp"],
                ["Teléfono", "telefono"],
              ].map(([label, key]) => (
                <Grid item xs={12} md={4} key={key}>
                  <TextField
                    label={label}
                    fullWidth
                    name={key}
                    value={form.direccion[key]}
                    onChange={handleDireccion}
                  />
                </Grid>
              ))}
            </Grid>

            {/* CLASIFICACIÓN */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Clasificación del Cliente
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Régimen Fiscal</InputLabel>
                  <Select
                    name="regimen"
                    value={form.regimen}
                    label="Régimen Fiscal"
                    onChange={handleChange}
                  >
                    {[
                      "REGIMEN GENERAL DE LEY PERSONAS MORALES",
                      "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS MORALES",
                      "PERSONAS MORALES CON FINES NO LUCRATIVOS",
                      "RÉGIMEN DE PEQUEÑOS CONTRIBUYENTES",
                      "RÉGIMEN DE SUELDOS Y SALARIOS E INGRESOS ASIMILADOS A SALARIOS",
                      "RÉGIMEN DE ARRENDAMIENTO",
                      "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS FÍSICAS",
                      "RÉGIMEN DE INCORPORACIÓN FISCAL",
                    ].map((reg) => (
                      <MenuItem key={reg} value={reg}>
                        {reg}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Agencia o Directo</InputLabel>
                  <Select
                    name="agenciaODirecto"
                    value={form.agenciaODirecto}
                    label="Agencia o Directo"
                    onChange={handleChange}
                  >
                    <MenuItem value="AGENCIA">AGENCIA</MenuItem>
                    <MenuItem value="DIRECTO">DIRECTO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Cliente</InputLabel>
                  <Select
                    name="tipoCliente"
                    value={form.tipoCliente}
                    label="Tipo de Cliente"
                    onChange={handleChange}
                  >
                    <MenuItem value="iniciativa privada">Iniciativa Privada</MenuItem>
                    <MenuItem value="gobierno">Gobierno</MenuItem>
                    <MenuItem value="corporativo">Corporativo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="tipoIndustria-label">Industria</InputLabel>
                  <Select
                    labelId="tipoIndustria-label"
                    name="tipoIndustria"
                    value={form.tipoIndustria}
                    label="Industria"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>Selecciona una opción</em>
                    </MenuItem>

                    {INDUSTRIAS.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            {/* CONTACTOS */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
              Contactos
            </Typography>

            {["mercadotecnia", "diseno", "facturacion"].map((area) => (
              <Box key={area} mt={1}>
                <Typography fontWeight={600} mb={1}>
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Nombre"
                      fullWidth
                      name="nombre"
                      value={form.contactos[area].nombre}
                      onChange={(e) => handleContacto(area, e)}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Email"
                      fullWidth
                      name="email"
                      value={form.contactos[area].email}
                      onChange={(e) => handleContacto(area, e)}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Celular"
                      fullWidth
                      name="celular"
                      value={form.contactos[area].celular}
                      onChange={(e) => handleContacto(area, e)}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}

            {/* ASIGNAR A USUARIO (Owner) */}
            {isOwner && (
              <>
                <Typography variant="h6" fontWeight={700} mt={4} mb={2}>
                  Asignar a Usuario
                </Typography>

                <FormControl fullWidth>
                  <InputLabel>Usuario</InputLabel>
                  <Select
                    name="assignedTo"
                    value={form.assignedTo}
                    label="Usuario"
                    onChange={handleChange}
                  >
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {/* STATUS */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={1}>
              Status del Cliente
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={form.status}
                label="Status"
                onChange={handleChange}
              >
                <MenuItem value="prospeccion">Prospección</MenuItem>
                <MenuItem value="presentacion">Presentación</MenuItem>
                <MenuItem value="propuesta">Propuesta</MenuItem>
                <MenuItem value="cierre">Cierre</MenuItem>
              </Select>
            </FormControl>

            {/* ACTIVO */}
            {/* CLIENTE ACTIVO */}
            <Typography variant="h6" fontWeight={700} mt={4} mb={1}>
              Cliente Activo
            </Typography>

            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.clienteActivo}
                    onChange={(e) =>
                      setForm({ ...form, clienteActivo: e.target.checked })
                    }
                  />
                }
                label={form.clienteActivo ? "Activo" : "Inactivo"}
              />
            </FormControl>



            <Box mt={4} display="flex" justifyContent="flex-end">
              <Button variant="contained" size="large" type="submit">
                Guardar Cliente
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            minWidth: 420,
            justifyContent: "space-between",
            alignItems: "center",
          }}
          action={
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setSnackbar({ ...snackbar, open: false })}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ClientCreatePage;