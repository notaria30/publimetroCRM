// src/pages/clients/ClientCampaignsPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCampaignsByClient } from "../../services/campaignService";

// MUI
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Chip
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function ClientCampaignsPage() {
    const { id } = useParams();
    const [campaigns, setCampaigns] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        async function load() {
            const res = await getCampaignsByClient(id);
            setCampaigns(res.data);
        }
        load();
    }, [id]);
    return (
        <div style={{ padding: "20px" }}>

            {/* TÍTULO */}
            <Typography variant="h4" fontWeight={700} mb={1.5}>
                Campañas del cliente
            </Typography>

            {/* FILA DE BOTONES (debajo del título) */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "25px",
                }}
            >
                <Button variant="outlined" onClick={() => navigate("/clients")}>
                    Volver
                </Button>

                <Button
                    variant="contained"
                    onClick={() => navigate(`/clients/${id}/campaigns/new`)}
                >
                    Nueva campaña
                </Button>
            </div>


            {/* Si no hay campañas */}
            {campaigns.length === 0 ? (
                <p>No hay campañas. Crea una arriba.</p>
            ) : (
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "white",
                        borderRadius: "10px",
                        overflow: "hidden",
                    }}
                >
                    <thead>
                        <tr style={{ background: "#0b7d3e", color: "white", textAlign: "left" }}>
                            <th style={{ padding: "15px" }}>Nombre</th>
                            <th style={{ padding: "15px" }}>Status</th>
                            <th style={{ padding: "15px" }}>Inicio</th>
                            <th style={{ padding: "15px" }}>Fin</th>
                            <th style={{ padding: "15px", textAlign: "center" }}>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {campaigns.map((c) => (
                            <tr
                                key={c._id}
                                style={{
                                    borderBottom: "1px solid #e5e5e5",
                                }}
                            >
                                <td style={{ padding: "15px" }}>{c.nombre}</td>

                                {/* status con estilo badge */}
                                <td style={{ padding: "15px" }}>
                                    <span
                                        style={{
                                            background:
                                                c.status === "planificada"
                                                    ? "#1565c0"
                                                    : c.status === "en_curso"
                                                        ? "#ff9800"
                                                        : c.status === "finalizada"
                                                            ? "#2e7d32"
                                                            : "#b71c1c",
                                            color: "white",
                                            padding: "4px 10px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            textTransform: "capitalize",
                                        }}
                                    >
                                        {c.status}
                                    </span>
                                </td>

                                <td style={{ padding: "15px" }}>
                                    {c.fechaInicio?.substring(0, 10)}
                                </td>

                                <td style={{ padding: "15px" }}>
                                    {c.fechaFin?.substring(0, 10)}
                                </td>

                                {/* Botón Ver */}
                                <td style={{ padding: "15px", textAlign: "center" }}>
                                    <button
                                        onClick={() =>
                                            navigate(`/clients/${id}/campaigns/${c._id}`)
                                        }
                                        style={{
                                            padding: "6px 18px",
                                            border: "1px solid #1976d2",
                                            background: "white",
                                            color: "#1976d2",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                        }}
                                    >
                                        Ver
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
