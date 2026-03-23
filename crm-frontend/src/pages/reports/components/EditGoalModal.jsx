import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";

export default function EditGoalModal({ open, onClose, year, month, monthName, onSave, currentGoal }) {
  const [goalAmount, setGoalAmount] = useState(currentGoal || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setGoalAmount(currentGoal || 0);
    setError(null);
  }, [currentGoal, open]);

  const handleSave = async () => {
    if (goalAmount < 0) {
      setError("La meta no puede ser negativa");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(year, month, goalAmount);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar la meta");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value || 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Editar meta de ventas
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {monthName} {year}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" gutterBottom>
            Meta actual: {formatMoney(currentGoal || 0)}
          </Typography>
          
          <TextField
            fullWidth
            label="Nueva meta mensual"
            type="number"
            value={goalAmount}
            onChange={(e) => setGoalAmount(Number(e.target.value))}
            InputProps={{
              startAdornment: <span style={{ marginRight: 8 }}>$</span>,
            }}
            helperText="Ingresa el monto en pesos mexicanos (sin IVA)"
            sx={{ mt: 2 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            Esta meta se usará para calcular el % de cumplimiento y la diferencia.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{ backgroundColor: "#007A3E" }}
        >
          {loading ? <CircularProgress size={24} /> : "Guardar meta"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}