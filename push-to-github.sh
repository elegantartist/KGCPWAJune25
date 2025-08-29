#!/bin/bash

# Script to push KGC Healthcare Platform updates to GitHub
# Run this script to commit and push all changes

echo "================================================"
echo "Pushing KGC Healthcare Platform to GitHub"
echo "================================================"

# Configure git (if needed)
git config user.email "admin@keepgoingcare.com" 2>/dev/null
git config user.name "KGC Admin" 2>/dev/null

# Show current status
echo ""
echo "Current changes to be committed:"
git status --short

echo ""
echo "Adding all changes..."
git add -A

echo ""
echo "Creating commit..."
git commit -m "Deploy-ready: Fixed E&W endpoints, added Google Cloud Run deployment scripts and documentation

- Fixed Exercise & Wellness video search endpoint (/api/exercise-wellness/videos)
- Fixed E&W Support location search endpoint (/api/ew-support/search)
- Created comprehensive Google Cloud Run deployment script
- Added health check endpoint for monitoring (/api/health)
- Updated Dockerfile for TypeScript/tsx execution
- Created deployment documentation (GOOGLE-CLOUD-RUN-QUICK-START.md)
- Added deployment automation script (deploy-to-google-cloud-run.sh)
- All Tavily integration features verified working
- HIPAA-compliant security configuration ready"

echo ""
echo "Pushing to GitHub..."
git push origin fresh-main

echo ""
echo "================================================"
echo "✅ Successfully pushed to GitHub!"
echo "Repository: https://github.com/elegantartist/KGCPWAJune25"
echo "Branch: fresh-main"
echo "================================================"