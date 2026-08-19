import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, FileText, TrendingUp, Receipt, ClipboardCheck, UserCog, BarChart2, Target } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.svg";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
  { to: "/clients", label: "Clientes", icon: <Users size={18} strokeWidth={1.5} /> },
  { to: "/opportunities", label: "Oportunidades", icon: <Target size={18} strokeWidth={1.5} /> },
  { to: "/quotes", label: "Cotizaciones", icon: <FileText size={18} strokeWidth={1.5} /> },
  { to: "/sales", label: "Ventas", icon: <TrendingUp size={18} strokeWidth={1.5} /> },
  { to: "/postsale", label: "Post-Venta", icon: <ClipboardCheck size={18} strokeWidth={1.5} /> },
  { to: "/reports", label: "Reportes", icon: <BarChart2 size={18} strokeWidth={1.5} /> },
];

const OWNER_LINKS = [
  { to: "/invoices", label: "Facturación", icon: <Receipt size={18} strokeWidth={1.5} /> },
];

export default function Sidebar() {
  const { isOwner } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="logo" />
      </div>

      <nav className="sidebar-nav">
        {NAV_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link--active" : "")}>
            {l.icon}{l.label}
          </NavLink>
        ))}
        
        {isOwner && (
          <div className="sidebar-section-divider">Administración</div>
        )}

        {isOwner && OWNER_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link--active" : "")}>
            {l.icon}{l.label}
          </NavLink>
        ))}
        {isOwner && (
          <NavLink to="/users"
            className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link--active" : "")}>
            <UserCog size={18} strokeWidth={1.5} />Usuarios
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
