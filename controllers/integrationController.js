import express from "express";
import Integration from "../models/Integration.js";
import Repo from "../models/Repository.js";
import Org from "../models/Organization.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import { githubPaginate } from "../helpers/githubApi.js";
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
        // Todo: make this async job later to handle large data
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

// resync integration data by deleteting from DB and re-fetching from GitHub
// export async function resyncIntegration(req, res){
//      try {
//     const id = req.params.id;
//     const integration = await Integration.findById(id).lean();

//     if (!integration) {
//       return res.status(404).json({ ok: false, error: "Integration not found" });
//     }

//     const token = integration.accessToken;

//     console.log("Resync started for integration", id);

//     // ORGS 
//     const orgs = await githubPaginate(token, "/user/orgs");

//     await Org.deleteMany({ integrationId: id });
//     await Org.insertMany(
//       orgs.map(o => ({
//         ...o,
//         integrationId: id,
//         fetchedAt: new Date()
//       }))
//     );

//     console.log("Saved orgs:", orgs.length);

//     // REPOS
//     let allRepos = [];

//     for (const org of orgs) {
//       const repos = await githubPaginate(token, `/orgs/${org.login}/repos`);
//       console.log(`Fetched ${repos.length} repos for org ${org.login}`);
//       allRepos.push(
//         ...repos.map(r => ({
//           ...r,
//           repo_full_name: r.full_name,
//           integrationId: id,
//           fetchedAt: new Date()
//         }))
//       );
//     }

//     await Repo.deleteMany({ integrationId: id });
//     if (allRepos.length) await Repo.insertMany(allRepos);

//     console.log("Total repos saved:", allRepos.length);

//     // COMMITS, PULLS, ISSUES
//     await Commit.deleteMany({ integrationId: id });
//     await Pull.deleteMany({ integrationId: id });
//     await Issue.deleteMany({ integrationId: id });

//     for (const r of allRepos.slice(0, 50)) {
//       const fullName = r.full_name;

//       const commits = await githubPaginate(token, `/repos/${fullName}/commits`);
//       if (commits.length)
//         await Commit.insertMany(
//           commits.map(c => ({
//             ...c,
//             repo_full_name: fullName,
//             integrationId: id,
//             fetchedAt: new Date()
//           }))
//         );

//       const pulls = await githubPaginate(token, `/repos/${fullName}/pulls?state=all`);
//       if (pulls.length)
//         await Pull.insertMany(
//           pulls.map(p => ({
//             ...p,
//             repo_full_name: fullName,
//             integrationId: id,
//             fetchedAt: new Date()
//           }))
//         );

//       const issues = await githubPaginate(token, `/repos/${fullName}/issues?state=all`);
//       if (issues.length)
//         await Issue.insertMany(
//           issues.map(i => ({
//             ...i,
//             repo_full_name: fullName,
//             integrationId: id,
//             fetchedAt: new Date()
//           }))
//         );
//     }

//     console.log("Resync completed for", id);

//     return res.status(200).json({ ok: true, message: "Resync completed" });

//   } catch (err) {
//     console.error("resync error", err);
//     return res.status(500).json({ ok: false, error: err.message });
//   }
// }


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