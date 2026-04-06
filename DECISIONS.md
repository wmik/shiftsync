# ShiftSync - Design Decisions

**Project:** ShiftSync — Multi-Location Staff Scheduling Platform  
**Date:** April 6, 2026  
**Purpose:** Document intentional ambiguities and how they were resolved

---

## Intentional Ambiguities

The following ambiguities were deliberately left unspecified in the project requirements. This document records the decisions made during implementation.

---

## 1. Historical Data on De-Certification

**Question:** What happens to historical data when a staff member is de-certified from a location?

**Decision:** Records are preserved, marked as historical

**Rationale:**
- Historical shift assignments provide an accurate record of who worked when
- Audit trails and compliance reports depend on this data
- De-certification prevents future assignments but doesn't erase the past

**Implementation:**
- The `certification` table has **no cascade delete** on removal
- When a manager removes a certification, the record is deleted
- Existing `shift_assignment` records remain intact
- Audit logs preserve the full picture of all changes

**Code Reference:**
```typescript
// src/app/api/staff/[id]/certifications/route.ts
await prisma.certification.delete({
  where: { id: certificationId },
});
// No cascade - historical assignments preserved
```

---

## 2. Desired Hours vs Availability Windows

**Question:** How should "desired hours" interact with availability windows?

**Decision:** Desired = goal, Availability = hard constraint

**Rationale:**
- Availability represents hard constraints (when staff CAN work)
- Desired hours represent preferences (how much staff WANT to work)
- These serve different purposes and should not conflict

**Implementation:**

| Concept | Type | Purpose | Enforcement |
|---------|------|---------|--------------|
| Availability | Hard constraint | When staff CAN work | Blocks assignment outside these hours |
| Desired Hours | Soft preference | How much staff WANT to work | Warning only, displayed in analytics |

**Schema:**
```prisma
model user {
  desired_hours_min Int? @default(20)  // Soft preference
  desired_hours_max Int? @default(40)  // Soft preference
}

model availability {
  // Hard constraint - enforced in validateAssignment()
  day_of_week  Int
  start_time  String
  end_time    String
}
```

**User Interface:**
- Profile page at `/profile` allows staff to set desired hours (default: 20-40)
- Managers see desired vs actual hours in analytics
- No blocking - only warnings when scheduling exceeds preferences

---

## 3. Consecutive Days Calculation

**Question:** When calculating consecutive days, does a 1-hour shift count the same as an 11-hour shift?

**Decision:** Yes, any shift with a confirmed assignment counts

**Rationale:**
- Labor law consecutive day rules are about rest, not hours worked
- Even a 1-hour shift provides a day of rest before/after
- Simpler to implement and explain to users

**Implementation:**
```typescript
// src/lib/constraints/index.ts
function calculateConsecutiveDays(shifts: { date: Date }[], targetDate: Date): number {
  // Counts ALL shifts with CONFIRMED assignments
  // No minimum hour threshold
  // A 1-hour shift counts the same as an 11-hour shift
}
```

**Behavior:**
| Shift Length | 6th Day | 7th Day |
|-------------|---------|---------|
| 1 hour | Warning | Override required |
| 8 hours | Warning | Override required |
| 11 hours | Warning | Override required |

---

## 4. Post-Approval Shift Edit

**Question:** If a shift is edited after swap approval but before it occurs, what should happen?

**Decision:** The swap is automatically cancelled, requiring new approval

**Rationale:**
- The approved swap was based on specific shift details (time, location, skill)
- Changes to the shift invalidate the original approval
- Both parties should be notified and have the chance to re-confirm

**Implementation:**
```typescript
// src/app/api/shifts/[id]/route.ts (PUT)
const pendingSwaps = await prisma.swap_request.findMany({
  where: {
    requester_shift_id: id,
    status: "PENDING_APPROVAL",  // Only approved swaps
  },
});

if (pendingSwaps.length > 0) {
  await prisma.swap_request.updateMany({
    where: { status: "PENDING_APPROVAL" },
    data: { status: "CANCELLED" },
  });
  
  // Notify both parties
  await createNotification({
    userId: swap.requester.id,
    type: "SWAP_CANCELLED",
    message: `Your swap was cancelled because the shift was modified`,
  });
}
```

