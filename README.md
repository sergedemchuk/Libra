# Libra

[![Build Status](https://img.shields.io/badge/build-In_Progress-yellow.svg)](https://github.com/sergedemchuk/libra/actions)
[![Version](https://img.shields.io/badge/version-0.0.3-orange.svg)](https://github.com/sergedemchuk/libra/releases)

> A modern library management tool for updating book catalog data with accurate pricing info for Destiny library systems

## Table of Contents

- [Synopsis](#synopsis)
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Developer Instructions](#developer-instructions)


## Synopsis

**Libra** is a specialized library management application designed to streamline the processing of book catalog data from Destiny library management systems. Built with modern React and TypeScript, it provides librarians and library administrators with an intuitive interface for uploading, processing, and updating library catalog per item pricing information.

The application features secure user authentication, file upload capabilities for complete catalog data processing, and comprehensive account management tools. Designed with accessibility and user experience in mind, Libra transforms tedious cost lookups tasks into simple file upload workflows.

### Key Highlights
- **Specialized Focus**: Purpose-built for library catalog data processing
- **Modern Interface**: Clean, professional design using Radix UI components
- **Secure Access**: Role-based authentication and account management
- **File Processing**: Advanced catalog data upload and processing capabilities
- **Responsive Design**: Optimized for desktop and mobile devices

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: React Hooks
- **Build Tool**: Vite 6.3.5
- **Icons**: Lucide React
- **Forms**: React Hook Form

- **Backend**: AWS Suite
- **Networking**: Route 53 DNS, CloudFront CDN
- **Storage**: S3 Buckets, DynamoDB 
- **Processing**: Lambda


## Features

**Authentication & Security**
- Secure user login and session management
- Account creation and user management
- Role-based access control

**Catalog Data Management**
- Upload and process library catalog files from Destiny systems
- Progress tracking for file processing operations
- Estimated processing time calculations
- Error handling and validation

**User Interface**
- Responsive design for all device sizes
- Professional dashboard with navigation
- Dark/light theme support via next-themes

**Administrative Tools**
- User account management interface
- File upload progress monitoring
- System configuration options

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Modern web browser

```bash
# Clone the repository
git clone https://github.com/sergedemchuk/libra.git

# Navigate to project directory
cd libra

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.(Default Value)


## Usage

### Accessing the Application

1. **Login**: Use the login page to authenticate with your credentials
2. **Dashboard**: Navigate to the main dashboard after successful login
3. **Upload Catalog Data**: Use the "Upload Catalog Data" section to process library files
4. **Account Management**: Manage user accounts through the account management interface

### File Upload Process

1. Select a catalog file from your Destiny library system
2. Configure processing options (pricing adjustments, rounding preferences)
3. Monitor upload progress with real-time status updates
4. Download processed results when complete

### Account Management

- Create new user accounts
- Manage existing user permissions
- Configure system settings

## Testing

**[Testing documentation and setup instructions to be added]**

## Deployment

**[Deployment guides, infrastructure setup, and environment-specific configurations to be documented]**

## Developer Instructions

**[Comprehensive developer guides, API references, architecture diagrams, and contribution guidelines to be expanded]**

