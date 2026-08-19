import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClients } from "../../services/clientService";
import { useAuth } from "../../context/AuthContext";
import { Search, UserPlus } from "lucide-react";
import "./ClientsPage.css";
import { TableSkeleton } from "../../components/skeletons/TableSkeleton";

const STATUS_COLORS = {
  prospeccion: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  presentacion: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  negociacion:  { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  propuesta:    { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  cerrado:      { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  cierre:       { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

function StatusBadge({ status }) {
  const key = (status || "prospeccion").toLowerCase();
  const style = STATUS_COLORS[key] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
  const label = key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <span
      className="cl-badge"
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {label}
    </span>
  );
}

const normalize = (str = "") =>
  String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function ClientsPage() {
  const { isOwner, isWorker } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getClients()
      .then((res) => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return clients;
    return clients.filter((c) =>
      [c.nombreComercial, c.razonSocial, c.rfc, c.status, c.assignedTo?.name]
        .filter(Boolean).map(normalize).join(" ").includes(q)
    );
  }, [clients, search]);

if (loading) return (
    <TableSkeleton
      pageClass="cl-page" headerClass="cl-header"
      hasSearch actions={1}
      tableWrapClass="cl-table-wrap" tableClass="cl-table"
      columns={6} rows={7}
    />
  );

  return (
    <div className="cl-page">

      {/* HEADER */}
      <div className="cl-header">
        <h1 className="cl-title">Clientes</h1>
        <div className="cl-header-actions">
          <div className="cl-search-wrap">
            <Search size={15} className="cl-search-icon" />
            <input
              className="cl-search"
              placeholder="Buscar cliente (nombre, razón social, RFC, estatus, ejecutivo)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(isOwner || isWorker) && (
            <Link to="/clients/new" className="cl-btn-primary">
              <UserPlus size={15} />
              Nuevo Cliente
            </Link>
          )}
        </div>
      </div>

      <p className="cl-count">Mostrando {filtered.length} de {clients.length}</p>

      {/* TABLA */}
      <div className="cl-table-wrap">
        <table className="cl-table">
          <thead>
            <tr>
              <th>Nombre Comercial</th>
              <th>Razón Social</th>
              <th>RFC</th>
              <th>Estatus</th>
              <th>Ejecutivo Asignado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client._id}>
                <td>{client.nombreComercial}</td>
                <td>{client.razonSocial}</td>
                <td className="cl-rfc">{client.rfc}</td>
                <td><StatusBadge status={client.status} /></td>
                <td>{client.assignedTo?.name || "N/A"}</td>
                <td>
                  <div className="cl-actions">
                    <Link to={`/clients/${client._id}`} className="cl-btn-outline">Ver</Link>
                    <Link to={`/clients/${client._id}/campaigns`} className="cl-btn-outline">Campañas</Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="cl-empty">
                  No se encontraron clientes con ese criterio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}