**Workflow After Edit:**
1. Swap status changes from `PENDING_APPROVAL` → `CANCELLED`
2. Both requester and target receive `SWAP_CANCELLED` notification
3. Original assignment remains unchanged
4. Staff must create new swap request if still needed

---

## 5. Location Timezone Boundary

**Question:** How should the system handle a location that spans a timezone boundary (e.g., a restaurant near a state line)?

**Decision:** Use the location's primary timezone as a single source of truth

**Rationale:**
- Simpler to implement and understand
- Most restaurants operate primarily in one timezone
- Edge cases (near state lines) are rare
- Consistent display across the application

**Implementation:**
```prisma
model location {
  name      String
  address   String
  timezone  String  // Single timezone per location (e.g., "America/Los_Angeles")
}
```

**Behavior:**
- Each location has one `timezone` field
- Shift times stored as local time strings ("09:00", "17:00")
- Display converts to location's timezone
- Staff setting availability see times in location's timezone

**Cross-Timezone Staff:**
- Staff certified at multiple locations can have different availability per location
- Example: Emily Watson certified at Downtown (PT) and Times Square (ET)
- Availability is stored locally per location context

---

## Additional Design Decisions

### 6. Overnight Shifts

**Question:** How are shifts that span midnight handled?

**Decision:** Supported with "+" suffix indicator

**Implementation:**
```typescript
const isOvernightShift = (startTime: string, endTime: string): boolean => {
  return startTime > endTime;
};

const formatShiftTime = (startTime: string, endTime: string): string => {
  const overnight = isOvernightShift(startTime, endTime);
  return `${startTime}-${endTime}${overnight ? "+" : ""}`;
};
```

**Display:** "22:00-06:00+" indicates shift ends next day

---

### 7. Shift Overlap Detection

**Question:** Should overlapping shifts at different locations be blocked?

**Decision:** Yes - double booking is blocked across all locations

**Implementation:**
```typescript
// Blocks overlapping shifts even at different locations
async function checkNoDoubleBooking(userId, date, startTime, endTime) {
  const shifts = await prisma.shift.findMany({
    where: {
      assignments: { some: { user_id: userId, status: "CONFIRMED" } },
      date: date,
    },
  });
  
  for (const shift of shifts) {
    if (timesOverlap(startTime, endTime, shift.start_time, shift.end_time)) {
      return { error: "Double booking detected" };
    }
  }
}
```

---

### 8. Drop Request Expiration

**Question:** How should unclaimed drop requests be handled?

**Decision:** 24-hour expiration with automatic cleanup

**Implementation:**
- Drop requests have `expires_at = now() + 24 hours`
- Hourly cron job marks expired requests as `EXPIRED`
- API fallback ensures expiry even without cron
- Notification sent to requester on expiration

```typescript
// src/app/api/cron/expire-drop-requests/route.ts
await prisma.drop_request.updateMany({
  where: {
    status: "OPEN",
    expires_at: { lt: new Date() },
  },
  data: { status: "EXPIRED" },
});
```

---

### 9. Constraint Violation Severity

**Question:** How are soft violations (warnings) vs hard violations (blocks) distinguished?

**Decision:** Severity is embedded in the constraint type

| Constraint | Severity | Behavior |
|------------|----------|----------|
| Double Booking | Hard | Blocked |
| 10-hour Rest | Hard | Blocked |
| Skill Mismatch | Hard | Blocked |
| Certification Missing | Hard | Blocked |
| Availability | Hard | Blocked |
| Daily Overtime (12hr) | Hard | Blocked |
| Weekly Overtime (40hr) | Hard | Blocked |
| 6th Consecutive Day | Soft | Warning |
| Daily Overtime (8hr) | Soft | Warning |
| 7th Consecutive Day | Soft | Override required (blockable) |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Apr 6, 2026 | Implementation | Initial decisions documented |

---

*This document is the canonical source for design decisions. Cross-referenced in:*
- `REQUIREMENTS_REPORT.md` - Evaluation context
- `AGENTS.md` - Developer context
- `plan.md` - Implementation planning
