const { AdvancedPDFProcessor } = require('./src/lib/advanced-pdf-processor');
const fs = require('fs');
const path = require('path');

async function testOCRFix() {
  console.log('Testing OCR initialization fix...');
  
  const processor = new AdvancedPDFProcessor();
  
  try {
    // Test OCR initialization
    console.log('1. Testing OCR initialization...');
    const ocrWorker = await processor.initializeOCR();
    console.log('✅ OCR worker initialized successfully');
    
    // Test cleanup
    console.log('2. Testing cleanup...');
    await processor.cleanup();
    console.log('✅ Cleanup completed successfully');
    
    // Test reinitialization
    console.log('3. Testing reinitialization...');
    const newOcrWorker = await processor.reinitializeOCR();
    console.log('✅ OCR worker reinitialized successfully');
    
    // Final cleanup
    await processor.cleanup();
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await processor.cleanup();
  }
}

// Run the test
testOCRFix().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});