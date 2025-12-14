require("dotenv").config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import { createUpdatePayload } from "../utils/payload";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getUsers = async (req, res) => {
  try {
    await client.connect();

    const applicants = await client
      .db("wn-classroom")
      .collection("users")
      .find({})
      .toArray();
    res.send({ status: "success", data: applicants });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

/**
 * Deprecated - Use getOneUser instead to fetch all user data at once
 * @param req
 * @param res
 */
export const getUserRole = async (req, res) => {
  try {
    await client.connect();

    const { email } = req.body;

    const [admin, teacher, applicant] = await Promise.all([
      client.db("wn-classroom").collection("admins").findOne({ email }),
      client.db("wn-classroom").collection("teachers").findOne({ email }),
      client.db("wn-classroom").collection("users").findOne({ email }),
    ]);

    const role = admin?.role || teacher?.role || applicant?.role || null;
    res.send({ status: "success", data: role });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getOneUser = async (req, res) => {
  try {
    await client.connect();

    const { email } = req.body;

    const result = await Promise.all([
      client.db("wn-classroom").collection("admins").findOne({ email }),
      client.db("wn-classroom").collection("teachers").findOne({ email }),
      client.db("wn-classroom").collection("users").findOne({ email }),
    ]);
    const user = result.filter((obj) => !!obj);
    if (user.length < 1)
      throw new Error(`user with email (${email}) does not exist`);
    res.send({ status: "success", data: user });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const createUser = async (req, res) => {
  try {
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .insertOne({
        ...req.body,
        timestamp: dayjs().format(),
        isAuthorized: false,
        isComplete: false,
      });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const updateUser = async (req, res) => {
  try {
    await client.connect();
    const { email } = req.body;
    const existing = await client
      .db("wn-classroom")
      .collection("users")
      .findOne({ email });

    const result = await client
      .db("wn-classroom")
      .collection("users")
      .updateOne({ email }, { $set: createUpdatePayload(existing, req.body) });

    res.send({ status: "success", data: result });
  } catch (e) {
    console.log(e);
    res.send(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

/**
 * Returns on the role of the user.
 * Currently only used in Auth0 to determine whether user's email should be collected or not
 * @param req
 * @param res
 */
export const checkUserRole = async (req, res) => {
  try {
    await client.connect();

    const { email } = req.body;
    console.log(req.body);

    const result = await Promise.all([
      client.db("wn-classroom").collection("admins").findOne({ email }),
      client.db("wn-classroom").collection("teachers").findOne({ email }),
      client.db("wn-classroom").collection("users").findOne({ email }),
    ]);
    const user = result.filter((obj) => !!obj);
    console.log(user);
    res.send({
      status: "success",
      data: user.length > 0 ? user[0].role : "notfound",
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
