import { useEffect, useState } from "react";
import {
  getDashboardOverview,
  getDashboardPipeline,
  getDashboardBilling,
  getDashboardClients,
  getDashboardQuotes,
} from "../../services/dashboardService";
import "./DashboardPage.css";
import { useAuth } from "../../context/AuthContext";
import { getDashboardActiveClients } from "../../services/dashboardService";
import { LoadingDashboard } from "./LoadingDashboard";

function MetricCard({ label, value, sub }) {
  return (
    <div className="db-metric-card">
      <p className="db-metric-label">{label}</p>
      <p className="db-metric-value">{value}</p>
      {sub && <p className="db-metric-sub">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [billing, setBilling] = useState(null);
  const [clientsStats, setClientsStats] = useState(null);
  const [quotesStats, setQuotesStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeClients, setActiveClients] = useState(null);
  const { user } = useAuth();


  useEffect(() => {
    async function load() {
      try {
        const [ovRes, plRes, biRes, clRes, quRes, acRes] = await Promise.all([
          getDashboardOverview(),
          getDashboardPipeline(),
          getDashboardBilling(),
          getDashboardClients(),
          getDashboardQuotes(),
          getDashboardActiveClients(),
        ]);
        setOverview(ovRes.data);
        setPipeline(plRes.data);
        setBilling(biRes.data);
        setClientsStats(clRes.data);
        setQuotesStats(quRes.data);
        setActiveClients(acRes.data);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setError("No se pudo cargar el dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingDashboard />;
  if (error) return <div className="db-status db-error">{error}</div>;

  const fmt = (n) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pct =
    billing.pagado + billing.pendiente > 0
      ? ((billing.pagado / (billing.pagado + billing.pendiente)) * 100).toFixed(1) + "%"
      : "0%";

  const cerradasMes = pipeline.ganadasMes + pipeline.perdidasMes;
  const tasaCierre = cerradasMes > 0
    ? ((pipeline.ganadasMes / cerradasMes) * 100).toFixed(0) + "%"
    : "—";

  return (
    <div className="db-page">

      {/* HEADER */}
      <div className="db-header">
        <div>
          <h1 className="db-greeting">Dashboard General</h1>
          <h1 className="db-greeting-sub">Bienvenido de nuevo {user?.name}</h1>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="db-metrics-grid">
        <MetricCard label="Total Clientes" value={overview.totalClientes} />
        <MetricCard label="Ventas Cerradas" value={overview.ventasCerradas} />
        <MetricCard label="Total Cotizaciones" value={overview.totalCotizaciones} />
        <MetricCard label="Total Facturado" value={fmt(overview.totalFacturado)} />
        <MetricCard label="Pendiente de Pago" value={fmt(overview.totalPendiente)} />
      </div>

      {/* Facturación — resumen */}
      <div className="db-card db-bottom-card">
        <p className="db-card-title">Facturación</p>
        <div className="db-billing-rows">
          <div className="db-billing-row">
            <span className="db-billing-dot green" />
            <span className="db-billing-label">Pagado</span>
            <span className="db-billing-val green-txt">
              {fmt(billing.pagado)}
            </span>
          </div>
          <div className="db-billing-row">
            <span className="db-billing-dot red" />
            <span className="db-billing-label">Pendiente</span>
            <span className="db-billing-val red-txt">
              {fmt(billing.pendiente)}
            </span>
          </div>
          <div className="db-billing-divider" />
          <div className="db-billing-row">
            <span className="db-billing-dot blue" />
            <span className="db-billing-label">% Cobrado</span>
            <span className="db-billing-val blue-txt">{pct}</span>
          </div>
        </div>
      </div>

      {/* RESULTADOS DEL MES (oportunidades ganadas / perdidas) */}
      <div className="db-card db-bottom-card">
        <p className="db-card-title">Resultados del mes</p>
        <div className="db-stats-row">
          <div className="db-stat-box">
            <p className="db-stat-label">Ganadas</p>
            <p className="db-stat-val">{pipeline.ganadasMes}</p>
          </div>
          <div className="db-stat-box">
            <p className="db-stat-label">Perdidas</p>
            <p className="db-stat-val">{pipeline.perdidasMes}</p>
          </div>
          <div className="db-stat-box">
            <p className="db-stat-label">Tasa de cierre</p>
            <p className="db-stat-val">{tasaCierre}</p>
          </div>
        </div>
      </div>

      {/* CLIENTES Y COTIZACIONES */}
      <div className="db-card db-bottom-card">
        <p className="db-card-title">Clientes y Cotizaciones</p>
        <div className="db-stats-row">
          <div className="db-stat-box">
            <p className="db-stat-label">Clientes activos</p>
            <p className="db-stat-val">{clientsStats.activos}</p>
          </div>
          <div className="db-stat-box">
            <p className="db-stat-label">Nuevos este mes</p>
            <p className="db-stat-val">{clientsStats.nuevosMes}</p>
          </div>
          <div className="db-stat-box">
            <p className="db-stat-label">Cotizaciones del mes</p>
            <p className="db-stat-val">{quotesStats.cotizacionesMes}</p>
          </div>
        </div>
      </div>
      {/* CLIENTES ACTIVOS E INACTIVOS */}
      {activeClients && (
        <div className="db-card db-clients-card">
          <p className="db-card-title">Clientes por Actividad</p>

          <div className="db-clients-grid">

            {/* ACTIVOS */}
            <div>
              <p className="db-clients-section-label db-clients-label-active">
                ✅ Activos ({activeClients.resumen.activos})
              </p>
              <div className="db-clients-list">
                {activeClients.data
                  .filter(c => c.estado === "Activo")
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={i} className="db-client-row">
                      <div className="db-client-avatar">
                        {c.cliente.charAt(0).toUpperCase()}
                      </div>
                      <div className="db-client-info">
                        <p className="db-client-name">{c.cliente}</p>
                        <p className="db-client-sub">
                          Última venta: {c.ultimaVenta}
                        </p>
                      </div>
                      <span className="db-client-amount">
                        ${c.totalVentas.toLocaleString("es-MX", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* INACTIVOS */}
            <div>
              <p className="db-clients-section-label db-clients-label-inactive">
                ⚠️ Inactivos ({activeClients.resumen.inactivos})
              </p>
              <div className="db-clients-list">
                {activeClients.data
                  .filter(c => c.estado === "Inactivo")
                  .slice(0, 5)
                  .map((c, i) => (
                    <div key={i} className="db-client-row">
                      <div className="db-client-avatar db-client-avatar--inactive">
                        {c.cliente.charAt(0).toUpperCase()}
                      </div>
                      <div className="db-client-info">
                        <p className="db-client-name">{c.cliente}</p>
                        <p className="db-client-sub">
                          Última venta: {c.ultimaVenta}
                        </p>
                      </div>
                      <span className="db-client-amount db-client-amount--inactive">
                        Sin ventas recientes
                      </span>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}