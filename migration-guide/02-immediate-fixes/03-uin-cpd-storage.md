# UIN-Based CPD Storage Implementation

## Problem Description

The KGC application currently lacks a proper data retention system for Care Plan Directives (CPDs), which are critical medical records that must be retained for 7 years according to TGA regulations. The current implementation:

1. Only stores the most recent CPD for each patient
2. Lacks proper versioning and historical tracking
3. Does not associate CPDs with the patient's Unique Identity Number (UIN)
4. Has no automated retention policy management

This poses compliance risks and limits the ability to review a patient's care history over time.

## Requirements for CPD Storage

According to regulatory requirements:

1. All CPDs must be stored for a minimum of 7 years
2. Each CPD must be linked to a patient's unique identifier
3. The full history of CPDs must be accessible to authorized personnel
4. The system must maintain data integrity and prevent unauthorized modifications

## Solution Implementation

### 1. Database Schema Updates

Create a new table for CPD history that will store all versions of a patient's CPDs:

```sql
-- In database migration file
CREATE TABLE "cpd_history" (
  "id" SERIAL PRIMARY KEY,
  "patient_id" INTEGER NOT NULL,
  "patient_uin" VARCHAR(20) NOT NULL,
  "doctor_id" INTEGER NOT NULL,
  "doctor_uin" VARCHAR(20) NOT NULL,
  "creation_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiry_date" TIMESTAMP,
  "content" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "replacement_id" INTEGER,
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retention_end_date" TIMESTAMP NOT NULL,
  FOREIGN KEY ("patient_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("doctor_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("replacement_id") REFERENCES "cpd_history" ("id")
);

-- Index for efficient retrieval by UIN
CREATE INDEX "idx_cpd_history_patient_uin" ON "cpd_history" ("patient_uin");
CREATE INDEX "idx_cpd_history_doctor_uin" ON "cpd_history" ("doctor_uin");
-- Index for retention queries
CREATE INDEX "idx_cpd_history_retention_end_date" ON "cpd_history" ("retention_end_date");
```

### 2. Drizzle ORM Schema Updates

Update the Drizzle schema in `shared/schema.ts` to include the new CPD history table:

```typescript
// Add to shared/schema.ts

export const cpdHistory = pgTable("cpd_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientUin: varchar("patient_uin", { length: 20 }).notNull(),
  doctorId: integer("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorUin: varchar("doctor_uin", { length: 20 }).notNull(),
  creationDate: timestamp("creation_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  content: jsonb("content").notNull(),
  version: integer("version").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  replacementId: integer("replacement_id").references(() => cpdHistory.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  retentionEndDate: timestamp("retention_end_date").notNull(),
});

export type CPDHistory = typeof cpdHistory.$inferSelect;
export type InsertCPDHistory = typeof cpdHistory.$inferInsert;

// Relationship definition
export const cpdHistoryRelations = relations(cpdHistory, ({ one }) => ({
  patient: one(users, {
    fields: [cpdHistory.patientId],
    references: [users.id],
  }),
  doctor: one(users, {
    fields: [cpdHistory.doctorId],
    references: [users.id],
  }),
  replacedBy: one(cpdHistory, {
    fields: [cpdHistory.replacementId],
    references: [cpdHistory.id],
  }),
}));
```

### 3. Backend API Updates

Update the API endpoints for CPD management to support the new storage model:

