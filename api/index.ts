require("dotenv").config();
import cors from "cors";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { createAdmin, getAdmins, updateAdmin } from "./admins";
import {
  createUser,
  getUsers,
  getOneUser,
  getUserRole,
  updateUser,
  checkUserRole,
} from "./users";

const app = express();
app.use(express.json());
app.use(cors());

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_BASE_URL,
  tokenSigningAlg: "RS256",
});

app.get("/", (req, res) => res.send("Express on Vercel"));

// Mudir - Admins
app.get("/admins", getAdmins);
app.post("/admins", checkJwt, createAdmin);
app.put("/admins", checkJwt, updateAdmin);

// Users
app.get("/users", checkJwt, getUsers);
app.post("/users/byEmail", checkJwt, getOneUser);
app.post("/users", createUser);
app.put("/users", checkJwt, updateUser);
app.post("/users/role", checkUserRole);

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
