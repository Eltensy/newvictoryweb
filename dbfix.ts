// migration-fix-file-paths.ts
// Run this script to fix file paths in your database

import { db } from "./server/db.ts";
import { submissions } from "./shared/schema.ts";
import { eq } from "drizzle-orm";
import fs from 'fs/promises';
import path from 'path';

export async function fixSubmissionFilePaths() {
  console.log('🔧 Starting file path migration...');
  console.log('=' * 50);
  
  try {
    // Get all submissions from database
    const allSubmissions = await db.select().from(submissions);
    console.log(`📊 Found ${allSubmissions.length} submissions to check`);
    
    const uploadsDir = path.resolve('./uploads');
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    
    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
      console.log(`✅ Uploads directory is accessible`);
    } catch (error) {
      console.error(`❌ Uploads directory not accessible: ${uploadsDir}`);
      return;
    }
    
    // Get list of all files in uploads directory for reference
    let uploadFiles: string[] = [];
    try {
      uploadFiles = await fs.readdir(uploadsDir);
      console.log(`📂 Found ${uploadFiles.length} files in uploads directory`);
    } catch (error) {
      console.error(`❌ Cannot read uploads directory:`, error);
      return;
    }
    
    let stats = {
      total: allSubmissions.length,
      alreadyValid: 0,
      fixed: 0,
      notFound: 0,
      errors: 0
    };
    
    // Process each submission
    for (let i = 0; i < allSubmissions.length; i++) {
      const submission = allSubmissions[i];
      const progress = `[${i + 1}/${allSubmissions.length}]`;
      
      console.log(`\n${progress} Processing submission: ${submission.id}`);
      console.log(`   Filename: ${submission.filename}`);
      console.log(`   Original: ${submission.originalFilename}`);
      console.log(`   Current path: ${submission.filePath}`);
      console.log(`   File type: ${submission.fileType}`);
      
      try {
        let needsUpdate = false;
        let newPath = submission.filePath;
        let newFilename = submission.filename;
        
        // Check if current path is valid
        if (submission.filePath) {
          try {
            const currentPath = path.resolve(submission.filePath);
            const pathStats = await fs.stat(currentPath);
            
            // Check if file exists and is within uploads directory
            if (pathStats.isFile() && currentPath.startsWith(uploadsDir)) {
              console.log(`   ✅ Current path is valid and accessible`);
              stats.alreadyValid++;
              continue;
            } else if (!currentPath.startsWith(uploadsDir)) {
              console.log(`   ⚠️ Current path is outside uploads directory`);
              needsUpdate = true;
            }
          } catch (error: any) {
            console.log(`   ❌ Current path not accessible: ${error.code}`);
            needsUpdate = true;
          }
        } else {
          console.log(`   ⚠️ No file path stored in database`);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          console.log(`   🔍 Searching for file...`);
          let foundFile: string | null = null;
          
          // Strategy 1: Try exact filename match
          const exactMatch = uploadFiles.find(file => file === submission.filename);
          if (exactMatch) {
            foundFile = exactMatch;
            console.log(`   ✅ Found by exact filename match`);
          } else {
            // Strategy 2: Try original filename match
            if (submission.originalFilename) {
              const originalMatch = uploadFiles.find(file => file === submission.originalFilename);
              if (originalMatch) {
                foundFile = originalMatch;
                newFilename = originalMatch; // Update filename to match actual file
                console.log(`   ✅ Found by original filename match`);
              }
            }
            
            // Strategy 3: Search for partial matches
            if (!foundFile) {
              const baseNameToSearch = path.parse(submission.filename).name;
              const extToSearch = path.parse(submission.filename).ext;
              
              const partialMatches = uploadFiles.filter(file => {
                const fileBase = path.parse(file).name;
                const fileExt = path.parse(file).ext;
                
                return (
                  // Base name matches
                  fileBase === baseNameToSearch ||
                  // File contains base name
                  file.includes(baseNameToSearch) ||
                  // Base name contains file name (for truncated names)
                  baseNameToSearch.includes(fileBase) ||
                  // Similar extension and partial base match
                  (fileExt === extToSearch && 
                   (fileBase.includes(baseNameToSearch.substring(0, 10)) ||
                    baseNameToSearch.includes(fileBase.substring(0, 10))))
                );
              });
              
              if (partialMatches.length === 1) {
                foundFile = partialMatches[0];
                newFilename = partialMatches[0];
                console.log(`   ✅ Found by unique partial match: ${foundFile}`);
              } else if (partialMatches.length > 1) {
                console.log(`   ⚠️ Multiple partial matches found: ${partialMatches.slice(0, 3).join(', ')}${partialMatches.length > 3 ? '...' : ''}`);
                
                // Try to pick the best match
                let bestMatch = partialMatches[0];
                
                // Prefer matches with correct extension
                const extMatch = partialMatches.find(file => 
                  path.extname(file).toLowerCase() === extToSearch.toLowerCase()
                );
                if (extMatch) bestMatch = extMatch;
                
                // Prefer matches that start with similar base name
                const prefixMatch = partialMatches.find(file => 
                  file.startsWith(baseNameToSearch.substring(0, 8))
                );
                if (prefixMatch) bestMatch = prefixMatch;
                
                foundFile = bestMatch;
                newFilename = bestMatch;
                console.log(`   ✅ Using best partial match: ${foundFile}`);
              }
            }
          }
          
          if (foundFile) {
            // Update database with correct path and filename
            newPath = path.join(uploadsDir, foundFile);
            
            await db
              .update(submissions)
              .set({ 
                filePath: newPath,
                filename: newFilename,
                updatedAt: new Date()
              })
              .where(eq(submissions.id, submission.id));
              
            console.log(`   💾 Updated database:`);
            console.log(`      New path: ${newPath}`);
            console.log(`      New filename: ${newFilename}`);
            
            stats.fixed++;
          } else {
            console.log(`   ❌ File not found in uploads directory`);
            console.log(`   🔍 Searched for patterns matching:`);
            console.log(`      - Exact: ${submission.filename}`);
            console.log(`      - Original: ${submission.originalFilename || 'N/A'}`);
            console.log(`      - Base name: ${path.parse(submission.filename).name}`);
            
            stats.notFound++;
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing submission ${submission.id}:`, error);
        stats.errors++;
      }
    }
    
    // Print final statistics
    console.log('\n' + '=' * 50);
    console.log('📊 Migration Summary:');
    console.log(`   Total submissions: ${stats.total}`);
    console.log(`   Already valid: ${stats.alreadyValid}`);
    console.log(`   Fixed: ${stats.fixed}`);
    console.log(`   Not found: ${stats.notFound}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log('=' * 50);
    
    if (stats.fixed > 0) {
      console.log(`🎉 Successfully fixed ${stats.fixed} submission file paths!`);
    }
    
    if (stats.notFound > 0) {
      console.log(`⚠️  ${stats.notFound} files could not be located. These may need manual intervention.`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    throw error;
  }
}

// Utility function to run migration
export async function runMigration() {
  try {
    await fixSubmissionFilePaths();
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// If running this file directly, execute the migration
if (import.meta.main) {
  runMigration();
}

// You can also call this from your server startup:
// Add this to your server/index.ts after database connection:
/*
import { fixSubmissionFilePaths } from './migration-fix-file-paths';

// Run migration on startup (optional)
setTimeout(async () => {
  try {
    console.log('🔧 Running file path migration...');
    await fixSubmissionFilePaths();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}, 5000); // Wait 5 seconds after startup
*/