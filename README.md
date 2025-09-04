# 🌟 Miharina Hub API

> A comprehensive business networking and opportunity matching platform for Madagascar entrepreneurs

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-orange.svg)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [📊 Database Schema](#-database-schema)
- [🔌 API Reference](#-api-reference)
- [🧪 Testing Examples](#-testing-examples)
- [📁 Project Structure](#-project-structure)
- [🔮 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)

---

## 🎯 Overview

Miharina Hub is a modern business networking platform designed to connect Madagascar entrepreneurs with global opportunities. The API provides comprehensive functionality for business profile management, opportunity matching, real-time messaging, and success story sharing.

### Key Highlights
- 🔐 **Secure Authentication** - Firebase-based auth with role management
- 🏢 **Business Profiles** - Multilingual support (French, English, Malagasy)
- 💼 **Smart Matching** - AI-powered business-opportunity pairing
- 💬 **Real-time Messaging** - Integrated communication system
- 📈 **Success Stories** - Community-driven showcases
- 🌍 **Export Focus** - International market connections

---

## ✨ Features

### 🔑 Authentication & Authorization
- Firebase ID token verification
- Role-based access control (Admin, Partner, Entrepreneur)
- Secure user registration and login flows
- Protected route middleware

### 🏢 Business Management
- **Multi-language profiles** (French, English, Malagasy)
- **Business verification** system
- **Document uploads** with cloud storage
- **Advanced search** and filtering capabilities

### 💼 Opportunity Marketplace
- Create and manage business opportunities
- **Smart filtering** by sector, country, and value range
- **Expiration tracking** and status management
- **Export-focused** opportunity matching

### 🤝 Intelligent Matching
- **AI-powered matching** algorithm
- Sector-based compatibility scoring
- Manual match creation and status tracking
- Comprehensive match analytics

### 💬 Communication Hub
- Real-time messaging between users
- **Conversation management**
- **Read status tracking**
- **Match-linked** messaging

### 🏆 Success Stories
- Community showcase platform
- **Media-rich** story creation
- **Status-based** publishing workflow
- **Featured stories** highlighting

### 🔔 Smart Notifications
- **Multi-type** notifications (matches, messages, opportunities)
- Persistent notification storage
- **Real-time** delivery system

---

## 🏗️ Architecture

```mermaid
graph TB
    A[Client Apps] --> B[Express API Server]
    B --> C[Firebase Auth]
    B --> D[PostgreSQL Database]
    B --> E[Google Cloud Storage]
    B --> F[Rate Limiter]
    
    subgraph "Core Services"
        G[Authentication Service]
        H[Business Service]
        I[Matching Engine]
        J[Messaging Service]
    end
    
    B --> G
    B --> H
    B --> I
    B --> J
```

### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL with advanced extensions
- **Authentication:** Firebase Authentication
- **Storage:** Google Cloud Storage
- **Language:** TypeScript/JavaScript

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Firebase project setup
- Google Cloud Storage bucket

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:TsikyLalaina/miharina_hub_development.git
   cd miharina_hub_development
   ```

2. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Restore the provided database dump
   psql $DATABASE_URL -f "Cloud_SQL_Export_2025-09-04 (12_41_13).sql"
   ```

5. **Start the development server**
   ```bash
   cd apps/api
   yarn dev
   ```

🎉 **Server running at:** `http://localhost:3001`

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/miharina` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `miharina-hub-prod` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | Service account private key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_API_KEY` | Firebase web API key | `AIzaSy...` |
| `GCS_BUCKET` | Google Cloud Storage bucket | `miharina-uploads` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | `/path/to/credentials.json` |

### Rate Limiting
- **Window:** 15 minutes
- **Max requests:** ~100 per IP
- **Headers:** `RateLimit-*` exposed in responses

---

## 📊 Database Schema

### Core Tables

#### 👤 Users
```sql
users (
  user_id UUID PRIMARY KEY,
  firebase_uid VARCHAR UNIQUE,
  email VARCHAR UNIQUE,
  phone_number VARCHAR UNIQUE,
  display_name VARCHAR,
  role ENUM('entrepreneur', 'admin', 'partner'),
  preferred_language ENUM('fr', 'en', 'mg'),
  avatar_upload_id UUID REFERENCES uploads(id)
)
```

#### 🏢 Business Profiles
```sql
business_profiles (
  business_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  name_fr/name_en/name_mg VARCHAR,
  description_fr/description_en/description_mg TEXT,
  region ENUM('Antananarivo', 'Fianarantsoa', ...),
  business_type ENUM('agricultural', 'artisan', 'digital_services', 'manufacturing'),
  contact_phone VARCHAR CHECK (phone ~ '^\+261[0-9]{9}$'),
  verification_status ENUM('pending', 'approved', 'rejected')
)
```

#### 💼 Opportunities
```sql
opportunities (
  opportunity_id UUID PRIMARY KEY,
  title_fr/title_en/title_mg VARCHAR,
  description_fr/description_en/description_mg TEXT,
  business_type VARCHAR,
  target_countries JSONB,
  estimated_value NUMERIC,
  currency ENUM('MGA', 'USD', 'EUR'),
  status ENUM('active', 'expired', 'closed')
)
```

### Key Features
- **Extensions:** `pg_trgm`, `unaccent`, `pgcrypto`, `uuid-ossp`
- **Full-text Search:** GIN indexes for multilingual search
- **Automatic Timestamps:** Trigger-based `updated_at` management
- **Data Integrity:** Comprehensive constraints and validations

---

## 🔌 API Reference

### Base URL
```
http://localhost:3001/api
```

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Create new user account | ❌ |
| `POST` | `/auth/login` | Login with Firebase token | ❌ |
| `POST` | `/auth/refresh-token` | Refresh authentication token | ❌ |
| `GET` | `/auth/me` | Get current user profile | ✅ |
| `PUT` | `/auth/profile` | Update user profile | ✅ |

### 🏢 Business Profiles

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/business-profiles` | Create business profile | ✅ |
| `GET` | `/business-profiles` | List/search profiles (public) | ❌ |
| `GET` | `/business-profiles/:id` | Get single profile | ❌ |
| `GET` | `/business-profiles/user/me` | Get my profile | ✅ |
| `PUT` | `/business-profiles/:id` | Update profile | ✅ (Owner/Admin) |
| `DELETE` | `/business-profiles/:id` | Delete profile | ✅ (Owner/Admin) |

### 💼 Opportunities

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/opportunities` | Create opportunity | ✅ |
| `GET` | `/opportunities` | List/filter opportunities | ❌ |
| `GET` | `/opportunities/:id` | Get single opportunity | ❌ |
| `GET` | `/opportunities/user/me` | Get my opportunities | ✅ |
| `PUT` | `/opportunities/:id` | Update opportunity | ✅ (Owner/Admin) |
| `DELETE` | `/opportunities/:id` | Delete opportunity | ✅ (Owner/Admin) |

### 🤝 Matching System

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/matches/find` | Find potential matches | ✅ |
| `GET` | `/matches` | Get my matches | ✅ |
| `POST` | `/matches` | Create manual match | ✅ |
| `PUT` | `/matches/:id/status` | Update match status | ✅ |
| `GET` | `/matches/stats` | Get matching statistics | ✅ |

### 💬 Messaging

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/messages` | Send message | ✅ |
| `GET` | `/messages` | Get conversation messages | ✅ |
| `GET` | `/conversations` | List all conversations | ✅ |
| `POST` | `/messages/mark-read` | Mark messages as read | ✅ |
| `DELETE` | `/messages/:id` | Delete message | ✅ (Sender/Receiver) |

### 📁 File Upload

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/upload` | Upload file (multipart) | ✅ |
| `GET` | `/uploads` | List user uploads | ✅ |
| `DELETE` | `/uploads/:id` | Delete upload | ✅ (Owner) |

### 🏆 Success Stories

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/success-stories` | Create story | ✅ |
| `GET` | `/success-stories` | List published stories | ❌ |
| `GET` | `/success-stories/:id` | Get single story | ❌ |
| `GET` | `/success-stories/user/me` | Get my stories | ✅ |
| `PUT` | `/success-stories/:id` | Update story | ✅ (Author) |
| `DELETE` | `/success-stories/:id` | Delete story | ✅ (Author) |

---

## 🧪 Testing Examples

### 🔐 Authentication Flow

1. **Get Firebase Token**
   ```bash
   curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"Password#123","returnSecureToken":true}'
   ```

2. **Server Login**
   ```bash
   curl -X POST "http://localhost:3001/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"idToken":"<FIREBASE_ID_TOKEN>"}'
   ```

### 🏢 Business Profile Creation

```bash
curl -X POST "http://localhost:3001/api/business-profiles" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nameFr": "Mon Entreprise Tech",
    "nameEn": "My Tech Company", 
    "descriptionFr": "Entreprise de services digitaux innovante",
    "businessType": "digital_services",
    "region": "Antananarivo",
    "contactPhone": "+261340000001",
    "contactEmail": "contact@mytech.mg",
    "currency": "MGA"
  }'
```

### 💼 Opportunity Creation

```bash
curl -X POST "http://localhost:3001/api/opportunities" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title_fr": "Partenariat Export Europe",
    "title_en": "European Export Partnership",
    "description_fr": "Opportunité d'\''exportation vers l'\''Europe",
    "business_type": "digital_services",
    "target_countries": ["France", "Germany", "Italy"],
    "estimated_value": 75000,
    "currency": "EUR",
    "expiration_date": "2025-12-31"
  }'
```

### 💬 Send Message

```bash
curl -X POST "http://localhost:3001/api/messages" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "<RECEIVER_USER_ID>",
    "content": "Bonjour! Je suis intéressé par votre opportunité...",
    "matchId": "<OPTIONAL_MATCH_ID>"
  }'
```

---

## 📁 Project Structure

```
miharina_hub_development/
├── apps/
│   └── api/
│       └── src/
│           ├── index.ts              # App bootstrap & middleware
│           ├── routes/               # API route definitions
│           ├── controllers/          # Request handlers
│           │   ├── auth.ts
│           │   ├── businessProfiles.ts
│           │   ├── opportunities.ts
│           │   ├── matches.ts
│           │   ├── messages.ts
│           │   └── ...
│           ├── services/             # Business logic
│           ├── middleware/           # Custom middleware
│           │   ├── auth.ts           # Firebase verification
│           │   └── roles.ts          # Role-based access
│           └── config/               # Configuration files
├── Cloud_SQL_Export_2025-09-04.sql  # Database schema & seed data
├── package.json
└── README.md
```

---

## 🔮 Roadmap

### 🚧 Current Priorities
- [ ] **Enhanced Notifications** - Push notification delivery channels
- [ ] **Comprehensive Testing** - Integration and unit test coverage
- [ ] **Migration System** - Database versioning and seeding
- [ ] **API Documentation** - OpenAPI/Swagger integration

### 🎯 Future Enhancements  
- [ ] **Real-time Features** - WebSocket integration for live messaging
- [ ] **Analytics Dashboard** - Business intelligence and reporting
- [ ] **Mobile App API** - Enhanced mobile-specific endpoints
- [ ] **AI Matching** - Machine learning-powered opportunity matching
- [ ] **Multi-tenant Support** - Organization-level access control

### 🔧 Technical Improvements
- [ ] **Performance Optimization** - Query optimization and caching
- [ ] **Security Audit** - Enhanced security measures
- [ **GraphQL Integration** - Flexible query capabilities
- [ ] **Microservices** - Service decomposition for scalability

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports
1. Check existing issues first
2. Use the bug report template
3. Include reproduction steps
4. Reference this README for context

### 💡 Feature Requests
1. Discuss in issues before implementing
2. Align with project roadmap
3. Consider backward compatibility
4. Update documentation

### 🔧 Development Setup
1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns
4. Add tests for new features
5. Update documentation

### 📝 Code Standards
- Use TypeScript where possible
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Maintain consistent error handling

---

## 📞 Support & Contact

- **Repository Owner:** [TsikyLalaina](https://github.com/TsikyLalaina)
- **Issues:** Please use GitHub issues for bug reports and feature requests
- **Documentation:** Reference this README for current implementation details

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🌟 Star this project if you find it useful!**

[⬆️ Back to Top](#-miharina-hub-api)

</div>
