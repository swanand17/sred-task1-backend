import Integration from "../models/Integration.js";
import Repo from "../models/Repository.js";
import Org from "../models/Organization.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import { Worker } from "worker_threads";

// Get list of integrations
export async function getIntegrations(req, res) {
    try {
        const integrations = await Integration
        .find({})
        .sort({ linkedAt: -1 })
        .lean();

        return res.status(200).json({
            ok: true,
            integrations,
            integration: integrations.length ? integrations[0] : null
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
}

// Get integration by ID
export async function getIntegrationById(req, res) {
    try {
       console.log("req.params.id", req.params.id);
       const integration = await Integration.findById(req.params.id).lean();
       if (!integration) {
         return res.status(404).json({ ok: false, error: "Integration not found" });
       }
       return res.status(200).json({ ok: true, integration });
    } catch (err) {
       return res.status(500).json({ ok: false, error: err.message });
    }
}

// Delete integration and related data
export async function deleteIntegrationAndData(req, res) {
    try {
        const id = req.params.id;

        const deleted = await Integration.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ ok: false, error: "Integration not found" });
        }

        //  Cascade delete
        await Promise.all([
            Repo.deleteMany({ integrationId: id }),
            Org.deleteMany({ integrationId: id }),
            Commit.deleteMany({ integrationId: id }),
            Pull.deleteMany({ integrationId: id }),
            Issue.deleteMany({ integrationId: id }),
            User.deleteMany({ integrationId: id })
        ]);

        return res.status(200).json({ ok: true, message: "Integration removed" });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
}

export async function resyncIntegration(req, res) {
  try {
    const id = req.params.id;

    const integration = await Integration.findById(id).lean();
    if (!integration) {
      return res.status(404).json({ ok: false, error: "Integration not found" });
    }

    // Return immediately — do not block
    res.json({ ok: true, message: "Resync started in background" });

    const worker = new Worker("./helpers/resyncWorker.js", {
      workerData: {
        integration: {
          ...integration,
          _id: integration._id.toString()
        },
        mongoUri: process.env.MONGO_URI
      }
    });

    worker.on("message", msg => {
      console.log("Worker finished:", msg);
    });

    worker.on("error", err => {
      console.error("Worker error:", err);
    });

    worker.on("exit", code => {
      console.log("Worker exited with code", code);
    });

  } catch (err) {
    console.error("resync error", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}