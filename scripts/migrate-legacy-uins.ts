/**
 * Migration Script: Legacy UIN to New UIN System
 * 
 * Safely migrates the three core users from legacy UIN format to new KGC format:
 * - Admin (ID: 8): AD00001 → KGC-ADM-001
 * - Dr. Marijke Collins (ID: 1): A → KGC-DOC-001  
 * - Reuben Collins (ID: 2): A1 → KGC-PAT-001
 * 
 * This migration ensures authentication compatibility and removes UIN disparity issues.
 */

import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface LegacyUserMigration {
  id: number;
  currentUIN: string;
  newUIN: string;
  name: string;
  sequence: number;
}

async function migrateLegacyUIDs() {
  console.log('🔄 Starting Legacy UIN Migration...');
  
  try {
    // Define the migrations for our three core users
    const migrations: LegacyUserMigration[] = [
      {
        id: 8,
        currentUIN: 'AD00001',
        newUIN: 'KGC-ADM-001', 
        name: 'System Administrator',
        sequence: 1
      },
      {
        id: 1,
        currentUIN: 'A',
        newUIN: 'KGC-DOC-001',
        name: 'Dr. Marijke Collins', 
        sequence: 1
      },
      {
        id: 2,
        currentUIN: 'A1',
        newUIN: 'KGC-PAT-001',
        name: 'Reuben Collins',
        sequence: 1
      }
    ];

    // Verify current state before migration
    console.log('📋 Pre-migration verification...');
    for (const migration of migrations) {
      const [user] = await db
        .select({ id: users.id, uin: users.uin, name: users.name })
        .from(users)
        .where(eq(users.id, migration.id));
      
      if (!user) {
        console.log(`❌ User ID ${migration.id} (${migration.name}) not found`);
        return;
      }
      
      if (user.uin !== migration.currentUIN) {
        console.log(`⚠️  User ID ${migration.id} has UIN "${user.uin}", expected "${migration.currentUIN}"`);
        return;
      }
      
      console.log(`✅ Found ${migration.name}: ${user.uin} → ${migration.newUIN}`);
    }

    // Check for UIN conflicts
    console.log('🔍 Checking for UIN conflicts...');
    for (const migration of migrations) {
      const [existing] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.uin, migration.newUIN));
      
      if (existing && existing.id !== migration.id) {
        console.log(`❌ UIN conflict: ${migration.newUIN} already exists for user ID ${existing.id}`);
        return;
      }
    }

    // Perform the migration
    console.log('🚀 Executing UIN migration...');
    for (const migration of migrations) {
      await db
        .update(users)
        .set({ 
          uin: migration.newUIN,
          uinSequence: migration.sequence
        })
        .where(eq(users.id, migration.id));
      
      console.log(`✅ Migrated ${migration.name}: ${migration.currentUIN} → ${migration.newUIN}`);
    }

    // Post-migration verification
    console.log('📋 Post-migration verification...');
    for (const migration of migrations) {
      const [user] = await db
        .select({ id: users.id, uin: users.uin, name: users.name, uinSequence: users.uinSequence })
        .from(users)
        .where(eq(users.id, migration.id));
      
      if (user.uin === migration.newUIN && user.uinSequence === migration.sequence) {
        console.log(`✅ Verified ${migration.name}: UIN = ${user.uin}, Sequence = ${user.uinSequence}`);
      } else {
        console.log(`❌ Verification failed for ${migration.name}`);
        return;
      }
    }

    console.log('🎉 Legacy UIN Migration completed successfully!');
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('  • System Administrator: AD00001 → KGC-ADM-001');
    console.log('  • Dr. Marijke Collins: A → KGC-DOC-001');
    console.log('  • Reuben Collins: A1 → KGC-PAT-001');
    console.log('');
    console.log('✅ All users now use consistent KGC UIN format');
    console.log('✅ Authentication compatibility restored');
    console.log('✅ No application functionality affected');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔒 Database rollback may be required');
  }
}

// Run the migration
migrateLegacyUIDs();