// Routes a cleaner-facing notification to whichever channel they've chosen
// (EMAIL, TEXT, or BOTH). Texts go out free via the carrier email-to-SMS
// gateway when the cleaner has a carrier on file; only falls back to paid
// Twilio (if configured) or plain email when a gateway text isn't possible.

import { sendEmail } from "@/lib/email"
import { sendSMSViaCarrierGateway, sendSMSViaTwilio } from "@/lib/sms"

interface CleanerLike {
  email: string
  phone?: string | null
  carrier?: string | null
  notificationChannel?: string | null
  emailNotifications?: boolean
}

interface NotifyOptions {
  subject: string
  emailHtml: string
  smsBody: string
}

export async function notifyCleaner(cleaner: CleanerLike, { subject, emailHtml, smsBody }: NotifyOptions) {
  const wantsText = cleaner.notificationChannel === "TEXT" || cleaner.notificationChannel === "BOTH"
  const wantsEmail = cleaner.notificationChannel !== "TEXT"

  let textSent = false
  if (wantsText && cleaner.phone) {
    textSent = await sendSMSViaCarrierGateway(cleaner.phone, cleaner.carrier, smsBody)
    if (!textSent) textSent = await sendSMSViaTwilio(cleaner.phone, smsBody)
  }

  // EMAIL/BOTH always get the email; TEXT-only falls back to email too if
  // no text actually went out, so the notification is never silently dropped.
  if ((wantsEmail || !textSent) && cleaner.email && cleaner.emailNotifications !== false) {
    await sendEmail({ to: cleaner.email, subject, html: emailHtml })
  }
}
