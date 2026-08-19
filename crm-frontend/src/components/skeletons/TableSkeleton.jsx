import { Bar, LoadingDots } from "./Bar";

// Skeleton para páginas de listado con tabla (Clientes, Campañas, Ventas,
// Cotizaciones, Facturas, Usuarios…). Reutiliza las clases reales de cada
// página (pageClass, headerClass, tableClass…) para que el hueco de carga
// respete el mismo layout, colores y bordes que el contenido final.
export function TableSkeleton({
  pageClass,
  headerClass,
  actions = 1,
  hasSearch = true,
  tabs = 0,
  statsGridClass,
  statBoxClass,
  statCount = 0,
  tableWrapClass,
  tableClass,
  columns = 5,
  rows = 6,
}) {
  return (
    <div className={pageClass}>
      <div className={headerClass}>
        <Bar style={{ width: 170, height: 26 }} />
        <div style={{ display: "flex", gap: 10 }}>
          {hasSearch && <Bar style={{ width: 260, height: 34, borderRadius: 8 }} />}
          {Array.from({ length: actions }).map((_, i) => (
            <Bar key={i} style={{ width: 130, height: 34, borderRadius: 8 }} />
          ))}
        </div>
      </div>

      {tabs > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {Array.from({ length: tabs }).map((_, i) => (
            <Bar key={i} style={{ width: 100, height: 30, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {statCount > 0 && (
        <div className={statsGridClass} style={{ marginBottom: 20 }}>
          {Array.from({ length: statCount }).map((_, i) => (
            <div className={statBoxClass} key={i}>
              <Bar style={{ height: 12, width: "70%", marginBottom: 12 }} />
              <Bar style={{ height: 26, width: "45%" }} />
            </div>
          ))}
        </div>
      )}

      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, c) => (
                <th key={c}><Bar style={{ width: "65%", height: 11 }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c}><Bar style={{ width: `${50 + ((r + c) % 4) * 12}%`, height: 12 }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LoadingDots />
    </div>
  );
}
