import nodemailer from "nodemailer";

export const dispatchEmail = async ({
  to,
  subject,
  content,
}: {
  to: string | string[];
  subject: string;
  content: string;
}) => {
  if (!to) return;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.GMAIL_USERNAME,
      pass: process.env.GMAIL_PASSWORD,
    },
    pool: true,
  });
  transporter.verify().catch((data) => console.error(data));

  /**
   * Check if provided recepients is an array or single user
   * If Array, include them all in bcc
   * If single, send directly
   */
  let receiver = {};
  if (Array.isArray(to)) {
    receiver = {
      bcc: to,
    };
  } else {
    receiver = {
      to,
    };
  }

  var mailOptions = {
    from: process.env.GMAIL_USERNAME,
    ...receiver,
    subject,
    html: content,
  };

  try {
    return transporter
      .sendMail(mailOptions)
      .catch((error) => console.log("error", error));
  } catch (e) {
    return console.log("error: ", e);
  }
};