```typescript
// In server/routes.ts

// Create new CPD (updated to store in history)
app.post("/api/doctor/patients/:patientId/cpd", async (req, res) => {
  try {
    const { patientId } = req.params;
    const { content, notes } = req.body;
    
    // Get the doctor's info from the authentication token
    const doctorId = req.user.id; // Assuming authenticated

    // Get UINs
    const [patient] = await db
      .select({ id: users.id, uin: users.uin })
      .from(users)
      .where(eq(users.id, parseInt(patientId)));

    const [doctor] = await db
      .select({ id: users.id, uin: users.uin })
      .from(users)
      .where(eq(users.id, doctorId));

    if (!patient || !doctor) {
      return res.status(404).json({ message: "Patient or doctor not found" });
    }

    // Get the current version number
    const [latestCpd] = await db
      .select({ version: cpdHistory.version })
      .from(cpdHistory)
      .where(eq(cpdHistory.patientId, patient.id))
      .orderBy(desc(cpdHistory.version))
      .limit(1);

    const newVersion = latestCpd ? latestCpd.version + 1 : 1;
    
    // Calculate retention end date (7 years from now)
    const retentionEndDate = new Date();
    retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 7);

    // Mark any existing active CPDs as inactive
    if (newVersion > 1) {
      await db
        .update(cpdHistory)
        .set({ isActive: false })
        .where(and(
          eq(cpdHistory.patientId, patient.id),
          eq(cpdHistory.isActive, true)
        ));
    }

    // Create the new CPD history entry
    const [cpdEntry] = await db
      .insert(cpdHistory)
      .values({
        patientId: patient.id,
        patientUin: patient.uin,
        doctorId: doctor.id,
        doctorUin: doctor.uin,
        content,
        version: newVersion,
        isActive: true,
        notes,
        retentionEndDate
      })
      .returning();

    return res.status(201).json(cpdEntry);
  } catch (error) {
    console.error("Error creating CPD:", error);
    return res.status(500).json({ message: "Failed to create CPD" });
  }
});

// Get current active CPD for a patient
app.get("/api/patients/:patientId/current-cpd", async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const [activeCpd] = await db
      .select()
      .from(cpdHistory)
      .where(and(
        eq(cpdHistory.patientId, parseInt(patientId)),
        eq(cpdHistory.isActive, true)
      ));
    
    if (!activeCpd) {
      return res.status(404).json({ message: "No active CPD found for patient" });
    }
    
    return res.json(activeCpd);
  } catch (error) {
    console.error("Error fetching current CPD:", error);
    return res.status(500).json({ message: "Failed to retrieve current CPD" });
  }
});

// Get CPD history for a patient (for doctors and admins)
app.get("/api/doctor/patients/:patientId/cpd-history", async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const cpdHistoryEntries = await db
      .select()
      .from(cpdHistory)
      .where(eq(cpdHistory.patientId, parseInt(patientId)))
      .orderBy(desc(cpdHistory.version));
    
    return res.json(cpdHistoryEntries);
  } catch (error) {
    console.error("Error fetching CPD history:", error);
    return res.status(500).json({ message: "Failed to retrieve CPD history" });
  }
});

// Get CPD by UIN (for data portability and interoperability)
app.get("/api/cpd/by-uin/:patientUin", async (req, res) => {
  try {
    const { patientUin } = req.params;
    
    // Ensure the requester has appropriate permissions
    // Additional authorization logic should be here
    
    const [activeCpd] = await db
      .select()
      .from(cpdHistory)
      .where(and(
        eq(cpdHistory.patientUin, patientUin),
        eq(cpdHistory.isActive, true)
      ));
    
    if (!activeCpd) {
      return res.status(404).json({ message: "No active CPD found for patient UIN" });
    }
    
    return res.json(activeCpd);
  } catch (error) {
    console.error("Error fetching CPD by UIN:", error);
    return res.status(500).json({ message: "Failed to retrieve CPD" });
  }
});
```

### 4. Data Retention Management

Implement a scheduled job to check for CPDs that have reached their retention period:

```typescript
// In server/retention-manager.ts
import { db } from './db';
import { cpdHistory } from '@shared/schema';
import { lt } from 'drizzle-orm';
import * as schedule from 'node-schedule';

export function setupRetentionManager() {
  // Run every day at midnight
  schedule.scheduleJob('0 0 * * *', async () => {
    try {
      const now = new Date();
      
      // Log expired CPDs before deletion (for audit purposes)
      const expiredCpds = await db
        .select()
        .from(cpdHistory)
        .where(lt(cpdHistory.retentionEndDate, now));
      
      if (expiredCpds.length > 0) {
        console.log(`Found ${expiredCpds.length} CPDs that have exceeded retention period`);
        
        // Log to audit system before deletion
        await logRetentionEvent(expiredCpds);
        
        // Delete expired CPDs
        const result = await db
          .delete(cpdHistory)
          .where(lt(cpdHistory.retentionEndDate, now));
        
        console.log(`Deleted ${result.count} expired CPDs`);
      }
    } catch (error) {
      console.error('Error in CPD retention management:', error);
    }
  });
}

async function logRetentionEvent(expiredCpds) {
  // Implementation of audit logging for retention events
  // ...
}
```

### 5. Frontend Updates

Update the CPD management components to display version history for doctors:

