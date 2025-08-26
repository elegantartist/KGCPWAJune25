SIZE: 18932 bytes

# Knowledge Card 05: Privacy and Australian Compliance

## Australian Privacy Principles (APPs) Compliance

### APP 1: Open and Transparent Management of Personal Information
```yaml
Compliance Requirements:
  - Clear privacy policy publicly available
  - Privacy contact details provided  
  - Regular privacy training for staff
  - Privacy impact assessments conducted

KGC Implementation:
  - Privacy policy accessible at /privacy
  - Privacy officer: privacy@keepgoingcare.com
  - Annual privacy training mandatory
  - PIA completed for all major features
  - User consent obtained before data collection
```

### APP 2: Anonymity and Pseudonymity
```typescript
// Anonymization implementation
interface AnonymizationConfig {
  piiFields: string[];        // Fields requiring anonymization
  retentionPeriod: number;   // Days before anonymization
  anonymizationLevel: 'partial' | 'full';
}

const ANONYMIZATION_RULES = {
  aiInteractions: {
    piiFields: ['userMessage', 'aiResponse'],
    retentionPeriod: 90,       // 90 days before anonymizing
    anonymizationLevel: 'full',
    preservedFields: ['messageType', 'timestamp', 'emergencyDetected']
  },
  
  auditLogs: {
    piiFields: ['ipAddress', 'userAgent'],
    retentionPeriod: 365,      // 1 year before anonymizing
    anonymizationLevel: 'partial',
    preservedFields: ['action', 'resource', 'timestamp', 'complianceType']
  },
  
  userProfiles: {
    deletionGracePeriod: 30,   // 30 days grace period
    anonymizationAfterDeletion: true,
    preserveAggregateData: true // For population health insights
  }
};

// Privacy protection agent
class PrivacyProtectionAgent {
  async anonymizeData(
    data: any, 
    config: AnonymizationConfig
  ): Promise<AnonymizedData> {
    return {
      originalData: data,
      anonymizedData: this.applyAnonymization(data, config),
      anonymizationDate: new Date(),
      retentionCompliant: true
    };
  }
}
```

### APP 3: Collection of Solicited Personal Information
```typescript
// Data collection consent framework
interface DataCollectionConsent {
  purpose: DataCollectionPurpose;
  lawfulBasis: 'consent' | 'legitimate_interest' | 'vital_interest';
  dataTypes: string[];
  retentionPeriod: string;
  consentObtained: boolean;
  consentDate?: Date;
  withdrawalMechanism: string;
}

enum DataCollectionPurpose {
  HEALTH_MONITORING = 'health_monitoring',
  AI_GUIDANCE = 'ai_guidance', 
  CARE_COORDINATION = 'care_coordination',
  EMERGENCY_DETECTION = 'emergency_detection',
  SYSTEM_IMPROVEMENT = 'system_improvement',
  COMPLIANCE_AUDIT = 'compliance_audit'
}

const COLLECTION_PURPOSES = {
  [DataCollectionPurpose.HEALTH_MONITORING]: {
    description: "Track daily health scores and progress",
    dataTypes: ['health_scores', 'progress_notes'],
    lawfulBasis: 'consent',
    retentionPeriod: '7_years'
  },
  
  [DataCollectionPurpose.AI_GUIDANCE]: {
    description: "Provide personalized AI health guidance",
    dataTypes: ['chat_messages', 'health_context'],
    lawfulBasis: 'consent',
    retentionPeriod: '2_years'
  },
  
  [DataCollectionPurpose.EMERGENCY_DETECTION]: {
    description: "Detect and respond to mental health emergencies",
    dataTypes: ['message_content', 'emergency_flags'],
    lawfulBasis: 'vital_interest',
    retentionPeriod: '7_years'
  }
};
```

### APP 4: Dealing with Unsolicited Personal Information
```typescript
// Unsolicited data handling procedures
class Unsolicited DataHandler {
  async handleUnsolicited(data: any, source: string): Promise<void> {
    // 1. Identify if data contains personal information
    const containsPII = await this.detectPII(data);
    
    if (containsPII) {
      // 2. Determine if collection would be lawful
      const isLawful = await this.assessLawfulness(data);
      
      if (!isLawful) {
        // 3. Destroy data if not lawful to collect
        await this.secureDestroy(data);
        await this.auditLog({
          action: 'UNSOLICITED_DATA_DESTROYED',
          source,
          reason: 'unlawful_collection',
          timestamp: new Date()
        });
      } else {
        // 4. Handle as solicited data with notification
        await this.notifyDataSubject(data);
        await this.processAsSolicited(data);
      }
    }
  }
}
```

