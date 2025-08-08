const { EmailService } = require('./src/services/emailService');

async function testEmailService() {
  try {
    console.log('Testing EmailService...');
    const emailService = EmailService.getInstance();
    
    if (emailService) {
      console.log('✅ EmailService initialized successfully');
      
      // Test sending a simple email
      await emailService.sendWelcomeEmail('salafa5476@misehub.com', 'Test User', 'fr');
      console.log('✅ Welcome email sent successfully');
    } else {
      console.error('❌ EmailService failed to initialize');
    }
  } catch (error) {
    console.error('❌ Email service error:', error);
  }
}

testEmailService();
