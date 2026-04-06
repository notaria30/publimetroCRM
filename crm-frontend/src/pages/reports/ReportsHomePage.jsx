import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import SalesMonthlyReport from "./components/SalesMonthlyReport";
import ExecutiveReport from "./components/ExecutiveReport";
import ComparativeReport from "./components/ComparativeReport";
import AdvertisingReport from "./components/AdvertisingReport";
import ActiveClientsReport from "./components/ActiveClientsReport";
import GoalsAdminPage from "./components/GoalsAdminPage";
import "./reports.css";
import "../sales/sales.css";

export default function ReportsHomePage() {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: "Ventas mensuales",      component: <SalesMonthlyReport /> },
    { label: "Ventas por ejecutivo",  component: <ExecutiveReport /> },
    { label: "Comparativo ventas",    component: <ComparativeReport /> },
    { label: "Publicidad",            component: <AdvertisingReport /> },
    { label: "Clientes activos",      component: <ActiveClientsReport /> },
  ];

  if (isOwner) {
    tabs.push({ label: "Administrar metas", component: <GoalsAdminPage /> });
  }

  return (
    <div className="sl-page">
      <h1 className="sl-title" style={{ marginBottom: 20 }}>Reportes</h1>

      <div className="rp-tabs-wrap">
        <div className="rp-tabs-bar">
          {tabs.map((t, i) => (
            <button
              key={i}
              className={`rp-tab${tab === i ? " rp-tab--active" : ""}`}
              onClick={() => setTab(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="rp-tab-content">
          {tabs[tab]?.component}
        </div>
      </div>
    </div>
  );
}