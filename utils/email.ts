import nodemailer from "nodemailer";

export const dispatchEmail = ({
  to,
  subject,
  content,
}: {
  to: string;
  subject: string;
  content: string;
}) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
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

  return transporter
    .sendMail(mailOptions)
    .then((data) => console.log(data))
    .catch((e) => console.log("error: ", e));
};
