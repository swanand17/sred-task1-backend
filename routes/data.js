import express from "express";
import { listCollections, queryCollection } from "../controllers/dataController.js";
const router = express.Router();

router.get("/collections", listCollections);
router.post("/collections/query", queryCollection); // body: { collection, page, limit, filters, sort, search }

export default router;
