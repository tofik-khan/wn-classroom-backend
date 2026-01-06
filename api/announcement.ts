import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import { getStudentsinClassroom } from "./students";
import { classAnnouncementCreated } from "../email-templates";
import { emailTemplate } from "../email-templates/master-template";
import { dispatchEmail } from "../utils/email";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
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
        publishedAt: dayjs().format(),
        unpublishedAt: dayjs()
          .add(duration.time ?? 1, duration.unit ?? "day")
          .format(),
      });

    const students = await getStudentsinClassroom(classroomId);
    students.map(async (student) => {
      if (student.email !== "")
        await dispatchEmail({
          to: student.email,
          subject: `Waqf-e-Nau Classes | New Announcement`,
          content: emailTemplate(classAnnouncementCreated(title, content)),
        });
      if (student.parentEmail !== "")
        await dispatchEmail({
          to: student.parentEmail,
          subject: `Waqf-e-Nau Classes | New Announcement`,
          content: emailTemplate(classAnnouncementCreated(title, content)),
        });
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
        return dayjs(announcement.unpublishedAt).isAfter(dayjs());
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
