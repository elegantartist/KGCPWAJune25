# KGC Application Cleanup Plan - Pre-AWS Migration

## Overview
This document outlines the code cleanup required before AWS deployment to remove redundancy, optimize performance, and ensure clean architecture.

## Immediate Issues Identified

### 1. **Duplicate Emergency Detection Services**
- **Location**: `server/services/emergencyDetectionService.ts` (newly created)
- **Issue**: May duplicate existing emergency functionality
- **Action**: Review existing emergency code and consolidate

### 2. **Redundant Email Services**
- **Files**: 
  - `server/services/emailService.ts` (incomplete integration)
  - `server/services/emailTemplateService.ts` (working templates)
  - Direct SendGrid integration in `server/routes.ts` (working)
- **Action**: Consolidate into single email service, remove unused files

### 3. **Unused Authentication Services**
- **File**: `server/services/authService.ts` (created but not integrated)
- **Issue**: Created custom auth but not connected to existing system
- **Action**: Remove or integrate with existing auth system

### 4. **Database Schema Issues**
- **Issue**: `emergencyAlerts` table added but may conflict with existing tables
- **Action**: Verify schema consistency and remove duplicates

### 5. **Multiple Validation Services**
- **Files**: Multiple validation services created but may duplicate existing functionality
- **Action**: Consolidate validation logic

## Pre-Migration Cleanup Tasks

### Phase 1: Database Cleanup
```bash
# Check for table conflicts
npm run db:push  # Should complete without errors
# Review schema for duplicate tables
# Remove unused tables if any
```

### Phase 2: Service Consolidation
1. **Email Services**: Keep only working SendGrid integration in routes
2. **Emergency Detection**: Ensure single emergency service (currently integrated)
3. **Validation**: Consolidate password and input validation

### Phase 3: Remove Unused Files
**Files to Review for Removal:**
- `server/services/authService.ts` (if not integrated)
- `server/services/emailService.ts` (if direct integration works)
- Any duplicate validation files

### Phase 4: Code Optimization
1. **Remove commented code blocks**
2. **Consolidate similar functions**
3. **Remove unused imports**
4. **Standardize error handling**

## Current Working Features (DO NOT MODIFY)
✅ **Admin Dashboard** - Doctor/patient management  
✅ **Doctor Email Integration** - SendGrid welcome emails  
✅ **Phone Number Validation** - Required for doctors  
✅ **24-Hour Monitoring** - Patient self-score alerts  
✅ **Emergency Detection** - Now integrated in chatbot  
✅ **Chatbot MCP System** - Core functionality  
✅ **Database Storage** - PostgreSQL with Drizzle  

## AWS Migration Readiness Checklist

### Environment Variables for AWS
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `SENDGRID_API_KEY` - Email service
- [ ] `OPENAI_API_KEY` - AI services  
- [ ] `ANTHROPIC_API_KEY` - AI services
- [ ] `SESSION_SECRET` - Security
- [ ] `BASE_URL` - Application URL

### Code Quality
- [ ] Remove all console.log statements for production
- [ ] Implement proper logging service
- [ ] Add comprehensive error boundaries
- [ ] Optimize database queries
- [ ] Add rate limiting for API endpoints

### Security for Production
- [ ] Implement proper CORS policies
- [ ] Add request validation middleware
- [ ] Secure file upload handling
- [ ] Add API rate limiting
- [ ] Implement proper session management

### Performance Optimization
- [ ] Bundle size optimization
- [ ] Database query optimization
- [ ] Add Redis caching for sessions
- [ ] Optimize image handling
- [ ] Add CDN for static assets

## Immediate Next Steps

1. **Test Current Functionality**: Verify all working features remain functional
2. **Remove Unused Code**: Clean up redundant services
3. **Database Migration**: Ensure clean schema for AWS
4. **Environment Setup**: Prepare production environment variables
5. **Performance Testing**: Load test before migration

## File Structure After Cleanup
```
server/
├── services/
│   ├── emergencyDetectionService.ts ✅ (integrated)
│   ├── emailTemplateService.ts ✅ (working)
│   ├── patientAlertService.ts ✅ (24hr monitoring)
│   ├── privacyProtectionAgent.ts ✅ (working)
│   └── [remove unused services]
├── ai/
│   ├── enhancedMCPService2.ts ✅ (core chatbot)
│   └── multiAIEvaluator.ts ✅ (working)
└── routes.ts ✅ (main API, includes email integration)
```

## Success Metrics
- Zero duplicate functionality
- Single source of truth for each feature
- Clean database schema
- Optimized bundle size
- All tests passing
- Production-ready error handling

---
**Priority**: High - Complete before AWS migration
**Timeline**: 1-2 days for cleanup, then migration
**Risk**: Medium - Cleanup may temporarily affect functionality