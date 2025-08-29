#!/bin/bash

# ================================================
# KGC Healthcare Platform - Google Cloud Run Deployment Script
# ================================================
# HIPAA-compliant deployment with TGA Class I SaMD compliance
# ================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="kgc-healthcare"
IMAGE_NAME="kgc-healthcare"
SERVICE_ACCOUNT_NAME="kgc-healthcare-runner"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists gcloud; then
        print_error "Google Cloud SDK (gcloud) is not installed."
        echo "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "Docker is not installed."
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if logged in to gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not logged in to Google Cloud."
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Set up project
setup_project() {
    if [ -z "$PROJECT_ID" ]; then
        print_status "Please enter your Google Cloud Project ID:"
        read -r PROJECT_ID
    fi
    
    print_status "Setting up project: $PROJECT_ID"
    gcloud config set project "$PROJECT_ID"
    
    # Enable required APIs
    print_status "Enabling required Google Cloud APIs..."
    gcloud services enable run.googleapis.com \
        cloudbuild.googleapis.com \
        containerregistry.googleapis.com \
        secretmanager.googleapis.com \
        cloudkms.googleapis.com \
        logging.googleapis.com \
        monitoring.googleapis.com \
        --quiet
    
    print_success "Project setup complete"
}

# Create service account
create_service_account() {
    print_status "Creating service account for Cloud Run..."
    
    # Check if service account exists
    if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
        print_warning "Service account already exists, skipping creation"
    else
        gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
            --display-name="KGC Healthcare Cloud Run Service Account" \
            --quiet
        
        # Grant necessary permissions
        print_status "Granting IAM permissions..."
        for role in \
            "roles/secretmanager.secretAccessor" \
            "roles/cloudsql.client" \
            "roles/logging.logWriter" \
            "roles/monitoring.metricWriter"
        do
            gcloud projects add-iam-policy-binding "$PROJECT_ID" \
                --member="serviceAccount:${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
                --role="$role" \
                --quiet
        done
        
        print_success "Service account created and configured"
    fi
}

# Create secrets
create_secrets() {
    print_status "Setting up Google Secret Manager secrets..."
    
    # Function to create or update a secret
    create_or_update_secret() {
        local secret_name=$1
        local secret_value=$2
        local description=$3
        
        if gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
            print_warning "Secret '$secret_name' already exists. Update it? (y/N)"
            read -r update_secret
            if [[ "$update_secret" =~ ^[Yy]$ ]]; then
                echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
                print_success "Updated secret: $secret_name"
            fi
        else
            echo -n "$secret_value" | gcloud secrets create "$secret_name" \
                --data-file=- \
                --replication-policy="automatic" \
                --labels="app=kgc-healthcare,environment=production"
            print_success "Created secret: $secret_name"
        fi
    }
    
    print_status "Please provide the following values for secrets:"
    
    # Database URL
    echo -e "\n${YELLOW}Database URL${NC} (PostgreSQL connection string):"
    read -r -s DATABASE_URL
    create_or_update_secret "database-url" "$DATABASE_URL" "PostgreSQL database connection string"
    
    # OpenAI API Key
    echo -e "\n${YELLOW}OpenAI API Key${NC}:"
    read -r -s OPENAI_API_KEY
    create_or_update_secret "openai-api-key" "$OPENAI_API_KEY" "OpenAI API key for GPT-4"
    
    # Anthropic API Key
    echo -e "\n${YELLOW}Anthropic API Key${NC}:"
    read -r -s ANTHROPIC_API_KEY
    create_or_update_secret "anthropic-api-key" "$ANTHROPIC_API_KEY" "Anthropic API key for Claude"
    
    # Twilio credentials
    echo -e "\n${YELLOW}Twilio Account SID${NC}:"
    read -r -s TWILIO_ACCOUNT_SID
    create_or_update_secret "twilio-account-sid" "$TWILIO_ACCOUNT_SID" "Twilio Account SID"
    
    echo -e "\n${YELLOW}Twilio Auth Token${NC}:"
    read -r -s TWILIO_AUTH_TOKEN
    create_or_update_secret "twilio-auth-token" "$TWILIO_AUTH_TOKEN" "Twilio Auth Token"
    
    echo -e "\n${YELLOW}Twilio Phone Number${NC} (format: +1234567890):"
    read -r TWILIO_PHONE_NUMBER
    create_or_update_secret "twilio-phone-number" "$TWILIO_PHONE_NUMBER" "Twilio Phone Number"
    
    # SendGrid API Key
    echo -e "\n${YELLOW}SendGrid API Key${NC}:"
    read -r -s SENDGRID_API_KEY
    create_or_update_secret "sendgrid-api-key" "$SENDGRID_API_KEY" "SendGrid API key for email"
    
    # Tavily API Key (optional)
    echo -e "\n${YELLOW}Tavily API Key${NC} (optional, press Enter to skip):"
    read -r -s TAVILY_API_KEY
    if [ -n "$TAVILY_API_KEY" ]; then
        create_or_update_secret "tavily-api-key" "$TAVILY_API_KEY" "Tavily API key for search"
    fi
    
    # Session secret (generate if not provided)
    echo -e "\n${YELLOW}Session Secret${NC} (32+ chars, press Enter to auto-generate):"
    read -r -s SESSION_SECRET
    if [ -z "$SESSION_SECRET" ]; then
        SESSION_SECRET=$(openssl rand -hex 32)
        print_status "Generated random session secret"
    fi
    create_or_update_secret "session-secret" "$SESSION_SECRET" "Express session secret"
    
    # Admin password
    echo -e "\n${YELLOW}Admin Password${NC} (for admin@keepgoingcare.com):"
    read -r -s ADMIN_PASSWORD
    # Hash the password using Node.js bcrypt
    ADMIN_PASSWORD_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASSWORD', 12))")
    create_or_update_secret "admin-password-hash" "$ADMIN_PASSWORD_HASH" "Hashed admin password"
    
    print_success "All secrets configured"
}

