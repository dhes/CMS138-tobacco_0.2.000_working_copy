#!/usr/bin/env node

// v 39 - Fixed FormData usage

const fs = require('fs');
const path = require('path');
// Note: Using native fetch available in Node.js 18+

/**
 * Script to process FHIR Measure/Library resources:
 * 1. Extract CQL from base64 content
 * 2. Generate annotated ELM via cql-translation-service
 * 3. Add ELM back to the resource as new content element
 */

class CQLELMProcessor {
    constructor(options = {}) {
        this.translatorUrl = options.translatorUrl || 'http://localhost:8081/cql/translator';
        this.cqlDir = options.cqlDir || path.join(__dirname, '../input/cql');
        this.resourcesDir = options.resourcesDir || path.join(__dirname, '../input/resources/library');
        this.outputDir = options.outputDir || path.join(__dirname, '../output/resources/library');
        this.translatorParams = {
            annotations: true,
            locators: true,
            'result-types': true,
            'detailed-errors': true,
            'date-range-optimization': true,
            ...options.translatorParams
        };
        
        // Ensure output directories exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        
        // Create ELM output directory
        this.elmOutputDir = options.elmOutputDir || path.join(__dirname, '../output/elm');
        if (!fs.existsSync(this.elmOutputDir)) {
            fs.mkdirSync(this.elmOutputDir, { recursive: true });
        }
    }

