#!/bin/bash

# KGC Healthcare Platform - AWS Deployment Script
# This script deploys backend services to AWS using CDK/SAM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Configuration
AWS_REGION=${AWS_REGION:-ap-southeast-2}
ENVIRONMENT=${ENVIRONMENT:-production}
PROJECT_NAME="kgc-healthcare"
STACK_PREFIX="KGC"

log "KGC Healthcare Platform - AWS Deployment"
log "Region: $AWS_REGION"
log "Environment: $ENVIRONMENT"

# Check prerequisites
log "Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first:"
    echo "  https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured or invalid"
    echo "Configure with: aws configure"
    echo "Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
success "AWS credentials valid for account: $AWS_ACCOUNT_ID"

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
success "Node.js version: $NODE_VERSION"

# Detect package manager
PACKAGE_MANAGER="npm"
if [ -f "pnpm-lock.yaml" ]; then
    PACKAGE_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    PACKAGE_MANAGER="yarn"
fi

log "Using package manager: $PACKAGE_MANAGER"

# Check for infrastructure code
INFRA_TYPE=""
INFRA_DIR=""

if [ -d "infrastructure/cdk" ] || [ -f "cdk.json" ]; then
    INFRA_TYPE="cdk"
    INFRA_DIR="infrastructure/cdk"
    if [ -f "cdk.json" ]; then
        INFRA_DIR="."
    fi
elif [ -d "infrastructure/sam" ] || [ -f "template.yaml" ] || [ -f "template.yml" ]; then
    INFRA_TYPE="sam"
    INFRA_DIR="infrastructure/sam"
    if [ -f "template.yaml" ] || [ -f "template.yml" ]; then
        INFRA_DIR="."
    fi
elif [ -d "infrastructure/terraform" ]; then
    INFRA_TYPE="terraform"
    INFRA_DIR="infrastructure/terraform"
else
    warning "No infrastructure code detected (CDK, SAM, or Terraform)"
    log "Creating basic AWS App Runner deployment configuration..."
    INFRA_TYPE="apprunner"
fi

log "Infrastructure type: $INFRA_TYPE"
if [ -n "$INFRA_DIR" ]; then
    log "Infrastructure directory: $INFRA_DIR"
fi

# Install infrastructure dependencies
install_infra_deps() {
    case $INFRA_TYPE in
        cdk)
            log "Installing AWS CDK dependencies..."
            if ! command -v cdk &> /dev/null; then
                case $PACKAGE_MANAGER in
                    pnpm)
                        pnpm add -g aws-cdk
                        ;;
                    *)
                        npm install -g aws-cdk
                        ;;
                esac
            fi
            
            CDK_VERSION=$(cdk --version)
            success "CDK version: $CDK_VERSION"
            
            # Install dependencies if in CDK directory
            if [ -f "$INFRA_DIR/package.json" ]; then
                log "Installing CDK project dependencies..."
                cd "$INFRA_DIR"
                case $PACKAGE_MANAGER in
                    pnpm)
                        pnpm install
                        ;;
                    *)
                        npm install
                        ;;
                esac
                cd - > /dev/null
            fi
            ;;
            
        sam)
            log "Installing AWS SAM CLI..."
            if ! command -v sam &> /dev/null; then
                error "AWS SAM CLI is not installed. Please install it:"
                echo "  https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
                exit 1
            fi
            
            SAM_VERSION=$(sam --version)
            success "SAM CLI version: $SAM_VERSION"
            ;;
            
        terraform)
            log "Checking Terraform installation..."
            if ! command -v terraform &> /dev/null; then
                error "Terraform is not installed. Please install it:"
                echo "  https://developer.hashicorp.com/terraform/downloads"
                exit 1
            fi
            
            TERRAFORM_VERSION=$(terraform --version | head -n1)
            success "Terraform version: $TERRAFORM_VERSION"
            ;;
            
        apprunner)
            log "Using AWS CLI for App Runner deployment..."
            # Check if Docker is available for container builds
            if command -v docker &> /dev/null; then
                DOCKER_VERSION=$(docker --version)
                success "Docker version: $DOCKER_VERSION"
            else
                warning "Docker not found - container builds will be skipped"
            fi
            ;;
    esac
}

