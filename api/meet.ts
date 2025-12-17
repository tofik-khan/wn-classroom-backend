import { google } from "googleapis";
import { oauth2Client, SCOPES } from "../utils/auth";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

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
    res.send({ result, expiry: tokens.expiry_date });
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

export const createMeeting = async (req, res) => {
  try {
    const { id, className = "Waqf-e-Nau Online Class" } = req.body;
    const tokenObj = await getAuthTokenFromDB(id);

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
          dateTime: dayjs().format(),
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

    res.json({
      eventId: response.data.id,
      params: req.params,
      query: req.query,
      meetLink,
    });
  } catch (error) {}
};
