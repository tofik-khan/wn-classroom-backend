require("dotenv").config();
import cors from "cors";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { createAdmin, getAdmins, updateAdmin } from "./admins";
import { createApplicant, getApplicants, getOneApplicant } from "./applicants";

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

// Waqf-e-Ardhi - Applicants
app.get("/applicants", checkJwt, getApplicants);
app.get("/applicants/:id", checkJwt, getOneApplicant);
app.post("/applicants", createApplicant);

module.exports = app;