# Build and push Docker image
build_and_push_image() {
    print_status "Building Docker image..."
    
    # Configure Docker for Google Container Registry
    gcloud auth configure-docker --quiet
    
    # Build the image
    docker build -t "gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest" .
    
    print_status "Pushing image to Google Container Registry..."
    docker push "gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest"
    
    print_success "Docker image built and pushed successfully"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
    print_status "Deploying to Google Cloud Run..."
    
    # Get the service URL if it exists
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --format="value(status.url)" 2>/dev/null || echo "")
    
    # Deploy the service
    gcloud run deploy "$SERVICE_NAME" \
        --image="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest" \
        --region="$REGION" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=2Gi \
        --cpu=2 \
        --max-instances=100 \
        --min-instances=1 \
        --timeout=300s \
        --concurrency=80 \
        --port=8080 \
        --execution-environment=gen2 \
        --service-account="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --set-env-vars="NODE_ENV=production,PORT=8080" \
        --set-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,TWILIO_ACCOUNT_SID=twilio-account-sid:latest,TWILIO_AUTH_TOKEN=twilio-auth-token:latest,TWILIO_PHONE_NUMBER=twilio-phone-number:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,SESSION_SECRET=session-secret:latest,ADMIN_PASSWORD_HASH=admin-password-hash:latest" \
        --quiet
    
    # Get the deployed service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --format="value(status.url)")
    
    print_success "Deployment complete!"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ KGC Healthcare Platform Deployed Successfully!${NC}"
    echo "=========================================="
    echo -e "Service URL: ${BLUE}${SERVICE_URL}${NC}"
    echo -e "Region: ${REGION}"
    echo -e "Project: ${PROJECT_ID}"
    echo ""
    echo "Next steps:"
    echo "1. Update CORS settings with your domain"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up monitoring alerts"
    echo "4. Test all healthcare features"
    echo ""
    echo "Admin login:"
    echo "  Email: admin@keepgoingcare.com"
    echo "  Password: [the password you provided]"
    echo "=========================================="
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "KGC Healthcare Platform - Google Cloud Run Deployment"
    echo "HIPAA-Compliant Healthcare Application"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    setup_project
    create_service_account
    
    print_warning "Do you want to configure secrets now? (y/N)"
    read -r configure_secrets
    if [[ "$configure_secrets" =~ ^[Yy]$ ]]; then
        create_secrets
    else
        print_warning "Skipping secret configuration. You'll need to set them manually before the app will work."
    fi
    
    build_and_push_image
    deploy_to_cloud_run
}

# Run the main function
main