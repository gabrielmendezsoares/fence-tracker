# 🚧 Fence Tracker

## 📋 Overview

Fence Tracker is a zone-based monitoring and alerting service that identifies when activity levels within specific geographic or logical zones exceed a configured threshold. It fetches data from a centralized Query Gateway, evaluates it against defined rules, and sends alerts when meaningful increases occur.

To prevent redundant notifications, Fence Tracker persists the last triggered state for each zone in a MySQL database. When a new threshold multiple is crossed, it formats and dispatches a structured alert message via an external messaging system.

### 🎯 Objectives

- Fetch the latest fence activity data using a named query from the Query Gateway
- Detect when the quantity per zone exceeds a defined threshold (e.g., 50)
- Persist trigger states in a MySQL database using Prisma to track previously alerted values
- Prevent duplicate alerts by only triggering when thresholds escalate beyond prior values
- Generate structured alert messages containing relevant zone and account information
- Send alerts to a configurable external messaging endpoint
- Use Basic and Bearer authentication strategies for secure communication with the Query Gateway
- Provide a scalable and maintainable alert pipeline for fence-based activity monitoring

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
  