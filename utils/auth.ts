const { google } = require("googleapis");

export const oauth2Client = new google.auth.OAuth2({
  client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
  client_secret: process.env.GOOGLE_OAUTH_SECRET,
  redirectUri: `${process.env.GOOGLE_OAUTH_REDIRECT}`,
});

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];