### APP 5: Notification of Collection
```typescript
// Collection notification requirements
interface CollectionNotification {
  identity: string;           // KGC organization details
  purpose: string[];          // Reasons for collection
  lawfulBasis: string;        // Legal basis for processing
  recipients: string[];       // Who will receive the data
  consequences: string;       // What happens if not provided
  rights: string[];          // Individual's rights
  complaints: string;        // How to complain
}

const COLLECTION_NOTICES = {
  registration: {
    identity: "Keep Going Care Pty Ltd, ABN: [TBD]",
    purpose: [
      "Provide healthcare platform services",
      "Enable doctor-patient communication", 
      "Track health progress",
      "Provide AI-powered health guidance"
    ],
    lawfulBasis: "Consent under APP 3",
    recipients: [
      "Your assigned healthcare providers",
      "AI service providers (anonymized data only)",
      "Technical support staff (when necessary)"
    ],
    consequences: "Cannot provide healthcare platform services",
    rights: [
      "Access your personal information (APP 12)",
      "Correct your personal information (APP 13)", 
      "Request deletion of your data",
      "Withdraw consent at any time"
    ],
    complaints: "privacy@keepgoingcare.com or OAIC: oaic.gov.au"
  }
};
```

## TGA Class I SaMD Compliance

### Medical Device Classification
```yaml
TGA Classification: Class I Software as Medical Device (SaMD)
Risk Classification: Low Risk
Regulatory Framework: TGA Software as Medical Device Guidance

Device Purpose:
  - NON-DIAGNOSTIC health and wellness support
  - Patient engagement and motivation
  - Care plan adherence tracking
  - Health data organization and visualization
  
Explicit Exclusions:
  - NO medical diagnosis capability
  - NO treatment recommendations
  - NO prescription medication advice
  - NO replacement for clinical judgment
  - NO medical device data integration
```

### Software Safety Requirements
```typescript
// TGA SaMD safety boundaries
interface SaMDSafetyBoundaries {
  diagnosticCapability: false;
  treatmentRecommendations: false;
  medicationAdvice: false;
  medicalDeviceIntegration: false;
  clinicalDecisionSupport: 'non_diagnostic_only';
}

const SAMD_COMPLIANCE_CHECKS = {
  messageProcessing: {
    // Prevent diagnostic language
    diagnosticTerms: [
      /\bdiagnos[ei]s?\b/i,
      /\byou have\b/i,
      /\bsuffering from\b/i,
      /\bcondition is\b/i
    ],
    
    // Prevent treatment advice
    treatmentTerms: [
      /\bprescribe\b/i,
      /\btake this medication\b/i,
      /\btreatment plan\b/i,
      /\bdose\b/i
    ],
    
    // Flag for manual review
    borderlineTerms: [
      /\bsymptoms suggest\b/i,
      /\bmight indicate\b/i,
      /\bcould be\b/i
    ]
  },
  
  responseValidation: {
    requiresDisclaimer: true,
    disclaimerText: "This information is for general wellness purposes only and is not medical advice. Always consult your healthcare provider.",
    maxConfidenceLevel: 'guidance', // Never 'diagnosis' or 'treatment'
    emergencyEscalation: true
  }
};
```

### Clinical Governance Framework
```typescript
// Clinical oversight requirements
interface ClinicalGovernance {
  clinicalAdvisor: {
    name: string;
    qualification: string;
    ahpraNumber: string;
    responsibility: string[];
  };
  
  safetyMonitoring: {
    adverseEventReporting: boolean;
    usabilityTesting: boolean;
    clinicalRiskAssessment: boolean;
    postMarketSurveillance: boolean;
  };
  
  qualityManagement: {
    iso13485Compliance: boolean;
    riskManagementFile: boolean;
    clinicalEvaluation: boolean;
    technicalDocumentation: boolean;
  };
}

const CLINICAL_GOVERNANCE = {
  clinicalAdvisor: {
    name: "[Clinical Advisor Name]",
    qualification: "MBBS, FRACGP",
    ahpraNumber: "[AHPRA Registration]",
    responsibility: [
      "Review AI response appropriateness",
      "Validate SaMD boundary compliance",
      "Monitor safety incidents",
      "Approve clinical content updates"
    ]
  },
  
  safetyMonitoring: {
    adverseEventReporting: true,
    reportingTimeline: "24_hours_for_serious_events",
    usabilityTesting: true,
    clinicalRiskAssessment: true,
    postMarketSurveillance: true
  }
};
```

## Data Residency and Sovereignty

### Australian Data Residency Requirements
```yaml
Primary Data Storage:
  Location: Australia (ap-southeast-2 region)
  Provider: Neon Database (Australian data centers)
  Backup: Australian-based backup storage
  Transit: Encrypted in transit within Australia

AI Processing:
  Primary: OpenAI (US-based, anonymized data only)
  Fallback: Anthropic (US-based, anonymized data only)
  PII Handling: All PII anonymized before external processing
  Data Minimization: Only necessary context sent to AI providers

Government Data Requests:
  Jurisdiction: Australian law applies
  Process: Formal legal process required
  Notification: Users notified unless legally prohibited
  Resistance: Legal challenge for inappropriate requests
```

