import { config } from "dotenv";
config();

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
    const { email } = req.body;
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("users")
      .updateOne(
        {
          email: email ?? "",
        },
        {
          $setOnInsert: {
            ...req.body,
            timestamp: dayjs().format(),
            classrooms: [],
          },
        },
        { upsert: true }
      );
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

    const result = await Promise.all([
      client.db("wn-classroom").collection("admins").findOne({ email }),
      client.db("wn-classroom").collection("teachers").findOne({ email }),
      client.db("wn-classroom").collection("users").findOne({ email }),
    ]);
    const user = result.filter((obj) => !!obj);
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

/**
 * Return students that have not been been assigned to any class
 * @param req
 * @param res
 */
export const getUnenrolledUsers = async (req, res) => {
  try {
    await client.connect();

    const applicants = await client
      .db("wn-classroom")
      .collection("users")
      .find({ role: "student", classrooms: { $size: 0 } })
      .toArray();
    res.send(applicants);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

/**
 * Enroll student into different classes
 */
export const enrollInClass = async (req, res) => {
  try {
    await client.connect();
    const classrooms = req.body.classrooms;
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;

    const result = await client
      .db("wn-classroom")
      .collection("users")
      .updateOne({ _id }, { $set: { classrooms: classrooms } });

    res.send({ status: "success", data: result });
  } catch (e) {
    console.log(e);
    res.send(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};

export const getUserMembercodes = async (req, res) => {
  try {
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("users")
      .find({})
      .toArray();
    res.send(result.map((user) => user.membercode));
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
