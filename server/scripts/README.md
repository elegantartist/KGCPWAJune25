# KGC Database Seeding Scripts

This directory contains scripts to populate the KGC database with realistic test data for development and testing.

## Available Scripts

### 1. Full Database Seeding (`seedDatabase.ts`)

Creates comprehensive test data including:
- **1 Admin user** (admin@kgc.com / admin123)
- **5 Doctors** with varied specializations
- **20 Patients** with realistic health profiles
- **Care Plan Directives (CPDs)** for each patient
- **30 days of health metrics** per patient
- **Progress milestones** and achievements
- **Chat history** (when schema supports it)

```bash
# Run full seeding
npm run seed:full

# Or directly with ts-node
npx ts-node server/scripts/seedDatabase.ts
```

### 2. Quick Seeding (`quickSeed.ts`)

Creates minimal test data for rapid testing:
- **1 Admin user**
- **1 Doctor** (Dr. Sarah Johnson)
- **1 Patient** (John Smith)
- **3 CPDs** (diet, exercise, medication)
- **7 days of health metrics**

```bash
# Run quick seeding
npm run seed:quick

# Or directly with ts-node
npx ts-node server/scripts/quickSeed.ts
```

## Test Accounts Created

### Admin Account
- **Email**: admin@kgc.com
- **Password**: admin123
- **Role**: Administrator

### Doctor Account (Quick Seed)
- **Email**: sarah.johnson@kgc.com
- **Password**: doctor123
- **Role**: Doctor
- **Specialization**: General Practice

### Patient Account (Quick Seed)
- **Email**: john.smith@example.com
- **Password**: patient123
- **Role**: Patient
- **Assigned Doctor**: Dr. Sarah Johnson

## Data Patterns

### Health Metrics
- **Realistic scoring patterns**: Some patients improving, others struggling
- **Daily variation**: Natural fluctuations in scores
- **Medication consistency**: Generally higher scores (more consistent)
- **Trend simulation**: Long-term improvement or decline patterns

### Care Plan Directives
- **Diet CPDs**: Mediterranean diet, sodium reduction, portion control
- **Exercise CPDs**: Walking programs, strength training, low-impact activities
- **Medication CPDs**: Adherence schedules, monitoring requirements
- **Wellness CPDs**: Stress management, sleep hygiene, mindfulness

### Patient Profiles
- **Age range**: 25-75 years
- **Medical conditions**: Type 2 Diabetes, Hypertension, High Cholesterol, etc.
- **Realistic names and contact info**: Generated with Faker.js
- **Assignment distribution**: Patients evenly distributed among doctors

## Usage in Development

### Before Frontend Integration
```bash
# Clear and reseed database
npm run seed:quick
```

### For Comprehensive Testing
```bash
# Full dataset for thorough testing
npm run seed:full
```

### For Demo/Presentation
```bash
# Quick seed provides clean, predictable data
npm run seed:quick
```

## Environment Requirements

- **Node.js** with TypeScript support
- **Database connection** configured in `server/db.ts`
- **Environment variables** set up for database access
- **Dependencies**: faker, bcrypt, drizzle-orm

## Safety Features

- **Development only**: Full seeding includes data clearing (only in NODE_ENV=development)
- **Password hashing**: All passwords properly hashed with bcrypt
- **Realistic data**: Uses Faker.js for believable test data
- **Error handling**: Comprehensive error reporting and rollback

## Extending the Scripts

### Adding New Data Types
1. Create the data generation function
2. Add it to the main seeding sequence
3. Update the configuration object
4. Test with quick seed first

### Customizing Data Patterns
- Modify `CPD_TEMPLATES` for different directive types
- Adjust `MEDICAL_CONDITIONS` for patient profiles
- Change `SEED_CONFIG` for different data volumes

## Troubleshooting

### Common Issues
- **Database connection**: Ensure database is running and accessible
- **Schema mismatch**: Verify schema matches the seeding script expectations
- **Permission errors**: Check database user permissions
- **Memory issues**: Reduce `SEED_CONFIG` values for large datasets

### Debug Mode
```bash
# Run with debug logging
DEBUG=* npm run seed:quick
```

## Integration with Testing

These scripts are designed to work seamlessly with:
- **Frontend integration testing**
- **API endpoint testing**
- **User journey testing**
- **Performance testing with realistic data volumes**

The seeded data provides a solid foundation for testing all KGC features with realistic, interconnected data relationships.