### Cross-Border Data Transfer Safeguards
```typescript
// Data transfer protection mechanisms
interface DataTransferSafeguards {
  anonymizationRequired: boolean;
  encryptionStandards: string[];
  auditTrail: boolean;
  userConsent: boolean;
  adequacyDecision: boolean;
}

const TRANSFER_SAFEGUARDS = {
  aiProcessing: {
    anonymizationRequired: true,
    anonymizationLevel: 'full_pii_removal',
    encryptionStandards: ['TLS1.3', 'AES256'],
    auditTrail: true,
    userConsent: true,
    dataMinimization: true,
    
    // What gets sent to external AI
    allowedData: [
      'anonymized_message_content',
      'general_health_context',
      'conversation_flow'
    ],
    
    // What never leaves Australia
    restrictedData: [
      'personal_identifiers',
      'specific_health_records',
      'location_data',
      'contact_information'
    ]
  }
};
```

## Privacy by Design Implementation

### Technical Privacy Measures
```typescript
// Privacy-preserving system architecture
class PrivacyByDesignSystem {
  // 1. Data minimization
  async collectMinimalData(purpose: string): Promise<DataCollectionSpec> {
    const requiredFields = this.getMinimalFields(purpose);
    return {
      purpose,
      requiredFields,
      optionalFields: [],
      retentionPeriod: this.getMinimalRetention(purpose)
    };
  }
  
  // 2. Purpose limitation
  async validateDataUse(data: any, purpose: string): Promise<boolean> {
    const originalPurpose = await this.getOriginalPurpose(data.id);
    return this.isCompatiblePurpose(originalPurpose, purpose);
  }
  
  // 3. Storage limitation
  async enforceRetention(): Promise<void> {
    // Automatically delete or anonymize based on retention schedules
    await this.applyRetentionPolicies();
  }
  
  // 4. Access controls
  async validateAccess(userId: string, resourceId: string): Promise<boolean> {
    return this.checkAccessPermissions(userId, resourceId);
  }
}

// Encryption and security measures
const PRIVACY_TECHNICAL_MEASURES = {
  encryption: {
    atRest: 'AES-256-GCM',
    inTransit: 'TLS 1.3',
    applicationLevel: 'Field-level encryption for PII',
    keyManagement: 'AWS KMS with automatic rotation'
  },
  
  accessControls: {
    authentication: 'Multi-factor (SMS + session)',
    authorization: 'Role-based with resource-level controls',
    sessionManagement: '2-hour timeout, secure cookies',
    auditLogging: 'All data access logged and monitored'
  },
  
  dataGovernance: {
    classification: 'Automatic PII detection and classification',
    lifecycle: 'Automated retention policy enforcement',
    monitoring: 'Continuous privacy compliance monitoring',
    incidents: 'Automated breach detection and response'
  }
};
```

### Privacy Dashboard and User Controls
```typescript
// User privacy control interface
interface PrivacyDashboard {
  dataAccess: {
    viewPersonalData(): Promise<PersonalDataSummary>;
    downloadData(): Promise<DataExportPackage>;
    viewUsageLog(): Promise<DataUsageLog[]>;
  };
  
  consentManagement: {
    viewConsents(): Promise<ConsentRecord[]>;
    updateConsents(consents: ConsentUpdate[]): Promise<void>;
    withdrawConsent(purpose: string): Promise<void>;
  };
  
  privacySettings: {
    updatePreferences(prefs: PrivacyPreferences): Promise<void>;
    setDataRetention(period: RetentionPeriod): Promise<void>;
    configureSharing(settings: SharingSettings): Promise<void>;
  };
  
  requests: {
    requestCorrection(field: string, newValue: string): Promise<RequestId>;
    requestDeletion(reason: string): Promise<RequestId>;
    submitComplaint(details: string): Promise<RequestId>;
  };
}

// Implementation of user rights
const USER_RIGHTS_IMPLEMENTATION = {
  rightToAccess: {
    responseTime: '30_days',
    format: 'machine_readable_and_human_readable',
    scope: 'all_personal_data',
    verification: 'multi_factor_authentication'
  },
  
  rightToCorrection: {
    responseTime: '30_days',
    verification: 'identity_verification_required',
    auditTrail: 'all_corrections_logged',
    notification: 'data_recipients_notified'
  },
  
  rightToErasure: {
    responseTime: '30_days',
    gracePeriod: '30_days_to_reverse',
    exceptions: 'legal_obligations_preserved',
    verification: 'secure_deletion_confirmed'
  }
};
```

