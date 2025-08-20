#!/usr/bin/env python3
import zipfile
import os
import shutil

print('🚀 Creating clean AWS deployment package with Python...')

# Remove existing files
if os.path.exists('keep-going-care-aws-deployment.zip'):
    os.remove('keep-going-care-aws-deployment.zip')
if os.path.exists('aws-clean-deployment'):
    shutil.rmtree('aws-clean-deployment')

# Create clean deployment directory
os.makedirs('aws-clean-deployment', exist_ok=True)

# Copy essential directories
for dir_name in ['client', 'server', 'shared', 'public']:
    if os.path.exists(dir_name):
        shutil.copytree(dir_name, f'aws-clean-deployment/{dir_name}')

# Copy configuration files
files_to_copy = [
    'package.json', 'package-lock.json', 'vite.config.ts', 
    'tailwind.config.ts', 'postcss.config.js', 'tsconfig.json', 
    'drizzle.config.ts', '.env.example'
]

for file_name in files_to_copy:
    if os.path.exists(file_name):
        shutil.copy2(file_name, f'aws-clean-deployment/{file_name}')

# Copy AWS-specific files
if os.path.exists('.platform'):
    shutil.copytree('.platform', 'aws-clean-deployment/.platform')

# Create Procfile
with open('aws-clean-deployment/Procfile', 'w') as f:
    f.write('web: npm start\n')

# Create ZIP file
with zipfile.ZipFile('keep-going-care-aws-deployment.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('aws-clean-deployment'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, 'aws-clean-deployment')
            zipf.write(file_path, arcname)

# Cleanup
shutil.rmtree('aws-clean-deployment')

# Get file size
size_bytes = os.path.getsize('keep-going-care-aws-deployment.zip')
size_mb = size_bytes / (1024 * 1024)

print(f'✅ Clean AWS deployment package created: keep-going-care-aws-deployment.zip')
print(f'📦 Size: {size_mb:.1f} MB')
print('🎯 Ready for AWS Elastic Beanstalk deployment')