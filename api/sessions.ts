import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import { createUpdatePayload } from "../utils/payload";
import { getStudentsinClassroom } from "./students";
import { createMeeting } from "./meet";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const createSession = async (req, res) => {
  try {
    const {
      classroomId,
      classroomName,
      teacherId,
      teacherRole,
      scheduledStartTime,
    } = req.body;

    // Get Students in current class and create attendacne array
    const students = await getStudentsinClassroom(classroomId);
    const attendance = students.map((student) => ({
      studentId: student._id,
      studentName: student.name,
      attendance: "absent",
    }));

    // Generate Meeting Link
    const meetingLink = await createMeeting(teacherId, classroomName);

    // Insert Session

    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("sessions")
      .insertOne({
        date: dayjs().format("YYYY-MM-DD"),
        classroomId,
        teacherId,
        teacherRole,
        startTime: {
          scheduled: scheduledStartTime,
        },
        attendance,
        link: meetingLink,
        createdAt: dayjs().format(),
      });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getSession = async (req, res) => {
  try {
    const { classroomId } = req.params;
    await client.connect();

    const sessions = await client
      .db("wn-classroom")
      .collection("sessions")
      .find({ classroomId, date: dayjs().format("YYYY-MM-DD") })
      .toArray();

    res.send(
      sessions.sort((a, b) => {
        return dayjs(a.createdAt).isAfter(b.createdAt) ? -1 : 1;
      })[0]
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
