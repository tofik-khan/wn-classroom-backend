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

export const StudentAnnualReportByYear = (year: string) => [
  // 1. Include student accounts
  {
    $match: {
      role: "student",
    },
  },

  // 2. Find all enrolled classes.
  // Handles classrooms being missing, null, or not an array.
  {
    $lookup: {
      from: "classrooms",
      let: {
        enrollments: {
          $cond: [{ $isArray: "$classrooms" }, "$classrooms", []],
        },
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$$enrollments",
                      as: "enrollment",
                      cond: {
                        $eq: ["$$enrollment.value", { $toString: "$_id" }],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            type: {
              $toLower: {
                $ifNull: ["$type", "unknown"],
              },
            },
          },
        },
      ],
      as: "_enrolledClasses",
    },
  },

  // 3. Find and count this student's attendance during the report year
  {
    $lookup: {
      from: "sessions",
      let: {
        studentId: "$_id",
      },
      pipeline: [
        // Limit sessions to the selected calendar year
        {
          $match: {
            date: {
              $gte: `${year}-01-01`,
              $lt: `${year + 1}-01-01`,
            },
          },
        },

        // One record for each attendance entry
        {
          $unwind: "$attendance",
        },

        // Keep only this student's attendance
        {
          $match: {
            $expr: {
              $eq: ["$attendance.studentId", "$$studentId"],
            },
          },
        },

        // Convert classroomId to ObjectId
        {
          $set: {
            _sessionClassId: {
              $convert: {
                input: "$classroomId",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
        },

        // Find the class associated with the session
        {
          $lookup: {
            from: "classrooms",
            localField: "_sessionClassId",
            foreignField: "_id",
            as: "_sessionClass",
          },
        },

        {
          $unwind: {
            path: "$_sessionClass",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Aggregate attendance by class type
        {
          $group: {
            _id: {
              $toLower: {
                $ifNull: ["$_sessionClass.type", "unknown"],
              },
            },

            present: {
              $sum: {
                $cond: [{ $eq: ["$attendance.attendance", "present"] }, 1, 0],
              },
            },

            tardy: {
              $sum: {
                $cond: [{ $eq: ["$attendance.attendance", "tardy"] }, 1, 0],
              },
            },

            absent: {
              $sum: {
                $cond: [{ $eq: ["$attendance.attendance", "absent"] }, 1, 0],
              },
            },
          },
        },
      ],
      as: "_attendanceCounts",
    },
  },

  // 4. Extract syllabus counts without using $map
  {
    $set: {
      _syllabusAttendance: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$_attendanceCounts",
              as: "item",
              cond: {
                $eq: ["$$item._id", "syllabus"],
              },
            },
          },
          0,
        ],
      },

      // 5. Extract Urdu counts without using $map
      _urduAttendance: {
        $arrayElemAt: [
          {
            $filter: {
              input: "$_attendanceCounts",
              as: "item",
              cond: {
                $eq: ["$$item._id", "urdu"],
              },
            },
          },
          0,
        ],
      },
    },
  },

  // 6. Format the final result
  {
    $project: {
      _id: 0,

      student: {
        _id: "$_id",
        name: "$name",
        membercode: "$membercode",
        waqfenauId: "$waqfenauId",
        jammat: "$jammat",
      },

      // Already an array from $lookup
      classes: "$_enrolledClasses",

      attendance: {
        syllabus: {
          present: {
            $ifNull: ["$_syllabusAttendance.present", 0],
          },
          tardy: {
            $ifNull: ["$_syllabusAttendance.tardy", 0],
          },
          absent: {
            $ifNull: ["$_syllabusAttendance.absent", 0],
          },
        },

        urdu: {
          present: {
            $ifNull: ["$_urduAttendance.present", 0],
          },
          tardy: {
            $ifNull: ["$_urduAttendance.tardy", 0],
          },
          absent: {
            $ifNull: ["$_urduAttendance.absent", 0],
          },
        },
      },
    },
  },

  // 7. Sort the report alphabetically
  {
    $sort: {
      "student.name": 1,
    },
  },
];
