// Navbar.jsx
import { AppBar, Toolbar, Box, Typography, Button } from "@mui/material";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.svg";

const linkStyle = {
  padding: "10px 16px",
  fontSize: 16,
  fontWeight: 500,
  textDecoration: "none",
  color: "#E6E6E6",
};

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="static"
      sx={{
        background: "#0E0E0E",
        py: 1,
        boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img src={logo} alt="logo" style={{ height: 45 }} />
        </Box>

        {/* Links */}
        <Box sx={{ display: "flex", gap: 2 }}>
          {[
            { to: "/", label: "Dashboard" },
            { to: "/clients", label: "Clientes" },
            { to: "/quotes", label: "Cotizaciones" },
            { to: "/sales", label: "Ventas" },
            { to: "/invoices", label: "Facturación" },
            { to: "/postsale", label: "Post-Venta" },
            { to: "/reports", label: "Reportes" },
          ].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                ...linkStyle,
                color: isActive ? "#4FD1C5" : "#f0f0f0",
                borderBottom: isActive ? "3px solid #4FD1C5" : "3px solid transparent",
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </Box>

        {/* User + Logout */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography color="#fff">{user?.name}</Typography>
          <Button
            variant="contained"
            onClick={logout}
            sx={{
              bgcolor: "#E63946",
              "&:hover": { bgcolor: "#C92A34" },
              borderRadius: "20px",
              textTransform: "none",
            }}
          >
            Salir
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
