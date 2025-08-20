#!/bin/bash
# Keep Going Care AWS Deployment Helper Script

# Function to show usage
show_usage() {
  echo "Keep Going Care AWS Deployment Helper"
  echo ""
  echo "Usage: ./deploy-aws.sh [option]"
  echo ""
  echo "Options:"
  echo "  --aws       Create a build for AWS deployment"
  echo "  --local     Create a build for local execution"
  echo "  --package   Create a packaged zip file for AWS deployment"
  echo "  --help      Show this help message"
  echo ""
}

# Check if there are any arguments
if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

# Process arguments
case "$1" in
  --aws)
    echo "Creating AWS deployment build..."
    node scripts/deploy-aws.js --env=production
    ;;
  --local)
    echo "Creating local execution build..."
    node scripts/deploy-aws.js --env=local
    ;;
  --package)
    echo "Creating packaged AWS deployment build..."
    node scripts/deploy-aws.js --env=production --zip
    ;;
  --help)
    show_usage
    ;;
  *)
    echo "Invalid option: $1"
    show_usage
    exit 1
    ;;
esac

exit 0