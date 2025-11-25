import express from "express";
import { startAuth, authCallback } from "../controllers/githubController.js";
const router = express.Router();

router.get("/github", startAuth); // redirect to GitHub
router.get("/github/callback", authCallback); // callback from GitHub

export default router;
