#!/usr/bin/env node

// Node.js ELM Base64 Updater Script
// Usage: node library-elm-updater.js

const fs = require('fs').promises;
const path = require('path');

async function updateElmInLibrary() {
  try {
    // File paths
    const elmFilePath = 'scratch/elm/trial0.json';
    const libraryFilePath = 'input/resources/library/library-CMS138FHIRPreventiveTobaccoCessation-0.2.001.json';
    
    console.log('🔍 Reading ELM file...');
    // Read the new ELM JSON file
    const elmContent = await fs.readFile(elmFilePath, 'utf8');
    
    console.log('📚 Reading FHIR library file...');
    // Read the FHIR library file
    const libraryContent = await fs.readFile(libraryFilePath, 'utf8');
    
    // Parse both files
    const elmJson = JSON.parse(elmContent);
    const libraryJson = JSON.parse(libraryContent);
    
    console.log(`✅ ELM file loaded: ${elmJson.library?.identifier?.id} version ${elmJson.library?.identifier?.version}`);
    console.log(`✅ Library file loaded: ${libraryJson.title} version ${libraryJson.version}`);
    
    // Convert ELM to base64
    const base64Elm = Buffer.from(elmContent, 'utf8').toString('base64');
    console.log(`🔄 ELM converted to base64. Size: ${(base64Elm.length / 1024).toFixed(1)} KB`);
    
    // Find the application/elm+json content entry
    const elmContentEntry = libraryJson.content?.find(entry => 
      entry.contentType === 'application/elm+json'
    );
    
    if (!elmContentEntry) {
      throw new Error('❌ No application/elm+json content entry found in library file');
    }
    
    console.log('🎯 Found ELM content entry. Updating base64 data...');
    
    // Store old data for comparison
    const oldBase64 = elmContentEntry.data;
    
    // Update the base64 data
    elmContentEntry.data = base64Elm;
    
    // Write the updated library file back
    const updatedLibraryContent = JSON.stringify(libraryJson, null, 2);
    await fs.writeFile(libraryFilePath, updatedLibraryContent, 'utf8');
    
    console.log('✅ Successfully updated library file!');
    console.log('📊 Summary:');
    console.log(`  • ELM JSON size: ${(elmContent.length / 1024).toFixed(1)} KB`);
    console.log(`  • Base64 encoded size: ${(base64Elm.length / 1024).toFixed(1)} KB`);
    console.log(`  • Old base64 length: ${oldBase64.length.toLocaleString()} chars`);
    console.log(`  • New base64 length: ${base64Elm.length.toLocaleString()} chars`);
    console.log(`  • Size change: ${base64Elm.length > oldBase64.length ? '+' : ''}${(base64Elm.length - oldBase64.length).toLocaleString()} chars`);
    console.log(`  • Updated file: ${libraryFilePath}`);
    
    return {
      success: true,
      elmSize: elmContent.length,
      base64Size: base64Elm.length,
      oldBase64Length: oldBase64.length,
      newBase64Length: base64Elm.length,
      sizeChange: base64Elm.length - oldBase64.length
    };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ File not found: ${error.path}`);
      console.error('   Make sure you\'re running this from the project root directory');
    } else if (error instanceof SyntaxError) {
      console.error('❌ JSON parsing error:', error.message);
    } else {
      console.error('❌ Error updating ELM in library:', error.message);
    }
    process.exit(1);
  }
}

// Alternative version with custom paths
async function updateElmInLibraryCustomPaths(elmPath, libraryPath) {
  try {
    console.log(`🔍 Reading ELM file from: ${elmPath}`);
    const elmContent = await fs.readFile(elmPath, 'utf8');
    
    console.log(`📚 Reading library file from: ${libraryPath}`);
    const libraryContent = await fs.readFile(libraryPath, 'utf8');
    
    const libraryJson = JSON.parse(libraryContent);
    const base64Elm = Buffer.from(elmContent, 'utf8').toString('base64');
    
    const elmContentEntry = libraryJson.content?.find(entry => 
      entry.contentType === 'application/elm+json'
    );
    
    if (!elmContentEntry) {
      throw new Error('❌ No application/elm+json content entry found in library file');
    }
    
    elmContentEntry.data = base64Elm;
    
    const updatedLibraryContent = JSON.stringify(libraryJson, null, 2);
    await fs.writeFile(libraryPath, updatedLibraryContent, 'utf8');
    
    console.log('✅ Successfully updated library file!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Use default paths
    console.log('🚀 Starting ELM Base64 update with default paths...\n');
    await updateElmInLibrary();
  } else if (args.length === 2) {
    // Use custom paths
    console.log('🚀 Starting ELM Base64 update with custom paths...\n');
    await updateElmInLibraryCustomPaths(args[0], args[1]);
  } else {
    console.log('Usage:');
    console.log('  node library-elm-updater.js                    # Use default paths');
    console.log('  node library-elm-updater.js <elm-path> <lib-path>  # Use custom paths');
    console.log('');
    console.log('Default paths:');
    console.log('  ELM: output/elm/CMS138FHIRPreventiveTobaccoCessation.json');
    console.log('  Library: input/resources/library/library-CMS138FHIRPreventiveTobaccoCessation-0.2.001.json');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

// Export functions for use as module
module.exports = {
  updateElmInLibrary,
  updateElmInLibraryCustomPaths
};