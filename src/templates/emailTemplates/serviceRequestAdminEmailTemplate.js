exports.adminServiceRequestTemplate = ({
  userName,
  userEmail,
  userMobile,
  serviceName,
  buttonUrl,
}) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Access Request</title>
    </head>

    <body style="margin:0; padding:0; background:#f8fafc; font-family:Arial, sans-serif;">

      <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
        <tr>
          <td align="center">

            <!-- Container -->
            <table width="560" cellpadding="0" cellspacing="0"
              style="
                background:#ffffff;
                border-radius:20px;
                padding:32px;
                border:1px solid #e2e8f0;
                box-shadow:0 30px 80px rgba(15,23,42,0.06);
              ">

              <!-- Badge -->
              <tr>
                <td style="padding-bottom:20px;">
                  <span style="
                    font-size:12px;
                    font-weight:600;
                    color:#334155;
                    background:#f1f5f9;
                    padding:6px 12px;
                    border-radius:999px;
                    display:inline-block;
                  ">
                    New Request
                  </span>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td style="padding-bottom:8px;">
                  <h1 style="
                    margin:0;
                    font-size:24px;
                    font-weight:700;
                    color:#0f172a;
                    letter-spacing:-0.4px;
                  ">
                    Access requested for a service
                  </h1>
                </td>
              </tr>

              <!-- Subtitle -->
              <tr>
                <td style="
                  font-size:14px;
                  color:#64748b;
                  padding-bottom:28px;
                  line-height:1.6;
                ">
                  A user is requesting permission. Review the details and take action.
                </td>
              </tr>

              <!-- Info Card -->
              <tr>
                <td style="
                  border:1px solid #e2e8f0;
                  border-radius:20px;
                  padding:20px;
                  background:#ffffff;
                ">

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>

                      <!-- User Details -->
                      <td width="50%" valign="top" style="padding-right:12px;">
                        <div style="font-size:12px; color:#94a3b8; margin-bottom:6px;">
                          USER DETAILS
                        </div>

                        <div style="font-size:15px; font-weight:600; color:#0f172a;">
                          ${userName || "-"}
                        </div>

                        <div style="font-size:13px; color:#64748b; margin-top:6px;">
                          Email: ${userEmail || "-"}
                        </div>

                        <div style="font-size:13px; color:#64748b; margin-top:4px;">
                          Mobile: ${userMobile || "-"}
                        </div>
                      </td>

                      <!-- Service -->
                      <td width="50%" valign="top" style="padding-left:12px;">
                        <div style="font-size:12px; color:#94a3b8; margin-bottom:6px;">
                          SERVICE
                        </div>

                        <div style="font-size:15px; font-weight:600; color:#0f172a;">
                          ${serviceName || "-"}
                        </div>
                      </td>

                    </tr>
                  </table>

                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding-top:32px;">
                  <a href="${buttonUrl}"
                     style="
                       display:inline-block;
                       width:100%;
                       text-align:center;
                       background:#0f172a;
                       color:#ffffff;
                       text-decoration:none;
                       padding:14px 0;
                       font-size:14px;
                       font-weight:600;
                       border-radius:14px;
                       box-shadow:0 12px 30px rgba(15,23,42,0.18);
                     ">
                    Review Request
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="
                  padding-top:28px;
                  font-size:12px;
                  color:#94a3b8;
                  line-height:1.6;
                  text-align:center;
                ">
                  Manage access requests from your admin dashboard.<br/>
                  This is an automated notification.
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
