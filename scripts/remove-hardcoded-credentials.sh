#!/bin/bash

# Script to find and remove hardcoded credentials in the codebase
# This addresses the security vulnerability of test credentials in production

echo "🔍 Searching for hardcoded credentials in codebase..."
echo "=================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Common credential patterns
PATTERNS=(
    "admin123"
    "password123"
    "admin:admin"
    "test123"
    "demo123"
    "default.*password"
    "hardcoded.*credential"
    "secret.*key.*="
    "api.*key.*="
)

# Files to exclude from search
EXCLUDE_FILES=(
    "*.log"
    "*.lock"
    "node_modules/*"
    ".git/*"
    "*.md"
    "package*.json"
    "yarn.lock"
)

# Search for credentials
found_issues=0

echo -e "${YELLOW}Searching for hardcoded credentials...${NC}\n"

for pattern in "${PATTERNS[@]}"; do
    echo "Checking pattern: $pattern"
    
    # Create find command with exclusions
    find_cmd="find . -type f -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx'"
    for exclude in "${EXCLUDE_FILES[@]}"; do
        find_cmd="$find_cmd ! -path './$exclude'"
    done
    
    # Search for the pattern
    results=$(eval $find_cmd | xargs grep -l "$pattern" 2>/dev/null || true)
    
    if [ ! -z "$results" ]; then
        echo -e "${RED}❌ Found hardcoded credentials:${NC}"
        echo "$results" | while read -r file; do
            echo "  File: $file"
            grep -n "$pattern" "$file" | head -3
        done
        ((found_issues++))
        echo ""
    fi
done

# Check for console.log with sensitive data
echo "Checking for console.log with sensitive data..."
sensitive_logs=$(eval $find_cmd | xargs grep -l "console\.log.*\(password\|secret\|token\|key\)" 2>/dev/null || true)

if [ ! -z "$sensitive_logs" ]; then
    echo -e "${RED}❌ Found potentially sensitive console.log statements:${NC}"
    echo "$sensitive_logs" | while read -r file; do
        echo "  File: $file"
        grep -n "console\.log.*\(password\|secret\|token\|key\)" "$file" | head -3
    done
    ((found_issues++))
fi

# Check for test endpoints in production code
echo "Checking for test/demo endpoints..."
test_endpoints=$(eval $find_cmd | xargs grep -l "\/api\/test\|\/api\/demo\|\/api\/mock\|fillTestData" 2>/dev/null || true)

if [ ! -z "$test_endpoints" ]; then
    echo -e "${YELLOW}⚠️  Found test/demo endpoints (should be disabled in production):${NC}"
    echo "$test_endpoints" | while read -r file; do
        echo "  File: $file"
    done
    ((found_issues++))
fi

# Summary
echo ""
echo "=================================================="
if [ $found_issues -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded credentials found!${NC}"
    echo "The codebase appears clean of obvious credential issues."
else
    echo -e "${RED}❌ Found $found_issues potential security issues${NC}"
    echo ""
    echo "REMEDIATION STEPS:"
    echo "1. Remove all hardcoded credentials from source code"
    echo "2. Use environment variables for all secrets"
    echo "3. Add sensitive patterns to .gitignore"
    echo "4. Disable test endpoints in production"
    echo "5. Review and clean up console.log statements"
    echo ""
    echo "Example secure credential handling:"
    echo "  const adminPassword = process.env.ADMIN_PASSWORD_HASH;"
    echo "  if (!adminPassword) throw new Error('Admin password not configured');"
fi

exit $found_issues