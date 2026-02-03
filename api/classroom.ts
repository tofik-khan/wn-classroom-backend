import { config } from "dotenv";
config();

import { MongoClient, ObjectId } from "mongodb";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { createUpdatePayload } from "../utils/payload";
import { StudentReportByClassroomId } from "../pipelines/reports";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`,
);

export type Classroom = {
  _id?: string;
  name: string;
  description: string;
  type: "syllabus" | "urdu";
  schedule: Dayjs[];
  start: {
    label: string;
    value: string;
  };
  end: {
    label: string;
    value: string;
  };
  resources?: {
    title: string;
    link: string;
  }[];
};

export const getClassrooms = async (req, res) => {
  try {
    await client.connect();

    const result = await client
      .db("wn-classroom")
      .collection("classrooms")
      .find({})
      .toArray();
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getOneClass = async (req, res) => {
  try {
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    await client.connect();
    const result = await client
      .db("wn-classroom")
      .collection("classrooms")
      .findOne({ _id });
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const createClassroom = async (req, res) => {
  try {
    await client.connect();
    console.log(req);
    const result = await client
      .db("wn-classroom")
      .collection("classrooms")
      .insertOne(req.body);
    res.send(result);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const updateClassroom = async (req, res) => {
  try {
    await client.connect();
    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;
    delete req.params.id;
    const existing = await client
      .db("wn-classroom")
      .collection("classrooms")
      .findOne({ _id });
    const result = await client
      .db("wn-classroom")
      .collection("classrooms")
      .updateOne({ _id }, { $set: createUpdatePayload(existing, req.body) });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const addClassroomResource = async (req, res) => {
  try {
    await client.connect();

    const _id =
      typeof req.params.id === "string"
        ? new ObjectId(req.params.id)
        : req.params.id;

    const { link, title } = req.body;

    const result = await client
      .db("wn-classroom")
      .collection<Classroom>("classrooms")
      .updateOne({ _id }, { $push: { resources: { link, title } } });
    res.send({ status: "success", data: result });
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};

export const getStudentsInClassroomAPI = async (req, res) => {
  try {
    await client.connect();
    const _id = req.params.id;
    const students = await client
      .db("wn-classroom")
      .collection("users")
      .aggregate(StudentReportByClassroomId(_id))
      .toArray();
    res.send(students);
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  }
};
