# Libra

[![Build Status](https://img.shields.io/badge/build-In_Progress-yellow.svg)](https://github.com/sergedemchuk/libra/actions)
[![Version](https://img.shields.io/badge/version-0.0.3-orange.svg)](https://github.com/sergedemchuk/libra/releases)

<img width="913" height="324" alt="image" src="https://github.com/user-attachments/assets/32332608-623f-4617-a830-c7316e5bddb4" />

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
<img width="681" height="782" alt="image" src="https://github.com/user-attachments/assets/c2ddcb0f-a8ca-4cfe-bd21-5dec5a91b74b" />

2. **Dashboard**: Navigate to the main dashboard after successful login
<img width="2210" height="744" alt="image" src="https://github.com/user-attachments/assets/50ed2384-5e15-4a85-8e89-e444f728e130" />

3. **Upload Catalog Data**: Use the "Upload Catalog Data" section to process library files
<img width="1908" height="880" alt="image" src="https://github.com/user-attachments/assets/c41752ac-87e7-495f-99c1-d2fecdff7fef" />

4. **Account Management**: Manage user accounts through the account management interface
<img width="1908" height="701" alt="image" src="https://github.com/user-attachments/assets/f2e7647a-ae12-437e-a174-c116d8209a5c" />

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

## TimeLine of Key Milestones:

### Completed

Sprint 1: Setup of the Jira work environment and other tools used for this project

Sprint 2: Initialization of project files coupled with the implementation Tailwind CSS configuration and the products background screen

Sprint 3: Implemented the general page layout including text and graphical elements

Sprint 4: Implemented some AWS functionality as well as additional graphical elements as well as some button implementation.

### To-Do

Sprint 5: Implementation of key login screen functions

Sprint 6: Implementation of Account Management user features and tools

Sprint 7: Implementation of Account Management core functionality, enabling the creation, alteration and deletion.

Sprint 8: Implementation of the catalog Data Pages' menu functionality and features

