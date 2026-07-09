// Routes a cleaner-facing notification to whichever channel they've chosen
// (EMAIL or TEXT) instead of always emailing regardless of preference.

import { sendEmail } from "@/lib/email"
import { sendSMS } from "@/lib/sms"

interface CleanerLike {
  email: string
  phone?: string | null
  notificationChannel?: string | null
  emailNotifications?: boolean
}

interface NotifyOptions {
  subject: string
  emailHtml: string
  smsBody: string
}

export async function notifyCleaner(cleaner: CleanerLike, { subject, emailHtml, smsBody }: NotifyOptions) {
  if (cleaner.notificationChannel === "TEXT" && cleaner.phone) {
    await sendSMS(cleaner.phone, smsBody)
    return
  }

  if (cleaner.email && cleaner.emailNotifications !== false) {
    await sendEmail({ to: cleaner.email, subject, html: emailHtml })
  }
}
