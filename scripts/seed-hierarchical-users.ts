/**
 * Seed Hierarchical Users for KGC Dashboard System - DEMO DATA ONLY
 * Creates the 51-user structure: 1 Admin (X1) + 10 Doctors (A-J) + 50 Patients (A1-J5)
 * 
 * ⚠️  WARNING: THIS SCRIPT GENERATES FAKE DATA FOR DEMO PURPOSES ONLY
 * ⚠️  DO NOT USE IN PRODUCTION - USE REAL USER DATA INSTEAD
 * 
 * SECURITY: Use --wipe-data flag to clear existing data in development only
 */

import { db } from '../server/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { 
  users, 
  userRoles,
  dashboardRelationships
} from '../shared/schema';

interface UserSeed {
  uin: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  doctorLetter?: string;
  patientNumber?: number;
  createdByUserId?: number;
}

async function seedHierarchicalUsers() {
  console.log('🌱 Starting hierarchical user seeding...');

  // SECURITY ENHANCEMENT: Explicit data wipe protection
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowDataWipe = process.argv.includes('--wipe-data');
  
  if (allowDataWipe && !isDevelopment) {
    console.warn('⚠️  Skipping data wipe in non-development environment. To wipe data, you must be in a development environment AND use the --wipe-data flag.');
    process.exit(1);
  }
  
  if (isDevelopment && allowDataWipe) {
    console.log('🧹 WARNING: Wiping existing hierarchical users (development mode with --wipe-data flag)...');
    // Add specific user wipe logic here if needed
  }

  try {
    // First, ensure user roles exist
    await ensureUserRoles();

    // Get role IDs
    const roles = await db.select().from(userRoles);
    const adminRole = roles.find(r => r.name === 'admin');
    const doctorRole = roles.find(r => r.name === 'doctor');
    const patientRole = roles.find(r => r.name === 'patient');

    if (!adminRole || !doctorRole || !patientRole) {
      throw new Error('Required user roles not found');
    }

    // Prepare user data
    const usersToSeed: UserSeed[] = [];

    // 1. Admin User (X1) - DEMO DATA ONLY
    usersToSeed.push({
      uin: 'X1',
      name: 'Demo Admin (REPLACE WITH REAL DATA)',
      email: 'demo-admin@keepgoingcare.com',
      phoneNumber: '+61400000001', // FAKE DEMO NUMBER
      role: 'admin'
    });

    // 2. Doctor Users (A-J) - DEMO DATA ONLY
    const doctorLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    doctorLetters.forEach((letter, index) => {
      usersToSeed.push({
        uin: letter,
        name: `Demo Doctor ${letter} (REPLACE WITH REAL DATA)`,
        email: `demo-doctor${letter.toLowerCase()}@keepgoingcare.com`,
        phoneNumber: `+6140000000${index + 2}`, // FAKE DEMO NUMBERS: +61400000002 to +61400000011
        role: 'doctor',
        doctorLetter: letter,
        createdByUserId: 1 // Will be set to admin's actual ID later
      });
    });

    // 3. Patient Users (A1-J5) - DEMO DATA ONLY
    doctorLetters.forEach((letter, doctorIndex) => {
      for (let patientNum = 1; patientNum <= 5; patientNum++) {
        const uin = `${letter}${patientNum}`;
        const phoneIndex = (doctorIndex * 5) + patientNum + 11; // FAKE DEMO NUMBERS: Starting from +61400000012
        
        usersToSeed.push({
          uin,
          name: `Demo Patient ${uin} (REPLACE WITH REAL DATA)`,
          email: `demo-patient${uin.toLowerCase()}@keepgoingcare.com`,
          phoneNumber: `+614000000${phoneIndex.toString().padStart(2, '0')}`, // FAKE DEMO NUMBERS
          role: 'patient',
          doctorLetter: letter,
          patientNumber: patientNum,
          createdByUserId: doctorIndex + 2 // Will be set to doctor's actual ID later
        });
      }
    });

    console.log(`📊 Prepared ${usersToSeed.length} users for seeding`);

    // Check for existing users to avoid duplicates
    const existingUsers = await db.select({ uin: users.uin }).from(users);
    const existingUIns = new Set(existingUsers.map(u => u.uin));

    // Filter out existing users
    const newUsers = usersToSeed.filter(user => !existingUIns.has(user.uin));
    
    if (newUsers.length === 0) {
      console.log('✅ All hierarchical users already exist');
      return;
    }

    console.log(`📝 Creating ${newUsers.length} new users...`);

    // Seed users in correct order (admin first, then doctors, then patients)
    const createdUserIds = new Map<string, number>();

    // 1. Create admin user
    const adminUser = newUsers.find(u => u.uin === 'X1');
    if (adminUser) {
      const [admin] = await db
        .insert(users)
        .values({
          uin: adminUser.uin,
          name: adminUser.name,
          email: adminUser.email,
          phoneNumber: adminUser.phoneNumber,
          roleId: adminRole.id,
          username: adminUser.uin.toLowerCase(),
          password: null, // SMS-only auth
          doctorLetter: null,
          patientNumber: null,
          createdByUserId: null,
          isActive: true
        })
        .returning({ id: users.id });

      createdUserIds.set('X1', admin.id);
      console.log(`👑 Created admin user: X1 (ID: ${admin.id})`);
    }

    // 2. Create doctor users
    const doctorUsers = newUsers.filter(u => doctorLetters.includes(u.uin));
    for (const doctor of doctorUsers) {
      const [createdDoctor] = await db
        .insert(users)
        .values({
          uin: doctor.uin,
          name: doctor.name,
          email: doctor.email,
          phoneNumber: doctor.phoneNumber,
          roleId: doctorRole.id,
          username: doctor.uin.toLowerCase(),
          password: null,
          doctorLetter: doctor.doctorLetter,
          patientNumber: null,
          createdByUserId: createdUserIds.get('X1') || null,
          isActive: true
        })
        .returning({ id: users.id });

      createdUserIds.set(doctor.uin, createdDoctor.id);

      // Create dashboard relationship
      if (createdUserIds.get('X1')) {
        await db.execute(`
          INSERT INTO dashboard_relationships (parent_user_id, child_user_id, relationship_type, active)
          VALUES ($1, $2, $3, $4)
        `, [createdUserIds.get('X1'), createdDoctor.id, 'admin_to_doctor', true]);
      }

      console.log(`👨‍⚕️ Created doctor user: ${doctor.uin} (ID: ${createdDoctor.id})`);
    }

    // 3. Create patient users
    const patientUsers = newUsers.filter(u => /^[A-J][1-5]$/.test(u.uin));
    for (const patient of patientUsers) {
      const doctorId = createdUserIds.get(patient.doctorLetter!);
      
      const [createdPatient] = await db
        .insert(users)
        .values({
          uin: patient.uin,
          name: patient.name,
          email: patient.email,
          phoneNumber: patient.phoneNumber,
          roleId: patientRole.id,
          username: patient.uin.toLowerCase(),
          password: null,
          doctorLetter: patient.doctorLetter,
          patientNumber: patient.patientNumber,
          createdByUserId: doctorId || null,
          isActive: true
        })
        .returning({ id: users.id });

      // Create dashboard relationship
      if (doctorId) {
        await db
          .insert(dashboardRelationships)
          .values({
            parentUserId: doctorId,
            childUserId: createdPatient.id,
            relationshipType: 'doctor_to_patient',
            active: true
          });
      }

      console.log(`🏥 Created patient user: ${patient.uin} (ID: ${createdPatient.id})`);
    }

    console.log('✅ Hierarchical user seeding completed successfully!');
    console.log('📋 Summary:');
    console.log('   - 1 Admin (X1)');
    console.log('   - 10 Doctors (A-J)');
    console.log('   - 50 Patients (A1-J5)');
    console.log('   - All with SMS-based authentication');
    console.log('   - Dashboard relationships established');

  } catch (error) {
    console.error('❌ Error seeding hierarchical users:', error);
    throw error;
  }
}

async function ensureUserRoles() {
  const roles = ['admin', 'doctor', 'patient'];
  
  for (const roleName of roles) {
    const existingRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.name, roleName));

    if (existingRole.length === 0) {
      await db
        .insert(userRoles)
        .values({
          name: roleName,
          description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role for KGC system`
        });
      
      console.log(`📝 Created role: ${roleName}`);
    }
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHierarchicalUsers()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedHierarchicalUsers };