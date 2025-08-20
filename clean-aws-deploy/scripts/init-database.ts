/**
 * Secure Database Initialization Script for AWS Deployment
 * 
 * This script initializes the database with required tables and creates
 * admin user ONLY if credentials are provided via environment variables
 */

import { db } from '../server/db';
import { userRoles, users } from '../shared/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function initializeDatabase() {
  console.log('🚀 Initializing KGC Healthcare Database...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await db.select().from(userRoles).limit(1);
    console.log('✅ Database connection successful');
    
    // Check if user roles exist
    const existingRoles = await db.select().from(userRoles);
    
    if (existingRoles.length === 0) {
      console.log('📝 Creating user roles...');
      
      await db.insert(userRoles).values([
        { name: 'admin', description: 'System administrator with full access' },
        { name: 'doctor', description: 'Healthcare provider managing patients' },
        { name: 'patient', description: 'Healthcare recipient using the platform' }
      ]);
      
      console.log('✅ User roles created successfully');
    } else {
      console.log('✅ User roles already exist');
    }
    
    // SECURE ADMIN CREATION - Only if environment variables provided
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const adminPhone = process.env.INITIAL_ADMIN_PHONE;

    if (!adminEmail || !adminPassword) {
      console.log('⚠️  No admin credentials provided in environment variables');
      console.log('   Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to create admin user');
      console.log('   Optionally set INITIAL_ADMIN_PHONE for SMS authentication');
      console.log('✅ Database structure initialization completed');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await db.select().from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists');
      console.log('✅ Database initialization completed');
      return;
    }

    console.log('👤 Creating admin user with provided credentials...');
    
    const hashedPassword = await hash(adminPassword, 12); // Increased salt rounds for production
    
    await db.insert(users).values({
      uin: 'KGC-ADM-001',
      name: 'System Administrator',
      email: adminEmail,
      roleId: 1, // admin role
      phoneNumber: adminPhone || '+1234567890',
      password: hashedPassword,
      uinSequence: 1,
      isActive: true
    });
    
    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${adminEmail}`);
    console.log('🔐 Password: [SECURE - from environment variable]');
    console.log('');
    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy your application to AWS');
    console.log('2. Verify admin login functionality');
    console.log('3. Access the admin dashboard to create doctors and patients');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();