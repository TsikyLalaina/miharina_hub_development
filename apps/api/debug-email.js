const nodemailer = require('nodemailer');

async function testEmailService() {
  console.log('Testing email service...');
  
  const smtpUser = process.env.EMAIL_SMTP_USER;
  const smtpPassword = process.env.EMAIL_SMTP_PASSWORD;
  
  console.log('SMTP User:', smtpUser);
  console.log('SMTP Password configured:', !!smtpPassword);
  
  if (!smtpUser || !smtpPassword) {
    console.log('Using Ethereal email service...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('Ethereal account created:', testAccount.user);
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    try {
      await transporter.verify();
      console.log('✅ Ethereal email service verified successfully');
      
      const info = await transporter.sendMail({
        from: 'test@miharina.mg',
        to: 'salafa5476@misehub.com',
        subject: 'Welcome to Miharina!',
        html: '<h1>Welcome Test User!</h1><p>Thank you for joining Miharina.</p>'
      });
      
      console.log('✅ Email sent successfully!');
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
    }
  } else {
    console.log('Using Gmail SMTP...');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    
    try {
      await transporter.verify();
      console.log('✅ Gmail SMTP verified successfully');
      
      const info = await transporter.sendMail({
        from: 'noreply@miharina.mg',
        to: 'salafa5476@misehub.com',
        subject: 'Welcome to Miharina!',
        html: '<h1>Welcome Test User!</h1><p>Thank you for joining Miharina.</p>'
      });
      
      console.log('✅ Email sent successfully!');
      
    } catch (error) {
      console.error('❌ Gmail SMTP failed:', error);
    }
  }
}

require('dotenv').config();
testEmailService();
