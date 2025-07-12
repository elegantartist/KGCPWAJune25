import fs from 'fs';
import path from 'path';

try {
  // Since this is an .mjs file (ESM), __dirname is not available.
  // Use import.meta.url to construct the path.
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const schemaPath = path.resolve(currentDir, '../shared/schema.ts');
  console.log(`--- Verifying schema at path: ${schemaPath} ---`);
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  console.log('--- SUCCESS: Read shared/schema.ts ---');
  if (schemaContent.includes('export const patientScores')) {
    console.log('--- VERIFICATION SUCCESS: "export const patientScores" string WAS FOUND. ---');
  } else {
    console.log('--- VERIFICATION FAILED: "export const patientScores" string was NOT found. ---');
  }
} catch (e) {
  console.log(`--- VERIFICATION FAILED: Could not read or access schema file. Error: ${e.message} ---`);
}
