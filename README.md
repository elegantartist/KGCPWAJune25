# KGC PWA - Enhanced Chatbot

This project is a full-stack web application featuring an AI-powered enhanced chatbot. The repository is structured as a monorepo with a separate client and server.

## Project Structure

The repository is organized into two main directories:

-   `/client`: Contains the React/Vite frontend application.
-   `/server`: Contains the Node.js/TypeScript backend server.

Each directory is a self-contained project with its own `package.json` and dependencies.

## Prerequisites

-   Node.js (v18 or later is recommended)
-   npm (comes with Node.js)

## Installation

1.  **Clone the repository** (if you haven't already).

2.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    ```

3.  **Install client dependencies:**
    ```bash
    cd ../client
    npm install
    ```

## Running the Application

You will need to run the client and server in separate terminal windows.

1.  **Start the backend server:**
    From the `/server` directory:
    ```bash
    npm run dev
    ```

2.  **Start the frontend client:**
    From the `/client` directory:
    ```bash
    npm run dev
    ```

The client application will typically be available at `http://localhost:5173` and the server will be running on a different port (e.g., `http://localhost:8080`).