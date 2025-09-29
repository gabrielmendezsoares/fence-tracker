# 🚧 Fence Tracker

## 📋 Overview

Fence Tracker is a scheduled zone-based alerting service that monitors activity levels in defined geographic or logical zones. It operates on a rolling 12-hour window, splitting each day into two distinct monitoring periods (00:00–11:59 and 12:00–23:59), based on São Paulo local time.

The system retrieves aggregated event counts per account and zone from a centralized Query Gateway. If the number of events exceeds a configurable threshold, Fence Tracker generates and sends an alert via WhatsApp, while persisting alert states to prevent duplicate notifications.

To ensure reliability and accuracy, Fence Tracker uses a trigger table to track previously sent alerts and only notifies on new threshold crossings (e.g., from 50 to 100 events). It also automatically cleans up outdated trigger records at the start of each new 12-hour cycle.

Fence Tracker helps operational teams respond to abnormal zone activity quickly and effectively, reducing noise and increasing situational awareness.

### 🎯 Objectives

- Monitor zone activity on a 12-hour rolling window (00:00–11:59 or 12:00–23:59)
- Retrieve aggregated zone activity data from the Query Gateway via named queries
- Filter and count events per account and zone
- Detect when event counts exceed a defined threshold (e.g., 50 events)
- Calculate and track alert states using a Prisma-managed trigger table
- Avoid duplicate notifications by only triggering on threshold multiples
- Clean up expired trigger records at the start of each 12-hour window
- Format alert messages with account, zone, cabinet, and condominium details
- Send alert notifications via WhatsApp using the ChatPro API
- Support Basic and Bearer token authentication for secure API access
- Log all operations and errors for auditability and diagnostics
- Run as a recurring scheduled job integrated with backend infrastructure

--- 

## 📦 Quick Start

### ⚠️ Prerequisites

- [**Node.js**](https://nodejs.org/) ≥ `20.14.0` — _JavaScript runtime environment_
- [**MySQL**](https://www.mysql.com/) ≥ `8.0` — _Relational database_
- [**Query Gateway**](https://github.com/gabrielmendezsoares/query-gateway) ≥ `3.0.3` — _Configurable data query service_

### ⚙️ Setup 

```bash 
# Clone & navigate
git clone <repository-url> && cd fence-tracker

# Configure environment
cp .env.example .env  # Edit with your settings

# Install dependencies (auto-runs database setup)
npm install
```

> **💡 Database:** Import `storage.sql.example` before running `npm install`

---

## ⚡ Usage

### 🛠️ Development

```bash
npm run start:development
```

### 🏗️ Production

```bash
npm run build && npm run start:production
```

---

## 📚 Command Reference

### 🧰 Core

| Command | Description |
| ------- | ----------- |
| `npm run start:development` | _Start the application in development_ |
| `npm run start:production` | _Start the application in production_ |
| `npm run build` | _Build the application for production_ |
| `npm run build:watch` | _Build the application with watch mode_ |
| `npm run clean` | _Clean application build artifacts_ |

### 🛢️ Database

| Command | Description |
| ------- | ----------- |
| `npm run db:pull` | _Pull database schema into Prisma across all schemas_ |
| `npm run db:push` | _Push Prisma schema to the database across all schemas_ |
| `npm run db:generate` | _Generate Prisma Client for all schemas_ |
| `npm run db:migrate:dev` | _Run development migrations across all schemas_ |
| `npm run db:migrate:deploy` | _Deploy migrations to production across all schemas_ |
| `npm run db:studio` | _Open Prisma Studio (GUI) across all schemas_ |
| `npm run db:reset` | _Reset database (pull + generate) for all schemas_ |

### 🐳 Docker

| Command | Description |
| ------- | ----------- |
| `npm run docker:build:development` | _Build Docker image for development_ |
| `npm run docker:build:production` | _Build Docker image for production_ |
| `npm run docker:run:development` | _Run development Docker container_ |
| `npm run docker:run:production` | _Run production Docker container_ |
| `npm run docker:compose:up:development` | _Start Docker Compose in development_ |
| `npm run docker:compose:up:production` | _Start Docker Compose in production_ |
| `npm run docker:compose:up:build:development` | _Start & rebuild Docker Compose in development_ |
| `npm run docker:compose:up:build:production` | _Start & rebuild Docker Compose in production_ |
| `npm run docker:compose:down` | _Stop Docker Compose services_ |
| `npm run docker:compose:logs` | _View Docker Compose logs_ |
| `npm run docker:prune` | _Clean up unused Docker resources_ |

### 🧪 Testing

| Command | Description |
| ------- | ----------- |
| `npm test` | _Run all tests once_ |
| `npm run test:watch` | _Run tests in watch mode_ |
| `npm run test:coverage` | _Run tests and generate a coverage report_ |
  