import { parentPort, workerData } from "worker_threads";
import mongoose from "mongoose";
import { githubPaginate } from "../helpers/githubApi.js";
import Repo from "../models/Repository.js";
import Org from "../models/Organization.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";

async function run() {
  const { integration, mongoUri } = workerData;

  await mongoose.connect(mongoUri);

  const id = integration._id;
  const token = integration.accessToken;

  console.log("Worker: Starting resync for", id);

  // ORGS
  const orgs = await githubPaginate(token, "/user/orgs");

  await Org.deleteMany({ integrationId: id });
  await Org.insertMany(orgs.map(o => ({
    ...o,
    integrationId: id,
    fetchedAt: new Date()
  })));

  // REPOS
  let allRepos = [];

  for (const org of orgs) {
    const repos = await githubPaginate(token, `/orgs/${org.login}/repos`);
    allRepos.push(...repos.map(r => ({
      ...r,
      repo_full_name: r.full_name,
      integrationId: id,
      fetchedAt: new Date()
    })));
  }

  // also fetch contributed & starred (for OSS repos)
  const starred = await githubPaginate(token, "/user/starred");
  allRepos.push(...starred.map(r => ({
    ...r,
    repo_full_name: r.full_name,
    integrationId: id,
    fetchedAt: new Date()
  })));

  const userRepos = await githubPaginate(token, "/user/repos", {
    type: "public",
    sort: "updated",
    per_page: 100
  });
  allRepos.push(...userRepos.map(r => ({
    ...r,
    repo_full_name: r.full_name,
    integrationId: id,
    fetchedAt: new Date()
  })));

  await Repo.deleteMany({ integrationId: id });
  await Repo.insertMany(allRepos);

  // RESET DATA
  await Commit.deleteMany({ integrationId: id });
  await Pull.deleteMany({ integrationId: id });
  await Issue.deleteMany({ integrationId: id });

  // PROCESS each repo with safety limits
  for (const r of allRepos.slice(0, 200)) {
    const fullName = r.full_name;

    const commits = await githubPaginate(token, `/repos/${fullName}/commits`, { per_page: 100 });
    if (commits.length) {
      await Commit.insertMany(commits.map(c => ({
        ...c,
        repo_full_name: fullName,
        integrationId: id,
        fetchedAt: new Date()
      })));
    }

    const pulls = await githubPaginate(token, `/repos/${fullName}/pulls`, { state: "all", per_page: 100 });
    if (pulls.length) {
      await Pull.insertMany(pulls.map(p => ({
        ...p,
        repo_full_name: fullName,
        integrationId: id,
        fetchedAt: new Date()
      })));
    }

    const issues = await githubPaginate(token, `/repos/${fullName}/issues`, { state: "all", per_page: 100 });
    if (issues.length) {
      await Issue.insertMany(issues.map(i => ({
        ...i,
        repo_full_name: fullName,
        integrationId: id,
        fetchedAt: new Date()
      })));
    }
  }

  console.log("Worker: Resync completed");

  parentPort.postMessage({ ok: true });
  process.exit(0);
}

run().catch(err => {
  console.error("Worker crashed:", err);
  parentPort.postMessage({ ok: false, error: err.message });
  process.exit(1);
});
