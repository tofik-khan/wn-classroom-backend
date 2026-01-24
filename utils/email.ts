import nodemailer from "nodemailer";

export const dispatchEmail = async ({
  to,
  subject,
  content,
}: {
  to: string;
  subject: string;
  content: string;
}) => {
  if (!to) return;
  console.log("sending email to:", to);
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
    pool: true,
  });
  transporter
    .verify()
    .then((data) => console.log(data))
    .catch((data) => console.error(data));

  var mailOptions = {
    from: process.env.GMAIL_USERNAME,
    to,
    subject,
    html: content,
  };

  try {
    return transporter
      .sendMail(mailOptions)
      .then((data) => console.log("sendMail data", data))
      .catch((error) => console.log("error", error));
  } catch (e) {
    return console.log("error: ", e);
  }
};
