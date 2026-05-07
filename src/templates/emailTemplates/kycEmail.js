exports.kycStatusTemplate = ({ name, status, rejectionReason, company = "Digital Gram Pay" }) => {
    const isApproved = status === "approved";

    return {
        subject: `KYC Verification ${isApproved ? "Approved" : "Update Required"}`,

        html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333">
        <p>Dear ${name},</p>

        <p>Thank you for submitting your KYC details.</p>

        <p><strong>KYC Status: ${status.toUpperCase()}</strong></p>

        ${isApproved
                ? `
            <p>Your KYC verification has been successfully approved.</p>

            <p>You can now:</p>
            <ul>
              <li>Start transactions</li>
              <li>Access all B2B payment services</li>
              <li>Use wallet & settlement features</li>
            </ul>
          `
                : `
            <p>We were unable to approve your KYC verification.</p>

            <p><strong>Reason:</strong> ${rejectionReason}</p>

            <p>Please log in and re-upload valid documents. Our team will review them promptly.</p>
          `
            }

        <p>If you did not initiate this request, please contact support immediately.</p>

        <p>Warm regards,<br/>
        <strong>Compliance Team</strong><br/>
        ${company}</p>
      </div>
    `,
    };
};
