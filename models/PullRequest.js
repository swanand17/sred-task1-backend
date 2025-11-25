import mongoose from "mongoose";

const PullSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  number: { type: Number, index: true },
  state: { type: String, index: true },
  title: { type: String, index: true },
  body: String,
  html_url: String,

  user: {
    login: { type: String, index: true },
    id: Number
  },

  merged_at: { type: Date, index: true },
  created_at: Date,
  updated_at: Date,

  repo_full_name: { type: String, index: true },
  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', index: true },

  fetchedAt: { type: Date, default: Date.now }
}, { collection: "github_pulls" });

export default mongoose.model("Pull", PullSchema);
