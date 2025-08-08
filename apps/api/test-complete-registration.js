const fetch = require('node-fetch');

async function testCompleteRegistration() {
  console.log('🧪 Testing complete registration flow...');
  
  const testData = {
    email: 'salafa5476@misehub.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    console.log('📧 Testing email service...');
    const emailService = require('./src/services/emailService').EmailService.getInstance();
    await emailService.sendWelcomeEmail(testData.email, `${testData.firstName} ${testData.lastName}`, 'fr');
    console.log('✅ Email service working correctly');

    console.log('📝 Testing registration endpoint...');
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'fr-FR'
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    console.log('📊 Registration response:', {
      status: response.status,
      success: response.ok,
      data: data
    });

    if (response.ok) {
      console.log('✅ Registration completed successfully!');
      console.log('📧 Welcome email sent to:', testData.email);
    } else {
      console.log('❌ Registration failed:', data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a moment for server to be ready
setTimeout(() => {
  testCompleteRegistration();
}, 2000);
