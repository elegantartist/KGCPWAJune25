#!/bin/bash

# KGC Healthcare Platform - GitHub Push Script
# This script handles git configuration, commits, and pushes to GitHub

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

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    error "Not in a git repository. Please initialize git first:"
    echo "  git init"
    echo "  git remote add origin <your-repo-url>"
    exit 1
fi

log "KGC Healthcare Platform - GitHub Push Process"

# Check git status
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log "Changes detected in working directory"
else
    log "No changes detected in working directory"
    read -p "Do you want to continue anyway? (y/N): " force_push
    if [[ ! $force_push =~ ^[Yy]$ ]]; then
        log "Exiting without pushing"
        exit 0
    fi
fi

# Check and configure git user info
log "Checking git configuration..."

GIT_USER_NAME=$(git config user.name 2>/dev/null || echo "")
GIT_USER_EMAIL=$(git config user.email 2>/dev/null || echo "")

if [ -z "$GIT_USER_NAME" ]; then
    echo ""
    warning "Git user.name is not configured"
    read -p "Enter your full name: " USER_NAME
    git config user.name "$USER_NAME"
    success "Set git user.name to: $USER_NAME"
fi

if [ -z "$GIT_USER_EMAIL" ]; then
    echo ""
    warning "Git user.email is not configured"
    read -p "Enter your email address: " USER_EMAIL
    git config user.email "$USER_EMAIL"
    success "Set git user.email to: $USER_EMAIL"
fi

success "Git user configuration complete"
echo "  Name: $(git config user.name)"
echo "  Email: $(git config user.email)"

# Get list of remotes
REMOTES=$(git remote 2>/dev/null || echo "")

if [ -z "$REMOTES" ]; then
    error "No git remotes configured. Please add a remote:"
    echo "  git remote add origin https://github.com/yourusername/kgc-healthcare.git"
    exit 1
fi

# Prompt for remote selection
echo ""
log "Available git remotes:"
git remote -v
echo ""

if [ $(echo "$REMOTES" | wc -w) -gt 1 ]; then
    read -p "Enter remote name (default: origin): " SELECTED_REMOTE
    SELECTED_REMOTE=${SELECTED_REMOTE:-origin}
else
    SELECTED_REMOTE="origin"
fi

# Verify remote exists
if ! git remote | grep -q "^$SELECTED_REMOTE$"; then
    error "Remote '$SELECTED_REMOTE' does not exist"
    exit 1
fi

success "Using remote: $SELECTED_REMOTE"

# Get remote URL for confirmation
REMOTE_URL=$(git remote get-url $SELECTED_REMOTE)
log "Remote URL: $REMOTE_URL"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$CURRENT_BRANCH" ]; then
    error "Unable to determine current branch"
    exit 1
fi

log "Current branch: $CURRENT_BRANCH"

# Show git status
log "Current repository status:"
git status --short

# Stage changes
echo ""
read -p "Stage all changes for commit? (Y/n): " stage_all
if [[ ! $stage_all =~ ^[Nn]$ ]]; then
    git add .
    success "Staged all changes"
else
    warning "No changes staged. You may need to run 'git add' manually"
fi

# Show staged changes
if git diff --cached --quiet; then
    warning "No staged changes to commit"
    read -p "Continue anyway? (y/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        log "Exiting without committing"
        exit 0
    fi
else
    log "Staged changes:"
    git diff --cached --stat
fi

# Get commit message
echo ""
echo "💡 Commit message suggestions for KGC Healthcare:"
echo "  feat: Add patient dashboard UI components"
echo "  fix: Resolve authentication session timeout issue"
echo "  docs: Update API documentation for care plan directives"
echo "  refactor: Extract privacy protection service"
echo "  test: Add unit tests for health score validation"
echo "  chore: Update dependencies and security patches"
echo ""

read -p "Enter commit message: " COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
    error "Commit message cannot be empty"
    exit 1
fi

# Add healthcare-specific commit metadata
COMMIT_METADATA=""

# Check for healthcare-related changes
if git diff --cached --name-only | grep -E "(health|patient|doctor|care|compliance)" >/dev/null; then
    COMMIT_METADATA+="\n\nHealthcare changes detected"
fi

