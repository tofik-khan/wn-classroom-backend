import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { getStudentsinClassroom } from "./students";
import { classAnnouncementCreated } from "../email-templates";
import { emailTemplate } from "../email-templates/master-template";
import { dispatchEmail } from "../utils/email";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`,
);

export const createAnnoncement = async (req, res) => {
  try {
    await client.connect();
    const { duration, classroomId, title, content } = req.body;
    const result = await client
      .db("wn-classroom")
      .collection("announcements")
      .insertOne({
        ...req.body,
        publishedAt: dayjs().tz("America/New_York").format(),
        unpublishedAt: dayjs()
          .tz("America/New_York")
          .add(duration.time ?? 1, duration.unit ?? "day")
          .format(),
      });

    const students = await getStudentsinClassroom(classroomId);

    const studentEmails: string[] = [];
    const parentEmails: string[] = [];

    students.map((student) => {
      if (student.email !== "") studentEmails.push(student.email);
      if (student.parentEmail !== "") parentEmails.push(student.parentEmail);
    });

    await dispatchEmail({
      to: [...studentEmails, ...parentEmails],
      subject: `Waqf-e-Nau Classes | New Announcement`,
      content: emailTemplate(classAnnouncementCreated(title, content)),
    });

    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const { classroomId } = req.params;
    await client.connect();

    const announcements = await client
      .db("wn-classroom")
      .collection("announcements")
      .find({ classroomId })
      .toArray();

    res.send(
      announcements.filter((announcement) => {
        return dayjs(announcement.unpublishedAt).isAfter(
          dayjs().tz("America/New_York"),
        );
      }),
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
