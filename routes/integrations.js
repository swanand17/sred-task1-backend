import express from "express";
import { getIntegrations, getIntegrationById, deleteIntegrationAndData, resyncIntegration } from "../controllers/integrationController.js";
const router = express.Router();

router.get("/integrations", getIntegrations);
router.get("/integrations/:id", getIntegrationById);
router.delete("/integrations/:id", deleteIntegrationAndData);
router.post("/integrations/:id/resync", resyncIntegration);

export default router;