# Check for security-related changes
if git diff --cached --name-only | grep -E "(auth|security|privacy|encrypt)" >/dev/null; then
    COMMIT_METADATA+="\n⚠️ Security-related changes - ensure compliance review"
fi

# Check for API changes
if git diff --cached --name-only | grep -E "(api|routes|endpoints)" >/dev/null; then
    COMMIT_METADATA+="\n📡 API changes - update documentation if needed"
fi

# Commit changes
log "Creating commit..."
if [ -n "$COMMIT_METADATA" ]; then
    git commit -m "$COMMIT_MESSAGE$COMMIT_METADATA"
else
    git commit -m "$COMMIT_MESSAGE"
fi

success "Commit created successfully"

# Show commit details
COMMIT_HASH=$(git rev-parse HEAD)
log "Commit hash: $COMMIT_HASH"
log "Commit details:"
git log -1 --oneline

# Pre-push checks
log "Running pre-push checks..."

# Check for sensitive data
SENSITIVE_PATTERNS=(
    "password.*="
    "secret.*="
    "key.*="
    "token.*="
    "api_key"
    "database.*url"
    "openai"
    "anthropic"
    "twilio"
    "sendgrid"
)

SENSITIVE_FOUND=false
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git diff --cached | grep -i "$pattern" >/dev/null; then
        warning "Potentially sensitive data found matching pattern: $pattern"
        SENSITIVE_FOUND=true
    fi
done

if $SENSITIVE_FOUND; then
    echo ""
    warning "⚠️  SECURITY WARNING: Potentially sensitive data detected in commit"
    echo "Please review the changes and ensure no secrets are being committed."
    echo ""
    read -p "Continue with push? (y/N): " continue_push
    if [[ ! $continue_push =~ ^[Yy]$ ]]; then
        error "Push cancelled for security reasons"
        echo "Consider using git reset HEAD~1 to undo the commit if needed"
        exit 1
    fi
fi

# Push to remote
echo ""
log "Pushing to $SELECTED_REMOTE/$CURRENT_BRANCH..."

# Check if remote branch exists
if git ls-remote --exit-code --heads $SELECTED_REMOTE $CURRENT_BRANCH >/dev/null 2>&1; then
    # Remote branch exists, do a normal push
    git push $SELECTED_REMOTE $CURRENT_BRANCH
else
    # Remote branch doesn't exist, set upstream
    warning "Remote branch '$CURRENT_BRANCH' doesn't exist, creating it..."
    git push --set-upstream $SELECTED_REMOTE $CURRENT_BRANCH
fi

success "Successfully pushed to $SELECTED_REMOTE/$CURRENT_BRANCH"

# Post-push information
echo ""
success "🎉 GitHub push completed!"
echo ""
log "Next steps:"

# Check if main/master branch
if [[ $CURRENT_BRANCH == "main" || $CURRENT_BRANCH == "master" ]]; then
    echo "  📋 Production deployment will trigger automatically via GitHub Actions"
    echo "  🔍 Monitor deployment status in GitHub Actions tab"
    echo "  🏥 Verify healthcare features in production environment"
else
    echo "  🔀 Create pull request to merge into main branch"
    echo "  📝 Ensure PR includes healthcare compliance checklist"
    echo "  👥 Request code review from team members"
fi

echo "  📊 View commit on GitHub: $REMOTE_URL/commit/$COMMIT_HASH"

# Check for CI/CD files
if [ -f ".github/workflows/ci.yml" ]; then
    log "GitHub Actions CI will run automatically"
    echo "  📈 Check CI status: $REMOTE_URL/actions"
fi

if [ -f ".github/workflows/deploy_vercel.yml" ]; then
    log "Vercel deployment will trigger for this push"
fi

if [ -f ".github/workflows/deploy_aws.yml" ] && [[ $CURRENT_BRANCH == "main" ]]; then
    log "AWS deployment will trigger for main branch push"
fi

# Healthcare-specific reminders
echo ""
log "🏥 Healthcare Platform Reminders:"
echo "  ✅ Ensure patient data privacy compliance"
echo "  ✅ Verify TGA Class I SaMD boundaries maintained"
echo "  ✅ Check Australian data residency requirements"
echo "  ✅ Monitor for emergency detection keywords"
echo "  ✅ Validate AI response appropriateness"

log "Push process completed successfully!"