export const sessionReportPipelineByDate = (date) => [
  {
    $match: {
      date,
    },
  },
  {
    $unwind: "$attendance",
  },
  {
    $group: {
      _id: {
        classroomId: "$classroomId",
        status: "$attendance.attendance",
      },
      date: {
        $first: "$date",
      },
      teacherId: {
        $first: "$teacherId",
      },
      teacherRole: {
        $first: "$teacherRole",
      },
      startTime: {
        $first: "$startTime",
      },
      count: {
        $sum: 1,
      },
    },
  },
  {
    $group: {
      _id: "$_id.classroomId",
      counts: {
        $push: {
          status: "$_id.status",
          count: "$count",
        },
      },
      totalStudents: {
        $sum: "$count",
      },
      date: {
        $first: "$date",
      },
      teacherId: {
        $first: "$teacherId",
      },
      teacherRole: {
        $first: "$teacherRole",
      },
      startTime: {
        $first: "$startTime",
      },
    },
  },
  {
    $addFields: {
      attendanceSummary: {
        $arrayToObject: {
          $map: {
            input: "$counts",
            as: "c",
            in: {
              k: "$$c.status",
              v: "$$c.count",
            },
          },
        },
      },
    },
  },
  {
    $lookup: {
      from: "classrooms",
      let: {
        classroomObjectId: {
          $toObjectId: "$_id",
        },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$classroomObjectId"],
            },
          },
        },
      ],
      as: "classroom",
    },
  },
  {
    $unwind: "$classroom",
  },
  {
    $lookup: {
      from: "teachers",
      let: {
        teacherObjectId: {
          $toObjectId: "$teacherId",
        },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$teacherObjectId"],
            },
          },
        },
      ],
      as: "teacher",
    },
  },
  {
    $unwind: {
      path: "$teacher",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      classroomId: "$_id",
      classroomName: "$classroom.name",
      date: 1,
      teacher: 1,
      teacherRole: 1,
      totalStudents: 1,
      startTime: 1,
      present: {
        $ifNull: ["$attendanceSummary.present", 0],
      },
      absent: {
        $ifNull: ["$attendanceSummary.absent", 0],
      },
      tardy: {
        $ifNull: ["$attendanceSummary.tardy", 0],
      },
      excused: { $ifNull: ["$attendanceSummary.excused", 0] },
    },
  },
  {
    $sort: {
      classroomName: 1,
    },
  },
];

export const StudentReportByClassroomId = (classroomId) => [
  {
    $match: {
      role: "student",
      "classrooms.value": classroomId,
    },
  },
  {
    $lookup: {
      from: "sessions",
      let: {
        studentId: "$_id",
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$classroomId", classroomId],
            },
          },
        },
        {
          $project: {
            date: 1,
            attendance: {
              $filter: {
                input: "$attendance",
                as: "a",
                cond: {
                  $eq: ["$$a.studentId", "$$studentId"],
                },
              },
            },
          },
        },
      ],
      as: "sessions",
    },
  },
  {
    $addFields: {
      sessions: {
        $map: {
          input: "$sessions",
          as: "s",
          in: {
            date: "$$s.date",
            attendance: {
              $arrayElemAt: ["$$s.attendance.attendance", 0],
            },
          },
        },
      },
    },
  },
  {
    $project: {
      verification: 0,
      classrooms: 0,
      suggestedClass: 0,
      dob: 0,
      urduClass: 0,
      timestamp: 0,
      role: 0,
    },
  },
];
