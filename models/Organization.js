import mongoose from "mongoose";

const OrgSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  login: { type: String, index: true },
  node_id: String,
  avatar_url: String,
  description: String,
  url: String,
  html_url: String,

  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', index: true },

  fetchedAt: { type: Date, default: Date.now }
}, { collection: "github_orgs" });

export default mongoose.model("Org", OrgSchema);
