import { TranslationServiceClient } from '@google-cloud/translate';
import { config } from '../config/environment';

interface TranslationOptions {
  text: string;
  targetLanguage: 'fr' | 'mg' | 'en';
  sourceLanguage?: string;
}

interface TranslatedContent {
  original: string;
  translated: string;
  detectedLanguage: string;
  confidence: number;
}

export class TranslationService {
  private client: TranslationServiceClient;
  private static instance: TranslationService;

  constructor() {
    this.client = new TranslationServiceClient({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.credentialsPath,
    });
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  public async translate(options: TranslationOptions): Promise<TranslatedContent> {
    try {
      const { text, targetLanguage, sourceLanguage } = options;

      const request = {
        parent: `projects/${config.googleCloud.projectId}`,
        contents: [text],
        mimeType: 'text/plain',
        targetLanguageCode: this.getLanguageCode(targetLanguage),
        sourceLanguageCode: sourceLanguage ?? null,
      };

      const result = await this.client.translateText(request) as any;
      const response = result[0];

      if (!response.translations || response.translations.length === 0) {
        throw new Error('No translations returned');
      }

      const translation = response.translations[0];

      return {
        original: text,
        translated: translation.translatedText || text,
        detectedLanguage: translation.detectedLanguageCode || sourceLanguage || 'unknown',
        confidence: 1.0,
      };
    } catch (error: any) {
      console.error('❌ Translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  public async translateMultiple(
    texts: string[],
    targetLanguage: 'fr' | 'mg' | 'en'
  ): Promise<TranslatedContent[]> {
    try {
      const request = {
        parent: `projects/${config.googleCloud.projectId}`,
        contents: texts,
        mimeType: 'text/plain',
        targetLanguageCode: this.getLanguageCode(targetLanguage),
      };

      const result = await this.client.translateText(request) as any;
      const response = result[0];

      if (!response.translations) {
        throw new Error('No translations returned');
      }

      return response.translations.map((translation: any, index: number) => ({
        original: texts[index],
        translated: translation.translatedText || texts[index],
        detectedLanguage: translation.detectedLanguageCode || 'unknown',
        confidence: 1.0,
      }));
    } catch (error: any) {
      console.error('❌ Multiple translation error:', error);
      throw new Error(`Multiple translation failed: ${error.message}`);
    }
  }

  public async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
  }> {
    try {
      const request = {
        parent: `projects/${config.googleCloud.projectId}`,
        content: text,
        mimeType: 'text/plain',
      };

      const [response] = await this.client.detectLanguage(request);

      if (!response.languages || response.languages.length === 0) {
        throw new Error('No language detected');
      }

      const detection = response.languages[0];

      return {
        language: detection?.languageCode || 'unknown',
        confidence: detection?.confidence || 0,
      };
    } catch (error: any) {
      console.error('❌ Language detection error:', error);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  private getLanguageCode(language: 'fr' | 'mg' | 'en'): string {
    const codes = {
      fr: 'fr',
      mg: 'mg', // Malagasy
      en: 'en',
    };
    return codes[language] || 'en';
  }

  public async translateBusinessProfile(
    profile: any,
    targetLanguage: 'fr' | 'mg' | 'en'
  ): Promise<any> {
    try {
      const fieldsToTranslate = [
        'business_name',
        'description',
        'mission',
        'vision',
        'services',
      ];

      const translatedProfile = { ...profile };

      const translationPromises = fieldsToTranslate.map(async (field) => {
        if (profile[field] && typeof profile[field] === 'string') {
          const translated = await this.translate({
            text: profile[field],
            targetLanguage,
          });
          translatedProfile[field] = translated.translated;
        }
      });

      await Promise.all(translationPromises);

      return translatedProfile;
    } catch (error: any) {
      console.error('❌ Profile translation error:', error);
      throw new Error(`Profile translation failed: ${error.message}`);
    }
  }

  public async translateOpportunity(
    opportunity: any,
    targetLanguage: 'fr' | 'mg' | 'en'
  ): Promise<any> {
    try {
      const fieldsToTranslate = [
        'title',
        'description',
        'requirements',
        'benefits',
      ];

      const translatedOpportunity = { ...opportunity };

      const translationPromises = fieldsToTranslate.map(async (field) => {
        if (opportunity[field] && typeof opportunity[field] === 'string') {
          const translated = await this.translate({
            text: opportunity[field],
            targetLanguage,
          });
          translatedOpportunity[field] = translated.translated;
        }
      });

      await Promise.all(translationPromises);

      return translatedOpportunity;
    } catch (error: any) {
      console.error('❌ Opportunity translation error:', error);
      throw new Error(`Opportunity translation failed: ${error.message}`);
    }
  }
}
