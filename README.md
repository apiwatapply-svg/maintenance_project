# Maintenance Project

Project scaffold for:

- Frontend: Next.js, Tailwind CSS, Axios
- Backend: Node.js, Express MVC
- Database: Microsoft SQL Server with `mssql` package, no ORM

## Run

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

## Database

Run `backend/database/schema.sql` on Microsoft SQL Server before using the admin CRUD endpoints,
or run:

```bash
cd backend
npm run db:setup
```

Master tables use the `tbm_` prefix. General transaction tables should use the `tb_` prefix.
The schema seeds the first super admin user:

- Username: `admin`
- Password: `admin`
- Role: `admin`
- Permissions: admin access to every feature

Backend reads `.env.local` first, then `.env`.

## Realtime

The backend starts Socket.IO on the same HTTP server as Express. Admin CRUD changes emit
`admin:data-changed`, and the admin dashboard listens for that event to refresh matching pages.

## Tests

```bash
cd backend
npm test
```
