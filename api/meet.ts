const { google } = require("googleapis");
import { oauth2Client, SCOPES } from "../utils/auth";
import { MongoClient } from "mongodb";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getAuth = async (req, res) => {
  const { id } = req.query;

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: id,
  });
  res.redirect(url);
};

export const authRedirect = async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);

    const result = await insertAuthTokenToDB({
      id: req.query.state,
      tokens,
    });
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(`
      <h2>Your Google Account is now connected to Waqf-e-Nau Classroom.</h2>
      <p>This is only valid for one operation and will disconnect in 10 minutes for your account saftey.</p>
      <p><em>You can close this tab now</em></p>
      `)
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const insertAuthTokenToDB = async ({ id, tokens }) => {
  try {
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("tokens")
      .updateOne(
        { id },
        {
          $set: { id, tokens },
        },
        {
          upsert: true,
        }
      );
    return result;
  } catch (e) {
    console.log(e);
  }
};

const getAuthTokenFromDB = async (id) => {
  try {
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("tokens")
      .findOne({ id });
    return result;
  } catch (e) {
    console.log(e);
  }
};

export const createMeeting = async (
  teacherId,
  className = "Waqf-e-Nau Online Class"
) => {
  try {
    const tokenObj = await getAuthTokenFromDB(teacherId);

    oauth2Client.setCredentials(tokenObj.tokens);

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await calendar.events.insert({
      conferenceDataVersion: 1,
      calendarId: "primary",
      requestBody: {
        end: {
          dateTime: dayjs().add(1, "hour").format(),
        },
        start: {
          dateTime: dayjs().format(),
        },
        summary: className,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    });

    const meetLink = response.data.conferenceData.entryPoints.find(
      (e) => e.entryPointType === "video"
    )?.uri;

    return meetLink;
  } catch (error) {}
};
