import csv from "csvtojson";
import dayjs from "dayjs";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
config();

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CONNECTION}/`
);

const getStudentData = async () => {
  const filepath = process.env.STUDENT_DATA_FILEPATH;

  if (!filepath || filepath === "") return null;

  return (await csv().fromFile(filepath)) as {
    name: string;
    membercode: string;
    waqfenauId: string;
    age: string;
  }[];
};

const getAge = (dob) => {
  const today = dayjs();
  const birth = dayjs(`${dob?.month}/01/${dob?.year}`, "M/DD/YYYY");
  return today.diff(birth, "years");
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[,.'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function namesMatch(needle, haystack) {
  const needleParts = normalizeName(needle);
  const haystackParts = normalizeName(haystack);

  return needleParts.every((part) => haystackParts.includes(part));
}

function isEqual(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

export async function verifyStudents() {
  const db = client.db("wn-classroom");
  const usersCol = db.collection("users");

  const studentData = await getStudentData();

  if (!studentData || studentData.length < 1) return;

  // Build lookup map
  const studentDataMap = new Map(studentData.map((s) => [s.membercode, s]));

  const cursor = usersCol.find({
    role: "student",
    verification: { $exists: false },
  });

  for await (const user of cursor) {
    const external = studentDataMap.get(user.membercode);

    // If no matching record, mark everything false
    if (!external) {
      await usersCol.updateOne(
        { _id: user._id },
        {
          $set: {
            verification: {
              name: false,
              membercode: false,
              waqfenauId: false,
              age: false,
            },
          },
        }
      );
      continue;
    }

    const calculatedAge = getAge(user.dob);

    const verification = {
      name: namesMatch(user.name, external.name),
      membercode: isEqual(user.membercode, external.membercode),
      waqfenauId: isEqual(user.waqfenauId, external.waqfenauId),
      age: Math.abs(calculatedAge - Number(external.age)) < 2,
    };

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          verification,
        },
      }
    );
  }
}
