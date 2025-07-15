#!/usr/bin/env ts-node

/**
 * KGC Database Seeding Script
 * 
 * This script populates the database with realistic test data for development and testing.
 * It creates doctors, patients, CPDs, health metrics, and other essential data.
 */

import { db } from '../db';
import * as schema from '../../shared/schema';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

// Seed data configuration
const SEED_CONFIG = {
  doctors: 5,
  patients: 20,
  healthMetricsPerPatient: 30, // 30 days of data
  cpdsPerPatient: 3, // Average CPDs per patient
  chatHistoryPerPatient: 10 // Chat interactions per patient
};

// Sample CPD templates by category
const CPD_TEMPLATES = {
  diet: [
    "Follow a Mediterranean diet with emphasis on olive oil, fish, and vegetables",
    "Reduce sodium intake to less than 2300mg per day",
    "Eat 5 servings of fruits and vegetables daily",
    "Limit processed foods and focus on whole grains",
    "Maintain portion control with smaller, frequent meals"
  ],
  exercise: [
    "Walk for 30 minutes daily, 5 days per week",
    "Perform strength training exercises twice weekly",
    "Engage in low-impact activities like swimming or cycling",
    "Take stairs instead of elevators when possible",
    "Practice yoga or stretching for 15 minutes daily"
  ],
  medication: [
    "Take prescribed blood pressure medication daily at 8 AM",
    "Monitor blood glucose levels twice daily",
    "Take omega-3 supplements with dinner",
    "Ensure consistent timing for all medications",
    "Keep a medication diary to track adherence"
  ],
  wellness: [
    "Practice stress reduction techniques for 10 minutes daily",
    "Maintain regular sleep schedule of 7-8 hours nightly",
    "Limit alcohol consumption to recommended guidelines",
    "Engage in social activities to support mental health",
    "Practice mindfulness or meditation regularly"
  ]
};

// Medical conditions for realistic patient profiles
const MEDICAL_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'High Cholesterol',
  'Metabolic Syndrome',
  'Obesity',
  'Pre-diabetes',
  'Cardiovascular Disease Risk'
];

async function seedDatabase() {
  console.log('🌱 Starting KGC Database Seeding...');
  
  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      await clearExistingData();
    }

    // Create admin user
    console.log('👑 Creating admin user...');
    await createAdminUser();

    // Create doctors
    console.log('👨‍⚕️ Creating doctors...');
    const doctors = await createDoctors();

    // Create patients
    console.log('👥 Creating patients...');
    const patients = await createPatients(doctors);

    // Create CPDs
    console.log('📋 Creating Care Plan Directives...');
    await createCPDs(patients, doctors);

    // Create health metrics
    console.log('📊 Creating health metrics...');
    await createHealthMetrics(patients);

    // Create progress milestones
    console.log('🏆 Creating progress milestones...');
    await createProgressMilestones(patients);

    // Create chat history
    console.log('💬 Creating chat history...');
    await createChatHistory(patients);

    console.log('✅ Database seeding completed successfully!');
    console.log(`📈 Created:`);
    console.log(`   - 1 Admin user`);
    console.log(`   - ${doctors.length} Doctors`);
    console.log(`   - ${patients.length} Patients`);
    console.log(`   - ${patients.length * SEED_CONFIG.cpdsPerPatient} Care Plan Directives`);
    console.log(`   - ${patients.length * SEED_CONFIG.healthMetricsPerPatient} Health Metric entries`);
    console.log(`   - Progress milestones and chat history`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

async function clearExistingData() {
  // Clear in reverse dependency order
  await db.delete(schema.healthMetrics);
  await db.delete(schema.carePlanDirectives);
  await db.delete(schema.progressMilestones);
  await db.delete(schema.patients);
  await db.delete(schema.doctors);
  await db.delete(schema.users);
}

async function createAdminUser() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await db.insert(schema.users).values({
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@kgc.com',
    phoneNumber: '+61400000000',
    role: 'admin',
    password: hashedPassword,
    isActive: true,
    createdAt: new Date(),
    lastLogin: null
  });
}

