import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import { createUpdatePayload } from "../utils/payload";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getStudents = async (req, res) => {
  try {
    await client.connect();

    const students = await client
      .db("wn-classroom")
      .collection("users")
      .find({ role: "student" })
      .toArray();
    res.send(students);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getOneStudent = async (req, res) => {
  try {
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .findOne({ _id, role: "student" });
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const updateStudent = async (req, res) => {
  try {
    await client.connect();
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    delete req.params.id;
    const existing = await client
      .db("wn-classroom")
      .collection("users")
      .findOne({ _id, role: "student" });
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .updateOne({ _id }, { $set: createUpdatePayload(existing, req.body) });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
