const config = require("../../config/client");

exports.generateOtpEmail = ({
  name,
  otp,
  reason = "Verify your identity", //login
  expiryMinutes = 2,
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>OTP Verification</title>
  </head>

  <body style="
    margin:0;
    padding:0;
    background-color:#f4f6f8;
    font-family:Arial, sans-serif;
  ">

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:40px 15px;">

          <table width="600" cellpadding="0" cellspacing="0" border="0"
            style="
              background:#ffffff;
              border-radius:12px;
              overflow:hidden;
              box-shadow:0 4px 15px rgba(0,0,0,0.05);
            "
          >

            <!-- Header -->
            <tr>
              <td align="center"
                style="
                  background:#2d6cdf;
                  padding:30px 20px;
                "
              >
                <img
                  src="${config.LOGO_URL}"
                  alt="Logo"
                  width="140"
                  style="display:block;"
                />

                <h1 style="
                  color:#ffffff;
                  margin:20px 0 0;
                  font-size:24px;
                  font-weight:bold;
                ">
                  ${config.COMPANY}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 35px;">

                <h2 style="
                  margin:0 0 20px;
                  color:#222222;
                  font-size:24px;
                ">
                  Verify Your Identity
                </h2>

                <p style="
                  margin:0 0 15px;
                  color:#555555;
                  font-size:15px;
                  line-height:1.7;
                ">
                  Hello <strong>${name || "User"}</strong>,
                </p>

                <p style="
                  margin:0 0 25px;
                  color:#555555;
                  font-size:15px;
                  line-height:1.7;
                ">
                  We received a request to ${reason}. Please use the OTP below to continue.
                </p>

                <!-- OTP BOX -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">

                      <div style="
                        background:#f4f7ff;
                        border:2px dashed #2d6cdf;
                        border-radius:10px;
                        padding:20px;
                        display:inline-block;
                        margin-bottom:20px;
                      ">
                        <span style="
                          font-size:36px;
                          font-weight:bold;
                          letter-spacing:10px;
                          color:#2d6cdf;
                        ">
                          ${otp}
                        </span>
                      </div>

                    </td>
                  </tr>
                </table>

                <p style="
                  margin:0 0 10px;
                  color:#444444;
                  font-size:14px;
                  line-height:1.6;
                ">
                  This OTP is valid for <strong>${expiryMinutes} minutes</strong>.
                </p>

                <p style="
                  margin:0;
                  color:#444444;
                  font-size:14px;
                  line-height:1.6;
                ">
                  Please do not share this OTP with anyone for security reasons.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="
                background:#fafafa;
                padding:25px 35px;
                border-top:1px solid #eeeeee;
              ">

                <p style="
                  margin:0 0 10px;
                  font-size:13px;
                  color:#777777;
                  line-height:1.6;
                ">
                  If you did not request this OTP, you can safely ignore this email.
                </p>

                <p style="
                  margin:20px 0 0;
                  font-size:13px;
                  color:#777777;
                ">
                  Regards,<br/>
                  <strong>${config.COMPANY} Team</strong>
                </p>

              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};