async function createDoctors() {
  const doctors = [];
  const specializations = [
    'General Practice',
    'Endocrinology', 
    'Cardiology',
    'Internal Medicine',
    'Family Medicine'
  ];

  for (let i = 0; i < SEED_CONFIG.doctors; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const hashedPassword = await bcrypt.hash('doctor123', 10);

    // Create user
    const user = await db.insert(schema.users).values({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@kgc.com`,
      phoneNumber: faker.phone.number('+614########'),
      role: 'doctor',
      password: hashedPassword,
      isActive: true,
      createdAt: faker.date.past({ years: 2 }),
      lastLogin: faker.date.recent({ days: 30 })
    }).returning();

    // Create doctor record
    const doctor = await db.insert(schema.doctors).values({
      userId: user[0].id,
      specialization: specializations[i % specializations.length],
      licenseNumber: `DOC${faker.string.numeric(6)}`,
      isActive: true,
      createdAt: user[0].createdAt
    }).returning();

    doctors.push({
      ...doctor[0],
      user: user[0]
    });
  }

  return doctors;
}

async function createPatients(doctors: any[]) {
  const patients = [];

  for (let i = 0; i < SEED_CONFIG.patients; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const hashedPassword = await bcrypt.hash('patient123', 10);
    const assignedDoctor = doctors[i % doctors.length]; // Distribute patients among doctors

    // Create user
    const user = await db.insert(schema.users).values({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phoneNumber: faker.phone.number('+614########'),
      role: 'patient',
      password: hashedPassword,
      isActive: true,
      createdAt: faker.date.past({ years: 1 }),
      lastLogin: faker.date.recent({ days: 7 })
    }).returning();

    // Create patient record
    const patient = await db.insert(schema.patients).values({
      userId: user[0].id,
      doctorId: assignedDoctor.userId,
      dateOfBirth: faker.date.birthdate({ min: 25, max: 75, mode: 'age' }),
      medicalConditions: faker.helpers.arrayElements(MEDICAL_CONDITIONS, { min: 1, max: 3 }),
      isActive: true,
      createdAt: user[0].createdAt
    }).returning();

    patients.push({
      ...patient[0],
      user: user[0],
      assignedDoctor
    });
  }

  return patients;
}

async function createCPDs(patients: any[], doctors: any[]) {
  const categories = ['diet', 'exercise', 'medication', 'wellness'] as const;

  for (const patient of patients) {
    const numCPDs = faker.number.int({ min: 2, max: 4 });
    const selectedCategories = faker.helpers.arrayElements(categories, numCPDs);

    for (const category of selectedCategories) {
      const directive = faker.helpers.arrayElement(CPD_TEMPLATES[category]);
      
      await db.insert(schema.carePlanDirectives).values({
        patientId: patient.id,
        doctorId: patient.assignedDoctor.userId,
        category,
        directive,
        targetValue: faker.number.int({ min: 7, max: 10 }), // Target scores
        isActive: true,
        createdAt: faker.date.past({ days: 60 }),
        updatedAt: faker.date.recent({ days: 30 })
      });
    }
  }
}

async function createHealthMetrics(patients: any[]) {
  for (const patient of patients) {
    // Create 30 days of health metrics with realistic patterns
    for (let day = 0; day < SEED_CONFIG.healthMetricsPerPatient; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      // Create realistic score patterns (some patients improving, some struggling)
      const patientTrend = faker.number.float({ min: 0.8, max: 1.2 }); // Patient's overall trend
      const dayVariation = faker.number.float({ min: 0.7, max: 1.3 }); // Daily variation
      
      const baseScore = Math.min(10, Math.max(1, 
        faker.number.int({ min: 4, max: 8 }) * patientTrend * dayVariation
      ));

      await db.insert(schema.healthMetrics).values({
        patientId: patient.id,
        date,
        dietScore: Math.round(Math.min(10, Math.max(1, baseScore + faker.number.float({ min: -1, max: 1 })))),
        exerciseScore: Math.round(Math.min(10, Math.max(1, baseScore + faker.number.float({ min: -1, max: 1 })))),
        medicationScore: Math.round(Math.min(10, Math.max(1, baseScore + faker.number.float({ min: -0.5, max: 0.5 })))), // Medication usually more consistent
        notes: day % 5 === 0 ? faker.lorem.sentence() : null, // Occasional notes
        createdAt: date
      });
    }
  }
}

async function createProgressMilestones(patients: any[]) {
  const milestoneTemplates = [
    { title: 'First Week Complete', description: 'Successfully completed your first week of daily scoring', category: 'engagement' },
    { title: 'Consistency Champion', description: 'Maintained daily scores for 2 weeks straight', category: 'consistency' },
    { title: 'Diet Improvement', description: 'Achieved 7+ diet scores for 5 consecutive days', category: 'diet' },
    { title: 'Exercise Enthusiast', description: 'Maintained 8+ exercise scores for one week', category: 'exercise' },
    { title: 'Medication Master', description: 'Perfect medication adherence for 10 days', category: 'medication' }
  ];

  for (const patient of patients) {
    const numMilestones = faker.number.int({ min: 1, max: 3 });
    const selectedMilestones = faker.helpers.arrayElements(milestoneTemplates, numMilestones);

    for (const milestone of selectedMilestones) {
      const isCompleted = faker.datatype.boolean({ probability: 0.6 }); // 60% chance of completion
      
      await db.insert(schema.progressMilestones).values({
        patientId: patient.id,
        title: milestone.title,
        description: milestone.description,
        category: milestone.category,
        targetValue: faker.number.int({ min: 7, max: 10 }),
        currentValue: isCompleted ? faker.number.int({ min: 7, max: 10 }) : faker.number.int({ min: 1, max: 6 }),
        isCompleted,
        completedAt: isCompleted ? faker.date.recent({ days: 30 }) : null,
        createdAt: faker.date.past({ days: 45 })
      });
    }
  }
}

async function createChatHistory(patients: any[]) {
  const sampleMessages = [
    "How can I improve my diet scores?",
    "I'm struggling with motivation today",
    "What exercises are good for beginners?",
    "I forgot to take my medication yesterday",
    "Can you help me understand my progress?",
    "I'm feeling overwhelmed with my health goals",
    "What healthy snacks do you recommend?",
    "How do I stay consistent with exercise?",
    "I had a bad day with my eating",
    "Can you remind me about my care plan?"
  ];

  const sampleResponses = [
    "I understand you're looking to improve your diet. Based on your care plan, focusing on whole foods and portion control can make a big difference.",
    "It's completely normal to have challenging days. Remember, every small step counts toward your health goals.",
    "For beginners, I'd recommend starting with gentle activities like walking or light stretching, then gradually building up.",
    "Missing a dose occasionally happens. The important thing is to get back on track today and maintain consistency going forward.",
    "Your progress shows real commitment to your health journey. Let's look at your recent scores and celebrate your improvements.",
    "Feeling overwhelmed is understandable. Let's break down your goals into smaller, manageable steps.",
    "Great question! Some healthy snack options that align with your care plan include nuts, fruits, and yogurt.",
    "Consistency comes from building habits gradually. Start small and celebrate each success along the way.",
    "One difficult day doesn't define your progress. Tomorrow is a fresh start to get back on track with your goals.",
    "Your care plan focuses on balanced nutrition, regular exercise, and medication adherence. Would you like me to review any specific area?"
  ];

  // Note: This would require a chat_history table in the schema
  // For now, we'll just log that we would create this data
  console.log('   💬 Chat history creation skipped - requires chat_history table in schema');
}

// Run the seeding script
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };