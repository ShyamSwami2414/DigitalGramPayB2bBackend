exports.userLoginAttemptInfo = ({
  firstName,
  lastName,
  email,
  phone,
  device = "Unknown Device",
  location = "Unknown Location",
  buttonUrl = "#",
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Login Alert</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:#111827; color:#ffffff; text-align:center; padding:20px;">
              <h2 style="margin:0; font-size:20px;">Security Alert</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#333333;">
              <h3 style="margin-top:0;">New Login Detected</h3>
              
              <p style="font-size:14px; line-height:1.6;">
                Hello <strong>${firstName || ""} ${lastName || ""}</strong>,<br/><br/>
                We noticed a login to your account from a new device or location.
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; margin:20px 0;">
                <tr>
                  <td style="padding:15px; font-size:14px;">
                    <p style="margin:5px 0;"><strong>Email:</strong> ${email || "-"}</p>
                    <p style="margin:5px 0;"><strong>Phone:</strong> ${phone || "-"}</p>
                    <p style="margin:5px 0;"><strong>Device:</strong> ${device}</p>
                    <p style="margin:5px 0;"><strong>Location:</strong> ${location}</p>
                    <p style="margin:5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px; line-height:1.6;">
                If this was you, you can safely ignore this email.
              </p>

              <p style="font-size:14px; line-height:1.6;">
                If you do not recognize this activity, please secure your account immediately.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center; margin:30px 0;">
                <a href="${buttonUrl}" 
                   style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:14px; display:inline-block;">
                  Secure My Account
                </a>
              </div>

              <p style="font-size:12px; color:#6b7280;">
                For security reasons, please do not share this email with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb; text-align:center; padding:15px; font-size:12px; color:#9ca3af;">
              © ${new Date().getFullYear()} Your Company. All rights reserved.
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
