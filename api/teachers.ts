require("dotenv").config();
import { MongoClient, ObjectId } from "mongodb";
import { createUpdatePayload } from "../utils/payload";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getTeachers = async (req, res) => {
  try {
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("teachers")
      .find({})
      .toArray();
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getOneTeacher = async (req, res) => {
  try {
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("teachers")
      .findOne({ _id });
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const createTeacher = async (req, res) => {
  try {
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("teachers")
      .insertOne(req.body);
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const updateTeacher = async (req, res) => {
  try {
    await client.connect();
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    delete req.params.id;
    const existing = await client
      .db("wn-classroom")
      .collection("teachers")
      .findOne({ _id });
    const result = await client
      .db("wn-classroom")
      .collection("teachers")
      .updateOne({ _id }, { $set: createUpdatePayload(existing, req.body) });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
