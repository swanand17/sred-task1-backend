import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

//import routes
import authRoutes from "./routes/auth.js";
import dataRoutes from "./routes/data.js";
import integrationsRoutes from "./routes/integrations.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { })
.then(() => console.log("MongoDB connected"))
.catch(err => { console.error("MongoDB connection error", err); process.exit(1); });

//use routes
app.use("/auth", authRoutes);
app.use("/api", dataRoutes);
app.use("/api", integrationsRoutes);

app.get("/", (req, res) => res.send("GitHub integration backend running"));

//server listen
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
