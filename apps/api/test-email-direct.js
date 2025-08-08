const { EmailService } = require('./dist/services/emailService');

async function testEmailService() {
  console.log('Testing EmailService directly...');
  
  try {
    const emailService = EmailService.getInstance();
    console.log('✅ EmailService instance created');
    
    await emailService.sendWelcomeEmail('salafa5476@misehub.com', 'Test User', 'fr');
    console.log('✅ Welcome email sent successfully to salafa5476@misehub.com');
    
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.error('Full error:', error);
  }
}

testEmailService();
