const config = require("../../config/client");

exports.generateIdChargeEmail = ({
  name,
  status, // "approved" | "rejected"
  reason = "",
  amount = "",
  supportEmail = config.SUPPORT_EMAIL,
  companyName = config.COMPANY,
}) => {
  const isApproved = status === "Approved";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>ID Charge Request Status</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    
    <table align="center" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" 
            style="background:#ffffff; margin-top:40px; padding:40px; border-radius:10px;">
            
            <!-- Heading -->
            <tr>
              <td align="center">
                <h2 style="margin:0; color:${isApproved ? "#188038" : "#d93025"};">
                  ${isApproved ? "ID Charge Approved ✅" : "ID Charge Rejected ❌"}
                </h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-top:25px; color:#444; font-size:15px;">
                <p>Hello <strong>${name}</strong>,</p>

                <p>
                  Your ID Charge request has been 
                  <strong style="color:${isApproved ? "#188038" : "#d93025"};">
                    ${status.toUpperCase()}
                  </strong>.
                </p>
              </td>
            </tr>

            <!-- Amount (only if approved) -->
            ${
              isApproved && amount
                ? `
            <tr>
              <td style="padding-top:10px; font-size:14px; color:#333;">
                <p><strong>Amount:</strong> ₹${amount}</p>
              </td>
            </tr>
            `
                : ""
            }

            <!-- Reason -->
            ${
              reason
                ? `
            <tr>
              <td style="padding-top:10px; font-size:14px; color:#333;">
                <p><strong>${isApproved ? "Note" : "Reason"}:</strong> ${reason}</p>
              </td>
            </tr>
            `
                : ""
            }

            <!-- Message -->
            <tr>
              <td style="padding-top:15px; font-size:14px; color:#333;">
                ${
                  isApproved
                    ? `<p>The request has been successfully processed. You can continue using our services.</p>`
                    : `<p>If you believe this was incorrect, you may retry or contact support for help.</p>`
                }
              </td>
            </tr>

            <!-- Support Button -->
            <tr>
              <td style="padding-top:20px;">
                <a href="mailto:${supportEmail}" 
                   style="background:#2d6cdf; 
                          color:#ffffff; 
                          text-decoration:none; 
                          padding:12px 20px; 
                          border-radius:6px; 
                          display:inline-block;">
                  Contact Support
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:30px; font-size:13px; color:#777;">
                <p>Thank you for choosing ${companyName}.</p>

                <p style="margin-top:25px;">
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
