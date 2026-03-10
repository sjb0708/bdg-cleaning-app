import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const url = process.env.DATABASE_URL!
let prisma: PrismaClient

if (url.startsWith("file:")) {
  const adapter = new PrismaBetterSqlite3({ url })
  prisma = new PrismaClient({ adapter })
} else {
  const adapter = new PrismaNeon({ connectionString: url })
  prisma = new PrismaClient({ adapter })
}

function d(year: number, month: number, day: number, hour = 11, min = 0) {
  return new Date(year, month - 1, day, hour, min)
}

async function main() {
  console.log("Seeding database...")

  // Clear existing data
  await prisma.payment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.checklistItem.deleteMany()
  await prisma.checklistTemplateItem.deleteMany()
  await prisma.checklistTemplate.deleteMany()
  await prisma.job.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.property.deleteMany()
  await prisma.user.deleteMany()

  const pw = await bcrypt.hash("Admin1234!", 12)
  const cleanerPw = await bcrypt.hash("Cleaner123!", 12)

  // Admin
  const steve = await prisma.user.create({
    data: {
      name: "Steve Bailey",
      email: "stevebailey130@gmail.com",
      password: pw,
      role: "ADMIN",
      approved: true,
    },
  })

  // Mock cleaners
  const cleaner1 = await prisma.user.create({
    data: {
      name: "Maria Garcia",
      email: "maria@cleaners.com",
      password: cleanerPw,
      role: "CLEANER",
      approved: true,
      phone: "352-555-0101",
    },
  })

  const cleaner2 = await prisma.user.create({
    data: {
      name: "James Wilson",
      email: "james@cleaners.com",
      password: cleanerPw,
      role: "CLEANER",
      approved: true,
      phone: "352-555-0202",
    },
  })

  // Pending cleaner (not yet approved)
  await prisma.user.create({
    data: {
      name: "Sofia Chen",
      email: "sofia@cleaners.com",
      password: cleanerPw,
      role: "CLEANER",
      approved: false,
    },
  })

  // Properties
  const p1 = await prisma.property.create({
    data: {
      hostId: steve.id,
      name: "Beautiful Home with Pool Near HITS",
      address: "1234 SW 80th Ave",
      city: "Ocala",
      state: "FL",
      bedrooms: 3,
      bathrooms: 2,
      description: "Beautiful 3-bed vacation rental with a private pool, close to HITS showgrounds.",
      airbnbIcalUrl: null,
      vrboIcalUrl: null,
      cleaningDuration: 180,
      cleaningFee: 120,
    },
  })

  const p2 = await prisma.property.create({
    data: {
      hostId: steve.id,
      name: "Spacious Home with Pool Near HITS",
      address: "5678 NE 14th St",
      city: "Ocala",
      state: "FL",
      bedrooms: 4,
      bathrooms: 3,
      description: "Spacious 4-bed home with pool, perfect for families visiting the equestrian events.",
      airbnbIcalUrl: null,
      vrboIcalUrl: null,
      cleaningDuration: 240,
      cleaningFee: 225,
    },
  })

  // Checklist templates
  const defaultRooms = (bedrooms: number, bathrooms: number) => {
    const items: { label: string; room: string; order: number }[] = [
      { label: "Vacuum all floors", room: "General", order: 0 },
      { label: "Mop hard floors", room: "General", order: 1 },
      { label: "Empty all trash cans", room: "General", order: 2 },
      { label: "Wipe down all light switches and door handles", room: "General", order: 3 },
      { label: "Clean kitchen counters and appliances", room: "Kitchen", order: 4 },
      { label: "Clean inside microwave", room: "Kitchen", order: 5 },
      { label: "Wipe down stovetop and oven", room: "Kitchen", order: 6 },
      { label: "Clean and sanitize sink", room: "Kitchen", order: 7 },
      { label: "Restock dish soap and sponge", room: "Kitchen", order: 8 },
    ]
    for (let i = 1; i <= bedrooms; i++) {
      const room = i === 1 ? "Master Bedroom" : `Bedroom ${i}`
      items.push(
        { label: "Make bed with fresh linens", room, order: items.length },
        { label: "Dust all surfaces", room, order: items.length + 1 },
        { label: "Wipe down nightstands", room, order: items.length + 2 },
      )
    }
    const bathCount = Math.ceil(bathrooms)
    for (let i = 1; i <= bathCount; i++) {
      const room = i === 1 ? "Master Bathroom" : `Bathroom ${i}`
      items.push(
        { label: "Clean and disinfect toilet", room, order: items.length },
        { label: "Clean shower/tub", room, order: items.length + 1 },
        { label: "Clean sink and mirror", room, order: items.length + 2 },
        { label: "Replace towels and toiletries", room, order: items.length + 3 },
      )
    }
    items.push({ label: "Final walkthrough", room: "General", order: items.length })
    return items
  }

  await prisma.checklistTemplate.create({
    data: { propertyId: p1.id, items: { create: defaultRooms(p1.bedrooms, p1.bathrooms) } },
  })
  await prisma.checklistTemplate.create({
    data: { propertyId: p2.id, items: { create: defaultRooms(p2.bedrooms, p2.bathrooms) } },
  })

  // Bookings — March 2026
  const b1 = await prisma.booking.create({ data: { propertyId: p1.id, guestName: "Thompson Family", checkIn: d(2026,3,8), checkOut: d(2026,3,11), platform: "AIRBNB", externalId: "airbnb-001" } })
  const b2 = await prisma.booking.create({ data: { propertyId: p2.id, guestName: "Rodriguez Group", checkIn: d(2026,3,9), checkOut: d(2026,3,12), platform: "VRBO", externalId: "vrbo-001" } })
  const b3 = await prisma.booking.create({ data: { propertyId: p1.id, guestName: "Smith Family", checkIn: d(2026,3,12), checkOut: d(2026,3,15), platform: "AIRBNB", externalId: "airbnb-002" } })
  const b4 = await prisma.booking.create({ data: { propertyId: p2.id, guestName: "Johnson Party", checkIn: d(2026,3,13), checkOut: d(2026,3,17), platform: "VRBO", externalId: "vrbo-002" } })
  const b5 = await prisma.booking.create({ data: { propertyId: p1.id, guestName: "Williams Family", checkIn: d(2026,3,18), checkOut: d(2026,3,22), platform: "AIRBNB", externalId: "airbnb-003" } })
  const b6 = await prisma.booking.create({ data: { propertyId: p2.id, guestName: "Martinez Group", checkIn: d(2026,3,19), checkOut: d(2026,3,24), platform: "VRBO", externalId: "vrbo-003" } })
  const b7 = await prisma.booking.create({ data: { propertyId: p1.id, guestName: "Davis Family", checkIn: d(2026,3,25), checkOut: d(2026,3,29), platform: "AIRBNB", externalId: "airbnb-004" } })

  // Helper to create checklist items for a job
  const checklistItems = [
    { label: "Vacuum all floors", room: "General", order: 0, completed: false },
    { label: "Mop hard floors", room: "General", order: 1, completed: false },
    { label: "Empty all trash cans", room: "General", order: 2, completed: false },
    { label: "Clean kitchen counters", room: "Kitchen", order: 3, completed: false },
    { label: "Make beds with fresh linens", room: "Bedroom", order: 4, completed: false },
    { label: "Clean and disinfect bathrooms", room: "Bathroom", order: 5, completed: false },
    { label: "Final walkthrough", room: "General", order: 6, completed: false },
  ]

  // COMPLETED jobs (past — with all checklist items done)
  const completedItems = checklistItems.map((i) => ({ ...i, completed: true }))

  const j1 = await prisma.job.create({
    data: {
      propertyId: p1.id, hostId: steve.id, cleanerId: cleaner1.id, bookingId: b1.id,
      scheduledDate: d(2026,3,11), duration: 180, status: "COMPLETED",
      checklistItems: { create: completedItems },
    },
  })
  await prisma.payment.create({
    data: { jobId: j1.id, cleanerId: cleaner1.id, propertyId: p1.id, amount: 120, status: "PAID", paidAt: d(2026,3,11,14) },
  })

  const j2 = await prisma.job.create({
    data: {
      propertyId: p2.id, hostId: steve.id, cleanerId: cleaner2.id, bookingId: b2.id,
      scheduledDate: d(2026,3,12), duration: 240, status: "COMPLETED",
      checklistItems: { create: completedItems },
    },
  })
  await prisma.payment.create({
    data: { jobId: j2.id, cleanerId: cleaner2.id, propertyId: p2.id, amount: 225, status: "UNPAID" },
  })

  // ASSIGNED jobs (coming up)
  await prisma.job.create({
    data: {
      propertyId: p1.id, hostId: steve.id, cleanerId: cleaner1.id, bookingId: b3.id,
      scheduledDate: d(2026,3,15), duration: 180, status: "ASSIGNED",
      checklistItems: { create: checklistItems },
    },
  })

  await prisma.job.create({
    data: {
      propertyId: p2.id, hostId: steve.id, cleanerId: cleaner2.id, bookingId: b4.id,
      scheduledDate: d(2026,3,17), duration: 240, status: "ASSIGNED",
      checklistItems: { create: checklistItems },
    },
  })

  // UNASSIGNED jobs (needs cleaner)
  await prisma.job.create({
    data: {
      propertyId: p1.id, hostId: steve.id, bookingId: b5.id,
      scheduledDate: d(2026,3,22), duration: 180, status: "UNASSIGNED",
      checklistItems: { create: checklistItems },
    },
  })

  await prisma.job.create({
    data: {
      propertyId: p2.id, hostId: steve.id, bookingId: b6.id,
      scheduledDate: d(2026,3,24), duration: 240, status: "UNASSIGNED",
      checklistItems: { create: checklistItems },
    },
  })

  await prisma.job.create({
    data: {
      propertyId: p1.id, hostId: steve.id, bookingId: b7.id,
      scheduledDate: d(2026,3,29), duration: 180, status: "UNASSIGNED",
      checklistItems: { create: checklistItems },
    },
  })

  // IN_PROGRESS job (today-ish)
  await prisma.job.create({
    data: {
      propertyId: p2.id, hostId: steve.id, cleanerId: cleaner1.id,
      scheduledDate: d(2026,3,9), duration: 240, status: "IN_PROGRESS",
      checklistItems: { create: [
        { label: "Vacuum all floors", room: "General", order: 0, completed: true },
        { label: "Mop hard floors", room: "General", order: 1, completed: true },
        { label: "Empty all trash cans", room: "General", order: 2, completed: true },
        { label: "Clean kitchen counters", room: "Kitchen", order: 3, completed: false },
        { label: "Make beds with fresh linens", room: "Bedroom", order: 4, completed: false },
        { label: "Clean and disinfect bathrooms", room: "Bathroom", order: 5, completed: false },
        { label: "Final walkthrough", room: "General", order: 6, completed: false },
      ]},
    },
  })

  // Notification for unassigned jobs
  await prisma.notification.create({
    data: {
      userId: steve.id,
      type: "JOB_ASSIGNED",
      title: "3 jobs need a cleaner assigned",
      message: "You have 3 upcoming jobs with no cleaner assigned for late March.",
    },
  })

  console.log("✓ Admin:    stevebailey130@gmail.com / Admin1234!")
  console.log("✓ Cleaner1: maria@cleaners.com / Cleaner123!")
  console.log("✓ Cleaner2: james@cleaners.com / Cleaner123!")
  console.log("✓ Pending:  sofia@cleaners.com (not approved)")
  console.log("✓ 2 properties, 7 bookings, 8 jobs across March 2026")
  console.log("✓ Statuses: 2 completed, 2 assigned, 3 unassigned, 1 in-progress")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
