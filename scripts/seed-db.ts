import { db } from '../server/db';
import { 
  userRoles, 
  users, 
  carePlanDirectives,
  healthMetrics
} from '../shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * This script populates the database with initial seed data
 * useful for setting up a new deployment environment
 */
async function main() {
  console.log('Starting database seeding...');

  try {
    // Check if user roles exist
    const existingRoles = await db.select().from(userRoles);
    
    // Create user roles if they don't exist
    if (existingRoles.length === 0) {
      console.log('Creating user roles...');
      await db.insert(userRoles).values([
        { name: 'admin', description: 'System administrator' },
        { name: 'doctor', description: 'Healthcare provider' },
        { name: 'patient', description: 'Patient user' }
      ]);
      console.log('User roles created successfully');
    } else {
      console.log('User roles already exist, skipping creation');
    }

    // Check if admin user exists
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@keepgoingcare.com'));

    // Admin users should be created through proper admin onboarding process
    if (!adminUser) {
      console.log('No admin user found. Admin users should be created through the proper admin onboarding process.');
    } else {
      console.log('Admin user exists');
    }

    // Check if default doctor exists
    const [defaultDoctor] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'doctor@keepgoingcare.com'));

    // Doctors should be added through proper doctor onboarding process
    if (!defaultDoctor) {
      console.log('No default doctor found. Doctors should be added through the proper doctor onboarding process.');
    } else {
      console.log('Default doctor exists');
    }

    // Check if default patient exists
    const [defaultPatient] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'patient@keepgoingcare.com'));

    // Create default patient if it doesn't exist
    if (!defaultPatient) {
      console.log('Creating default patient...');
      const [patient] = await db.insert(users).values({
        name: 'Sarah Johnson',
        email: 'patient@keepgoingcare.com',
        roleId: 3, // Patient role
        username: 'sjohnson',
        password: 'patientpassword', // This should be hashed in a real scenario
        uin: 'PAT-3000000',
        isActive: true,
        joinedDate: new Date()
      }).returning();

      // Create default health metrics for the patient
      await db.insert(healthMetrics).values({
        userId: patient.id,
        medicationScore: 7,
        dietScore: 6,
        exerciseScore: 5
      });

      // Create default care plan directives for the patient
      await db.insert(carePlanDirectives).values([
        {
          userId: patient.id,
          directive: 'Take medication three times daily with meals',
          category: 'medication',
          active: true,
        },
        {
          userId: patient.id,
          directive: 'Maintain a low-sodium diet with plenty of vegetables',
          category: 'diet',
          active: true,
        },
        {
          userId: patient.id,
          directive: 'Walk for at least 30 minutes each day',
          category: 'exercise',
          active: true,
        }
      ]);
      
      console.log('Default patient created successfully with health metrics and care plan directives');
    } else {
      console.log('Default patient already exists, skipping creation');
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();