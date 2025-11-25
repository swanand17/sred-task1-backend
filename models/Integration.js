import mongoose from "mongoose";

const IntegrationSchema = new mongoose.Schema({
  provider: { type: String, default: "github", index: true },

  accessToken: { type: String }, // encrypt or vault in production
  refreshToken: { type: String },
  tokenType: String,
  scope: String,

  linkedAt: { type: Date, default: Date.now },

  user: {
    id: { type: Number, index: true },
    login: { type: String, index: true },
    avatar_url: String,
    html_url: String
  },

  metadata: { type: Object }
}, { collection: "github-integration" });

export default mongoose.model("Integration", IntegrationSchema);
