# Pharmacy POS Desktop App Installation Guide

This guide explains how to install dependencies and run the project in both web and desktop modes.

## 1. Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git

Check versions:

```bash
node -v
npm -v
```

## 2. Clone Project

```bash
git clone <your-repository-url>
cd pharmacy-pos
```

## 3. Install Dependencies

Install all project dependencies:

```bash
npm install
```

This installs:

- Frontend dependencies (React + Vite + Tailwind)
- Database dependencies (Prisma + SQLite)
- Desktop dependencies (Electron, concurrently, wait-on)

## 4. Configure Database

The project uses SQLite with Prisma.

Generate Prisma client:

```bash
npm run db:generate
```

Create and sync database tables:

```bash
npm run db:push
```

Optional: seed sample data

```bash
npm run db:seed
```

Optional: open Prisma Studio to inspect data

```bash
npm run db:studio
```

## 5. Run App (Web Mode)

```bash
npm run dev
```

Open:

- http://localhost:5173

## 6. Run App (Desktop Mode with Electron)

```bash
npm run dev:desktop
```

This starts:

- Vite dev server
- Electron desktop window

In desktop mode, the bridge is available and UI can use Prisma-backed SQLite workflow.

## 7. Build for Production

Build frontend assets:

```bash
npm run build
```

Desktop build script currently maps to frontend build:

```bash
npm run build:desktop
```

## 8. Useful Database CLI Commands

List products:

```bash
npm run db:cli -- list-products
```

Add customer:

```bash
npm run db:cli -- add-customer "Ahmed Ali" "Cairo" "01012345678"
```

Save invoice:

```bash
npm run db:cli -- save-invoice "Paracetamol 500mg" 25 2 "Ahmed Ali"
```

List invoices with search/filter:

```bash
npm run db:cli -- list-invoices "para" "Ahmed"
```

Get full catalog metadata:

```bash
npm run db:cli -- get-catalog
```

## 9. Troubleshooting

### Problem: Prisma schema changed

Run again:

```bash
npm run db:generate
npm run db:push
```

### Problem: Desktop window does not open

- Make sure Electron dependencies were installed with `npm install`
- Ensure no process is blocking port 5173
- Re-run `npm run dev:desktop`

### Problem: No data visible

- Verify data exists in SQLite using `npm run db:studio`
- In desktop mode, confirm bridge methods are exposed from Electron preload

## 10. Project Scripts Summary

- `npm run dev` -> run Vite web app
- `npm run dev:desktop` -> run Vite + Electron desktop app
- `npm run build` -> build web app
- `npm run build:desktop` -> desktop build alias
- `npm run db:generate` -> generate Prisma client
- `npm run db:push` -> sync SQLite schema
- `npm run db:seed` -> insert sample data
- `npm run db:studio` -> open DB GUI
- `npm run db:cli -- <command>` -> run DB utility commands
