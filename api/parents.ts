import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import { createUpdatePayload } from "../utils/payload";
import dayjs from "dayjs";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getParents = async (req, res) => {
  try {
    await client.connect();

    const users = await client
      .db("wn-classroom")
      .collection("users")
      .find({ role: "parent" })
      .toArray();
    res.send(users);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getOneParent = async (req, res) => {
  try {
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .findOne({ _id, role: "parent" });
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const updateParent = async (req, res) => {
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
      .findOne({ _id, role: "parent" });
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

export const getMyStudents = async (req, res) => {
  try {
    await client.connect();
    const { email } = req.body;

    const users = await client
      .db("wn-classroom")
      .collection("users")
      .find({ parentEmail: email })
      .toArray();
    res.send(users);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const createStudent = async (req, res) => {
  try {
    await client.connect();
    const { membercode, parentEmail } = req.body;

    /**
     * Check if the user with the membercode for the student already exists.
     * If yes, then just update the parent email of the found student.
     * Otherwise, create a new user with the data from the request
     */
    const student = await client
      .db("wn-classroom")
      .collection("users")
      .findOne({
        $or: [{ role: "student" }, { role: "unregistered" }],
        membercode,
      });

    if (!!student) {
      /**
       * If student is found, only update the parentEmail
       */
      const result = await client
        .db("wn-classroom")
        .collection("users")
        .updateOne(
          { _id: student._id },
          { $set: createUpdatePayload(student, { parentEmail }) }
        );

      return res.send({ status: "success", data: result });
    }

    /**
     * If student doesn't exist, create a user account
     */
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .insertOne({
        ...req.body,
        role: "student",
        timestamp: dayjs().format(),
        classrooms: [],
      });

    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};