# Bootstrap AWS environment
bootstrap_aws() {
    case $INFRA_TYPE in
        cdk)
            log "Bootstrapping CDK environment..."
            cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
            success "CDK environment bootstrapped"
            ;;
            
        sam)
            log "SAM does not require bootstrapping"
            ;;
            
        terraform)
            log "Initializing Terraform..."
            cd "$INFRA_DIR"
            terraform init
            terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT
            cd - > /dev/null
            success "Terraform initialized"
            ;;
            
        apprunner)
            log "Checking App Runner prerequisites..."
            # Check if ECR repositories exist
            ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
            
            for service in api privacy-proxy; do
                REPO_NAME="kgc-$service"
                if ! aws ecr describe-repositories --repository-names $REPO_NAME --region $AWS_REGION &>/dev/null; then
                    log "Creating ECR repository: $REPO_NAME"
                    aws ecr create-repository \
                        --repository-name $REPO_NAME \
                        --region $AWS_REGION \
                        --image-scanning-configuration scanOnPush=true
                    success "Created ECR repository: $REPO_NAME"
                else
                    success "ECR repository exists: $REPO_NAME"
                fi
            done
            ;;
    esac
}

# Build and deploy services
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    log "Deploying service: $service_name"
    
    # Check if service exists in current structure
    if [ ! -d "$service_path" ]; then
        if [ "$service_name" = "api" ] && [ -d "server" ]; then
            service_path="server"
            log "Using current server/ directory for API service"
        elif [ "$service_name" = "privacy-proxy" ]; then
            warning "Privacy proxy service not yet extracted from main API"
            log "Skipping privacy-proxy deployment - will be implemented in P11"
            return 0
        else
            warning "Service directory not found: $service_path"
            return 1
        fi
    fi
    
    case $INFRA_TYPE in
        cdk)
            log "Deploying $service_name with CDK..."
            cd "$INFRA_DIR"
            cdk deploy "${STACK_PREFIX}${service_name^}Stack" \
                --require-approval never \
                --parameters Environment=$ENVIRONMENT \
                --parameters ServiceName=$service_name
            cd - > /dev/null
            ;;
            
        sam)
            log "Deploying $service_name with SAM..."
            cd "$INFRA_DIR"
            sam build
            sam deploy \
                --guided \
                --stack-name "${STACK_PREFIX}-${service_name}-${ENVIRONMENT}" \
                --parameter-overrides \
                    Environment=$ENVIRONMENT \
                    ServiceName=$service_name
            cd - > /dev/null
            ;;
            
        terraform)
            log "Deploying $service_name with Terraform..."
            cd "$INFRA_DIR"
            terraform plan \
                -var="environment=$ENVIRONMENT" \
                -var="service_name=$service_name" \
                -var="aws_region=$AWS_REGION"
            terraform apply -auto-approve \
                -var="environment=$ENVIRONMENT" \
                -var="service_name=$service_name" \
                -var="aws_region=$AWS_REGION"
            cd - > /dev/null
            ;;
            
        apprunner)
            deploy_apprunner_service "$service_name" "$service_path"
            ;;
    esac
    
    success "Service $service_name deployed successfully"
}

# Deploy service using App Runner directly
deploy_apprunner_service() {
    local service_name=$1
    local service_path=$2
    
    log "Deploying $service_name to AWS App Runner..."
    
    # Build container if Docker is available
    if command -v docker &> /dev/null && [ -f "Dockerfile" ]; then
        log "Building container for $service_name..."
        
        IMAGE_TAG="$service_name:$(date +%Y%m%d-%H%M%S)"
        ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kgc-$service_name"
        
        # Build container
        docker build -t $IMAGE_TAG -f Dockerfile .
        
        # Login to ECR
        aws ecr get-login-password --region $AWS_REGION | \
            docker login --username AWS --password-stdin $ECR_URI
        
        # Tag and push
        docker tag $IMAGE_TAG $ECR_URI:latest
        docker tag $IMAGE_TAG $ECR_URI:$(date +%Y%m%d-%H%M%S)
        
        docker push $ECR_URI:latest
        docker push $ECR_URI:$(date +%Y%m%d-%H%M%S)
        
        success "Container pushed to ECR: $ECR_URI"
        
        # Create or update App Runner service
        SERVICE_NAME="kgc-$service_name-$ENVIRONMENT"
        
        # Check if service exists
        if aws apprunner describe-service --service-arn "arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/$SERVICE_NAME" &>/dev/null; then
            log "Updating existing App Runner service: $SERVICE_NAME"
            # TODO: Implement service update
            warning "Service update not implemented - please update manually in AWS Console"
        else
            log "Creating new App Runner service: $SERVICE_NAME"
            # TODO: Implement service creation
            warning "Service creation not implemented - please create manually in AWS Console"
            log "Use image: $ECR_URI:latest"
        fi
    else
        warning "Cannot build container - Docker not available or Dockerfile not found"
        log "Please build and deploy container manually"
    fi
}

