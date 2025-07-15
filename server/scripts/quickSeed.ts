#!/usr/bin/env ts-node

/**
 * Quick Database Seeding Script
 * 
 * A simplified version for rapid testing with minimal data
 */

import { db } from '../db';
import * as schema from '../../shared/schema';
import bcrypt from 'bcrypt';

async function quickSeed() {
  console.log('🚀 Quick seeding for testing...');
  
  try {
    // Create admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await db.insert(schema.users).values({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@kgc.com',
      phoneNumber: '+61400000000',
      role: 'admin',
      password: hashedPassword,
      isActive: true,
      createdAt: new Date()
    }).returning();

    // Create test doctor
    const doctorPassword = await bcrypt.hash('doctor123', 10);
    const doctorUser = await db.insert(schema.users).values({
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@kgc.com',
      phoneNumber: '+61412345678',
      role: 'doctor',
      password: doctorPassword,
      isActive: true,
      createdAt: new Date()
    }).returning();

    const doctor = await db.insert(schema.doctors).values({
      userId: doctorUser[0].id,
      specialization: 'General Practice',
      licenseNumber: 'DOC123456',
      isActive: true,
      createdAt: new Date()
    }).returning();

    // Create test patient
    const patientPassword = await bcrypt.hash('patient123', 10);
    const patientUser = await db.insert(schema.users).values({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phoneNumber: '+61423456789',
      role: 'patient',
      password: patientPassword,
      isActive: true,
      createdAt: new Date()
    }).returning();

    const patient = await db.insert(schema.patients).values({
      userId: patientUser[0].id,
      doctorId: doctorUser[0].id,
      dateOfBirth: new Date('1980-01-01'),
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      isActive: true,
      createdAt: new Date()
    }).returning();

    // Create sample CPDs
    await db.insert(schema.carePlanDirectives).values([
      {
        patientId: patient[0].id,
        doctorId: doctorUser[0].id,
        category: 'diet',
        directive: 'Follow a Mediterranean diet with emphasis on vegetables and lean proteins',
        targetValue: 8,
        isActive: true,
        createdAt: new Date()
      },
      {
        patientId: patient[0].id,
        doctorId: doctorUser[0].id,
        category: 'exercise',
        directive: 'Walk for 30 minutes daily, 5 days per week',
        targetValue: 7,
        isActive: true,
        createdAt: new Date()
      },
      {
        patientId: patient[0].id,
        doctorId: doctorUser[0].id,
        category: 'medication',
        directive: 'Take prescribed medications daily at consistent times',
        targetValue: 9,
        isActive: true,
        createdAt: new Date()
      }
    ]);

    // Create sample health metrics (last 7 days)
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      await db.insert(schema.healthMetrics).values({
        patientId: patient[0].id,
        date,
        dietScore: Math.floor(Math.random() * 4) + 6, // 6-9
        exerciseScore: Math.floor(Math.random() * 4) + 5, // 5-8
        medicationScore: Math.floor(Math.random() * 2) + 8, // 8-9
        createdAt: date
      });
    }

    console.log('✅ Quick seed completed!');
    console.log('📧 Test accounts created:');
    console.log('   Admin: admin@kgc.com / admin123');
    console.log('   Doctor: sarah.johnson@kgc.com / doctor123');
    console.log('   Patient: john.smith@example.com / patient123');

  } catch (error) {
    console.error('❌ Quick seed failed:', error);
    throw error;
  }
}

if (require.main === module) {
  quickSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { quickSeed };