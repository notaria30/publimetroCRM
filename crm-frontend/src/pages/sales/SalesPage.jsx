// src/pages/sales/SalesPage.jsx
import { useEffect, useState } from "react";
import { getSales } from "../../services/salesService";
import { Link } from "react-router-dom";

function SalesPage() {
  const [sales, setSales] = useState([]);
  const [facturadoFilter, setFacturadoFilter] = useState("all"); // all | yes | no

  useEffect(() => {
    getSales().then((res) => setSales(res.data));
  }, []);

  const filteredSales = sales.filter((s) => {
    if (facturadoFilter === "all") return true;
    if (facturadoFilter === "yes") return s.facturado === true;
    if (facturadoFilter === "no") return s.facturado === false;
    return true;
  });

  return (
    <div>
      <h1>Ventas</h1>
      <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        Facturado:
        <select
          value={facturadoFilter}
          onChange={(e) => setFacturadoFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="yes">Sí</option>
          <option value="no">No</option>
        </select>
      </label>
      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Pipeline</th>
            <th>Pagada</th>
            <th>Facturado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.map((s) => (
            <tr key={s._id}>
              <td>{s._id}</td>
              <td>{s.client?.nombreComercial}</td>
              <td>{s.total}</td>
              <td>{s.pipelineStatus}</td>
              <td>{s.pagada ? "Sí" : "No"}</td>
              <td>{s.facturado ? "Sí" : "No"}</td>
              <td>
                <Link to={`/sales/${s._id}`}>
                  <button>Ver</button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SalesPage;
