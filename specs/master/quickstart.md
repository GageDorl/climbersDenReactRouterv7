# Quickstart: notifications feature (dev)

1. Ensure database is running and DATABASE_URL is set.
2. Apply Prisma migrations:

```bash
npx prisma migrate dev --name add_notifications
npx prisma generate
```

3. Start dev server:

```bash
cd app
npm run dev
```

4. Open two browser windows, log in as two users, perform actions (message, like, comment) to see realtime notifications.