    /**
     * Parse multipart form response from CQL translation service
     */
    parseMultipartElmResponse(responseText, contentType) {
        console.log('🔍 Parsing multipart ELM response...');
        
        // Extract boundary from content-type header - handle both quoted and unquoted boundaries
        const boundaryMatch = contentType.match(/boundary=([^;,\s]+)/);
        if (!boundaryMatch) {
            throw new Error('No boundary found in content-type header');
        }
        
        let boundary = boundaryMatch[1];
        // Remove quotes if present
        boundary = boundary.replace(/['"]/g, '');
        
        console.log(`🔍 Using boundary: ${boundary}`);
        
        const libraries = {};
        
        // Split by boundary - the actual boundary in content starts with --
        const parts = responseText.split(`--${boundary}`);
        
        console.log(`🔍 Found ${parts.length} parts after boundary split`);
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // Skip empty parts, closing boundary (--), and parts without Content-Disposition
            if (!part.trim() || part.trim() === '--' || !part.includes('Content-Disposition')) {
                console.log(`🔍 Skipping part ${i} (empty or no Content-Disposition)`);
                continue;
            }
            
            console.log(`🔍 Processing part ${i}...`);
            
            // Find the name from Content-Disposition header
            const nameMatch = part.match(/name="([^"]+)"/);
            if (!nameMatch) {
                console.warn(`⚠️ No name found in part ${i}`);
                continue;
            }
            
            const libraryName = nameMatch[1];
            console.log(`🔍 Found library name: ${libraryName}`);
            
            // Look for various patterns of header end: \n\n, \r\n\r\n, \r\r
            let headerEndIndex = -1;
            const headerEndPatterns = ['\r\n\r\n', '\n\n', '\r\r'];
            
            for (const pattern of headerEndPatterns) {
                headerEndIndex = part.indexOf(pattern);
                if (headerEndIndex !== -1) {
                    console.log(`🔍 Found header end using pattern: ${JSON.stringify(pattern)}`);
                    headerEndIndex += pattern.length;
                    break;
                }
            }
            
            if (headerEndIndex === -1) {
                console.warn(`⚠️ No header end found in part ${i} for ${libraryName}`);
                // Debug: show first 200 chars of the part
                console.warn(`Part preview: ${part.substring(0, 200)}`);
                continue;
            }
            
            let jsonContent = part.substring(headerEndIndex);
            
            // Remove any trailing boundary markers - be more specific about what to remove
            jsonContent = jsonContent.replace(/\r?\n?--Boundary_\d+_\d+_\d+.*$/s, '');
            jsonContent = jsonContent.trim();
            
            // Skip if content is too short to be valid JSON
            if (jsonContent.length < 10) {
                console.warn(`⚠️ Content too short for ${libraryName}: ${jsonContent.length} characters`);
                continue;
            }
            
            console.log(`🔍 Attempting to parse JSON for ${libraryName} (${jsonContent.length} characters)`);
            
            try {
                const elmLibrary = JSON.parse(jsonContent);
                
                // Validate it's a proper ELM library
                if (elmLibrary.library && elmLibrary.library.identifier) {
                    libraries[libraryName] = elmLibrary;
                    const version = elmLibrary.library.identifier.version || 'unknown';
                    console.log(`✅ Parsed ELM library: ${libraryName} (v${version})`);
                } else {
                    console.warn(`⚠️ Invalid ELM structure for library: ${libraryName}`);
                    console.warn(`Structure: ${Object.keys(elmLibrary).join(', ')}`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to parse JSON for library ${libraryName}:`, error.message);
                // Log the start and end of content for debugging
                const preview = jsonContent.substring(0, 200);
                const suffix = jsonContent.length > 200 ? jsonContent.substring(jsonContent.length - 100) : '';
                console.warn(`Content preview (first 200 chars): ${preview}...`);
                if (suffix) {
                    console.warn(`Content suffix (last 100 chars): ...${suffix}`);
                }
            }
        }
        
        console.log(`🔍 Total libraries parsed: ${Object.keys(libraries).length}`);
        return libraries;
    }

    /**
     * Process a FHIR Measure or Library resource by name or full path
     */
    async processFHIRResource(resourceName) {
        try {
            // Handle both relative names and full paths
            let resourcePath;
            if (path.isAbsolute(resourceName) || resourceName.includes('/')) {
                resourcePath = resourceName;
            } else {
                // Look for the resource in the resources directory
                resourcePath = path.join(this.resourcesDir, resourceName);
                if (!fs.existsSync(resourcePath) && !resourceName.endsWith('.json')) {
                    resourcePath = path.join(this.resourcesDir, `${resourceName}.json`);
                }
            }
            
            if (!fs.existsSync(resourcePath)) {
                throw new Error(`Resource file not found: ${resourcePath}`);
            }
            
            console.log(`Processing FHIR resource: ${resourcePath}`);
            
            // Read and parse the FHIR resource
            const resourceData = JSON.parse(fs.readFileSync(resourcePath, 'utf8'));
            
            // Extract CQL content
            const cqlContent = this.extractCQLContent(resourceData);
            if (!cqlContent) {
                throw new Error('No CQL content found in resource');
            }
            
            // Determine main CQL filename from resource
            const mainCqlFilename = this.getMainCQLFilename(resourceData, cqlContent);
            console.log(`📄 Using main CQL file: ${mainCqlFilename}`);
            
            // Generate ELM from CQL files
            const elmLibraries = await this.generateELM(mainCqlFilename);
            
            // Save all ELM libraries to individual files
            this.saveELMLibraries(elmLibraries);
            
            // Find the main library ELM (matching the resource name/id)
            const mainLibraryName = this.getMainLibraryName(resourceData, cqlContent);
            const mainElmContent = elmLibraries[mainLibraryName] || Object.values(elmLibraries)[0];
            
            if (!mainElmContent) {
                throw new Error(`No ELM content found for main library: ${mainLibraryName}`);
            }
            
            // Add ELM to resource
            this.addELMToResource(resourceData, mainElmContent);
            
            // Write updated resource
            const outputPath = path.join(
                this.outputDir, 
                `${path.basename(resourcePath, '.json')}_with_elm.json`
            );
            fs.writeFileSync(outputPath, JSON.stringify(resourceData, null, 2));
            
            console.log(`✅ Successfully processed and saved to: ${outputPath}`);
            
            // Return both paths and ELM for potential further use
            return {
                fhirResourcePath: outputPath,
                elmOutputDir: this.elmOutputDir,
                mainElmLibrary: mainElmContent,
                allElmLibraries: elmLibraries
            };
            
        } catch (error) {
            console.error(`❌ Error processing ${resourceName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get the main library name to match with ELM response
     */
    getMainLibraryName(resource, cqlContent) {
        // Try to extract library name from CQL content first
        const libraryMatch = cqlContent.match(/^library\s+([^\s\r\n]+)/m);
        if (libraryMatch) {
            return libraryMatch[1];
        }
        
        // Fallback to resource name/id
        if (resource.name) {
            return resource.name;
        }
        
        if (resource.id) {
            return resource.id;
        }
        
        return 'main';
    }

    /**
     * Determine the main CQL filename from the resource metadata
     */
    getMainCQLFilename(resource, cqlContent) {
        // Try to extract from resource name/id
        if (resource.name) {
            return `${resource.name}.cql`;
        }
        
        if (resource.id) {
            return `${resource.id}.cql`;
        }
        
        // Try to extract library name from CQL content
        const libraryMatch = cqlContent.match(/^library\s+([^\s\r\n]+)/m);
        if (libraryMatch) {
            return `${libraryMatch[1]}.cql`;
        }
        
        return 'main.cql';
    }

    extractCQLContent(resource) {
        // Handle both Library and Measure resources
        const content = resource.content || (resource.library && resource.library[0] && resource.library[0].content);
        
        if (!content || !Array.isArray(content)) {
            throw new Error('No content array found in resource');
        }

        const cqlContentElement = content.find(c => c.contentType === 'text/cql');
        if (!cqlContentElement || !cqlContentElement.data) {
            throw new Error('No text/cql content element found');
        }

        // Decode base64
        const cqlContent = Buffer.from(cqlContentElement.data, 'base64').toString('utf8');
        console.log(`📄 Extracted CQL content (${cqlContent.length} characters)`);
        
        return cqlContent;
    }

    /**
     * Generate ELM using cql-translation-service
     */
    async generateELM(mainCqlFilename) {
        console.log('🔄 Generating ELM using translation service...');
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        Object.entries(this.translatorParams).forEach(([key, value]) => {
            queryParams.append(key, value.toString());
        });

        const url = `${this.translatorUrl}?${queryParams.toString()}`;
        console.log('🔗 URL:', url);
        
        // Use native FormData (not the npm form-data library)
        const formData = new FormData();
        
        // Add all CQL libraries from the cql directory
        await this.addDependencyLibraries(formData);
        
        console.log(`📄 Main CQL library expected: ${path.basename(mainCqlFilename, '.cql')}`);

        try {
            console.log('📤 Sending request with native FormData...');
            const response = await fetch(url, {
                method: 'POST',
                body: formData
                // Don't set headers - let fetch handle it
            });

            console.log(`📨 Response status: ${response.status}`);
            const contentType = response.headers.get('content-type') || '';
            console.log(`📨 Content-Type: ${contentType}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Translation service returned ${response.status}: ${errorText}`);
            }

            const responseText = await response.text();
            console.log(`📨 Response length: ${responseText.length} characters`);

            let elmLibraries = {};

            if (contentType.includes('multipart/form-data')) {
                // Handle multipart response
                elmLibraries = this.parseMultipartElmResponse(responseText, contentType);
            } else if (contentType.includes('application/json')) {
                // Handle single JSON response
                try {
                    const elmLibrary = JSON.parse(responseText);
                    if (elmLibrary.library && elmLibrary.library.identifier) {
                        const libraryName = elmLibrary.library.identifier.id;
                        elmLibraries[libraryName] = elmLibrary;
                        console.log(`✅ Parsed single ELM library: ${libraryName}`);
                    } else {
                        throw new Error('Invalid ELM structure in JSON response');
                    }
                } catch (error) {
                    throw new Error(`Failed to parse JSON response: ${error.message}`);
                }
            } else {
                // Try to parse as JSON anyway (fallback)
                try {
                    const elmLibrary = JSON.parse(responseText);
                    if (elmLibrary.library && elmLibrary.library.identifier) {
                        const libraryName = elmLibrary.library.identifier.id;
                        elmLibraries[libraryName] = elmLibrary;
                        console.log(`✅ Parsed ELM library (no content-type): ${libraryName}`);
                    }
                } catch (error) {
                    throw new Error(`Unsupported response format. Content-Type: ${contentType}, Error: ${error.message}`);
                }
            }

            const libraryCount = Object.keys(elmLibraries).length;
            
            if (libraryCount === 0) {
                throw new Error('No valid ELM libraries found in response');
            }

            console.log(`🎉 Successfully processed ${libraryCount} ELM libraries:`);
            Object.keys(elmLibraries).forEach(name => {
                const version = elmLibraries[name].library.identifier.version;
                console.log(`   - ${name} (v${version})`);
            });

            return elmLibraries;
            
        } catch (error) {
            console.error('❌ Translation service error:', error.message);
            throw error;
        }
    }

    /**
     * Add dependency CQL libraries to form data
     */
    async addDependencyLibraries(formData) {
        if (!fs.existsSync(this.cqlDir)) {
            console.log(`⚠️  CQL directory not found: ${this.cqlDir}`);
            return;
        }

        // Get all .cql files from the cql directory
        const cqlFiles = fs.readdirSync(this.cqlDir)
            .filter(file => file.endsWith('.cql'))
            .sort(); // Sort for consistent ordering

        console.log(`📁 Found ${cqlFiles.length} CQL files in ${this.cqlDir}`);

        for (const fileName of cqlFiles) {
            const filePath = path.join(this.cqlDir, fileName);
            if (fs.existsSync(filePath)) {
                // Read file content as text and append to form
                const cqlContent = fs.readFileSync(filePath, 'utf8');
                const fieldName = path.basename(fileName, '.cql');
                formData.append(fieldName, cqlContent);
                console.log(`📚 Added: ${fileName} → field: ${fieldName} (as text)`);
            }
        }
    }

    /**
     * Save all ELM libraries to individual JSON files
     */
    saveELMLibraries(elmLibraries) {
        console.log(`💾 Saving ${Object.keys(elmLibraries).length} ELM libraries to ${this.elmOutputDir}`);
        
        for (const [libraryName, elmContent] of Object.entries(elmLibraries)) {
            const fileName = `${libraryName}.json`;
            const filePath = path.join(this.elmOutputDir, fileName);
            
            // Write ELM as pretty-printed JSON
            fs.writeFileSync(filePath, JSON.stringify(elmContent, null, 2));
            
            const version = elmContent.library?.identifier?.version || 'unknown';
            console.log(`💾 Saved: ${fileName} (v${version})`);
        }
    }
    addELMToResource(resource, elmContent) {
        // Base64 encode the ELM
        const elmJSON = JSON.stringify(elmContent, null, 2);
        const elmBase64 = Buffer.from(elmJSON).toString('base64');

        // Get or create content array
        if (!resource.content) {
            resource.content = [];
        }

        // Remove existing ELM content if present
        resource.content = resource.content.filter(c => 
            c.contentType !== 'application/elm+json'
        );

        // Add new ELM content
        resource.content.push({
            contentType: 'application/elm+json',
            data: elmBase64
        });

        console.log('📦 Added ELM content to resource');
    }
}

// CLI Usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: node cql-elm-processor.js <fhir-resource-name> [options]

Options:
  --translator-url <url>     CQL translation service URL (default: http://localhost:8081/cql/translator)
  --cql-dir <path>          Directory containing CQL files (default: ../input/cql)
  --resources-dir <path>    Directory containing FHIR resources (default: ../input/resources/library)  
  --output-dir <path>       Output directory (default: ../output/resources/library)
  --elm-output-dir <path>   ELM output directory (default: ../output/elm)
  --no-locators            Disable locator annotations
  --no-result-types        Disable result type annotations
  
Examples:
  node cql-elm-processor.js measure-CMS138FHIRPreventiveTobaccoCessation-0.2.001
  node cql-elm-processor.js library-CMS138FHIRPreventiveTobaccoCessation-0.2.001.json
  node cql-elm-processor.js ../resources/measure-custom.json --cql-dir ./my-cql

Directory structure expected:
  project/
  ├── scripts/
  │   └── cql-elm-processor.js    (this script)
  ├── input/
  │   ├── cql/
  │   │   ├── MainLibrary-1.0.0.cql
  │   │   ├── FHIRHelpers-4.4.0.cql
  │   │   └── ...
  │   └── resources/
  │       └── library/
  │           ├── library-example.json
  │           └── ...
  └── output/                     (generated)
      └── resources/
          └── library/
              └── processed-files...
        `);
        process.exit(1);
    }

    const resourceName = args[0];
    
    // Parse command line options
    const options = {
        translatorParams: {}
    };
    
    for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--translator-url':
                options.translatorUrl = value;
                break;
            case '--cql-dir':
                options.cqlDir = value;
                break;
            case '--resources-dir':
                options.resourcesDir = value;
                break;
            case '--output-dir':
                options.outputDir = value;
                break;
            case '--elm-output-dir':
                options.elmOutputDir = value;
                break;
            case '--no-locators':
                options.translatorParams.locators = false;
                i--; // No value for this flag
                break;
            case '--no-result-types':
                options.translatorParams['result-types'] = false;
                i--; // No value for this flag
                break;
        }
    }

    try {
        const processor = new CQLELMProcessor(options);
        await processor.processFHIRResource(resourceName);
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = CQLELMProcessor;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}