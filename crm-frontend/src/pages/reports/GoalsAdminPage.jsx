import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tab,
    Tabs,
    Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { getSalesGoals, createOrUpdateGoal, getReportExecutives } from "../../services/reportService";

export default function GoalsAdminPage() {
    const [loading, setLoading] = useState(false);
    const [goals, setGoals] = useState([]);
    const [executives, setExecutives] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [tabValue, setTabValue] = useState(0); // 0: metas generales, 1: metas por ejecutivo
    const [formData, setFormData] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        goalAmount: 0,
        assignedTo: "",
    });

    // Cargar metas existentes
    const loadGoals = async () => {
        setLoading(true);
        try {
            const res = await getSalesGoals({});
            setGoals(res.data);
        } catch (err) {
            setError("Error al cargar las metas");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Cargar ejecutivos
    const loadExecutives = async () => {
        try {
            const res = await getReportExecutives();
            setExecutives(res.data);
        } catch (err) {
            console.error("Error cargando ejecutivos:", err);
        }
    };

    useEffect(() => {
        loadGoals();
        loadExecutives();
    }, []);

    // Abrir modal para nueva meta
    const handleNewGoal = () => {
        setEditingGoal(null);
        setFormData({
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            goalAmount: 0,
            assignedTo: tabValue === 1 ? "" : undefined,
        });
        setOpenModal(true);
    };

    // Abrir modal para editar meta
    const handleEditGoal = (goal) => {
        setEditingGoal(goal);
        setFormData({
            year: goal.year,
            month: goal.month,
            goalAmount: goal.goalAmount,
            assignedTo: goal.assignedTo?._id || goal.assignedTo || "",
        });
        setOpenModal(true);
    };

    // Guardar meta
    const handleSaveGoal = async () => {
        setLoading(true);
        setError(null);
        try {
            const dataToSave = {
                year: formData.year,
                month: formData.month,
                goalAmount: typeof formData.goalAmount === "string" ? Number(formData.goalAmount) : formData.goalAmount,
            };

            if (tabValue === 1 && formData.assignedTo) {
                dataToSave.assignedTo = formData.assignedTo;
            }

            await createOrUpdateGoal(dataToSave);
            setSuccess("Meta guardada correctamente");
            setTimeout(() => setSuccess(null), 3000);
            setOpenModal(false);
            loadGoals();
        } catch (err) {
            setError(err.response?.data?.message || "Error al guardar la meta");
        } finally {
            setLoading(false);
        }
    };

    // Formatear moneda
    const formatMoney = (value) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
        }).format(value || 0);
    };

    // Nombres de meses
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Separar metas generales (sin assignedTo) y por ejecutivo
    const generalGoals = goals.filter(g => !g.assignedTo);
    const executiveGoals = goals.filter(g => g.assignedTo);

    // Agrupar metas por año para generales
    const generalGoalsByYear = generalGoals.reduce((acc, goal) => {
        if (!acc[goal.year]) acc[goal.year] = [];
        acc[goal.year].push(goal);
        return acc;
    }, {});

    // Agrupar metas por ejecutivo y año
    const executiveGoalsByExecutive = executiveGoals.reduce((acc, goal) => {
        const execName = goal.assignedTo?.name || "No asignado";
        if (!acc[execName]) acc[execName] = [];
        acc[execName].push(goal);
        return acc;
    }, {});

    const generalYears = Object.keys(generalGoalsByYear).sort((a, b) => b - a);

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700}>
                    Administración de Metas de Ventas
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleNewGoal}
                    sx={{ backgroundColor: "#007A3E" }}
                >
                    + Nueva meta
                </Button>
            </Box>

            {/* Mensajes */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Tabs */}
            <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab label="Metas generales" />
                <Tab label="Metas por ejecutivo" />
            </Tabs>

            {/* Contenido según tab */}
            {tabValue === 0 ? (
                // METAS GENERALES
                generalYears.length === 0 && !loading ? (
                    <Paper sx={{ p: 4, textAlign: "center" }}>
                        <Typography color="text.secondary">
                            No hay metas generales registradas. Haz clic en "Nueva meta" para comenzar.
                        </Typography>
                    </Paper>
                ) : (
                    generalYears.map((year) => (
                        <Card key={year} sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: "#007A3E" }}>
                                    {year}
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Mes</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="right">Meta mensual</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }} align="center">Acciones</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {monthNames.map((month, index) => {
                                                const monthNum = index + 1;
                                                const goal = generalGoalsByYear[year]?.find(g => g.month === monthNum);
                                                const goalAmount = goal?.goalAmount || 0;
                                                const hasGoal = goal !== undefined;

                                                return (
                                                    <TableRow key={monthNum} sx={{ opacity: hasGoal ? 1 : 0.6 }}>
                                                        <TableCell>{month}</TableCell>
                                                        <TableCell align="right">
                                                            {hasGoal ? formatMoney(goalAmount) : "—"}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    if (hasGoal) {
                                                                        handleEditGoal(goal);
                                                                    } else {
                                                                        setEditingGoal(null);
                                                                        setFormData({
                                                                            year: parseInt(year),
                                                                            month: monthNum,
                                                                            goalAmount: 0,
                                                                            assignedTo: undefined,
                                                                        });
                                                                        setOpenModal(true);
                                                                    }
                                                                }}
                                                                color={hasGoal ? "primary" : "default"}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    ))
                )
            ) : (
                // METAS POR EJECUTIVO
                <Box>
                    {executives.length === 0 && !loading ? (
                        <Paper sx={{ p: 4, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                No hay ejecutivos registrados en el sistema.
                            </Typography>
                        </Paper>
                    ) : Object.keys(executiveGoalsByExecutive).length === 0 && !loading ? (
                        <Paper sx={{ p: 4, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                No hay metas por ejecutivo registradas. Haz clic en "Nueva meta" para asignar metas a cada vendedor.
                            </Typography>
                        </Paper>
                    ) : (
                        Object.entries(executiveGoalsByExecutive).map(([execName, execGoalsList]) => {
                            // Agrupar por año
                            const goalsByYear = execGoalsList.reduce((acc, goal) => {
                                if (!acc[goal.year]) acc[goal.year] = [];
                                acc[goal.year].push(goal);
                                return acc;
                            }, {});
                            const years = Object.keys(goalsByYear).sort((a, b) => b - a);

                            return (
                                <Card key={execName} sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                                            <Typography variant="h6" fontWeight={600} sx={{ color: "#007A3E" }}>
                                                {execName}
                                            </Typography>
                                            <Chip label="Ejecutivo" size="small" color="primary" />
                                        </Box>

                                        {years.map((year) => (
                                            <Box key={year} sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: "#666" }}>
                                                    {year}
                                                </Typography>
                                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                                    <Table size="small">
                                                        <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 600 }}>Mes</TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }} align="right">Meta mensual</TableCell>
                                                                <TableCell sx={{ fontWeight: 600 }} align="center">Acciones</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {monthNames.map((month, index) => {
                                                                const monthNum = index + 1;
                                                                const goal = goalsByYear[year]?.find(g => g.month === monthNum);
                                                                const goalAmount = goal?.goalAmount || 0;
                                                                const hasGoal = goal !== undefined;

                                                                return (
                                                                    <TableRow key={monthNum} sx={{ opacity: hasGoal ? 1 : 0.6 }}>
                                                                        <TableCell>{month}</TableCell>
                                                                        <TableCell align="right">
                                                                            {hasGoal ? formatMoney(goalAmount) : "—"}
                                                                        </TableCell>
                                                                        <TableCell align="center">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => {
                                                                                    if (hasGoal) {
                                                                                        handleEditGoal(goal);
                                                                                    } else {
                                                                                        setEditingGoal(null);
                                                                                        setFormData({
                                                                                            year: parseInt(year),
                                                                                            month: monthNum,
                                                                                            goalAmount: 0,
                                                                                            assignedTo: goal?.assignedTo?._id || "",
                                                                                        });
                                                                                        setOpenModal(true);
                                                                                    }
                                                                                }}
                                                                                color={hasGoal ? "primary" : "default"}
                                                                            >
                                                                                <EditIcon fontSize="small" />
                                                                            </IconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </Box>
            )}

            {/* Modal para editar/crear meta */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingGoal ? "Editar meta" : "Nueva meta"}
                    {tabValue === 1 && (
                        <Typography variant="caption" display="block" color="text.secondary">
                            Meta por ejecutivo
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Año</InputLabel>
                                <Select
                                    value={formData.year}
                                    label="Año"
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                >
                                    {[2023, 2024, 2025, 2026].map((year) => (
                                        <MenuItem key={year} value={year}>{year}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Mes</InputLabel>
                                <Select
                                    value={formData.month}
                                    label="Mes"
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                >
                                    {monthNames.map((month, idx) => (
                                        <MenuItem key={idx} value={idx + 1}>{month}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {tabValue === 1 && (
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Ejecutivo</InputLabel>
                                    <Select
                                        value={formData.assignedTo}
                                        label="Ejecutivo"
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                        required
                                    >
                                        {executives.map((exec) => (
                                            <MenuItem key={exec._id} value={exec._id}>
                                                {exec.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Meta mensual (MXN)"
                                type="number"
                                value={formData.goalAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Si está vacío, guardamos como string vacío temporalmente
                                    if (value === "") {
                                        setFormData({ ...formData, goalAmount: "" });
                                    } else {
                                        setFormData({ ...formData, goalAmount: Number(value) });
                                    }
                                }}
                                onBlur={() => {
                                    // Cuando pierde el foco, si está vacío lo ponemos en 0
                                    if (formData.goalAmount === "") {
                                        setFormData({ ...formData, goalAmount: 0 });
                                    }
                                }}
                                InputProps={{
                                    startAdornment: <span style={{ marginRight: 8 }}>$</span>,
                                }}
                                helperText="Ingresa el monto en pesos mexicanos (sin IVA)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveGoal}
                        disabled={loading || (tabValue === 1 && !formData.assignedTo)}
                        sx={{ backgroundColor: "#007A3E" }}
                    >
                        {loading ? <CircularProgress size={24} /> : "Guardar meta"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}