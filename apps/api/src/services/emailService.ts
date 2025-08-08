import nodemailer from 'nodemailer';
import { config } from '../config/environment';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private static instance: EmailService;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize in constructor - use lazy initialization
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async initializeTransporter(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.initialized) {
      return;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const smtpUser = config.email.smtpUser;
      const smtpPassword = config.email.smtpPassword;

      console.log('📧 Initializing email service...');
      console.log('📧 SMTP User:', smtpUser ? `${smtpUser.substring(0, 5)}...` : 'NOT SET');
      console.log('📧 SMTP Password:', smtpPassword ? 'SET' : 'NOT SET');

      if (!smtpUser || !smtpPassword) {
        console.warn('⚠️ SMTP credentials not configured, using Ethereal email service for development');

        // Use Ethereal email service for development
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });

        console.log('📧 Ethereal email service configured');
        console.log('📧 Preview URL will be provided for sent emails');
      } else {
        // Use configured SMTP (Gmail)
        console.log('📧 Configuring Gmail SMTP...');
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPassword
          },
          tls: {
            rejectUnauthorized: process.env['NODE_ENV'] === 'production'
          }
        });

        console.log('📧 Gmail SMTP configured');
      }

      // Verify connection configuration
      console.log('🔍 Testing SMTP connection...');
      await this.transporter.verify();
      console.log('✅ SMTP server is ready to send emails');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error);

      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Invalid login')) {
          console.error('❌ SMTP Authentication failed - check EMAIL_SMTP_USER and EMAIL_SMTP_PASSWORD');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error('❌ SMTP Connection refused - check network connection');
        } else if (error.message.includes('ENOTFOUND')) {
          console.error('❌ SMTP Host not found - check SMTP server address');
        }
      }

      console.warn('⚠️ Email service will be disabled');
      this.transporter = null;
      this.initialized = true; // Mark as initialized even if failed, to prevent retry loops

      // Re-throw the error so the calling code knows initialization failed
      throw new Error(`Email service initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // Ensure transporter is initialized
      if (!this.initialized) {
        await this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error('Email transporter not initialized - SMTP configuration failed');
      }

      const { to, subject, html, text } = options;

      const mailOptions = {
        from: config.email.from,
        replyTo: config.email.replyTo,
        to,
        subject,
        html,
        text
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Check if we're using Ethereal email service
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Preview URL:', previewUrl);
      }

      console.log('✅ Email sent successfully to:', to);
    } catch (error) {
      console.error('❌ Failed to send email:', error);

      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Invalid login')) {
          throw new Error('Email authentication failed - please check SMTP credentials');
        } else if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Email server connection refused - please check network and SMTP settings');
        } else if (error.message.includes('ENOTFOUND')) {
          throw new Error('Email server not found - please check SMTP host configuration');
        }
      }

      throw error;
    }
  }

  public async sendWelcomeEmail(to: string, userName: string, language: 'fr' | 'mg' | 'en' = 'fr'): Promise<void> {
    const templates = {
      fr: {
        subject: 'Bienvenue sur Miharina - Connectons les entrepreneurs malgaches',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bienvenue sur Miharina!</h1>
              </div>
              <div class="content">
                <h2>Salut ${userName}!</h2>
                <p>Merci de rejoindre Miharina, la plateforme qui connecte les jeunes entrepreneurs malgaches aux opportunités d'affaires.</p>
                <p>Voici ce que vous pouvez faire maintenant :</p>
                <ul>
                  <li>Créer votre profil d'entreprise</li>
                  <li>Explorer les opportunités d'affaires</li>
                  <li>Connecter avec d'autres entrepreneurs</li>
                  <li>Publier vos propres opportunités</li>
                </ul>
                <p>Commencez par créer votre profil d'entreprise pour maximiser vos opportunités de matching.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Connecter les entrepreneurs malgaches</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      mg: {
        subject: 'Tonga soa amin ny Miharina - Arotsahy ny mpandraharaha malagasy',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Tonga soa amin ny Miharina!</h1>
              </div>
              <div class="content">
                <h2>Salama ${userName}!</h2>
                <p>Misaotra nankafy ny Miharina, ny sehatra manampy ny tanora mpandraharaha malagasy hahita vintana ara-barotra.</p>
                <p>Ireto ny azo atao ankehitriny:</p>
                <ul>
                  <li>Mamorona ny mombamomba ny orinasanao</li>
                  <li>Hijery ny vintana ara-barotra</li>
                  <li>Hifandray amin'ny mpandraharaha hafa</li>
                  <li>Hametraka vintana ara-barotra</li>
                </ul>
                <p>Manomboka amin ny famoronana ny mombamomba ny orinasanao hanatsarana ny vintana.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Mampifandray ny mpandraharaha malagasy</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      en: {
        subject: 'Welcome to Miharina - Connecting Malagasy entrepreneurs',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Miharina!</h1>
              </div>
              <div class="content">
                <h2>Hello ${userName}!</h2>
                <p>Thank you for joining Miharina, the platform connecting young Malagasy entrepreneurs to business opportunities.</p>
                <p>Here's what you can do now:</p>
                <ul>
                  <li>Create your business profile</li>
                  <li>Explore business opportunities</li>
                  <li>Connect with other entrepreneurs</li>
                  <li>Post your own opportunities</li>
                </ul>
                <p>Start by creating your business profile to maximize your matching opportunities.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Connecting Malagasy entrepreneurs</p>
              </div>
            </div>
          </body>
          </html>
        `
      }
    };

    const template = templates[language];
    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html
    });
  }

  public async sendMatchNotification(to: string, matchDetails: any, language: 'fr' | 'mg' | 'en' = 'fr'): Promise<void> {
    const templates = {
      fr: {
        subject: 'Nouvelle correspondance commerciale - Miharina',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .match-details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Nouvelle opportunité de partenariat!</h1>
              </div>
              <div class="content">
                <p>Vous avez une nouvelle correspondance avec une entreprise qui pourrait vous intéresser.</p>
                <div class="match-details">
                  <h3>Détails de la correspondance:</h3>
                  <p><strong>Nom de l'entreprise:</strong> ${matchDetails.businessName}</p>
                  <p><strong>Type d'affaires:</strong> ${matchDetails.businessType}</p>
                  <p><strong>Région:</strong> ${matchDetails.region}</p>
                </div>
                <p>Connectez-vous à votre compte Miharina pour en savoir plus et entrer en contact.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Connecter les entrepreneurs malgaches</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      mg: {
        subject: 'Fifanarahana ara-barotra vaovao - Miharina',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .match-details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Vintana vaovao amin ny fiaraha-miasa!</h1>
              </div>
              <div class="content">
                <p>Misy fifanarahana vaovao amin'ny orinasa iray mety hahaliana anao.</p>
                <div class="match-details">
                  <h3>Antsipirian'ny fifanarahana:</h3>
                  <p><strong>Anaran'ny orinasa:</strong> ${matchDetails.businessName}</p>
                  <p><strong>Karazana asa:</strong> ${matchDetails.businessType}</p>
                  <p><strong>Faritra:</strong> ${matchDetails.region}</p>
                </div>
                <p>Midira amin'ny kaontinao Miharina mba hahafantatra bebe kokoa sy hifandray.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Mampifandray ny mpandraharaha malagasy</p>
              </div>
            </div>
          </body>
          </html>
        `
      },
      en: {
        subject: 'New business match - Miharina',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9fafb; }
              .match-details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New partnership opportunity!</h1>
              </div>
              <div class="content">
                <p>You have a new match with a business that might interest you.</p>
                <div class="match-details">
                  <h3>Match details:</h3>
                  <p><strong>Business type:</strong> ${matchDetails.businessType}</p>
                  <p><strong>Region:</strong> ${matchDetails.region}</p>
                </div>
                <p>Log in to your Miharina account to learn more and get in touch.</p>
              </div>
              <div class="footer">
                <p>© 2024 Miharina - Connecting Malagasy entrepreneurs</p>
              </div>
            </div>
          </body>
          </html>
        `
      }
    };

    const template = templates[language];
    await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html
    });
  }

  // Method to check if email service is ready
  public async isReady(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initializeTransporter();
      }
      return this.transporter !== null;
    } catch (error) {
      return false;
    }
  }

  // Method to get email service status
  public getStatus(): { initialized: boolean; hasTransporter: boolean; error?: string } {
    const status: { initialized: boolean; hasTransporter: boolean; error?: string } = {
      initialized: this.initialized,
      hasTransporter: this.transporter !== null
    };

    // Only include error property if there's an actual error
    if (!this.transporter && this.initialized) {
      status.error = 'Transporter initialization failed';
    }

    return status;
  }
}