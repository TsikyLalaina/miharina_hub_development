require('dotenv').config();
console.log('=== Environment Variables ===');
console.log('EMAIL_SMTP_USER:', process.env.EMAIL_SMTP_USER);
console.log('EMAIL_SMTP_PASSWORD:', process.env.EMAIL_SMTP_PASSWORD ? '***' : 'not set');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_REPLY_TO:', process.env.EMAIL_REPLY_TO);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PWD:', process.env.PWD);
console.log('=== Config Values ===');

const { config } = require('./src/config/environment');
console.log('config.email.smtpUser:', config.email.smtpUser);
console.log('config.email.smtpPassword:', config.email.smtpPassword ? '***' : 'not set');
console.log('config.email.from:', config.email.from);
