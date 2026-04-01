exports.reKycTemplate = ({ name, reason }) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #e74c3c;">KYC Re-Upload Required</h2>

      <p>Dear ${name},</p>

      <p>Your KYC has been <strong style="color:red;">rejected</strong>.</p>

      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}

      <p>Please log in to your account and re-upload the required documents.</p>

      <p style="margin-top:20px;">Regards,<br/>B2B Team</p>
    </div>
  `;
};


