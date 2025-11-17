#!/bin/bash

# Library Catalog Application - Deployment Script
# Using ISBNdb Bulk Data API (100 results per call)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check CDK CLI
    if ! command -v cdk &> /dev/null; then
        log_error "AWS CDK is not installed. Please run: npm install -g aws-cdk"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    log_success "All prerequisites are installed!"
}

# Get ISBNdb API key
get_api_key() {
    log_info "Setting up ISBNdb API configuration..."
    
    echo -e "${YELLOW}ISBNdb Bulk Data API Information:${NC}"
    echo "• Bulk Data tier: 100 results per API call"
    echo "• Rate limit: 1 call per second"
    echo "• Daily limit: 5,000 searches per day"
    echo "• Cost: Check current pricing at https://isbndb.com/pricing"
    echo ""
    echo -e "${BLUE}Get your API key from: https://isbndb.com${NC}"
    echo ""
    
    if [ -z "$ISBNDB_API_KEY" ]; then
        echo -e "${YELLOW}Please enter your ISBNdb API key:${NC}"
        read -s ISBNDB_API_KEY
        echo
    fi
    
    if [ -z "$ISBNDB_API_KEY" ]; then
        log_error "ISBNdb API key is required. Get one from https://isbndb.com"
        exit 1
    fi
    
    log_success "ISBNdb API key provided"
}

# Create directory structure
setup_directories() {
    log_info "Setting up directory structure..."
    
    mkdir -p backend/infrastructure
    mkdir -p backend/lambdas/{process-csv,upload,status}/src
    mkdir -p backend/scripts
    mkdir -p frontend/src
    
    log_success "Directory structure created"
}

# Deploy backend infrastructure
deploy_backend() {
    log_info "Deploying backend infrastructure..."
    
    # Create ISBNdb secret
    log_info "Creating ISBNdb API secret..."
    aws secretsmanager create-secret \
        --name "isbndb-api-key" \
        --description "API key for ISBNdb bulk service" \
        --secret-string "{\"apiKey\":\"$ISBNDB_API_KEY\"}" \
        --region $AWS_REGION || log_warning "Secret may already exist"
    
    # Install infrastructure dependencies
    cd backend/infrastructure
    log_info "Installing CDK dependencies..."
    npm install
    
    # Build Lambda functions
    log_info "Building Lambda functions..."
    cd ../lambdas/process-csv && npm install && npm run build
    cd ../upload && npm install && npm run build  
    cd ../status && npm install && npm run build
    
    # Deploy infrastructure
    cd ../../infrastructure
    log_info "Deploying AWS infrastructure (this may take 5-10 minutes)..."
    
    # Bootstrap CDK if needed
    cdk bootstrap || log_warning "CDK bootstrap may have already been done"
    
    # Deploy stack
    DEPLOY_OUTPUT=$(cdk deploy --require-approval never --outputs-file outputs.json)
    
    if [ $? -eq 0 ]; then
        log_success "Backend infrastructure deployed successfully!"
    else
        log_error "Backend deployment failed. Check the error messages above."
        exit 1
    fi
    
    # Extract API URL from outputs
    if [ -f outputs.json ]; then
        API_URL=$(cat outputs.json | jq -r '.LibraryCatalogStack.ApiUrl // empty')
        AWS_REGION_OUTPUT=$(cat outputs.json | jq -r '.LibraryCatalogStack.AWS_REGION // empty')
        
        if [ -n "$API_URL" ]; then
            log_success "API URL: $API_URL"
        else
            log_warning "Could not extract API URL from outputs"
        fi
    fi
    
    cd ../../..
}

# Setup frontend
setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install
    
    # Create environment file
    log_info "Creating environment configuration..."
    
    if [ -n "$API_URL" ]; then
        cat > .env << EOF
# Library Catalog Frontend Configuration
REACT_APP_API_URL=$API_URL
REACT_APP_AWS_REGION=$AWS_REGION
NODE_ENV=development
EOF
        log_success "Environment file created with API URL: $API_URL"
    else
        log_warning "API URL not available, creating template .env file"
        cp .env.example .env
        log_warning "Please update .env file with your API URL manually"
    fi
    
    cd ..
}

# Test the deployment
test_deployment() {
    log_info "Testing deployment..."
    
    if [ -n "$API_URL" ]; then
        cd backend/scripts
        
        log_info "Running API tests..."
        if ./test-api.sh "$API_URL"; then
            log_success "API tests passed!"
        else
            log_warning "Some API tests failed. Check the output above."
        fi
        
        cd ../..
    else
        log_warning "Skipping API tests - API URL not available"
    fi
}

# Main deployment function
main() {
    echo -e "${GREEN}"
    echo "=================================================="
    echo "   Library Catalog Application Deployment"
    echo "      Using ISBNdb Bulk Data API"
    echo "=================================================="
    echo -e "${NC}"
    
    # Get AWS region
    if [ -z "$AWS_REGION" ]; then
        AWS_REGION=$(aws configure get region)
        if [ -z "$AWS_REGION" ]; then
            AWS_REGION="us-east-1"
            log_warning "No AWS region configured, using default: $AWS_REGION"
        fi
    fi
    
    log_info "Using AWS region: $AWS_REGION"
    
    # Run deployment steps
    check_prerequisites
    get_api_key
    setup_directories
    deploy_backend
    setup_frontend
    test_deployment
    
    echo -e "${GREEN}"
    echo "=================================================="
    echo "            Deployment Complete! 🎉"
    echo "=================================================="
    echo -e "${NC}"
    
    log_success "Backend infrastructure deployed to AWS"
    log_success "Frontend configured and ready for development"
    
    if [ -n "$API_URL" ]; then
        echo -e "${BLUE}API URL:${NC} $API_URL"
    fi
    
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. cd frontend && npm run dev  # Start development server"
    echo "2. Open http://localhost:5173 in your browser"  
    echo "3. Upload a CSV file and test the processing workflow"
    echo ""
    echo -e "${YELLOW}ISBNdb Bulk API Features:${NC}"
    echo "• Processes 100 books per API call (very efficient)"
    echo "• Rate limit: 1 call per second"
    echo "• Daily limit: 5,000 searches (500,000 books per day)"
    echo "• Smart caching reduces repeat API calls"
    echo "• Automatic daily usage tracking"
    echo ""
    echo -e "${YELLOW}Performance Examples:${NC}"
    echo "• 100 books: ~1-2 API calls = 2-3 seconds"
    echo "• 500 books: ~5 API calls = 6-7 seconds"  
    echo "• 1000 books: ~10 API calls = 12-15 seconds"
    echo "• Large files process much faster than individual API calls!"
}

# Handle script arguments
case "$1" in
    "backend-only")
        log_info "Deploying backend only..."
        check_prerequisites
        get_api_key
        deploy_backend
        ;;
    "frontend-only")
        log_info "Setting up frontend only..."
        setup_frontend
        ;;
    "test")
        log_info "Testing deployment..."
        test_deployment
        ;;
    "clean")
        log_info "Cleaning up deployment..."
        cd backend/infrastructure
        cdk destroy
        aws secretsmanager delete-secret --secret-id isbndb-api-key --force-delete-without-recovery
        log_success "Cleanup complete"
        ;;
    *)
        main
        ;;
esac
