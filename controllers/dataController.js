import Integration from "../models/Integration.js";
import Org from "../models/Organization.js";
import Repo from "../models/Repository.js";
import Commit from "../models/Commit.js";
import Pull from "../models/PullRequest.js";
import Issue from "../models/Issue.js";
import User from "../models/User.js";
import { buildMongoFilter } from "../helpers/mongoFilter.js";


// return list of available collections for Active Integrations / Entity dropdown
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

// export async function queryCollection(req, res) {
//   try {
//     const { 
//       collection, 
//       skip = 0, 
//       limit = 25, 
//       sort = {}, 
//       filters = {}, 
//       search 
//     } = req.body;

//     let Model;
//     switch (collection) {
//       case "github_repos": Model = Repo; break;
//       case "github_orgs": Model = Org; break;
//       case "github_commits": Model = Commit; break;
//       case "github_pulls": Model = Pull; break;
//       case "github_issues": Model = Issue; break;
//       case "github_users": Model = User; break;
//       default:
//         return res.status(400).json({ error: "Unknown collection" });
//     }

//     const mongoQuery = {};

//     if (search) {
//       const regex = new RegExp(search, "i");
//       mongoQuery.$or = [
//         { name: regex },
//         { full_name: regex },
//         { title: regex },
//         { body: regex },
//         { message: regex },
//         { login: regex }
//       ];
//     }

//     // 💥 Column filters (the thing you want)
//     Object.assign(mongoQuery, buildMongoFilter(filters));

//     const total = await Model.countDocuments(mongoQuery);

//      let mongoSort = {};
//     if (sort && sort.field) {
//       mongoSort[sort.field] = sort.direction === 'asc' ? 1 : -1;
//     }
//     const docs = await Model.find(mongoQuery)
//       .sort(mongoSort)
//       .skip(Number(skip))    
//       .limit(Number(limit))   
//       .lean()
//       .exec();

//     res.json({ total, skip, limit, data: docs });

//   } catch (err) {
//     console.error("queryCollection error", err);
//     res.status(500).json({ error: err.message });
//   }
// }

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

    // 🌍 GLOBAL SEARCH
    if (search && search.trim() !== "") {
      const regex = new RegExp(search, "i");
      mongoQuery.$or = [
        { name: regex },
        { full_name: regex },
        { title: regex },
        { body: regex },
        { message: regex },
        { login: regex }
      ];
    }

    // 🔍 COLUMN FILTERS
    Object.assign(mongoQuery, buildMongoFilter(filters, collection));

    // 📊 TOTAL COUNT
    const total = await Model.countDocuments(mongoQuery);

    // 🔽 SORTING FIX (AG Grid uses colId)
    let mongoSort = {};
    if (sort && sort.colId) {
      mongoSort[sort.colId] = sort.sort === "asc" ? 1 : -1;
    }

    // 📄 DOCUMENT QUERY
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
