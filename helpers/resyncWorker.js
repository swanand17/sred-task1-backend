import { parentPort, workerData } from "worker_threads";
import mongoose from "mongoose";
import { githubPaginate } from "../helpers/githubApi.js";
import Repo from "../models/Repository.js";
import Org from "../models/Organization.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import User from "../models/User.js";

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

  console.log(`Organizations Resync Completed: Fetched ${orgs.length} orgs`);


  // REPOS
  let allRepos = [];
  await Repo.deleteMany({ integrationId: id });

  for (const org of orgs) {
    const repos = await githubPaginate(token, `/orgs/${org.login}/repos`);
    allRepos.push(...repos.map(r => ({
      ...r,
      repo_full_name: r.full_name,
      integrationId: id,
      fetchedAt: new Date()
    })));
  }

  // const starred = await githubPaginate(token, "/user/starred");
  // allRepos.push(...starred.map(r => ({
  //   ...r,
  //   repo_full_name: r.full_name,
  //   integrationId: id,
  //   fetchedAt: new Date()
  // })));

  // const userRepos = await githubPaginate(token, "/user/repos", {
  //   type: "public",
  //   sort: "updated",
  //   per_page: 100
  // });
  // allRepos.push(...userRepos.map(r => ({
  //   ...r,
  //   repo_full_name: r.full_name,
  //   integrationId: id,
  //   fetchedAt: new Date()
  // })));


  await Repo.insertMany(allRepos);
  console.log(`Repositories Resync Completed: Fetched ${allRepos.length} repos`);


  // RESET DATA
  const check = Promise.all([
    resyncOrgUsers(id, token, orgs),
    resyncCommit(id, token, allRepos),
    resyncPullRequests(id, token, allRepos),
    resyncIssues(id, token, allRepos)
  ]);

  // await Commit.deleteMany({ integrationId: id });
  // await Pull.deleteMany({ integrationId: id });
  // await Issue.deleteMany({ integrationId: id });

  // // PROCESS each repo with safety limits
  // for (const r of allRepos.slice(0, 200)) {
  //   const fullName = r.full_name;

  //   const commits = await githubPaginate(token, `/repos/${fullName}/commits`, { per_page: 100 });
  //   if (commits.length) {
  //     await Commit.insertMany(commits.map(c => ({
  //       ...c,
  //       repo_full_name: fullName,
  //       integrationId: id,
  //       fetchedAt: new Date()
  //     })));
  //   }

  //   const pulls = await githubPaginate(token, `/repos/${fullName}/pulls`, { state: "all", per_page: 100 });
  //   if (pulls.length) {
  //     await Pull.insertMany(pulls.map(p => ({
  //       ...p,
  //       repo_full_name: fullName,
  //       integrationId: id,
  //       fetchedAt: new Date()
  //     })));
  //   }

  //   const issues = await githubPaginate(token, `/repos/${fullName}/issues`, { state: "all", per_page: 100 });
  //   if (issues.length) {
  //     await Issue.insertMany(issues.map(i => ({
  //       ...i,
  //       repo_full_name: fullName,
  //       integrationId: id,
  //       fetchedAt: new Date()
  //     })));
  //   }
  // }

  check.then(() => {
    console.log("Worker: Resync tasks completed");
    parentPort.postMessage({ ok: true });
    process.exit(0);
  }).catch(err => {
    console.error("Worker: Resync tasks error:", err);
  });
}

function resyncCommit(id, token, allRepos){
  return new Promise(async (resolve, reject) => {
    await Commit.deleteMany({ integrationId: id });
    try {
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
      }
      console.log("Commits Resync Completed");
      return resolve();
    } catch (err) {
      console.error("Error in resyncCommit:", err);

      return reject(err);
    }
  });
}

function resyncPullRequests(id, token, allRepos){
  return new Promise(async (resolve, reject) => {
    await Pull.deleteMany({ integrationId: id });
    try {
      for (const r of allRepos.slice(0, 200)) {
        const fullName = r.full_name;

        const pulls = await githubPaginate(token, `/repos/${fullName}/pulls`, { per_page: 100 });
        if (pulls.length) {
          await Pull.insertMany(pulls.map(c => ({
            ...c,
            repo_full_name: fullName,
            integrationId: id,
            fetchedAt: new Date()
          })));
        }
      }
      console.log("PRs Resync Completed");
      return resolve();
    } catch (err) {
      console.error("Error in resyncPullRequest:", err);

      return reject(err);
    }
  });
}

function resyncIssues(id, token, allRepos){
  return new Promise(async (resolve, reject) => {
    await Issue.deleteMany({ integrationId: id });
    try {
      for (const r of allRepos.slice(0, 200)) {
        const fullName = r.full_name;

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
      console.log("Issues Resync Completed");
      return resolve();
    } catch (err) {
      console.error("Error in resyncIssues:", err);
      return reject(err);
    }
  });
}


function resyncOrgUsers(id, token, orgs) {
   return new Promise(async (resolve, reject) => {
    await User.deleteMany({ integrationId: id });
    try {
      if (!token) return res.status(401).json({ error: "Missing token" });
      for (const org of orgs) {
        const members = await githubPaginate(token, `/orgs/${org.login}/members`, {
          per_page: 100
        });
        User.insertMany(members.map(u => ({
          ...u,
          org: org.login,
          integrationId: id,
          fetchedAt: new Date()
        })));
      }
      console.log("Organization Users Resync Completed");
      resolve();
    } catch (err) {
      console.error("Error in resyncOrgUsers:", err);
      return reject(err);
    }
  });
}

run().catch(err => {
  console.error("Worker crashed:", err);
  parentPort.postMessage({ ok: false, error: err.message });
  process.exit(1);
});
