const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendEmail = async (to, cc, bcc, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"B2B" <${process.env.SMTP_USER}>`,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      html,
    });
    console.log(`Email sent to: ${to}`);
    console.log(`Email sent to: ${cc}`);
    console.log(`Email sent to: ${bcc}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
};
