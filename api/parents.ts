import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import { createUpdatePayload } from "../utils/payload";

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
