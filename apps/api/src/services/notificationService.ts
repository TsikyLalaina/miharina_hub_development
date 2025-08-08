import { EmailService } from './emailService';
import { query } from '../config/database';

interface NotificationOptions {
  userId: string;
  type: 'match' | 'message' | 'opportunity' | 'system';
  title: string;
  message: string;
  data?: any;
  email?: boolean;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationService {
  private emailService: EmailService;
  private static instance: NotificationService;

  constructor() {
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async createNotification(options: NotificationOptions): Promise<string> {
    try {
      const queryText = `
        INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
        RETURNING id
      `;
      
      const result = await query(queryText, [
        options.userId,
        options.type,
        options.title,
        options.message,
        JSON.stringify(options.data || {})
      ]);

      const notificationId = result.rows[0].id;

      // Send email if requested
      if (options.email) {
        await this.sendEmailNotification(options);
      }

      return notificationId;
    } catch (error: any) {
      console.error('❌ Create notification error:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  public async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const queryText = `
        SELECT 
          id,
          user_id as "userId",
          type,
          title,
          message,
          data,
          is_read as "isRead",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await query(queryText, [userId, limit]);
      return result.rows.map(row => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : {}
      }));
    } catch (error: any) {
      console.error('❌ Get notifications error:', error);
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const queryText = `
        UPDATE notifications 
        SET is_read = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `;
      
      await query(queryText, [notificationId, userId]);
    } catch (error: any) {
      console.error('❌ Mark as read error:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  public async markAllAsRead(userId: string): Promise<void> {
    try {
      const queryText = `
        UPDATE notifications 
        SET is_read = true, updated_at = NOW()
        WHERE user_id = $1 AND is_read = false
      `;
      
      await query(queryText, [userId]);
    } catch (error: any) {
      console.error('❌ Mark all as read error:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    try {
      const queryText = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;
      
      const result = await query(queryText, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error: any) {
      console.error('❌ Get unread count error:', error);
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  private async sendEmailNotification(options: NotificationOptions): Promise<void> {
    try {
      const userQuery = 'SELECT email FROM users WHERE id = $1';
      const userResult = await query(userQuery, [options.userId]);
      
      if (userResult.rows.length > 0) {
        await this.emailService.sendEmail({
          to: userResult.rows[0].email,
          subject: options.title,
          html: `
            <h1>${options.title}</h1>
            <p>${options.message}</p>
            ${options.data ? `<pre>${JSON.stringify(options.data, null, 2)}</pre>` : ''}
          `
        });
      }
    } catch (error: any) {
      console.error('❌ Send email notification error:', error);
    }
  }

  public async notifyMatch(businessId: string, matchDetails: any): Promise<void> {
    await this.createNotification({
      userId: businessId,
      type: 'match',
      title: 'New Business Match',
      message: `You have a new match with ${matchDetails.businessName}`,
      data: matchDetails,
      email: true
    });
  }

  public async notifyNewMessage(userId: string, messageDetails: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'message',
      title: 'New Message',
      message: `New message from ${messageDetails.senderName}`,
      data: messageDetails,
      email: true
    });
  }

  public async notifyNewOpportunity(userId: string, opportunityDetails: any): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'opportunity',
        title: 'New Opportunity Available',
        message: `A new opportunity matching your business has been created: ${opportunityDetails.title}`,
        data: opportunityDetails,
        email: true
      });
    } catch (error: any) {
      console.error('❌ Notify new opportunity error:', error);
    }
  }

  public async createOpportunityNotification(userId: string, opportunityId: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'opportunity',
        title: 'Opportunity Created',
        message: 'Your opportunity has been successfully created and is now visible to other businesses.',
        data: { opportunityId },
        email: true
      });
    } catch (error: any) {
      console.error('❌ Create opportunity notification error:', error);
    }
  }

  public async createMessageNotification(messageId: string, receiverId: string, senderId: string, preview: string): Promise<void> {
    try {
      await this.createNotification({
        userId: receiverId,
        type: 'message',
        title: 'New Message',
        message: `You have received a new message: ${preview}`,
        data: { messageId, senderId, preview },
        email: true
      });
    } catch (error: any) {
      console.error('❌ Create message notification error:', error);
    }
  }

  public async createSuccessStoryNotification(userId: string, storyId: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'system',
        title: 'Success Story Published',
        message: 'Your success story has been published and is now visible to the community.',
        data: { storyId },
        email: true
      });
    } catch (error: any) {
      console.error('❌ Create success story notification error:', error);
    }
  }
}
