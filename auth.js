const admin = require('firebase-admin');
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Firebase Admin SDK setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://miharina-hub-dev.lam.gserviceaccount.com'
});

// PostgreSQL Pool
const pool = new Pool({
  user: 'miharina_user',
  host: 'localhost',
  database: 'miharina_db',
  password: 'secure_password',
  port: 5432,
});

// Middleware to verify Firebase ID token and claims
const verifyTokenAndClaims = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    const claims = decodedToken;
    req.claims = claims;

    // Role-based access control
    const requiredRoles = req.requiredRoles || [];
    if (requiredRoles.length && !requiredRoles.includes(claims.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Set custom claims after registration
const setInitialClaims = async (uid, businessType, region, role) => {
  const currentTimestamp = new Date().toISOString();
  await admin.auth().setCustomUserClaims(uid, {
    businessType: businessType.toLowerCase(),
    region: region.toLowerCase(),
    verified: false,
    country: 'madagascar',
    role: role.toLowerCase(),
    createdAt: currentTimestamp,
    lastLogin: currentTimestamp,
  });
};

// Register user with phone or email and set claims
router.post('/register', async (req, res) => {
  const { phoneNumber, email, password, firstName, lastName, businessType, region, role } = req.body;

  try {
    let userRecord;
    if (phoneNumber && phoneNumber.startsWith('+261')) {
      userRecord = await admin.auth().createUser({
        phoneNumber,
        email: email || null,
        password: password || null,
        displayName: `${firstName} ${lastName}`,
      });
    } else if (email) {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });
    } else {
      return res.status(400).json({ error: 'Phone number (+261) or email is required' });
    }

    await setInitialClaims(userRecord.uid, businessType, region, role || 'entrepreneur');

    await pool.query(
      'INSERT INTO users (user_id, phone_number, email, password_hash, first_name, last_name, preferred_language, is_verified, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [userRecord.uid, phoneNumber || null, email || null, 'hashed_' + password, firstName, lastName, 'fr', false, role || 'entrepreneur']
    );

    // Create initial business profile
    await pool.query(
      'INSERT INTO business_profiles (business_id, user_id, name_fr, description_fr, region, business_type, is_verified, verification_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userRecord.uid, userRecord.uid, `${firstName}'s Business`, 'New business profile', region, businessType, false, 'pending']
    );

    res.status(201).json({ uid: userRecord.uid, message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 'auth/invalid-phone-number') {
      return res.status(400).json({ error: 'Invalid Madagascar phone number. Must start with +261' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Update claims for business verification
router.post('/verify-business', verifyTokenAndClaims, async (req, res) => {
  const { uid } = req.user;
  try {
    const currentTimestamp = new Date().toISOString();
    await admin.auth().setCustomUserClaims(uid, { ...req.claims, verified: true, lastLogin: currentTimestamp });
    await pool.query('UPDATE users SET is_verified = TRUE WHERE user_id = $1', [uid]);
    await pool.query('UPDATE business_profiles SET is_verified = TRUE, verification_status = $1 WHERE user_id = $2', ['approved', uid]);
    res.status(200).json({ message: 'Business verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Token refresh with updated claims
router.post('/refresh-token', verifyTokenAndClaims, async (req, res) => {
  const { uid } = req.user;
  const currentTimestamp = new Date().toISOString();
  await admin.auth().setCustomUserClaims(uid, { ...req.claims, lastLogin: currentTimestamp });
  try {
    const token = await admin.auth().createCustomToken(uid);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Protected route example with role check
router.get('/protected', verifyTokenAndClaims, (req, res) => {
  req.requiredRoles = ['admin', 'partner'];
  res.status(200).json({ message: 'Access granted', user: req.user });
});

module.exports = router;