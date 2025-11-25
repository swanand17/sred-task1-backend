import mongoose from "mongoose";

const RepoSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  name: String,
  full_name: { type: String, index: true },
  private: Boolean,
  visibility: String,
  description: String,
  html_url: String,

  owner: {
    login: { type: String, index: true },
    id: Number,
    avatar_url: String
  },

  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', index: true },

  fetchedAt: { type: Date, default: Date.now }
}, { collection: "github_repos" });

export default mongoose.model("Repo", RepoSchema);
