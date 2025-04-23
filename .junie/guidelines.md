# Binance OE Demo Project Guidelines

## Project Overview

This is a NestJS application that integrates with Binance API to handle cryptocurrency deposits and withdrawals. The
application uses a Telegram bot as a user interface and includes features for processing transactions, managing user
accounts, and interacting with blockchain.

## Project Structure

- `src/` - Main source code directory
    - `app.module.ts` - Main application module that imports all other modules
    - `binance/` - Binance API integration module
    - `blockchain/` - Blockchain interaction module
    - `common/` - Shared utilities and constants
    - `deposits/` - Deposit processing module
    - `telegram/` - Telegram bot integration module
    - `users/` - User management module
    - `withdraw/` - Withdrawal processing module
    - `setting/` - Application settings module
- `assets/` - Static assets
- `dist/` - Compiled JavaScript output
- `test/` - Test files

## Development Workflow

1. The project uses NestJS framework with TypeScript
2. PostgreSQL is used as the main database (configured via TypeORM)
3. Redis is used for queue management (via BullMQ)
4. Telegram Bot API is used for user interface

## Testing Guidelines

When implementing changes, Junie should:

1. Ensure that any new code follows the existing patterns in the codebase
2. Run tests using `npm test` to verify changes don't break existing functionality
3. For changes to the Binance integration, use the test script `./test.sh` which may contain specific test cases

## Build Process

Before submitting changes, Junie should:

1. Build the project using `npm run build` to ensure it compiles correctly
2. Verify that the compiled output in `dist/` works as expected

## Code Style Guidelines

1. Follow TypeScript best practices and NestJS conventions
2. Use dependency injection as per NestJS patterns
3. Maintain consistent error handling throughout the codebase
4. Document complex logic with comments
5. Use async/await for asynchronous operations
6. Follow the existing module structure when adding new features
7. Enhance type safety:
    - Avoid using `any` type whenever possible
    - Use specific types or interfaces instead of generic Object types
    - Utilize TypeScript's utility types (Partial, Pick, Omit, etc.) when appropriate
    - Consider enabling stricter TypeScript compiler options
    - Use type guards to narrow types when necessary