import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { sendTelegramMessage } from "../utils/telegram";
dayjs.extend(utc);
dayjs.extend(timezone);

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const createSupportRequest = async (req, res) => {
  try {
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("support")
      .insertOne({
        ...req.body,
        createdAt: dayjs().tz("America/New_York").format(),
      });

    const message = `
    New Support case:
https://classroom.waqfenau.us/protected/support/${result.insertedId}
    `;
    await sendTelegramMessage(message);

    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getSupportRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("support")
      .find({ _id: new ObjectId(id) })
      .toArray();

    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
