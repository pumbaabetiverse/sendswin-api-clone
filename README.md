# Sends.win

A NestJS application that integrates with Binance API to handle cryptocurrency deposits and withdrawals. The application
uses a Telegram bot as a user interface and includes features for processing transactions, managing user accounts,
interacting with blockchain networks, and providing gaming functionality.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)

## Features

- Integration with Binance API for cryptocurrency operations
- Telegram bot interface for user interaction
- Cryptocurrency deposit processing
- Cryptocurrency withdrawal processing
- Blockchain interaction (BSC and opBNB networks)
- User account management
- Queue management for asynchronous operations
- Admin dashboard for system management
- Authentication system
- Health check endpoints
- Gaming functionality:
    - Over/Under game
    - Lucky Seven game

## Technologies

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL (via [TypeORM](https://typeorm.io/))
- **Queue Management**: [BullMQ](https://docs.bullmq.io/) with Redis
- **Telegram Bot**: [Telegraf](https://telegraf.js.org/)
  via [nestjs-telegraf](https://github.com/bukhalo/nestjs-telegraf)
- **Blockchain Interaction**: [Viem](https://viem.sh/) and [Ethers.js](https://docs.ethers.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Numeric Precision**: [Big.js](https://github.com/MikeMcl/big.js/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Caching**: NestJS Cache Manager
- **Scheduling**: NestJS Schedule Module

## Project Structure

```
src/
├── admin/                # Admin dashboard functionality
├── app.module.ts         # Main application module
├── auth/                 # Authentication system
├── binance/              # Binance API integration
├── blockchain/           # Blockchain interaction
├── common/               # Shared utilities and constants
├── deposits/             # Deposit processing
├── game/                 # Gaming functionality
│   ├── lucky-seven/      # Lucky Seven game
│   └── over-under/       # Over/Under game
├── health/               # Health check endpoints
├── setting/              # Application settings
├── telegram/             # Telegram bot integration
├── users/                # User management
└── withdraw/             # Withdrawal processing
```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sends-win
   ```

2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```

3. Set up the database:
    - Create a PostgreSQL database
    - Configure the database connection in the `.env` file

4. Set up Redis:
    - Install Redis or use a Redis service
    - Configure the Redis connection in the `.env` file

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=sends_win
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Redis
# For local development:
REDIS_URL=redis://localhost:6379
# For production with Upstash or other Redis services:
# REDIS_URL=redis://default:password@hostname.upstash.io:6379

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_SECRET_TOKEN=your_telegram_bot_secret_token
NEST_PUBLIC_DOMAIN=your_public_domain  # For webhook setup
```

## Usage

### Development Mode

```bash
pnpm start:dev
```

### Production Mode

```bash
pnpm build
pnpm start:prod
```

### Telegram Bot

Once the application is running, you can interact with it through the configured Telegram bot. Start a conversation with
the bot and follow the instructions to:

1. Connect your wallet
2. Connect your Binance account
3. Play games (Over/Under and Lucky Seven)
4. View transaction history
5. Manage deposits and withdrawals

## Development

### Code Formatting

```bash
pnpm format
```

### Linting

```bash
pnpm lint
```

## Testing

### Running Tests

```bash
pnpm test
```

### Running E2E Tests

```bash
pnpm test:e2e
```

### Test Coverage

```bash
pnpm test:cov
```
