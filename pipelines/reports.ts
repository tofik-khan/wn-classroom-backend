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

export const TeachersAnnualReportByYear = (year: string) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;
  return [
    // 1. Only include teachers
    {
      $match: {
        role: "teacher",
      },
    },

    // 2. Normalize classrooms.
    // Prevents errors if classrooms is missing or not an array.
    {
      $set: {
        _teacherClassrooms: {
          $cond: [{ $isArray: "$classrooms" }, "$classrooms", []],
        },
      },
    },

    // 3. Look up the teacher's assigned classroom names
    {
      $lookup: {
        from: "classrooms",
        let: {
          enrollments: "$_teacherClassrooms",
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
                          $eq: [
                            {
                              $convert: {
                                input: "$$enrollment.value",
                                to: "string",
                                onError: "",
                                onNull: "",
                              },
                            },
                            {
                              $convert: {
                                input: "$_id",
                                to: "string",
                                onError: "",
                                onNull: "",
                              },
                            },
                          ],
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
              classId: { $toString: "$_id" },
              name: 1,
              type: 1,
            },
          },
        ],
        as: "assignedClasses",
      },
    },

    // 4. Look up sessions actually taught by this teacher
    {
      $lookup: {
        from: "sessions",
        let: {
          teacherId: "$_id",
        },
        pipeline: [
          {
            $match: {
              date: {
                $gte: startDate,
                $lt: endDate,
              },
            },
          },

          // Normalize teacher IDs so strings and ObjectIds can be compared
          {
            $set: {
              _sessionTeacherId: {
                $convert: {
                  input: "$teacherId",
                  to: "string",
                  onError: "",
                  onNull: "",
                },
              },
              _reportTeacherId: {
                $convert: {
                  input: "$$teacherId",
                  to: "string",
                  onError: "",
                  onNull: "",
                },
              },
            },
          },

          // Keep sessions actually conducted by this teacher
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$_sessionTeacherId", ""] },
                  { $eq: ["$_sessionTeacherId", "$_reportTeacherId"] },
                ],
              },
            },
          },

          // Parse timestamps, preserving their timezone offsets
          {
            $set: {
              _scheduledDate: {
                $convert: {
                  input: "$startTime.scheduled",
                  to: "date",
                  onError: null,
                  onNull: null,
                },
              },
              _actualDate: {
                $convert: {
                  input: "$startTime.actual",
                  to: "date",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },

          // Count sessions and those started within 2 minutes
          {
            $group: {
              _id: null,

              sessionsTaught: {
                $sum: 1,
              },

              sessionsWithTimestamps: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$_scheduledDate", null] },
                        { $ne: ["$_actualDate", null] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              onTimeSessions: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$_scheduledDate", null] },
                        { $ne: ["$_actualDate", null] },
                        {
                          $lte: [
                            "$_actualDate",
                            {
                              $add: ["$_scheduledDate", 120000],
                            },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },

          {
            $project: {
              _id: 0,
              sessionsTaught: 1,
              sessionsWithTimestamps: 1,
              onTimeSessions: 1,
            },
          },
        ],
        as: "_teachingStats",
      },
    },

    // 5. Default to zero if the teacher has no sessions
    {
      $set: {
        _teachingStats: {
          $ifNull: [
            { $arrayElemAt: ["$_teachingStats", 0] },
            {
              sessionsTaught: 0,
              sessionsWithTimestamps: 0,
              onTimeSessions: 0,
            },
          ],
        },
      },
    },

    // 6. Find sessions held in this teacher's assigned classrooms
    {
      $lookup: {
        from: "sessions",
        let: {
          teacherId: "$_id",
          classrooms: "$_teacherClassrooms",
        },
        pipeline: [
          {
            $match: {
              date: {
                $gte: startDate,
                $lt: endDate,
              },
            },
          },

          // A session must belong to one of this teacher's classes
          {
            $match: {
              $expr: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$$classrooms",
                        as: "enrollment",
                        cond: {
                          $eq: [
                            {
                              $convert: {
                                input: "$$enrollment.value",
                                to: "string",
                                onError: "",
                                onNull: "",
                              },
                            },
                            {
                              $convert: {
                                input: "$classroomId",
                                to: "string",
                                onError: "",
                                onNull: "",
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },

          // Normalize the session teacher and assigned teacher IDs
          {
            $set: {
              _sessionTeacherId: {
                $convert: {
                  input: "$teacherId",
                  to: "string",
                  onError: "",
                  onNull: "",
                },
              },
              _assignedTeacherId: {
                $convert: {
                  input: "$$teacherId",
                  to: "string",
                  onError: "",
                  onNull: "",
                },
              },
              _teacherRole: {
                $toLower: {
                  $ifNull: ["$teacherRole", ""],
                },
              },
            },
          },

          // Count sessions in assigned classes and those taught by substitutes
          {
            $group: {
              _id: null,

              sessionsInAssignedClasses: {
                $sum: 1,
              },

              substituteSessions: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        // Explicitly recorded substitute
                        { $eq: ["$_teacherRole", "substitute"] },

                        // A different identified teacher conducted the session
                        {
                          $and: [
                            { $ne: ["$_sessionTeacherId", ""] },
                            {
                              $ne: [
                                "$_sessionTeacherId",
                                "$_assignedTeacherId",
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },

          {
            $project: {
              _id: 0,
              sessionsInAssignedClasses: 1,
              substituteSessions: 1,
            },
          },
        ],
        as: "_substituteStats",
      },
    },

    // 7. Supply zeros if no assigned-class sessions were found
    {
      $set: {
        _substituteStats: {
          $ifNull: [
            { $arrayElemAt: ["$_substituteStats", 0] },
            {
              sessionsInAssignedClasses: 0,
              substituteSessions: 0,
            },
          ],
        },
      },
    },

    // 8. Final report structure
    {
      $project: {
        _id: 0,

        year: {
          $literal: year,
        },

        teacher: {
          _id: { $toString: "$_id" },
          name: "$name",
          email: "$email",
          phone: "$phone",
          jammat: "$jammat",
        },

        assignedClasses: "$assignedClasses",

        metrics: {
          sessionsTaught: "$_teachingStats.sessionsTaught",

          sessionsWithTimestamps: "$_teachingStats.sessionsWithTimestamps",

          onTimeSessions: "$_teachingStats.onTimeSessions",

          sessionsInAssignedClasses:
            "$_substituteStats.sessionsInAssignedClasses",

          substituteSessions: "$_substituteStats.substituteSessions",
        },
      },
    },

    // 9. Sort alphabetically
    {
      $sort: {
        "teacher.name": 1,
      },
    },
  ];
};
