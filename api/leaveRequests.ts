import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { dispatchEmail } from "../utils/email";
import { emailTemplate } from "../email-templates/master-template";
import { leaveRequested } from "../email-templates";
import {
  LEAVE_CUTOFF_MESSAGE,
  getNextClassStart,
  isLeaveWindowOpen,
} from "../utils/schedule";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`,
);

const MAX_REASON_LENGTH = 500;

const getCallerEmail = (req) => req.auth.payload[process.env.AUTH0_EMAIL_PAYLOAD];

const getCallerRole = (req) => {
  const roles = req.auth.payload[process.env.AUTH0_AUTENTICATION_PAYLOAD];
  return Array.isArray(roles) ? roles[0] : roles;
};

/**
 * A student may act for themselves; a parent may act for students whose
 * parentEmail matches their own account.
 */
const canActForStudent = (student, email: string) =>
  !!email && (student?.email === email || student?.parentEmail === email);

export const createLeaveRequests = async (req, res) => {
  try {
    const { studentId, classroomIds, reason } = req.body ?? {};
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";

    if (!studentId || !ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .send({ status: "error", message: "A valid student is required." });
    }
    if (!Array.isArray(classroomIds) || classroomIds.length === 0) {
      return res
        .status(400)
        .send({ status: "error", message: "Select at least one class." });
    }
    if (!trimmedReason || trimmedReason.length > MAX_REASON_LENGTH) {
      return res.status(400).send({
        status: "error",
        message: `A reason of up to ${MAX_REASON_LENGTH} characters is required.`,
      });
    }

    await client.connect();
    const db = client.db("wn-classroom");
    const email = getCallerEmail(req);

    const student = await db
      .collection("users")
      .findOne({ _id: new ObjectId(studentId), role: "student" });

    if (!student) {
      return res
        .status(404)
        .send({ status: "error", message: "Student not found." });
    }
    if (!canActForStudent(student, email)) {
      return res.status(403).send({
        status: "error",
        message: "You can only request leave for your own students.",
      });
    }

    const enrolledIds: string[] = (student.classrooms ?? []).map(
      (classroom) => classroom.value,
    );
    const now = dayjs().tz("America/New_York");
    const created: any[] = [];
    const skipped: { classroomId: string; reason: string; code: number }[] = [];

    for (const classroomId of [...new Set<string>(classroomIds)]) {
      if (!ObjectId.isValid(classroomId) || !enrolledIds.includes(classroomId)) {
        skipped.push({
          classroomId,
          reason: "Student is not enrolled in this class.",
          code: 403,
        });
        continue;
      }

      const classroom = await db
        .collection("classrooms")
        .findOne({ _id: new ObjectId(classroomId) });
      const nextStart = classroom && getNextClassStart(classroom as any, now);

      if (!nextStart) {
        skipped.push({
          classroomId,
          reason: "This class has no upcoming session.",
          code: 400,
        });
        continue;
      }
      if (!isLeaveWindowOpen(nextStart, now)) {
        skipped.push({ classroomId, reason: LEAVE_CUTOFF_MESSAGE, code: 400 });
        continue;
      }

      const date = nextStart.format("YYYY-MM-DD");
      const existing = await db.collection("leaveRequests").findOne({
        studentId: student._id,
        classroomId,
        date,
        status: "active",
      });
      if (existing) {
        skipped.push({
          classroomId,
          reason: "Leave has already been requested for this class.",
          code: 409,
        });
        continue;
      }

      const leaveRequest = {
        studentId: student._id,
        studentName: student.name,
        classroomId,
        classroomName: classroom.name,
        date,
        scheduledStart: nextStart.format(),
        reason: trimmedReason,
        status: "active",
        requestedBy: { email, role: getCallerRole(req) },
        createdAt: now.format(),
      };
      const result = await db
        .collection("leaveRequests")
        .insertOne(leaveRequest);
      created.push({ _id: result.insertedId, ...leaveRequest });
    }

    if (created.length === 0) {
      return res.status(skipped[0].code).send({
        status: "error",
        message: skipped[0].reason,
        data: { created, skipped },
      });
    }

    // Notify each class's teacher; email failures should not fail the request
    await Promise.all(
      created.map(async (leaveRequest) => {
        try {
          const teachers = await db
            .collection("teachers")
            .find({ "classrooms.value": leaveRequest.classroomId })
            .toArray();
          const teacherEmails = teachers
            .map((teacher) => teacher.email)
            .filter((teacherEmail) => !!teacherEmail);
          if (teacherEmails.length === 0) return;

          await dispatchEmail({
            to: teacherEmails,
            subject: `Leave requested: ${leaveRequest.studentName} - ${
              leaveRequest.classroomName ?? "Class"
            }`,
            content: emailTemplate(leaveRequested(leaveRequest)),
          });
        } catch (e) {
          console.error(e);
        }
      }),
    );

    res.send({ status: "success", data: { created, skipped } });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getMyLeaveRequests = async (req, res) => {
  try {
    await client.connect();
    const db = client.db("wn-classroom");
    const email = getCallerEmail(req);

    const students = await db
      .collection("users")
      .find({ role: "student", $or: [{ email }, { parentEmail: email }] })
      .toArray();

    const result = await db
      .collection("leaveRequests")
      .find({
        studentId: { $in: students.map((student) => student._id) },
        status: "active",
        date: { $gte: dayjs().tz("America/New_York").format("YYYY-MM-DD") },
      })
      .toArray();

    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .send({ status: "error", message: "Invalid leave request." });
    }

    await client.connect();
    const db = client.db("wn-classroom");

    const leaveRequest = await db
      .collection("leaveRequests")
      .findOne({ _id: new ObjectId(id), status: "active" });
    if (!leaveRequest) {
      return res
        .status(404)
        .send({ status: "error", message: "Leave request not found." });
    }

    const student = await db
      .collection("users")
      .findOne({ _id: leaveRequest.studentId });
    if (!canActForStudent(student, getCallerEmail(req))) {
      return res.status(403).send({
        status: "error",
        message: "You can only withdraw leave for your own students.",
      });
    }
    if (!isLeaveWindowOpen(leaveRequest.scheduledStart)) {
      return res.status(400).send({
        status: "error",
        message:
          "Leave can only be withdrawn up to an hour before the class starts.",
      });
    }

    const result = await db.collection("leaveRequests").updateOne(
      { _id: leaveRequest._id },
      {
        $set: {
          status: "cancelled",
          cancelledAt: dayjs().tz("America/New_York").format(),
        },
      },
    );
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getClassroomLeaveRequests = async (req, res) => {
  try {
    const { classroomId, date } = req.params;
    const result = await getActiveLeaveRequests(classroomId, date);
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getActiveLeaveRequests = async (
  classroomId: string,
  date: string,
) => {
  await client.connect();
  return client
    .db("wn-classroom")
    .collection("leaveRequests")
    .find({ classroomId, date, status: "active" })
    .toArray();
};