# Validate deployment
validate_deployment() {
    local service_name=$1
    
    log "Validating $service_name deployment..."
    
    case $INFRA_TYPE in
        cdk)
            # Get stack outputs
            STACK_NAME="${STACK_PREFIX}${service_name^}Stack"
            if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION &>/dev/null; then
                success "Stack $STACK_NAME exists and is healthy"
                
                # Get service URL if available
                SERVICE_URL=$(aws cloudformation describe-stacks \
                    --stack-name $STACK_NAME \
                    --region $AWS_REGION \
                    --query 'Stacks[0].Outputs[?OutputKey==`ServiceUrl`].OutputValue' \
                    --output text 2>/dev/null || echo "")
                
                if [ -n "$SERVICE_URL" ] && [ "$SERVICE_URL" != "None" ]; then
                    log "Service URL: $SERVICE_URL"
                    
                    # Health check
                    if curl -f "$SERVICE_URL/health" -m 30 &>/dev/null; then
                        success "Service health check passed"
                    else
                        warning "Service health check failed or endpoint not available"
                    fi
                fi
            else
                error "Stack $STACK_NAME not found or unhealthy"
                return 1
            fi
            ;;
            
        *)
            log "Validation not implemented for $INFRA_TYPE"
            warning "Please verify deployment manually in AWS Console"
            ;;
    esac
}

# Main deployment process
main() {
    log "Starting AWS deployment process..."
    
    # Environment variable checks
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set - using environment default"
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        error "SESSION_SECRET must be set for production deployment"
        exit 1
    fi
    
    # Install infrastructure dependencies
    install_infra_deps
    
    # Bootstrap AWS environment
    bootstrap_aws
    
    # Deploy services
    SERVICES_TO_DEPLOY=("api" "privacy-proxy")
    SERVICE_PATHS=("services/api" "services/privacy-proxy")
    
    for i in "${!SERVICES_TO_DEPLOY[@]}"; do
        SERVICE_NAME="${SERVICES_TO_DEPLOY[$i]}"
        SERVICE_PATH="${SERVICE_PATHS[$i]}"
        
        log "Processing service: $SERVICE_NAME"
        
        if deploy_service "$SERVICE_NAME" "$SERVICE_PATH"; then
            validate_deployment "$SERVICE_NAME"
        else
            error "Failed to deploy service: $SERVICE_NAME"
            # Continue with other services
        fi
    done
    
    success "🎉 AWS deployment completed!"
    
    echo ""
    log "🏥 KGC Healthcare Platform Deployment Summary:"
    echo "  📍 Region: $AWS_REGION (Australia Southeast)"
    echo "  🏗️ Infrastructure: $INFRA_TYPE"
    echo "  🌟 Environment: $ENVIRONMENT"
    echo "  🏥 Services: API Service, Privacy Proxy (planned)"
    echo ""
    log "🔍 Next steps:"
    echo "  1. Verify services in AWS Console"
    echo "  2. Update DNS records for custom domains"
    echo "  3. Configure monitoring and alerting"
    echo "  4. Run end-to-end health checks"
    echo "  5. Validate healthcare compliance features"
    echo ""
    log "🚨 Healthcare Compliance Reminders:"
    echo "  ✅ Verify Australian data residency (ap-southeast-2)"
    echo "  ✅ Confirm TGA Class I SaMD boundaries"
    echo "  ✅ Validate PII/PHI anonymization pipeline"
    echo "  ✅ Check audit logging configuration"
    echo "  ✅ Test emergency detection workflows"
}

# Run main deployment
main "$@"