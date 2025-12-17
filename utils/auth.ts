import { google } from "googleapis";

export const oauth2Client = new google.auth.OAuth2({
  client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
  client_secret: process.env.GOOGLE_OAUTH_SECRET,
  redirectUri: "http://localhost:3000/auth/google/callback",
});

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];
