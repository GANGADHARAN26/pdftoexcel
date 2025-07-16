// Test script to verify the API endpoints
const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/process-advanced-pdf', {
      method: 'GET'
    });
    
    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.message === 'Advanced PDF Processing API') {
      console.log('✅ API is working correctly!');
      console.log('✅ Features:', data.features);
      console.log('✅ Document Types:', data.supportedDocumentTypes);
      console.log('✅ Processing Methods:', data.processingMethods);
    } else {
      console.log('❌ API response unexpected');
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

testAPI();