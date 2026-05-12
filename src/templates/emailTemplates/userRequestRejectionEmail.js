const config = require("../../config/client");
exports.generateRejectionEmail = ({
  name,
  email,
  reason,
  supportEmail = config.SUPPORT_EMAIL,
  companyName = config.COMPANY,
  logoUrl = config.LOGO_URL ,
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Application Status</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; margin-top:40px; padding:40px; border-radius:8px;">
            
            <!-- Logo -->
            <tr>
              <td align="center">
                <img src="${logoUrl}" alt="${companyName} Logo" width="150" />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td align="center" style="padding-top:20px;">
                <h2 style="margin:0; color:#d93025;">Application Update</h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-top:30px; color:#444; font-size:15px;">
                <p>Hello <strong>${name}</strong>,</p>
                <p>
                  Thank you for your interest in joining <strong>${companyName}</strong>.
                  After reviewing your signup request, we regret to inform you that it has not been approved at this time.
                </p>
              </td>
            </tr>

            <!-- Reason -->
            ${
              reason
                ? `
            <tr>
              <td style="padding-top:10px; font-size:14px; color:#333;">
                <p><strong>Reason:</strong> ${reason}</p>
              </td>
            </tr>
            `
                : ""
            }

            <!-- Next Steps -->
            <tr>
              <td style="padding-top:15px; font-size:14px; color:#333;">
                <p>
                  If you believe this decision was made in error or would like to submit additional information,
                  please contact our support team.
                </p>
              </td>
            </tr>

            <!-- Support Button -->
            <tr>
              <td align="left" style="padding-top:20px;">
                <a href="mailto:${supportEmail}" 
                   style="background:#2d6cdf; 
                          color:#ffffff; 
                          text-decoration:none; 
                          padding:12px 20px; 
                          border-radius:6px; 
                          display:inline-block;
                          font-size:14px;">
                  Contact Support
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:30px; font-size:13px; color:#777;">
                <p>We appreciate your interest and wish you all the best.</p>
                <p style="margin-top:30px;">
                  Regards,<br/>
                  <strong>${companyName} Team</strong>
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
