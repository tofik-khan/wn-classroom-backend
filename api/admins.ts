require("dotenv").config();
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
import { createUpdatePayload } from "../utils/payload";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getAdmins = async (req, res) => {
  try {
    await client.connect();

    const admins = await client
      .db("wn-classroom")
      .collection("admins")
      .find({})
      .toArray();
    res.send({ status: "success", data: admins });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const createAdmin = async (req, res) => {
  try {
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("admins")
      .insertOne(req.body);
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const updateAdmin = async (req, res) => {
  try {
    await client.connect();
    const _id =
      typeof req.body._id === "string"
        ? new ObjectId(req.body._id)
        : req.body._id;
    delete req.body._id;
    delete req.body.index;
    const existing = await client
      .db("wn-classroom")
      .collection("admins")
      .findOne({ _id });
    const result = await client
      .db("wn-classroom")
      .collection("admins")
      .updateOne({ _id }, { $set: createUpdatePayload(existing, req.body) });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
