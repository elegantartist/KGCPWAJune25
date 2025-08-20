#!/usr/bin/env python3
import os
import zipfile
import shutil
from pathlib import Path

def create_deployment_zip():
    source_dir = Path("clean-aws-deploy")
    zip_path = Path("kgc-healthcare-BUILD-COMPLETE.zip")
    
    # Remove existing zip if it exists
    if zip_path.exists():
        zip_path.unlink()
    
    # Files and directories to exclude
    exclude_patterns = {
        'node_modules', '.git', 'dist', '.env', '.DS_Store', '__pycache__',
        '*.log', '*.tmp', '.vscode', '.idea'
    }
    
    def should_exclude(path_str):
        path_parts = Path(path_str).parts
        for part in path_parts:
            if any(pattern in part for pattern in exclude_patterns):
                return True
            if part.startswith('.') and part not in {'.ebextensions', '.platform'}:
                return True
        return False
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                if not should_exclude(file_path):
                    # Calculate the archive name (relative to source_dir)
                    arcname = os.path.relpath(file_path, source_dir)
                    zipf.write(file_path, arcname)
                    print(f"Added: {arcname}")
    
    file_size = zip_path.stat().st_size / (1024 * 1024)  # Size in MB
    print(f"\n✅ Deployment package created: {zip_path}")
    print(f"📦 Size: {file_size:.1f} MB")
    print(f"🚀 Ready for AWS Elastic Beanstalk deployment")

if __name__ == "__main__":
    create_deployment_zip()