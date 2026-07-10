// Notifies a cleaner on every channel that's actually reachable — always
// email, and always a free carrier-gateway text if a phone + carrier are on
// file. No per-cleaner channel picker to leave misconfigured: if a carrier
// is set, they get both; if not, they just get email.

import { sendEmail } from "@/lib/email"
import { sendSMSViaCarrierGateway, sendSMSViaTwilio } from "@/lib/sms"

interface CleanerLike {
  email: string
  phone?: string | null
  carrier?: string | null
  emailNotifications?: boolean
}

interface NotifyOptions {
  subject: string
  emailHtml: string
  smsBody: string
}

export async function notifyCleaner(cleaner: CleanerLike, { subject, emailHtml, smsBody }: NotifyOptions) {
  if (cleaner.phone) {
    const sent = await sendSMSViaCarrierGateway(cleaner.phone, cleaner.carrier, smsBody)
    if (!sent) await sendSMSViaTwilio(cleaner.phone, smsBody)
  }

  if (cleaner.email && cleaner.emailNotifications !== false) {
    await sendEmail({ to: cleaner.email, subject, html: emailHtml })
  }
}
