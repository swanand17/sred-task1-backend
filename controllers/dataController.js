import Org from "../models/Organization.js";
import Repo from "../models/Repository.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import User from "../models/User.js";
import { buildMongoFilter } from "../helpers/mongoFilter.js";

export async function listCollections(req, res) {
  res.json({
    collections: [
      { name: "github_repos", label: "Repositories" },
      { name: "github_orgs", label: "Organizations" },
      { name: "github_commits", label: "Commits" },
      { name: "github_pulls", label: "Pull Requests" },
      { name: "github_issues", label: "Issues" },
      { name: "github_users", label: "Users" }
    ]
  });
}

const searchFieldsMap = {
  github_repos: ["name", "full_name", "description"],
  github_orgs: ["login", "description"],
  github_commits: ["commit.message", "commit.author.name"],
  github_pulls: ["title", "body", "user.login"],
  github_issues: ["title", "body", "user.login"],
  github_users: ["login"]
};

export async function queryCollection(req, res) {
  try {
    const {
      collection,
      skip = 0,
      limit = 25,
      sort = null,
      filters = {},
      search
    } = req.body;

    let Model;
    switch (collection) {
      case "github_repos": Model = Repo; break;
      case "github_orgs": Model = Org; break;
      case "github_commits": Model = Commit; break;
      case "github_pulls": Model = Pull; break;
      case "github_issues": Model = Issue; break;
      case "github_users": Model = User; break;
      default:
        return res.status(400).json({ error: "Unknown collection" });
    }

    const mongoQuery = {};

    
    // GLOBAL SEARCH
    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");
      const fields = searchFieldsMap[collection] || [];

      mongoQuery.$or = fields.map(f => ({ [f]: regex }));
    }

    // COLUMN FILTERS
    Object.assign(mongoQuery, buildMongoFilter(filters, collection));

    // TOTAL COUNT
    const total = await Model.countDocuments(mongoQuery);

    // SORTING
    let mongoSort = {};
    if (sort && sort.field) {
      mongoSort[sort.field] = (sort.sort || sort.direction) === "asc" ? 1 : -1;
    }

    const docs = await Model.find(mongoQuery)
      .sort(mongoSort)
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    res.json({ total, skip, limit, data: docs });

  } catch (err) {
    console.error("queryCollection error", err);
    res.status(500).json({ error: err.message });
  }
}
