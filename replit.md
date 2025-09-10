# GameRewards Platform

## Overview

GameRewards is a gaming submission platform that allows users to upload their best gaming moments (screenshots and videos) and earn rewards for approved content. The platform features a modern gaming-inspired UI with dark themes, drawing inspiration from Fortnite and other popular gaming platforms like Discord and Steam. Users can submit content in categories like "gold kills," "victories," and "funny moments," which are then reviewed by administrators who can approve or reject submissions and assign monetary rewards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Comprehensive design system built on Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom dark mode theme inspired by gaming aesthetics
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with file upload support via multer
- **File Storage**: Local disk storage with configurable upload limits (50MB)
- **Session Management**: Express sessions with PostgreSQL session store

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Well-defined tables for users, submissions, and admin actions with proper relationships
- **File Management**: Local file system storage with organized directory structure

### Authentication & Authorization
- **Primary Auth**: Epic Games OAuth integration (configured but not fully implemented)
- **Session-based**: Express sessions with secure cookie handling
- **Role-based Access**: Admin role system with special permissions for content moderation
- **User Management**: Support for both Epic Games accounts and traditional username/email registration

### Key Features
- **Multi-category Submissions**: Support for gold kills, victories, and funny gaming moments
- **File Upload System**: Handles both images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)
- **Admin Dashboard**: Comprehensive moderation interface for reviewing submissions
- **Reward System**: Monetary reward assignment and user balance tracking
- **Telegram Integration**: Optional Telegram username linking for notifications
- **Gaming UI**: Custom dark theme with glassmorphism effects and gaming-inspired color palette

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Drizzle ORM**: Type-safe database operations and schema management

### UI & Design System
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom gaming theme
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix primitives

### File Handling & Storage
- **Multer**: Express middleware for handling multipart/form-data file uploads
- **Local File System**: Direct disk storage for uploaded gaming content

### Development & Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds

### External Services (Planned/Configured)
- **Epic Games OAuth**: Authentication integration for gaming community
- **Telegram Bot API**: Notification system for submission status updates
- **Replit Integration**: Development environment optimization with runtime error handling

### Form & Validation
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **TanStack React Query**: Server state management and caching