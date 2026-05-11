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
- [Team Members](#team-members)


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
### ERD Backend
<img width="2386" height="1549" alt="ERD BACKEND" src="https://github.com/user-attachments/assets/aa8d649e-df1a-4b6a-b646-608257750524" />


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
User flow of Pages:
<img width="2500" height="537" alt="ERD_User flow" src="https://github.com/user-attachments/assets/fb2c9814-d3e6-4d3f-b800-cb82d98e6e4e" />


### Accessing the Application

1. **Login**: Use the login page to authenticate with your credentials
<img width="601" height="782" alt="image" src="https://github.com/user-attachments/assets/f349f511-ef7e-4cf2-b47c-4565291e0035" />

2. **Dashboard**: Navigate to the main dashboard after successful login
<img width="2210" height="786" alt="image" src="https://github.com/user-attachments/assets/8bd3a464-10b5-462e-89cc-8a47e5eb6f45" />


3. **Upload Catalog Data**: Use the "Upload Catalog Data" section to process library files
<img width="3720" height="818" alt="image" src="https://github.com/user-attachments/assets/186ebff1-b23a-4330-8187-c021057dd966" />

4. **Change Output Parameters**: Use the "Parameter Settings" section to process library files
<img width="3720" height="1230" alt="image" src="https://github.com/user-attachments/assets/bd772aad-3689-45b8-b9c8-15fb9ef789dd" />

5. **Download and optionally view/edit the results**: Use the "Downloaded Exported Data" to download the file and re-upload it to view and edit
<img width="3720" height="1202" alt="image" src="https://github.com/user-attachments/assets/d572eec1-0bf2-42ac-b5dd-33236ec4da2e" />

6. **Edit and Filter Raw Output Data**: Use the "Parameter Settings" section to edit returned catalog files
<img width="3720" height="1366" alt="image" src="https://github.com/user-attachments/assets/0e065761-8689-41c3-9a2b-c8f63dbee886" />

7. **Account Management**: Manage user accounts through the account management interface
<img width="3720" height="1252" alt="image" src="https://github.com/user-attachments/assets/8083518a-702d-41ec-9f75-19a532ca84a7" />
<img width="3720" height="866" alt="image" src="https://github.com/user-attachments/assets/1c731a90-8aad-4815-a481-dc035bf10899" />
<img width="3720" height="1198" alt="image" src="https://github.com/user-attachments/assets/0e65ddd8-a298-4d78-9a23-9841ea89eff9" />

8. **Create New Accounts Easily**: Use the "Create Account" button on the navigation bar to instantly access an account creation interface
<img width="601" height="40" alt="image" src="https://github.com/user-attachments/assets/255155f8-b9e7-4e9a-b425-cafd884db6d8" />
<img width="601" height="700" alt="image" src="https://github.com/user-attachments/assets/ea4e6392-eb46-405e-9bd6-68b31660cdc8" />



### File Upload Process

1. Select a catalog file exported from Destiny containing, at minimum, ISBNs and pricing data (incomplete or otherwise)
2. Configure processing options (pricing adjustments, rounding preferences)
3. Monitor upload progress with real-time status updates
4. Download processed results when complete
5. (Optional) Reupload Libra file output at anytime to view, filter, and edit the output data.

### Account Management (Limited to Administrator Accounts)

- Create new user accounts
- Manage existing user permissions
- Configure notification settings

## Testing

Libra contains several automated tests that can be run, totalling 230 automated unit tests covering all lambda functions and the react frontend. These tests should be run after every code change, in order to catch regressions before deploying. No AWS credentials or internet connection are required. All AWS calls are mocked.

To run all suites:

(cd lambda/accounts && npm test) && \\

(cd lambda/upload && npm test) && \\

(cd lambda/status && npm test) && \\

(cd frontend && npm test)


 - Verify - Each suite prints a summary table when it finishes. A passing run looks like this:

Tests:		    57 passed, 57 total

Test suites:	1 passed, 1 total


- Note - If a test fails, the output will identify the test name, the expected value, and the actual value received. 
If a update needs to be made a fix to all underlying code issues should be made before deploying. 

- Do not delete or skip failing tests.

## Deployment

**[Deployment guides, infrastructure setup, and environment-specific configurations to be documented]**

## Developer Instructions

**[Comprehensive developer guides, API references, architecture diagrams, and contribution guidelines to be expanded]**

## TimeLine of Key Milestones:

Sprint 1: Setup of the Jira work environment and other tools used for this project.

Sprint 2: Initialization of project files coupled with the implementation Tailwind CSS configuration and the products background screen.

Sprint 3: Implemented the general page layout including text and graphical elements.

Sprint 4: Impelemnted catalog data upload features.

Sprint 5: Implemented login and logout features.

Sprint 6: Implemented Account management features and displays.

Sprint 7: Implemented account creation features and additional account management utitlities.

Sprint 8: Implemented additional catalog data upload features and additional account management/creation features.

Sprint 9: Implemented testing functions for all major processes, additional minor improvements and refinements are also made.

## Team Members

Name:     Harman Bassi

Contact:  HarmanBassi@csus.edu

Name:     Serhii Demchuk

Contact:  sdemchuk@csus.edu

Name:     Nicolas Schallock

Contact:  nicolasschallock@csus.edu

Name:     Aidan Payne

Contact:  adpayne2@csus.edu

Name:     Nicholas Edenfield

Contact:  nicholasedenfield@csus.edu
