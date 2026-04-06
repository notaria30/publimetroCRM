import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuoteById, updateQuote } from "../../services/quoteService";
import QuoteForm from "./QuoteForm.jsx";
import { ArrowLeft } from "lucide-react";
import "./quotes.css";

export default function QuoteEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuoteById(id)
      .then((res) => setQuote(res.data))
      .catch(() => alert("Error cargando la cotización"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      await updateQuote(id, payload);
      navigate(`/quotes/${id}`);
    } catch { alert("Error al guardar la cotización"); }
  };

  if (loading) return <div className="qt-status">Cargando...</div>;

  if (!quote) return (
    <div className="qt-page">
      <p style={{ color: "#dc2626" }}>No se encontró la cotización.</p>
      <button className="qt-btn-secondary" type="button" onClick={() => navigate("/quotes")}>
        Volver
      </button>
    </div>
  );

  return (
    <div className="qt-page">
      <div className="qt-detail-header">
        <h1 className="qt-title">Editar cotización #{quote.folio}</h1>
        <button className="qt-btn-secondary" type="button" onClick={() => navigate(`/quotes/${id}`)}>
          <ArrowLeft size={14} /> Volver
        </button>
      </div>
      <QuoteForm mode="edit" initialQuote={quote} onSubmit={handleSubmit} />
    </div>
  );
}