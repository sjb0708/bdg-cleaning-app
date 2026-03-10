import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, jobAssignedEmail, jobDeclinedEmail } from "@/lib/email"
import { format } from "date-fns"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: true,
        host: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
        cleaner: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true, location: true } },
        booking: true,
        checklistItems: { orderBy: { order: "asc" } },
      },
    })

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    const canAccess = user.role === "ADMIN" || job.cleanerId === user.userId
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    return NextResponse.json({ job })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.job.findUnique({
      where: { id },
      include: {
        property: true,
        host: { select: { id: true, name: true, email: true } },
        cleaner: { select: { id: true, name: true, email: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    const canAccess = user.role === "ADMIN" || existing.cleanerId === user.userId
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const updateData: Record<string, unknown> = {}

    if (user.role === "ADMIN") {
      if (body.status !== undefined) updateData.status = body.status
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.scheduledDate !== undefined) updateData.scheduledDate = new Date(body.scheduledDate)

      // Assigning a cleaner → set to PENDING_ACCEPTANCE and notify
      if (body.cleanerId !== undefined) {
        if (body.cleanerId) {
          updateData.cleanerId = body.cleanerId
          updateData.status = "PENDING_ACCEPTANCE"
        } else {
          updateData.cleanerId = null
          updateData.status = "UNASSIGNED"
        }
      }
    }

    // Cleaners can start cleaning (ASSIGNED → IN_PROGRESS)
    if (user.role === "CLEANER") {
      if (body.status === "IN_PROGRESS" && existing.status === "ASSIGNED") {
        updateData.status = "IN_PROGRESS"
      }
    }

    if (body.markComplete === true || body.status === "COMPLETED") {
      updateData.status = "COMPLETED"
      updateData.completedAt = new Date()
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        cleaner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        checklistItems: { orderBy: { order: "asc" } },
      },
    })

    // Auto-create Payment on completion
    const jobCompleted = updateData.status === "COMPLETED"
    if (jobCompleted && job.cleanerId) {
      const existingPayment = await prisma.payment.findUnique({ where: { jobId: id } })
      if (!existingPayment) {
        const prop = await prisma.property.findUnique({ where: { id: job.propertyId } })
        const amount = prop?.cleaningFee ?? 0
        if (amount > 0) {
          await prisma.payment.create({
            data: {
              jobId: id,
              cleanerId: job.cleanerId,
              propertyId: job.propertyId,
              amount,
            },
          })
        }
      }
    }

    // When admin assigns a cleaner → send notification + email to cleaner
    if (user.role === "ADMIN" && body.cleanerId && body.cleanerId !== existing.cleanerId) {
      const newCleaner = await prisma.user.findUnique({ where: { id: body.cleanerId } })
      const dateStr = format(new Date(existing.scheduledDate), "EEEE, MMMM d 'at' h:mm a")
      const jobUrl = `${APP_URL}/jobs/${id}`

      await prisma.notification.create({
        data: {
          userId: body.cleanerId,
          jobId: id,
          type: "JOB_ASSIGNED",
          title: "New Job — Action Required",
          message: `You've been assigned a cleaning job at ${existing.property?.name} on ${dateStr}. Please accept or decline.`,
        },
      })

      if (newCleaner?.emailNotifications && newCleaner.email) {
        await sendEmail({
          to: newCleaner.email,
          subject: `New cleaning job at ${existing.property?.name}`,
          html: jobAssignedEmail(newCleaner.name, existing.property?.name ?? "", dateStr, jobUrl),
        })
      }
    }

    // Notify admin if job was cancelled
    if (user.role === "ADMIN" && body.status === "CANCELLED" && existing.cleanerId) {
      await prisma.notification.create({
        data: {
          userId: existing.cleanerId,
          jobId: id,
          type: "JOB_CANCELLED",
          title: "Job Cancelled",
          message: `The cleaning job at ${existing.property?.name} on ${format(new Date(existing.scheduledDate), "MMM d")} has been cancelled.`,
        },
      })
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const existing = await prisma.job.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    if (existing.cleanerId) {
      await prisma.notification.create({
        data: {
          userId: existing.cleanerId,
          jobId: id,
          type: "JOB_CANCELLED",
          title: "Job Cancelled",
          message: `A cleaning job scheduled for ${format(new Date(existing.scheduledDate), "MMM d")} has been cancelled.`,
        },
      })
    }

    await prisma.job.update({ where: { id }, data: { status: "CANCELLED" } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
