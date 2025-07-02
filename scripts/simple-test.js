#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test script to debug the translation service issue
async function testTranslationService() {
    const cqlDir = path.join(__dirname, '../input/cql');
    
    // Read the main CQL file content
    const mainCqlPath = path.join(cqlDir, 'CMS138FHIRPreventiveTobaccoCessation.cql');
    const statusCqlPath = path.join(cqlDir, 'Status.cql');
    
    if (!fs.existsSync(mainCqlPath) || !fs.existsSync(statusCqlPath)) {
        console.error('❌ CQL files not found');
        return;
    }
    
    const mainCqlContent = fs.readFileSync(mainCqlPath, 'utf8');
    const statusCqlContent = fs.readFileSync(statusCqlPath, 'utf8');
    
    console.log('🧪 Testing with minimal setup...');
    
    // Test 1: Try with native fetch FormData (browser-style)
    console.log('\n=== Test 1: Browser-style FormData ===');
    try {
        const formData = new FormData();
        
        // Create Blob objects (like browser files)
        const mainBlob = new Blob([mainCqlContent], { type: 'text/plain' });
        const statusBlob = new Blob([statusCqlContent], { type: 'text/plain' });
        
        formData.append('CMS138FHIRPreventiveTobaccoCessation', mainBlob, 'CMS138FHIRPreventiveTobaccoCessation.cql');
        formData.append('Status', statusBlob, 'Status.cql');
        
        const response = await fetch('http://localhost:8081/cql/translator', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'multipart/form-data',
                'User-Agent': 'Node.js Test'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        if (response.ok) {
            const result = await response.text();
            console.log('✅ Success! Response length:', result.length);
            console.log('Response preview:', result.substring(0, 200) + '...');
        } else {
            const error = await response.text();
            console.log('❌ Failed:', error || '(empty response)');
        }
        
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
    
    // Test 2: Try sending as simple text form fields
    console.log('\n=== Test 2: Simple text fields ===');
    try {
        const formData = new FormData();
        formData.append('CMS138FHIRPreventiveTobaccoCessation', mainCqlContent);
        formData.append('Status', statusCqlContent);
        
        const response = await fetch('http://localhost:8081/cql/translator', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'multipart/form-data'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        if (response.ok) {
            const result = await response.text();
            console.log('✅ Success! Response length:', result.length);
        } else {
            const error = await response.text();
            console.log('❌ Failed:', error || '(empty response)');
        }
        
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
    
    // Test 3: Try with URLSearchParams (application/x-www-form-urlencoded)
    console.log('\n=== Test 3: URL encoded ===');
    try {
        const params = new URLSearchParams();
        params.append('CMS138FHIRPreventiveTobaccoCessation', mainCqlContent);
        params.append('Status', statusCqlContent);
        
        const response = await fetch('http://localhost:8081/cql/translator', {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });
        
        console.log(`Response status: ${response.status}`);
        if (response.ok) {
            const result = await response.text();
            console.log('✅ Success! Response length:', result.length);
        } else {
            const error = await response.text();
            console.log('❌ Failed:', error || '(empty response)');
        }
        
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
}

testTranslationService().catch(console.error);