# Research notes: notifications

- Use existing Socket.IO emitter helpers in `app/lib/realtime.server.ts` to emit `notification:new` events.
- Store notifications in `notification` table via Prisma; use NotificationPreference to gate creation.
- UI should use server-side loader to fetch unread count for navbar.
