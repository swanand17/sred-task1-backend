import mongoose from "mongoose";

const CommitSchema = new mongoose.Schema({
  sha: { type: String, index: true },
  node_id: String,
  url: String,
  html_url: String,

  commit: {
    author: {
      name: String,
      email: String,
      date: { type: Date, index: true }
    },
    committer: {
      name: String,
      email: String,
      date: Date
    },
    message: { type: String, index: true }
  },

  author: Object,
  committer: Object,

  repo_full_name: { type: String, index: true },
  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', index: true },

  fetchedAt: { type: Date, default: Date.now }
}, { collection: "github_commits" });

export default mongoose.model("Commit", CommitSchema);
