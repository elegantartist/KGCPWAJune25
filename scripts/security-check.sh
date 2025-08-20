#!/bin/bash

# KGC Security Check Script
# Comprehensive security validation for the KGC healthcare application

set -e

echo "🔐 KGC Application Security Check"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
WARNINGS=0
FAILED=0

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

# Check 1: Environment Variables
echo "1. Environment Configuration"
echo "----------------------------"

required_vars=("SESSION_SECRET" "DATABASE_URL" "OPENAI_API_KEY" "TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN" "TWILIO_PHONE_NUMBER")

for var in "${required_vars[@]}"; do
    if [[ -n "${!var}" ]]; then
        check_pass "$var is configured"
    else
        check_fail "$var is missing"
    fi
done

# Check SESSION_SECRET strength
if [[ -n "$SESSION_SECRET" ]]; then
    if [[ ${#SESSION_SECRET} -ge 32 ]]; then
        check_pass "SESSION_SECRET has adequate length (${#SESSION_SECRET} chars)"
    else
        check_fail "SESSION_SECRET is too short (${#SESSION_SECRET} chars, need 32+)"
    fi
else
    check_fail "SESSION_SECRET not found"
fi

echo ""

# Check 2: File Permissions
echo "2. File Security"
echo "----------------"

if [[ -f ".env" ]]; then
    perm=$(stat -c "%a" .env 2>/dev/null || stat -f "%Lp" .env 2>/dev/null)
    if [[ "$perm" == "600" || "$perm" == "400" ]]; then
        check_pass ".env file has secure permissions ($perm)"
    else
        check_warn ".env file permissions should be 600 (current: $perm)"
    fi
else
    check_warn ".env file not found (using system environment variables)"
fi

# Check .gitignore
if [[ -f ".gitignore" ]] && grep -q ".env" .gitignore; then
    check_pass ".env is properly excluded from version control"
else
    check_fail ".env not in .gitignore - CRITICAL SECURITY ISSUE"
fi

echo ""

# Check 3: Dependencies Security
echo "3. Dependencies"
echo "---------------"

if command -v npm &> /dev/null; then
    if npm list express-rate-limit &> /dev/null; then
        check_pass "Rate limiting middleware installed"
    else
        check_fail "Rate limiting middleware missing"
    fi
    
    if npm list bcrypt &> /dev/null; then
        check_pass "Password hashing library installed"
    else
        check_fail "Password hashing library missing"
    fi
    
    if npm list cors &> /dev/null; then
        check_pass "CORS middleware installed"
    else
        check_fail "CORS middleware missing"
    fi
else
    check_warn "npm not found - cannot verify dependencies"
fi

echo ""

# Check 4: Network Security
echo "4. Network Configuration"
echo "------------------------"

# Check if running on secure port in production
if [[ "$NODE_ENV" == "production" ]]; then
    if [[ -n "$FORCE_HTTPS" ]]; then
        check_pass "HTTPS enforcement configured"
    else
        check_fail "HTTPS enforcement not configured for production"
    fi
    
    if [[ -n "$ALLOWED_ORIGINS" ]]; then
        check_pass "CORS origins restricted for production"
    else
        check_fail "CORS origins not configured for production"
    fi
else
    check_warn "Running in development mode"
fi

echo ""

# Check 5: Code Security Scan
echo "5. Code Security"
echo "----------------"

# Search for potential security issues in code
security_issues=0

if grep -r "admin123\|password123\|default.*secret" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null; then
    check_fail "Hardcoded credentials found in code"
    ((security_issues++))
fi

if grep -r "console.log.*password\|console.log.*secret\|console.log.*token" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null; then
    check_warn "Potential credential logging found"
    ((security_issues++))
fi

if [[ $security_issues -eq 0 ]]; then
    check_pass "No obvious security issues in code"
fi

echo ""

# Check 6: Database Security
echo "6. Database Configuration"
echo "-------------------------"

if [[ -n "$DATABASE_URL" ]]; then
    if [[ "$DATABASE_URL" =~ ssl=true|sslmode=require ]]; then
        check_pass "Database SSL configuration detected"
    else
        check_warn "Database SSL not explicitly configured"
    fi
    
    if [[ "$DATABASE_URL" =~ ^postgresql:// ]]; then
        check_pass "Valid PostgreSQL connection string"
    else
        check_fail "Invalid database connection string format"
    fi
else
    check_fail "DATABASE_URL not configured"
fi

echo ""

# Final Report
echo "================================"
echo "SECURITY CHECK SUMMARY"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo -e "${RED}🚨 CRITICAL SECURITY ISSUES FOUND!${NC}"
    echo "The application should NOT be deployed until these are resolved."
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  Security warnings detected.${NC}"
    echo "Review and address warnings before production deployment."
    exit 2
else
    echo ""
    echo -e "${GREEN}🛡️  Security check PASSED!${NC}"
    echo "The application meets basic security requirements."
    echo ""
    echo "Recommended next steps:"
    echo "- Set up SSL/TLS certificates"
    echo "- Configure production monitoring"
    echo "- Run penetration testing"
    echo "- Set up automated security scanning"
    exit 0
fi