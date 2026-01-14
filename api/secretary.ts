import { config } from "dotenv";
config();

import { MongoClient } from "mongodb";

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

export const getStudentsInJammat = async (req, res) => {
  try {
    await client.connect();

    const email = req.auth.payload[process.env.AUTH0_EMAIL_PAYLOAD];

    const secretary = await client
      .db("wn-classroom")
      .collection("secretaries")
      .findOne({ email });

    if (!secretary) throw new Error("No Secretary Found");

    const jammat = secretary.jammat;

    const students = await client
      .db("wn-classroom")
      .collection("users")
      .find({ role: "student", jammat })
      .toArray();

    // Only send back the information that the local secretary needs to view
    res.send(
      students.map((student) => ({
        _id: student._id,
        name: student.name,
        jammat: student.jammat,
        waqfenauId: student.waqfenauId,
        classrooms: student.classrooms,
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).send({ status: "error", message: e.message });
  } finally {
    await client.close();
  }
};