## Compliance Monitoring and Reporting

### Automated Compliance Checks
```typescript
// Continuous compliance monitoring
class ComplianceMonitor {
  async performDailyChecks(): Promise<ComplianceReport> {
    const checks = await Promise.all([
      this.checkDataRetention(),
      this.checkAccessControls(),
      this.checkAnonymization(),
      this.checkConsentValid(),
      this.checkSecurityIncidents(),
      this.checkSaMDBoundaries()
    ]);
    
    return this.generateComplianceReport(checks);
  }
  
  private async checkDataRetention(): Promise<RetentionComplianceCheck> {
    // Check if any data exceeds retention periods
    const violations = await this.findRetentionViolations();
    
    return {
      compliant: violations.length === 0,
      violations,
      actions: violations.map(v => `Delete or anonymize ${v.dataType}`)
    };
  }
  
  private async checkSaMDBoundaries(): Promise<SaMDComplianceCheck> {
    // Review recent AI responses for boundary violations
    const responses = await this.getRecentAIResponses(24); // Last 24 hours
    const violations = responses.filter(r => 
      this.containsDiagnosticLanguage(r.content) ||
      this.containsTreatmentAdvice(r.content)
    );
    
    return {
      compliant: violations.length === 0,
      violations: violations.map(v => v.id),
      severity: violations.length > 0 ? 'high' : 'none',
      actions: violations.length > 0 ? ['immediate_review', 'clinical_advisor_alert'] : []
    };
  }
}
```

### Privacy Impact Assessment (PIA) Framework
```yaml
PIA Requirements:
  Trigger Events:
    - New data collection initiated
    - Data processing purpose changes
    - New technology implementation
    - Cross-border data transfers
    - High-risk processing activities

  Assessment Areas:
    - Data necessity and proportionality
    - Lawful basis for processing
    - Individual rights impact
    - Security and privacy risks
    - Mitigation measures
    - Monitoring and review processes

  PIA Documentation:
    - Risk assessment matrix
    - Mitigation action plan
    - Stakeholder consultation results
    - Legal basis justification
    - Privacy safeguards implementation
    - Review and update schedule
```

### Incident Response and Breach Management
```typescript
// Privacy breach detection and response
interface PrivacyBreach {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'unauthorized_access' | 'data_loss' | 'disclosure' | 'availability';
  affectedIndividuals: number;
  dataTypes: string[];
  discoveryDate: Date;
  containmentActions: string[];
  notificationRequired: boolean;
}

class BreachResponseManager {
  async handleBreach(incident: SecurityIncident): Promise<BreachResponse> {
    // 1. Immediate containment
    await this.containBreach(incident);
    
    // 2. Assess impact and classify
    const breach = await this.assessBreachImpact(incident);
    
    // 3. Determine notification requirements
    const notifications = await this.determineNotifications(breach);
    
    // 4. Execute notifications
    if (notifications.oaicRequired) {
      await this.notifyOAIC(breach, notifications.timeframe);
    }
    
    if (notifications.individualsRequired) {
      await this.notifyAffectedIndividuals(breach);
    }
    
    // 5. Document and learn
    await this.documentBreach(breach);
    return this.generateBreachResponse(breach);
  }
  
  private async determineNotifications(breach: PrivacyBreach): Promise<NotificationRequirements> {
    // OAIC notification required if eligible data breach
    const isEligibleBreach = 
      breach.severity === 'high' || 
      breach.severity === 'critical' ||
      breach.affectedIndividuals > 100;
    
    // Individual notification required if likely serious harm
    const likelySeriousHarm = 
      breach.dataTypes.includes('health_data') ||
      breach.dataTypes.includes('financial_data') ||
      breach.severity === 'critical';
    
    return {
      oaicRequired: isEligibleBreach,
      timeframe: isEligibleBreach ? '30_days' : null,
      individualsRequired: likelySeriousHarm,
      publicRequired: breach.affectedIndividuals > 1000
    };
  }
}

// Breach notification templates
const BREACH_NOTIFICATIONS = {
  oaic: {
    timeframe: '30_days_from_awareness',
    content: [
      'Identity of organization',
      'Description of data breach',
      'Kind of information involved',
      'Number of individuals affected',
      'Steps taken to address breach',
      'Steps taken to reduce risk of harm',
      'Contact details for more information'
    ]
  },
  
  individual: {
    timeframe: 'as_soon_as_practicable',
    method: 'most_effective_communication',
    content: [
      'Identity of organization',
      'Description of breach in plain language',
      'Kind of information involved',
      'Steps individual should take',
      'Steps organization has taken',
      'Contact details for more information'
    ]
  }
};
```

This comprehensive privacy and compliance framework ensures KGC meets all Australian regulatory requirements while protecting user privacy and maintaining healthcare service integrity.