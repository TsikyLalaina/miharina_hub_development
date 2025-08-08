import { query } from '../config/database';

/**
 * Maps Firebase UID to database user_id UUID
 * @param firebaseUid - Firebase UID string
 * @returns Promise<string> - Database UUID user_id
 * @throws Error if user not found
 */
export async function getUserIdByFirebaseUid(firebaseUid: string): Promise<string> {
  try {
    const result = await query(
      'SELECT user_id FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`User not found for Firebase UID: ${firebaseUid}`);
    }
    
    return result.rows[0].user_id;
  } catch (error) {
    console.error('Error mapping Firebase UID to user_id:', error);
    throw error;
  }
}

/**
 * Maps database user_id UUID to Firebase UID
 * @param userId - Database UUID user_id
 * @returns Promise<string> - Firebase UID string
 * @throws Error if user not found
 */
export async function getFirebaseUidByUserId(userId: string): Promise<string> {
  try {
    const result = await query(
      'SELECT firebase_uid FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`User not found for user_id: ${userId}`);
    }
    
    return result.rows[0].firebase_uid;
  } catch (error) {
    console.error('Error mapping user_id to Firebase UID:', error);
    throw error;
  }
}
