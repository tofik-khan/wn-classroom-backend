export const registrationSuccess = (user) => `
  <h2 style="text-align: right; font-family: 'Noto Arabic';">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ &#xFDF2; وَبَرَكَاتُهُ</h2>
  <div>Respected ${user.name ?? "Member"},</div>
  <div>This is to notify you that your account registration is complete. JazakaAllah for finishing this step.</div>
  <h3>What's the next?</h3>
  <ul>
    <li>For parents, they should add students to their account from <a href="https://classroom.waqfenau.us/protected/dashboard">the dashboard.</a> Each student in the household should be added separately even if they are in the same class</li>
    <li>For students, once your account is created, the admin team will enroll you in your selected classes within a few days</li>
  </ul>

  <div>جزاک&#xFDF2;</div>
  <div>The Waqf-e-Nau USA Classes Team</div>
`;

export const sessionStarted = (classroomId, classroomName, userName) => `
  <h2 style="text-align: right; font-family: 'Noto Arabic';">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ &#xFDF2; وَبَرَكَاتُهُ</h2>
  <div>Respected ${userName ?? "Member"},</div>
  <div>The teacher has started the ${
    classroomName ?? "class"
  } session. please join the session from the link in the <a href="https://classroom.waqfenau.us/protected/dashboard/class/${classroomId}">class dashboard</a> </div>
  <div>جزاک&#xFDF2;</div>
  <div>The Waqf-e-Nau USA Classes Team</div>
`;

export const classAnnouncementCreated = (title, content) => `
<h2 style="text-align: right; font-family: 'Noto Arabic';">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ &#xFDF2; وَبَرَكَاتُهُ</h2>
<p><strong>New Class Announcement:</strong></p>
<div style="color: #6A0136">${title}</div>
<div>${content ?? ""}</div>
`;

const escapeHtml = (value = "") =>
  `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const leaveRequested = (leaveRequest: {
  studentName: any;
  classroomName: any;
  date: any;
  reason: string | undefined;
}) => `
<h2 style="text-align: right; font-family: 'Noto Arabic';">السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ &#xFDF2; وَبَرَكَاتُهُ</h2>
<div>Respected Teacher,</div>
<div><strong>${escapeHtml(leaveRequest.studentName ?? "A student")}</strong> has requested leave from the ${
  leaveRequest.classroomName ?? "class"
} session on ${leaveRequest.date}. They will be marked excused when the session starts.</div>
<p><strong>Reason:</strong></p>
<div style="color: #6A0136">${escapeHtml(leaveRequest.reason)}</div>
<div>جزاک&#xFDF2;</div>
<div>The Waqf-e-Nau USA Classes Team</div>
`;
