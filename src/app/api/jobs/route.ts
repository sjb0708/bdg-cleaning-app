import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Admins see all jobs; cleaners only see their assigned jobs
    const where =
      user.role === "ADMIN"
        ? { ...(status ? { status: status as never } : {}) }
        : { cleanerId: user.userId, ...(status ? { status: status as never } : {}) }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        property: true,
        host: { select: { id: true, name: true, email: true, avatarUrl: true } },
        cleaner: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
        booking: true,
        checklistItems: { orderBy: { order: "asc" } },
      },
      orderBy: { scheduledDate: "asc" },
      take: limit,
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { propertyId, scheduledDate, notes, bookingId, cleanerId } = body

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { checklistTemplate: { include: { items: { orderBy: { order: "asc" } } } } },
    })
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 })

    // Use checklist template items if available, otherwise use defaults
    const checklistItems =
      property.checklistTemplate && property.checklistTemplate.items.length > 0
        ? property.checklistTemplate.items.map((item) => ({
            label: item.label,
            room: item.room,
            order: item.order,
            completed: false,
          }))
        : [
            { label: "Vacuum all floors", room: "General", order: 0, completed: false },
            { label: "Mop hard floors", room: "General", order: 1, completed: false },
            { label: "Empty all trash cans", room: "General", order: 2, completed: false },
            { label: "Clean bathrooms", room: "Bathroom", order: 3, completed: false },
            { label: "Replace towels and toiletries", room: "Bathroom", order: 4, completed: false },
            { label: "Make all beds with fresh linens", room: "Bedroom", order: 5, completed: false },
            { label: "Clean kitchen counters and appliances", room: "Kitchen", order: 6, completed: false },
            { label: "Final walkthrough", room: "General", order: 7, completed: false },
          ]

    const job = await prisma.job.create({
      data: {
        propertyId,
        hostId: user.userId,
        scheduledDate: new Date(scheduledDate),
        duration: property.cleaningDuration,
        notes: notes || null,
        bookingId: bookingId || null,
        cleanerId: cleanerId || null,
        status: cleanerId ? "ASSIGNED" : "UNASSIGNED",
        checklistItems: { create: checklistItems },
      },
      include: {
        property: true,
        cleaner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        booking: true,
        checklistItems: { orderBy: { order: "asc" } },
      },
    })

    // Create in-app notification for cleaner if assigned
    if (cleanerId) {
      await prisma.notification.create({
        data: {
          userId: cleanerId,
          jobId: job.id,
          type: "JOB_ASSIGNED",
          title: "New Job Assigned",
          message: `You have been assigned a cleaning job at ${property.name} on ${new Date(scheduledDate).toLocaleDateString()}.`,
        },
      })
    }

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
