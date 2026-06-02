const config = require("../../config/client");
exports.generateWelcomeEmail = ({
  name,
  email,
  userName,
  password,
  pin,
  loginUrl,
}) => {
    console.log(config.LOGO_URL);
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>"Welcome to ${config.COMPANY}"</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; margin-top:40px; padding:40px; border-radius:8px;">
            
            <!-- Logo -->
            <tr>
              <td align="center">
                 <img
                 src="${config.LOGO_URL}"
                  alt="${config.COMPANY}"
                  width="20"
                  style="
                    display:block;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    margin:auto;"
                />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td align="center" style="padding-top:20px;">
                <h2 style="margin:0; color:#222;">"${config.COMPANY}"</h2>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding-top:30px; color:#444; font-size:15px;">
                <p>Hello <strong>${name}</strong>,</p>
                <p>
                  We're excited to have you join <strong>"${config.COMPANY}"</strong>. 
                  Your account has been created successfully.
                </p>
              </td>
            </tr>

            <!-- Account Details -->
            <tr>
              <td style="padding-top:10px; font-size:14px; color:#333;">
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Username:</strong> ${userName}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>PIN:</strong> ${pin}</p>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td align="left" style="padding-top:20px;">
                <a href="${loginUrl}" 
                   style="background:#2d6cdf; 
                          color:#ffffff; 
                          text-decoration:none; 
                          padding:12px 20px; 
                          border-radius:6px; 
                          display:inline-block;
                          font-size:14px;">
                  Login to Your Account
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:30px; font-size:13px; color:#777;">
                <p>If you did not register for this account, please ignore this email.</p>
                <p style="margin-top:30px;">
                  Best regards,<br/>
                  <strong>"${config.COMPANY} Team" </strong>
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
