import { config } from "dotenv";
config();

import cors from "cors";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { createAdmin, getAdmins, updateAdmin } from "./admins";
import {
  createUser,
  getUsers,
  getOneUser,
  updateUser,
  checkUserRole,
  getUnenrolledUsers,
  enrollInClass,
  getUserMembercodes,
} from "./users";
import {
  createTeacher,
  getOneTeacher,
  getTeacherByClassId,
  getTeachers,
  updateTeacher,
} from "./teachers";
import { authRedirect, createMeeting, getAuth } from "./meet";
import {
  addClassroomResource,
  createClassroom,
  getClassrooms,
  getOneClass,
  getStudentsInClassroomAPI,
  updateClassroom,
} from "./classroom";
import { getOneStudent, getStudents, updateStudent } from "./students";
import {
  createStudent,
  getMyStudents,
  getOneParent,
  getParents,
  updateParent,
} from "./parents";
import { createSession, getSession, updateAttendance } from "./sessions";
import { createAnnoncement, getAnnouncements } from "./announcement";
import {
  createSupportRequest,
  getAllSupportCases,
  getSupportRequest,
  updateSupportCase,
} from "./support";
import { checkRoles } from "../utils/checkRoles";
import { verifyStudents } from "../utils/studentVerification";
import { getStudentsInJammat } from "./secretary";
import {
  getClassroomSessionReport,
  getSessionReport,
  getSessionsForTheYear,
} from "./reports";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors());

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_BASE_URL,
  tokenSigningAlg: "RS256",
});

const TEACHER_ROLES = ["admin", "teacher", "substitute"];

app.get("/", (req, res) => res.send("Express on Vercel"));

// Admins
app.get("/admins", checkJwt, checkRoles(["admin"]), getAdmins);
app.post("/admins", checkJwt, checkRoles(["admin"]), createAdmin);
app.put("/admins", checkJwt, checkRoles(["admin"]), updateAdmin);

// Users
app.get("/users", checkJwt, checkRoles(["admin"]), getUsers);
app.post("/users/byEmail", checkJwt, getOneUser);
app.post("/users", createUser);
app.put("/users", checkJwt, updateUser);
app.post("/users/role", checkUserRole);
app.get(
  "/users/unenrolled",
  checkJwt,
  checkRoles(["admin"]),
  getUnenrolledUsers,
);
app.put("/users/:id/enroll", checkJwt, checkRoles(["admin"]), enrollInClass);
app.get("/users/membercodes", checkJwt, getUserMembercodes);

// Teachers
app.get("/teachers", checkJwt, checkRoles(["admin"]), getTeachers);
app.get("/teachers/:id", checkJwt, checkRoles(["admin"]), getOneTeacher);
app.post("/teachers", checkJwt, checkRoles(["admin"]), createTeacher);
app.put("/teachers/:id", checkJwt, checkRoles(["admin"]), updateTeacher);
app.get("/teachers/classrooms/:id", checkJwt, getTeacherByClassId);

app.get("/auth", getAuth);
app.get("/auth/google/callback", authRedirect);
app.post("/meet", checkJwt, createMeeting);

// Classrooms
app.get("/classrooms", checkJwt, getClassrooms);
app.post("/classrooms", checkJwt, checkRoles(["admin"]), createClassroom);
app.get("/classrooms/:id", checkJwt, getOneClass);
app.put(
  "/classrooms/:id",
  checkJwt,
  checkRoles(TEACHER_ROLES),
  updateClassroom,
);
app.post("/classrooms/:id/resources", checkJwt, addClassroomResource);
app.get(
  "/classrooms/:id/students",
  checkJwt,
  checkRoles(TEACHER_ROLES),
  getStudentsInClassroomAPI,
);

// Students
app.get("/students", checkJwt, checkRoles(["admin"]), getStudents);
app.get("/students/:id", checkJwt, checkRoles(["admin"]), getOneStudent);
app.put("/students/:id", checkJwt, checkRoles(["admin"]), updateStudent);

// Parents
app.get("/parents", checkJwt, checkRoles(["admin"]), getParents);
app.get("/parents/:id", checkJwt, checkRoles(["admin"]), getOneParent);
app.put("/parents/:id", checkJwt, checkRoles(["admin"]), updateParent);
app.post(
  "/parents/myStudents",
  checkJwt,
  checkRoles(["admin", "parent", "unregistered"]),
  getMyStudents,
);
app.post(
  "/parents/createStudent",
  checkJwt,
  checkRoles(["admin", "parent", "unregistered"]),
  createStudent,
);

// Sessions
app.get("/sessions/:classroomId", checkJwt, getSession);
app.post("/sessions", checkJwt, checkRoles(TEACHER_ROLES), createSession);
app.put("/sessions/:sessionId/attendance", checkJwt, updateAttendance);

// Announcements
app.post(
  "/announcements",
  checkJwt,
  checkRoles(TEACHER_ROLES),
  createAnnoncement,
);
app.get("/announcements/:classroomId", checkJwt, getAnnouncements);

// Support
app.post("/support", createSupportRequest);
app.get("/support", checkJwt, checkRoles(["admin"]), getAllSupportCases);
app.get("/support/:id", checkJwt, checkRoles(["admin"]), getSupportRequest);
app.put("/support/:id", checkJwt, checkRoles(["admin"]), updateSupportCase);

// Student Verification
app.get("/verify", async (req, res) => {
  await verifyStudents();
  res.send("done");
});

// Secretary
app.get(
  "/secretary/getStudents",
  checkJwt,
  checkRoles(["admin", "secretary"]),
  getStudentsInJammat,
);

// Reports
app.get(
  "/reports/:year",
  checkJwt,
  checkRoles(["admin"]),
  getSessionsForTheYear,
);
app.get(
  "/reports/sessions/:date",
  checkJwt,
  checkRoles(["admin"]),
  getSessionReport,
);
app.get(
  "/reports/sessions/:date/:classroomId",
  checkJwt,
  checkRoles(["admin"]),
  getClassroomSessionReport,
);

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
