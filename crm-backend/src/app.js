const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const clientRoutes = require("./routes/client.routes");
const quoteRoutes = require("./routes/quote.routes");
const saleRoutes = require("./routes/sale.routes");
const opportunityRoutes = require("./routes/opportunity.routes"); // NUEVO
const postSaleRoutes = require("./routes/postSale.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const reportRoutes = require("./routes/report.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const pdfRoutes = require("./routes/pdf.routes");
const campaignRoutes = require("./routes/campaign.routes");
const goalsRoutes = require("./routes/goals.routes");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);  
app.use("/api/quotes", quoteRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/opportunities", opportunityRoutes); // MONTAJE NUEVO
app.use("/api/campaigns", campaignRoutes);
app.use("/api/postsale", postSaleRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/goals", goalsRoutes);

module.exports = app;