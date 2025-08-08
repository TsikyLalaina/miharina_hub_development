// apps/api/src/config/email.ts
import { config } from './environment';

// Email service configuration using Gmail API (Google native approach)
export const emailConfig = {
  // Gmail API Configuration (using service account)
  gmail: {
    serviceAccountEmail: config.email.serviceAccount,
    user: config.email.from,
    replyTo: config.email.replyTo,
  },

  // Email Templates Configuration
  templates: {
    welcome: {
      subject: {
        fr: 'Bienvenue sur Miharina - Connectons les entrepreneurs malgaches',
        mg: 'Tonga soa amin ny Miharina - Mampifandray ny mpandraharaha malagasy',
        en: 'Welcome to Miharina - Connecting Malagasy entrepreneurs'
      },
      template: 'welcome'
    },
    verification: {
      subject: {
        fr: 'Vérifiez votre adresse email - Miharina',
        mg: 'Avereno ny mailakao - Miharina',
        en: 'Verify your email address - Miharina'
      },
      template: 'verification'
    },
    match: {
      subject: {
        fr: 'Nouvelle correspondance commerciale - Miharina',
        mg: 'Fifanarahana ara-barotra vaovao - Miharina',
        en: 'New business match - Miharina'
      },
      template: 'match'
    },
    opportunity: {
      subject: {
        fr: 'Nouvelle opportunité disponible - Miharina',
        mg: 'Fahafahana vaovao misokatra - Miharina',
        en: 'New opportunity available - Miharina'
      },
      template: 'opportunity'
    },
    passwordReset: {
      subject: {
        fr: 'Réinitialisation de mot de passe - Miharina',
        mg: 'Famadihana teny miafina - Miharina',
        en: 'Password reset - Miharina'
      },
      template: 'password-reset'
    },
    businessVerification: {
      subject: {
        fr: 'Vérification de profil d\'entreprise - Miharina',
        mg: 'Fanamarinana mombamomba ny orinasa - Miharina',
        en: 'Business profile verification - Miharina'
      },
      template: 'business-verification'
    },
    contactMessage: {
      subject: {
        fr: 'Nouveau message de contact - Miharina',
        mg: 'Hafatra vaovao avy amin ny olona - Miharina',
        en: 'New contact message - Miharina'
      },
      template: 'contact-message'
    }
  },

  // Email Settings
  settings: {
    fromName: 'Miharina',
    fromEmail: config.email.from,
    replyTo: config.email.replyTo,
    maxRetries: 3,
    retryDelay: 5000,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // emails per window
    }
  },

  // Email Templates Content
  templateContent: {
    welcome: {
      fr: {
        title: 'Bienvenue sur Miharina',
        body: 'Bienvenue dans la communauté Miharina ! Nous sommes ravis de vous aider à connecter avec d\'autres entrepreneurs malgaches et à explorer de nouvelles opportunités commerciales.',
        cta: 'Commencer'
      },
      mg: {
        title: 'Tonga soa amin ny Miharina',
        body: 'Tonga soa amin ny fiaraha-monina Miharina! Faly izahay manampy anao hifandray amin ny mpandraharaha malagasy hafa sy hitady fahafahana ara-barotra vaovao.',
        cta: 'Manomboka'
      },
      en: {
        title: 'Welcome to Miharina',
        body: 'Welcome to the Miharina community! We\'re excited to help you connect with other Malagasy entrepreneurs and explore new business opportunities.',
        cta: 'Get Started'
      }
    },
    verification: {
      fr: {
        title: 'Vérifiez votre email',
        body: 'Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.',
        cta: 'Vérifier l\'email'
      },
      mg: {
        title: 'Avereno ny mailakao',
        body: 'Azafady avereno ny mailakao, tsindrio ny bokotra etsy ambany.',
        cta: 'Avereno ny mailaka'
      },
      en: {
        title: 'Verify your email',
        body: 'Please verify your email address by clicking the button below.',
        cta: 'Verify Email'
      }
    },
    passwordReset: {
      fr: {
        title: 'Réinitialisation du mot de passe',
        body: 'Vous avez demandé une réinitialisation de mot de passe. Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe.',
        cta: 'Réinitialiser le mot de passe',
        note: 'Ce lien expirera dans 1 heure.'
      },
      mg: {
        title: 'Famadihana ny teny miafina',
        body: 'Nangataka famadihana teny miafina ianao. Tsindrio ny bokotra etsy ambany hamadihana ny teny miafinao.',
        cta: 'Avereno ny teny miafina',
        note: 'Mifarana ao anatin ny ora 1 ny rohy.'
      },
      en: {
        title: 'Password Reset',
        body: 'You requested a password reset. Click the button below to reset your password.',
        cta: 'Reset Password',
        note: 'This link will expire in 1 hour.'
      }
    }
  },

  // Email queue configuration
  queue: {
    name: 'email-queue',
    concurrency: 5,
    retryLimit: 3,
    backoffDelay: 5000
  }
};

// Email service class for sending emails
export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Method to get email subject based on template and language
  public getEmailSubject(template: string, language: 'fr' | 'mg' | 'en'): string {
    const templateConfig = emailConfig.templates[template as keyof typeof emailConfig.templates];
    return templateConfig?.subject[language] || templateConfig?.subject.en || 'Miharina Notification';
  }

  // Method to get email template content
  public getEmailTemplate(template: string, language: 'fr' | 'mg' | 'en'): any {
    return emailConfig.templateContent[template as keyof typeof emailConfig.templateContent]?.[language] ||
      emailConfig.templateContent[template as keyof typeof emailConfig.templateContent]?.en ||
      {};
  }
}
