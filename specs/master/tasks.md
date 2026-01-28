---
description: "Tasks for notifications feature"
---

# Tasks: notifications

**Input**: Design documents from `/specs/master/`

## Phase 1: Setup

- [ ] T001 Create feature structure under `specs/master`
- [ ] T002 Ensure Prisma migration exists for NotificationPreference
- [ ] T003 Add UI route `app/routes/notifications.tsx`
- [ ] T004 Add Settings route `app/routes/settings.notifications.tsx`

## Phase 2: Foundational

- [ ] T010 Add Notification DB model (if missing)
- [ ] T011 Run `npx prisma migrate dev --name add_notifications`
- [ ] T012 Regenerate Prisma client

## Phase 3: Core

- [ ] T020 Create server helpers to emit notifications
- [ ] T021 Add notification creation to message/like/comment/follow/gear flows
- [ ] T022 Add API endpoints to mark read/clear/mark-all-read

## Phase 4: Integration & Tests

- [ ] T030 Restart dev server and smoke-test flows
- [ ] T031 Add integration tests for realtime delivery

