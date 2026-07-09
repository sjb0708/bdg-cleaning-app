// SMS utility via Twilio. Falls back to a console log if credentials aren't
// configured, matching the pattern in lib/email.ts.

export async function sendSMS(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log("\n💬 [SMS - not sent, Twilio env vars not configured]")
    console.log(`   To: ${to}`)
    console.log(`   Body: ${body}`)
    console.log("")
    return
  }

  const toDigits = to.replace(/[^\d+]/g, "")
  const toE164 = toDigits.startsWith("+") ? toDigits : `+1${toDigits.replace(/^1/, "")}`

  try {
    const twilio = (await import("twilio")).default
    const client = twilio(accountSid, authToken)
    await client.messages.create({ to: toE164, from: fromNumber, body })
  } catch (err) {
    console.error("Twilio send failed:", err)
  }
}
