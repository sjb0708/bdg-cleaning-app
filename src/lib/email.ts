// Email utility — uses Resend if RESEND_API_KEY is set, otherwise logs to console
// To enable real emails: add RESEND_API_KEY=re_xxx to your .env.local

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.EMAIL_FROM || "BDG Cleaning <noreply@baileydevelopmentgroup.com>"

  if (!apiKey) {
    // No email configured — log to console so you can see what would be sent
    console.log("\n📧 [EMAIL - not sent, add RESEND_API_KEY to enable]")
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log("")
    return
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(apiKey)
    await resend.emails.send({ from: fromEmail, to, subject, html })
  } catch (err) {
    console.error("Email send failed:", err)
  }
}

export function jobAssignedEmail(cleanerName: string, propertyName: string, date: string, jobUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Job Assignment</h1>
        <p style="color: #bfdbfe; margin: 4px 0 0;">Bailey Development Group</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155;">Hi ${cleanerName},</p>
        <p style="color: #334155;">You've been assigned a cleaning job. Please log in to <b>accept or decline</b>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">PROPERTY</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${propertyName}</p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">DATE</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${date}</p>
        </div>
        <a href="${jobUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Job &amp; Respond
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Bailey Development Group Cleaning Management</p>
      </div>
    </div>
  `
}

export function jobAcceptedEmail(adminName: string, cleanerName: string, propertyName: string, date: string, jobUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Job Accepted ✓</h1>
        <p style="color: #a7f3d0; margin: 4px 0 0;">Bailey Development Group</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155;">Hi ${adminName},</p>
        <p style="color: #334155;"><b>${cleanerName}</b> has accepted the cleaning job.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">PROPERTY</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${propertyName}</p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">DATE</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${date}</p>
        </div>
        <a href="${jobUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Job
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Bailey Development Group Cleaning Management</p>
      </div>
    </div>
  `
}

export function issueReportedEmail(
  adminName: string,
  cleanerName: string,
  propertyName: string,
  type: string,
  severity: string,
  description: string,
  photoUrls: string[],
  issueUrl: string
) {
  const severityColor = severity === "High" ? "#dc2626" : severity === "Medium" ? "#d97706" : "#16a34a"
  const photosHtml = photoUrls.length
    ? `<div style="margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">PHOTOS</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${photoUrls.map((url) => `<img src="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${url}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />`).join("")}
        </div>
      </div>`
    : ""
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #7c3aed; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Issue Reported</h1>
        <p style="color: #ddd6fe; margin: 4px 0 0;">Bailey Development Group</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155;">Hi ${adminName},</p>
        <p style="color: #334155;"><b>${cleanerName}</b> reported an issue at <b>${propertyName}</b>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; color: #64748b; font-size: 14px;">TYPE</p>
          <p style="margin: 0 0 12px; font-weight: bold; color: #0f172a;">${type}</p>
          <p style="margin: 0 0 6px; color: #64748b; font-size: 14px;">SEVERITY</p>
          <p style="margin: 0 0 12px; font-weight: bold; color: ${severityColor};">${severity}</p>
          <p style="margin: 0 0 6px; color: #64748b; font-size: 14px;">DESCRIPTION</p>
          <p style="margin: 0; color: #0f172a;">${description}</p>
          ${photosHtml}
        </div>
        <a href="${issueUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Issue Report
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Bailey Development Group Cleaning Management</p>
      </div>
    </div>
  `
}

export function jobDeclinedEmail(adminName: string, cleanerName: string, propertyName: string, date: string, jobUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Job Declined</h1>
        <p style="color: #fecaca; margin: 4px 0 0;">Bailey Development Group</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #334155;">Hi ${adminName},</p>
        <p style="color: #334155;"><b>${cleanerName}</b> has declined the cleaning job. You'll need to assign another cleaner.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">PROPERTY</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${propertyName}</p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">DATE</p>
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${date}</p>
        </div>
        <a href="${jobUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Assign Another Cleaner
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Bailey Development Group Cleaning Management</p>
      </div>
    </div>
  `
}
