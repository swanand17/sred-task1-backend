import Integration from "../models/Integration.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";

export async function startAuth(req, res) {
  const state = Math.random().toString(36).substring(2); // in prod store state in session
  const scope = "repo read:org user";
  const redirect = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(redirect);
}

export async function authCallback(req, res) {
  const { code /*, state */ } = req.query;
  if (!code) return res.status(400).send("Missing code");

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    })
  });
  const tokenJson = await tokenRes.json();
  if (tokenJson.error) return res.status(400).json(tokenJson);

  const accessToken = tokenJson.access_token;
  // fetch user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" }
  });
  const user = await userRes.json();

  // Check if integration exists for this GitHub user
  let integration = await Integration.findOne({ "user.id": user.id });

  if (integration) {
    // Update existing integration instead of creating duplicate
    integration.accessToken = accessToken;
    integration.tokenType = tokenJson.token_type;
    integration.scope = tokenJson.scope;
    integration.linkedAt = new Date();
    integration.user = {
      id: user.id,
      login: user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url
    };

    await integration.save();
    console.log("Updated existing integration:", integration._id);

  } else {
    // Create new integration (first time only)
    integration = new Integration({
      provider: "github",
      accessToken,
      tokenType: tokenJson.token_type,
      scope: tokenJson.scope,
      linkedAt: new Date(),
      user: {
        id: user.id,
        login: user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url
      }
    });

    await integration.save();
    console.log("Created new integration:", integration._id);
  }

  // Redirect back to front-end with success (in prod use proper front-end route + encryption/session)
  const redirectUrl = `${FRONTEND_URL}/?integration_id=${integration._id}&status=success`;
  return res.redirect(redirectUrl);
}