```jsx
// client/src/components/doctor/CPDHistoryView.tsx
import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';

interface CPD {
  id: number;
  patientId: number;
  patientUin: string;
  doctorId: number;
  doctorUin: string;
  creationDate: string;
  content: any;
  version: number;
  isActive: boolean;
  notes?: string;
}

interface CPDHistoryViewProps {
  patientId: number;
}

export default function CPDHistoryView({ patientId }: CPDHistoryViewProps) {
  const [cpdHistory, setCpdHistory] = useState<CPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCPDHistory = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', `/api/doctor/patients/${patientId}/cpd-history`);
        const data = await response.json();
        setCpdHistory(data);
        setError(null);
      } catch (err) {
        setError('Failed to load CPD history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCPDHistory();
  }, [patientId]);
  
  if (loading) {
    return <div>Loading CPD history...</div>;
  }
  
  if (error) {
    return <div className="text-red-500">{error}</div>;
  }
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold mb-4">Care Plan Directive History</h3>
      
      {cpdHistory.length === 0 ? (
        <p>No CPD history found for this patient.</p>
      ) : (
        <div className="space-y-4">
          {cpdHistory.map((cpd) => (
            <div 
              key={cpd.id} 
              className={`p-4 border rounded-md ${cpd.isActive ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-1 text-xs rounded-full mr-2 bg-gray-200">
                    Version {cpd.version}
                  </span>
                  {cpd.isActive && (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Created: {formatDate(cpd.creationDate)}
                </div>
              </div>
              
              <div className="mt-3">
                <h4 className="font-medium">Content</h4>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(cpd.content, null, 2)}
                </pre>
              </div>
              
              {cpd.notes && (
                <div className="mt-3">
                  <h4 className="font-medium">Notes</h4>
                  <p className="mt-1 text-sm">{cpd.notes}</p>
                </div>
              )}
              
              <div className="mt-3 text-xs text-gray-500">
                <div>Patient UIN: {cpd.patientUin}</div>
                <div>Created by: Doctor UIN {cpd.doctorUin}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Migration of Existing CPDs

To ensure all existing CPDs are properly stored in the new system, run a migration script:

```typescript
// scripts/migrate-cpds.ts
import { db } from '../server/db';
import { users, carePlanDirectives, cpdHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function migrateCPDs() {
  try {
    console.log('Starting CPD migration...');
    
    // Get all existing CPDs
    const existingCPDs = await db
      .select({
        id: carePlanDirectives.id,
        patientId: carePlanDirectives.patientId,
        doctorId: carePlanDirectives.doctorId,
        content: carePlanDirectives.content,
        createdAt: carePlanDirectives.createdAt,
      })
      .from(carePlanDirectives);
    
    console.log(`Found ${existingCPDs.length} existing CPDs to migrate`);
    
    // Process each CPD
    for (const cpd of existingCPDs) {
      // Get patient and doctor UINs
      const [patient] = await db
        .select({ id: users.id, uin: users.uin })
        .from(users)
        .where(eq(users.id, cpd.patientId));
      
      const [doctor] = await db
        .select({ id: users.id, uin: users.uin })
        .from(users)
        .where(eq(users.id, cpd.doctorId));
      
      if (!patient || !doctor) {
        console.warn(`Skipping CPD ${cpd.id} - missing patient or doctor`);
        continue;
      }
      
      // Calculate retention end date (7 years from creation)
      const retentionEndDate = new Date(cpd.createdAt);
      retentionEndDate.setFullYear(retentionEndDate.getFullYear() + 7);
      
      // Insert into new CPD history table
      await db
        .insert(cpdHistory)
        .values({
          patientId: patient.id,
          patientUin: patient.uin,
          doctorId: doctor.id,
          doctorUin: doctor.uin,
          content: cpd.content,
          version: 1, // First version
          isActive: true,
          creationDate: cpd.createdAt,
          createdAt: cpd.createdAt,
          retentionEndDate,
          notes: 'Migrated from legacy CPD system',
        });
      
      console.log(`Migrated CPD ${cpd.id} for patient ${patient.uin}`);
    }
    
    console.log('CPD migration completed successfully');
  } catch (error) {
    console.error('Error during CPD migration:', error);
    process.exit(1);
  }
}

migrateCPDs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });
```

## Testing the Implementation

1. After implementing these changes, test the system by:
   - Creating new CPDs for patients
   - Retrieving the current active CPD
   - Viewing the CPD history for a patient
   - Verifying that CPDs can be retrieved by patient UIN

2. Test the data retention logic by:
   - Creating a test CPD with a short retention period
   - Manually triggering the retention check
   - Verifying that expired CPDs are properly handled

## Benefits of the Implementation

1. **Regulatory Compliance**: Ensures 7-year retention of all CPDs
2. **Complete Patient History**: Maintains full version history of care plans
3. **UIN Integration**: Makes patient data portable and interoperable
4. **Audit Trail**: Provides visibility into CPD changes over time
5. **Data Governance**: Automatic management of retention periods

## Next Steps

After implementing the UIN-based CPD storage, proceed to the [Authentication System Preparation](./04-authentication-preparation.md) to prepare for AWS Cognito integration.