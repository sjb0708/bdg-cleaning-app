// SMS delivery.
//
// Primary path: free carrier email-to-SMS gateways, sent through the same
// Gmail account already configured for email (lib/email.ts) — no per-message
// or monthly cost. Emailing {10-digit-number}@{carrier gateway domain}
// delivers as a text on that carrier's network.
//
// Optional fallback: Twilio, only if TWILIO_* env vars are set AND a
// cleaner's carrier isn't on file. Twilio costs money per number/message —
// it's not needed once every cleaner has a carrier saved, so leave those
// env vars unset to avoid the charge entirely.

import { sendEmail } from "@/lib/email"
import { CARRIER_GATEWAYS } from "@/lib/carriers"

export { CARRIER_GATEWAYS, CARRIER_OPTIONS } from "@/lib/carriers"

function toGatewayAddress(phone: string, carrier: string): string | null {
  const domain = CARRIER_GATEWAYS[carrier]
  if (!domain) return null
  const digits = phone.replace(/\D/g, "").replace(/^1(\d{10})$/, "$1")
  if (digits.length !== 10) return null
  return `${digits}@${domain}`
}

// Returns true if a text was actually sent this way (carrier known and
// phone valid), so callers know whether they still need a fallback.
export async function sendSMSViaCarrierGateway(
  phone: string | null | undefined,
  carrier: string | null | undefined,
  body: string
) {
  if (!phone || !carrier) return false
  const address = toGatewayAddress(phone, carrier)
  if (!address) return false
  // No subject: most gateways prepend the subject line to the message body,
  // and SMS has no room to spare for it.
  await sendEmail({ to: address, subject: "", html: body })
  return true
}

// Paid fallback via Twilio. Returns true if it attempted delivery (creds
// configured), false if left unconfigured — in which case the caller
// should fall back to email instead.
export async function sendSMSViaTwilio(phone: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) return false

  const toDigits = phone.replace(/[^\d+]/g, "")
  const toE164 = toDigits.startsWith("+") ? toDigits : `+1${toDigits.replace(/^1/, "")}`

  try {
    const twilio = (await import("twilio")).default
    const client = twilio(accountSid, authToken)
    await client.messages.create({ to: toE164, from: fromNumber, body })
    return true
  } catch (err) {
    // Send actually failed (e.g. a cancelled/suspended number left with
    // stale env vars) — report failure so the caller falls back to email
    // instead of silently dropping the notification.
    console.error("Twilio send failed:", err)
    return false
  }
}
