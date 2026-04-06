import "./quotes.css";

export default function QuoteTotalFinalSection({ form }) {
  return (
    <div
      className="qt-card"
      style={{ borderLeft: "5px solid #16a34a", marginBottom: 20 }}
    >
      <div className="qt-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: "inherit" }}>Total final</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>
          ${(Number(form.total) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}