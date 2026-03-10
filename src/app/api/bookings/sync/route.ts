import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Simple iCal parser — handles Airbnb and VRBO formats
function parseIcal(text: string): {
  uid: string
  summary: string
  dtstart: Date | null
  dtend: Date | null
}[] {
  const events: { uid: string; summary: string; dtstart: Date | null; dtend: Date | null }[] = []
  const lines = text.replace(/\r\n /g, "").replace(/\r\n\t/g, "").split(/\r?\n/)

  let current: Partial<{ uid: string; summary: string; dtstart: string; dtend: string }> | null = null

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {}
    } else if (line.startsWith("END:VEVENT") && current) {
      if (current.dtstart && current.dtend) {
        events.push({
          uid: current.uid || crypto.randomUUID(),
          summary: current.summary || "Booking",
          dtstart: parseIcalDate(current.dtstart),
          dtend: parseIcalDate(current.dtend),
        })
      }
      current = null
    } else if (current) {
      if (line.startsWith("UID:")) current.uid = line.slice(4).trim()
      else if (line.startsWith("SUMMARY:")) current.summary = line.slice(8).trim()
      else if (line.startsWith("DTSTART")) current.dtstart = line.split(":").slice(1).join(":").trim()
      else if (line.startsWith("DTEND")) current.dtend = line.split(":").slice(1).join(":").trim()
    }
  }

  return events
}

function parseIcalDate(str: string): Date | null {
  try {
    // Date only format: 20240115
    if (/^\d{8}$/.test(str)) {
      const y = str.slice(0, 4)
      const m = str.slice(4, 6)
      const d = str.slice(6, 8)
      return new Date(`${y}-${m}-${d}T12:00:00.000Z`)
    }
    // DateTime format: 20240115T120000Z
    if (/^\d{8}T\d{6}Z$/.test(str)) {
      return new Date(
        `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(9, 11)}:${str.slice(11, 13)}:${str.slice(13, 15)}Z`
      )
    }
    return new Date(str)
  } catch {
    return null
  }
}

async function fetchAndSync(propertyId: string, icalUrl: string, platform: string) {
  const res = await fetch(icalUrl, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Failed to fetch iCal from ${icalUrl}`)
  const text = await res.text()
  const events = parseIcal(text)

  let created = 0
  let skipped = 0

  for (const event of events) {
    if (!event.dtstart || !event.dtend) { skipped++; continue }

    // Skip blocked/unavailable entries (Airbnb uses "Airbnb (Not available)")
    const summaryLower = event.summary.toLowerCase()
    if (summaryLower.includes("not available") || summaryLower.includes("unavailable") || summaryLower.includes("blocked")) {
      skipped++
      continue
    }

    try {
      await prisma.booking.upsert({
        where: { propertyId_externalId: { propertyId, externalId: event.uid } },
        create: {
          propertyId,
          platform,
          externalId: event.uid,
          guestName: event.summary !== "Airbnb" && event.summary !== "VRBO" ? event.summary : null,
          checkIn: event.dtstart,
          checkOut: event.dtend,
        },
        update: {
          checkIn: event.dtstart,
          checkOut: event.dtend,
          guestName: event.summary !== "Airbnb" && event.summary !== "VRBO" ? event.summary : null,
        },
      })
      created++
    } catch {
      skipped++
    }
  }

  return { created, skipped, total: events.length }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { airbnbIcalUrl: { not: null } },
          { vrboIcalUrl: { not: null } },
        ],
      },
    })

    const results: { propertyId: string; name: string; platform: string; synced: number; errors: string[] }[] = []

    for (const property of properties) {
      if (property.airbnbIcalUrl) {
        try {
          const r = await fetchAndSync(property.id, property.airbnbIcalUrl, "airbnb")
          results.push({ propertyId: property.id, name: property.name, platform: "airbnb", synced: r.created, errors: [] })
        } catch (e) {
          results.push({ propertyId: property.id, name: property.name, platform: "airbnb", synced: 0, errors: [(e as Error).message] })
        }
      }

      if (property.vrboIcalUrl) {
        try {
          const r = await fetchAndSync(property.id, property.vrboIcalUrl, "vrbo")
          results.push({ propertyId: property.id, name: property.name, platform: "vrbo", synced: r.created, errors: [] })
        } catch (e) {
          results.push({ propertyId: property.id, name: property.name, platform: "vrbo", synced: 0, errors: [(e as Error).message] })
        }
      }

      await prisma.property.update({
        where: { id: property.id },
        data: { lastSyncedAt: new Date() },
      })
    }

    return NextResponse.json({ results, syncedAt: new Date().toISOString() })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET for cron/background use
export async function GET() {
  return POST()
}
