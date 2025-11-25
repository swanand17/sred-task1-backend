import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  login: { type: String, index: true },
  html_url: String,
  avatar_url: String,
  type: String,

  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', index: true },
  fetchedAt: { type: Date, default: Date.now }
}, { collection: "github_users" });

export default mongoose.model("User", UserSchema);
