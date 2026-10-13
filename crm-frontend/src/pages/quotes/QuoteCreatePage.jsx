import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createQuote } from "../../services/quoteService";
import QuoteForm from "./QuoteForm";
import { ArrowLeft } from "lucide-react";
import "./quotes.css";

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, type === "error" ? 6000 : 2500); return () => clearTimeout(t); }, [onClose, type]);
  return <div className={`qt-toast qt-toast--${type}`}>{msg}</div>;
}

export default function QuoteCreatePage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const handleCreate = async (payload) => {
    try {
      const res = await createQuote(payload);
      setToast({ msg: "Cotización creada correctamente", type: "success" });
      setTimeout(() => navigate(`/quotes/${res.data.quote._id}`), 1200);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Error creando cotización", type: "error" });
    }
  };

  return (
    <div className="qt-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="qt-detail-header">
        <h1 className="qt-title">Nueva Cotización</h1>
        <button className="qt-btn-secondary" onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={14} /> Volver
        </button>
      </div>
      <QuoteForm mode="create" onSubmit={handleCreate} />
    </div>
  );
}