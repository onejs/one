# Setup

At the root of this repo install and build:

```sh
yarn
yarn build
```

In this folder set up env:

```sh
cp .env.example .env
```

Start [Docker](https://orbstack.dev).

Then, in separate tabs run:

```
yarn backend
yarn zero
yarn dev
```

# Project Overview

OneChat is a modern, cross-platform chat application built with a robust tech stack and architecture.

## Architecture

### Frontend
- **Entry Points**:
  - `app/_layout.tsx`: Main application layout and initialization
  - `app/index.tsx`: Primary content renderer
  - `app/index.native.tsx`: Native platform specific implementation

### Core Technologies
- **UI Framework**: Tamagui for cross-platform UI components
- **State Management**: 
  - Valtio for reactive state management
  - Zero for real-time data synchronization
- **Build System**: 
  - Vite for web development
  - Expo for mobile platforms
  - Tauri for desktop applications

### Key Components

#### 1. Data Layer
- **Database**: PostgreSQL for persistent storage
- **Real-time Sync**: Zero framework integration
- **Schema**: 
  - Users and Roles
  - Channels and Permissions
  - Messages and Threads
  - Servers and Pins

#### 2. Interface Layer
- **Components**:
  - Chat interface components
  - Server settings management
  - Thread management
  - User interface elements
- **Features**:
  - Real-time messaging
  - Thread-based discussions
  - Server management
  - User permissions
  - File attachments

#### 3. Platform Support
- **Web**: Progressive Web App
- **Desktop**: Tauri-based native application
- **Mobile**: 
  - iOS app via Expo
  - Android app via Expo

### Development Tools
- **DevTools**: Custom development tools for debugging and testing
- **Build Tools**:
  - Docker for development environment
  - Biome for code formatting and linting
  - TypeScript for type safety

### Security
- Authentication system with multiple providers
- Role-based access control
- Secure file handling
- End-to-end encryption (planned)

## Project Structure

```
apps/chat/
├── app/                 # Entry points and routing
├── src/
│   ├── interface/      # UI components and layouts
│   ├── state/          # Application state management
│   ├── zero/           # Real-time sync implementation
│   ├── postgres/       # Database schemas and queries
│   └── dev/           # Development tools
├── src-tauri/          # Desktop app implementation
└── docker-compose.yml  # Development environment
```

## Key Features
- Cross-platform support (Web, Desktop, Mobile)
- Real-time messaging and updates
- Thread-based discussions
- Server and channel management
- Role-based permissions
- File sharing and attachments
- Custom emoji support
- Search functionality
- User presence tracking

## Development Workflow
1. Local development with hot reload
2. Automated testing and linting
3. Cross-platform building and deployment
4. Continuous integration and delivery

For more detailed documentation on specific components or features, please refer to the respective directories.
