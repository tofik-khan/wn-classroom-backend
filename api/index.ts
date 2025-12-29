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
  createClassroom,
  getClassrooms,
  getOneClass,
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

const app = express();
app.use(express.json());
app.use(cors());

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_BASE_URL,
  tokenSigningAlg: "RS256",
});

app.get("/", (req, res) => res.send("Express on Vercel"));

// Admins
app.get("/admins", getAdmins);
app.post("/admins", checkJwt, createAdmin);
app.put("/admins", checkJwt, updateAdmin);

// Users
app.get("/users", checkJwt, getUsers);
app.post("/users/byEmail", checkJwt, getOneUser);
app.post("/users", createUser);
app.put("/users", checkJwt, updateUser);
app.post("/users/role", checkUserRole);
app.get("/users/unenrolled", checkJwt, getUnenrolledUsers);
app.put("/users/:id/enroll", checkJwt, enrollInClass);

// Teachers
app.get("/teachers", checkJwt, getTeachers);
app.get("/teachers/:id", checkJwt, getOneTeacher);
app.post("/teachers", checkJwt, createTeacher);
app.put("/teachers/:id", checkJwt, updateTeacher);
app.get("/teachers/classrooms/:id", checkJwt, getTeacherByClassId);

app.get("/auth", getAuth);
app.get("/auth/google/callback", authRedirect);
app.post("/meet", checkJwt, createMeeting);
//@TODO: add GET /class/:id/meet

// Classrooms
app.get("/classrooms", checkJwt, getClassrooms);
app.post("/classrooms", checkJwt, createClassroom);
app.get("/classrooms/:id", checkJwt, getOneClass);
app.put("/classrooms/:id", checkJwt, updateClassroom);

// Students
app.get("/students", checkJwt, getStudents);
app.get("/students/:id", checkJwt, getOneStudent);
app.put("/students/:id", checkJwt, updateStudent);

// Parents
app.get("/parents", checkJwt, getParents);
app.get("/parents/:id", checkJwt, getOneParent);
app.put("/parents/:id", checkJwt, updateParent);
app.post("/parents/myStudents", checkJwt, getMyStudents);
app.post("/parents/createStudent", checkJwt, createStudent);

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
