import { config } from "dotenv";
config();

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { MongoClient, ObjectId } from "mongodb";
import { groupByMonths } from "../utils/time";
import { sessionReportPipelineByDate } from "../pipelines/reports";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`,
);

export const getSessionsForTheYear = async (req, res) => {
  try {
    const { year } = req.params;

    await client.connect();

    const uniqueSessionDates = await client
      .db("wn-classroom")
      .collection("sessions")
      .distinct("date");

    const currentYearSessionDates = uniqueSessionDates.filter((date) => {
      const [sessionYear, sessionMonth, sessionDay] = date.split("-");
      return sessionYear === year;
    });

    res.send(groupByMonths(currentYearSessionDates));
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getSessionReport = async (req, res) => {
  try {
    const { date } = req.params;

    await client.connect();

    const report = await client
      .db("wn-classroom")
      .collection("sessions")
      .aggregate(sessionReportPipelineByDate(date))
      .toArray();

    res.send(report);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};
