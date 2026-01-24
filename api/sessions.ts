import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

import { getStudentsinClassroom } from "./students";
import { createMeeting } from "./meet";
import { dispatchEmail } from "../utils/email";
import { emailTemplate } from "../email-templates/master-template";
import { sessionStarted } from "../email-templates";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`,
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

    if (!meetingLink || meetingLink === "") {
      throw new Error("Meeting link could not be generated");
    }

    students.map(async (student) => {
      if (student.email !== "")
        dispatchEmail({
          to: student.email,
          subject: `${classroomName ?? "Class"} Session started`,
          content: emailTemplate(
            sessionStarted(classroomId, classroomName, student.name),
          ),
        });
      if (student.parentEmail !== "")
        dispatchEmail({
          to: student.parentEmail,
          subject: `${classroomName ?? "Class"} Session started`,
          content: emailTemplate(
            sessionStarted(classroomId, classroomName, "Parent"),
          ),
        });
    });

    // Insert Session

    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("sessions")
      .insertOne({
        date: dayjs().tz("America/New_York").format("YYYY-MM-DD"),
        classroomId,
        teacherId,
        teacherRole,
        startTime: {
          scheduled: dayjs
            .tz(scheduledStartTime, "h:mm", "America/New_York")
            .format(),
        },
        attendance,
        link: meetingLink,
        createdAt: dayjs().tz("America/New_York").format(),
        endTime: dayjs().tz("America/New_York").add(1, "hour").format(),
      });
    res.send({ status: "success", data: result });
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};

export const getSession = async (req, res) => {
  try {
    const { classroomId } = req.params;
    await client.connect();

    const sessions = await client
      .db("wn-classroom")
      .collection("sessions")
      .find({
        classroomId,
        date: dayjs().tz("America/New_York").format("YYYY-MM-DD"),
      })
      .toArray();

    res.send(
      sessions.sort((a, b) => {
        return dayjs(a.createdAt).isAfter(b.createdAt) ? -1 : 1;
      })[0],
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, attendance, role } = req.body;

    await client.connect();

    if (role === "teacher") {
      // Mark teacher attendance
      const result = await client
        .db("wn-classroom")
        .collection("sessions")
        .updateOne(
          {
            _id: new ObjectId(sessionId),
            "startTime.actual": { $exists: false },
          },
          {
            $set: {
              "startTime.actual": dayjs().tz("America/New_York").format(),
            },
          },
        );
      return res.send(result);
    } else {
      // Mark Student attendance

      const result = await client
        .db("wn-classroom")
        .collection("sessions")
        .updateOne(
          {
            _id: new ObjectId(sessionId),
          },
          {
            $set: {
              "attendance.$[student].attendance": attendance ?? "absent",
            },
          },
          {
            arrayFilters: [{ "student.studentId": new ObjectId(studentId) }],
          },
        );
      return res.send(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
};
