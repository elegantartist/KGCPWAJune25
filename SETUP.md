# Setup Instructions

## Prerequisites

- Node.js
- npm

## Client

1. Navigate to the `client` directory.
2. Run `npm install` to install the dependencies.
3. Run `npm run dev` to start the development server.

## Server

1. Navigate to the `server` directory.
2. Run `npm install` to install the dependencies.
3. Run `npm run dev` to start the development server.

## Known Issues

- The `npm install` command times out in both the `client` and `server` directories. This is a known issue and is being investigated.

## Troubleshooting

### Timeout Issues

If you are experiencing timeout issues when running `npm install`, `npm run dev`, or `npm run build`, it is likely due to a large number of TypeScript errors in the codebase. These errors can cause the build process to hang and eventually time out. To resolve this issue, you will need to fix the TypeScript errors before running the application.
