--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21
-- Dumped by pg_dump version 13.21

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: miharina; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA miharina;


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: business_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_profiles (
    business_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name_fr character varying(255) NOT NULL,
    name_mg character varying(255),
    name_en character varying(255),
    description_fr text NOT NULL,
    description_mg text,
    description_en text,
    region character varying(50) NOT NULL,
    business_type character varying(50) NOT NULL,
    registration_number character varying(50),
    export_interests jsonb,
    contact_phone character varying(15),
    contact_email character varying(255),
    website_url character varying(255),
    is_verified boolean DEFAULT false,
    verification_status character varying(20) DEFAULT 'pending'::character varying,
    currency character varying(3) DEFAULT 'MGA'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    logo_upload_id uuid,
    CONSTRAINT business_profiles_business_type_check CHECK (((business_type)::text = ANY (ARRAY[('agricultural'::character varying)::text, ('artisan'::character varying)::text, ('digital_services'::character varying)::text, ('manufacturing'::character varying)::text]))),
    CONSTRAINT business_profiles_contact_phone_check CHECK (((contact_phone)::text ~ '^\+261[0-9]{9}$'::text)),
    CONSTRAINT business_profiles_currency_check CHECK (((currency)::text = ANY (ARRAY[('MGA'::character varying)::text, ('USD'::character varying)::text, ('EUR'::character varying)::text]))),
    CONSTRAINT business_profiles_region_check CHECK (((region)::text = ANY (ARRAY[('Antananarivo'::character varying)::text, ('Fianarantsoa'::character varying)::text, ('Toamasina'::character varying)::text, ('Mahajanga'::character varying)::text, ('Toliara'::character varying)::text, ('Antsiranana'::character varying)::text]))),
    CONSTRAINT business_profiles_verification_status_check CHECK (((verification_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    match_id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    opportunity_id uuid NOT NULL,
    match_score numeric(5,2),
    match_reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT matches_match_score_check CHECK (((match_score >= (0)::numeric) AND (match_score <= (100)::numeric))),
    CONSTRAINT matches_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    message_id character varying(128) DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    match_id uuid,
    content text NOT NULL,
    original_language character varying(2),
    translated_content jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT messages_original_language_check CHECK (((original_language)::text = ANY (ARRAY[('fr'::character varying)::text, ('mg'::character varying)::text, ('en'::character varying)::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(30) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['match'::character varying, 'message'::character varying, 'opportunity'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    opportunity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title_fr character varying(255) NOT NULL,
    title_mg character varying(255),
    title_en character varying(255),
    description_fr text NOT NULL,
    description_mg text,
    description_en text,
    business_type character varying(50) NOT NULL,
    target_countries jsonb,
    industry character varying(100),
    estimated_value numeric(15,2),
    currency character varying(3) DEFAULT 'MGA'::character varying,
    expiration_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT opportunities_business_type_check CHECK (((business_type)::text = ANY (ARRAY[('agricultural'::character varying)::text, ('artisan'::character varying)::text, ('digital_services'::character varying)::text, ('manufacturing'::character varying)::text]))),
    CONSTRAINT opportunities_currency_check CHECK (((currency)::text = ANY (ARRAY[('MGA'::character varying)::text, ('USD'::character varying)::text, ('EUR'::character varying)::text]))),
    CONSTRAINT opportunities_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('expired'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: opportunity_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_uploads (
    opportunity_id uuid NOT NULL,
    upload_id uuid NOT NULL,
    role text DEFAULT 'attachment'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT opportunity_uploads_role_check CHECK ((role = ANY (ARRAY['hero'::text, 'attachment'::text])))
);


--
-- Name: success_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.success_stories (
    story_id character varying(128) DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    title_fr character varying(255) NOT NULL,
    title_mg character varying(255),
    title_en character varying(255),
    content_fr text NOT NULL,
    content_mg text,
    content_en text,
    media_urls jsonb,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT success_stories_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('pending'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_name text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT uploads_file_type_check CHECK ((file_type = ANY (ARRAY['profile'::text, 'business'::text, 'opportunity'::text, 'document'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(15),
    email character varying(255),
    password_hash character varying(255),
    preferred_language character varying(2) DEFAULT 'fr'::character varying,
    is_verified boolean DEFAULT false,
    role character varying(20) DEFAULT 'entrepreneur'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    firebase_uid character varying(255),
    display_name character varying(255),
    last_login_at timestamp with time zone,
    avatar_upload_id uuid,
    CONSTRAINT users_phone_number_check CHECK (((phone_number)::text ~ '^\+261[0-9]{9}$'::text)),
    CONSTRAINT users_preferred_language_check CHECK (((preferred_language)::text = ANY (ARRAY[('fr'::character varying)::text, ('mg'::character varying)::text, ('en'::character varying)::text]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('entrepreneur'::character varying)::text, ('admin'::character varying)::text, ('partner'::character varying)::text])))
);


--
-- Data for Name: business_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_profiles (business_id, user_id, name_fr, name_mg, name_en, description_fr, description_mg, description_en, region, business_type, registration_number, export_interests, contact_phone, contact_email, website_url, is_verified, verification_status, currency, created_at, updated_at, created_by, logo_upload_id) FROM stdin;
7478f086-0f19-4396-a452-151afd520cf7	90faa376-5b93-4331-974f-50f813b40495	Mon Entreprise	Ny orinasako	My Business	Description en français	Famaritana amin'ny teny malagasy	Description in English	Antananarivo	agricultural	\N	{}	+261340000000	contact@mybusiness.mg	https://mybusiness.mg	f	pending	MGA	2025-08-06 11:09:54.313782+00	2025-08-06 11:09:54.313782+00	\N	\N
06543ed6-a41e-4022-a831-46e607b40d0e	588ba85f-3c05-45a6-9271-b95bebc76841	Mon Entreprise	Ny orinasako	My Business	Description en français	Famaritana amin'ny teny malagasy	Description in English	Fianarantsoa	digital_services	\N	{}	+261340000000	contact@mybusiness.mg	https://mybusiness.mg	f	pending	MGA	2025-08-06 11:51:51.384653+00	2025-08-06 11:51:51.384653+00	\N	\N
f2ac8dba-54ec-457d-b98a-4b6941a36d48	f51d036f-d08a-42b3-9dff-ab95589a8534	Mon Entreprise	\N	My Business	Description en français	\N	\N	Antananarivo	digital_services	\N	["technology", "services"]	+261340000001	contact@business.mg	\N	f	pending	MGA	2025-08-07 05:34:02.347382+00	2025-08-07 05:34:02.347382+00	\N	\N
ff6667b1-d972-4138-9f63-163889890210	ebb6bc72-1ade-4561-b618-b3802cabdb5b	Nom Mis à Jour	\N	My Business	Description mise à jour	\N	\N	Mahajanga	manufacturing	\N	["retail", "services"]	+261340000001	xexedev474@hostbyt.com	https://www.monsite.mg	f	pending	MGA	2025-08-07 05:46:21.290387+00	2025-08-07 05:49:43.070942+00	\N	\N
3ffae0c1-d30d-41ee-b9d4-f192e7355a06	a9a341f1-9935-4ac5-9f1c-ac0735a4a06d	Mon Entreprise	\N	My Business	Description en français	\N	\N	Toamasina	manufacturing	\N	["retail", "services"]	+261340000001	xexedev474@hostbyt.com	\N	f	pending	MGA	2025-08-07 08:12:27.681571+00	2025-08-07 08:12:27.681571+00	\N	\N
dbdc23fe-8006-46d7-869f-580b4074bc16	567f59ba-bbf3-42ea-b327-b4cad1b29410	Mon Entreprise	Ny Orinasako	My Business	Description en français longue et valide pour création (20+ chars)	Famaritana amin'ny teny Malagasy	English description	Antananarivo	digital_services	RN-2025-001	{"products": ["Software", "Services"], "countries": ["France", "Germany"]}	+261340000010	contact@business.mg	https://www.monsite.mg	f	pending	MGA	2025-08-08 12:16:48.69175+00	2025-08-08 12:16:48.69175+00	\N	\N
36b87900-953a-4a10-88ac-50e1b9705317	68a1a829-86a2-47a7-bb98-2922f7335c90	Entreprise Déléguée	\N	\N	Créée par admin/partner	\N	\N	Toamasina	manufacturing	RC-67890	{"countries": ["FR"]}	+261381234567	delegate@example.mg	https://delegate.example.mg	f	pending	MGA	2025-09-01 09:24:32.51738+00	2025-09-02 08:18:56.935951+00	993a9ad5-2e3b-4af8-9a42-750d3a9f1d83	dd93398d-bc25-46a9-bf71-63fd0c2fbc2d
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.matches (match_id, business_id, opportunity_id, match_score, match_reason, status, created_at, updated_at, created_by) FROM stdin;
74ad0a84-c72b-46c9-9a55-cafa1d361f8f	36b87900-953a-4a10-88ac-50e1b9705317	764ed903-6f98-4fff-bdd4-22acb851d9ec	88.00	Sector overlap, Geo proximity	accepted	2025-09-04 05:49:54.010201+00	2025-09-04 05:51:16.598488+00	68a1a829-86a2-47a7-bb98-2922f7335c90
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (message_id, sender_id, receiver_id, match_id, content, original_language, translated_content, is_read, created_at, updated_at, created_by) FROM stdin;
cf320091-cb26-4207-bc17-e418bcdf439a	68a1a829-86a2-47a7-bb98-2922f7335c90	5e150229-3649-4746-b11d-82c4e38b12be	\N	Hello there!	\N	\N	f	2025-09-04 07:00:44.8889+00	2025-09-04 07:00:44.8889+00	68a1a829-86a2-47a7-bb98-2922f7335c90
5809afef-85d5-48cf-9dd3-b57fcf609a8f	68a1a829-86a2-47a7-bb98-2922f7335c90	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c	\N	Hello there!	\N	\N	t	2025-09-04 06:39:00.89793+00	2025-09-04 07:12:22.0723+00	68a1a829-86a2-47a7-bb98-2922f7335c90
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, data, is_read, created_at, updated_at) FROM stdin;
9f8f03eb-8e58-47c8-a183-442791afdd1a	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c	opportunity	Opportunity Created	Your opportunity has been successfully created and is now visible to other businesses.	{"opportunityId": "af70c8e5-18f8-4079-a694-83adaa07be15"}	f	2025-09-01 12:19:06.465368+00	2025-09-01 12:19:06.465368+00
ee722461-d192-4024-bc8b-15a424652259	68a1a829-86a2-47a7-bb98-2922f7335c90	opportunity	Opportunity Created	Your opportunity has been successfully created and is now visible to other businesses.	{"opportunityId": "d792488b-382f-43c9-baf6-8994a4af0616"}	f	2025-09-01 12:21:40.539062+00	2025-09-01 12:21:40.539062+00
dc8fc1ce-c248-43bd-a474-5968ccf4426a	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c	message	New Message	You have received a new message: Hello there!	{"preview": "Hello there!", "senderId": "68a1a829-86a2-47a7-bb98-2922f7335c90", "messageId": "5809afef-85d5-48cf-9dd3-b57fcf609a8f"}	f	2025-09-04 06:39:02.379659+00	2025-09-04 06:39:02.379659+00
e5d59b23-fe8c-4fd9-81a2-46de628b7c7a	5e150229-3649-4746-b11d-82c4e38b12be	message	New Message	You have received a new message: Hello there!	{"preview": "Hello there!", "senderId": "68a1a829-86a2-47a7-bb98-2922f7335c90", "messageId": "cf320091-cb26-4207-bc17-e418bcdf439a"}	f	2025-09-04 07:00:46.494955+00	2025-09-04 07:00:46.494955+00
262da30e-503d-4443-9260-8418f7fc94b0	68a1a829-86a2-47a7-bb98-2922f7335c90	system	Success Story Published	Your success story has been published and is now visible to the community.	{"storyId": "c9383727-c70d-4fb0-8adc-7639f76e2ecd"}	f	2025-09-04 07:41:06.990822+00	2025-09-04 07:41:06.990822+00
9b5d2bdf-cd03-4d9a-8e7a-5af2f34dbb57	68a1a829-86a2-47a7-bb98-2922f7335c90	system	Success Story Published	Your success story has been published and is now visible to the community.	{"storyId": "90903ecf-35a9-43a2-9f0f-b005c59bac9f"}	f	2025-09-04 07:44:40.467766+00	2025-09-04 07:44:40.467766+00
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.opportunities (opportunity_id, title_fr, title_mg, title_en, description_fr, description_mg, description_en, business_type, target_countries, industry, estimated_value, currency, expiration_date, status, created_at, updated_at, created_by) FROM stdin;
2f31dc91-5711-4f2f-90ec-f78070b83e88	Opportunité d'exportation	\N	Export Opportunity	Grande opportunité d'exportation pour les services numériques	\N	Great export opportunity for digital services	digital_services	["France", "Germany"]	Technology	50000.00	USD	2025-12-31	active	2025-08-07 06:31:18.357719+00	2025-08-07 06:31:18.357719+00	a9a341f1-9935-4ac5-9f1c-ac0735a4a06d
eee6338b-6537-4049-9a35-7774dc226645	Opportunité Vanille	\N	\N	Exportation de vanille vers l'Europe	\N	\N	agricultural	["France"]	\N	25000.00	EUR	2025-08-31	active	2025-08-07 06:34:48.053136+00	2025-08-07 06:34:48.053136+00	f51d036f-d08a-42b3-9dff-ab95589a8534
d795194c-4c96-49b2-8617-3e3894f22718	Export de Café	\N	Coffee Export	Opportunité d'exportation de café de haute qualité	\N	High-quality coffee export opportunity	agricultural	["Italy", "France"]	Agriculture	30000.00	EUR	2025-09-15	active	2025-08-07 06:38:09.563161+00	2025-08-07 06:38:09.563161+00	f51d036f-d08a-42b3-9dff-ab95589a8534
b3512795-af58-47b3-bcac-ff9814b68ac8	Production Textile	\N	Textile Manufacturing	Opportunité de production textile pour l'export	\N	Textile manufacturing opportunity for export	manufacturing	["South Africa", "Kenya"]	Textile	100000.00	USD	2025-12-15	active	2025-08-07 06:38:59.02364+00	2025-08-07 06:38:59.02364+00	f51d036f-d08a-42b3-9dff-ab95589a8534
abf337fe-03e0-4eb9-a3b1-5406a47e66e4	Export de Café	\N	Coffee Export	Opportunité d'exportation de café de haute qualité	\N	High-quality coffee export opportunity	agricultural	["Italy", "France"]	Agriculture	30000.00	EUR	2025-09-15	active	2025-08-07 08:14:12.661788+00	2025-08-07 08:14:12.661788+00	a9a341f1-9935-4ac5-9f1c-ac0735a4a06d
598cdf1c-5b90-4cba-b170-26117361ba98	Opportunité Mise à Jour	Fahafahana Nohavaozina	Updated Opportunity	Description mise à jour	Famaritana nohavaozina	Updated description	digital_services	["madagascar", "mauritius"]	technology	75000.00	MGA	2026-01-31	active	2025-08-07 07:01:20.292866+00	2025-08-07 13:54:54.05691+00	f51d036f-d08a-42b3-9dff-ab95589a8534
9fb3e76f-1a56-475e-b061-267ca0951632	Services Numériques	Serivisy Nomerika	Digital Services	Développement d'applications mobiles	Famoronana rindrambaiko finday	Mobile app development	digital_services	["France", "Canada"]	Software Development	75000.00	USD	2025-06-30	closed	2025-08-07 06:36:28.18036+00	2025-08-07 14:04:42.56893+00	f51d036f-d08a-42b3-9dff-ab95589a8534
764ed903-6f98-4fff-bdd4-22acb851d9ec	Offre simple	\N	\N	Description FR	\N	\N	digital_services	[]	\N	\N	MGA	\N	active	2025-09-01 10:52:22.829162+00	2025-09-01 10:52:22.829162+00	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c
8b5c5237-cb0d-4450-a619-651cdb39fd21	Offre simple	\N	\N	Description FR	\N	\N	digital_services	[]	\N	\N	MGA	\N	active	2025-09-01 11:38:34.488311+00	2025-09-01 11:38:34.488311+00	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c
af70c8e5-18f8-4079-a694-83adaa07be15	Offre simple	\N	\N	Description FR	\N	\N	digital_services	[]	\N	\N	MGA	\N	active	2025-09-01 12:19:04.907028+00	2025-09-01 12:19:04.907028+00	4a8e63d7-da17-49ff-919d-f4c1bfee3b8c
d792488b-382f-43c9-baf6-8994a4af0616	Titre FR MAJ	Lohateny MG	Title EN	Nouvelle description	Desc MG	Desc EN	manufacturing	["FR", "MG", "US"]	agro	2500000.00	MGA	2026-03-31	closed	2025-09-01 12:21:40.239917+00	2025-09-01 12:51:15.881734+00	68a1a829-86a2-47a7-bb98-2922f7335c90
\.


--
-- Data for Name: opportunity_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.opportunity_uploads (opportunity_id, upload_id, role, created_at) FROM stdin;
d792488b-382f-43c9-baf6-8994a4af0616	0da43b7f-e07e-42a5-a254-bf4cd1dc4f37	hero	2025-09-02 08:53:35.915907+00
\.


--
-- Data for Name: success_stories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.success_stories (story_id, business_id, title_fr, title_mg, title_en, content_fr, content_mg, content_en, media_urls, status, created_at, updated_at, created_by) FROM stdin;
90903ecf-35a9-43a2-9f0f-b005c59bac9f	36b87900-953a-4a10-88ac-50e1b9705317	First Export Win	\N	\N	We secured our first export deal in the region.	\N	\N	["https://example.com/img1.jpg", "https://example.com/img2.jpg"]	published	2025-09-04 07:44:39.000376+00	2025-09-04 07:44:39.000376+00	68a1a829-86a2-47a7-bb98-2922f7335c90
a9b83f55-b943-4cb0-ac4e-eaf18d2f059c	36b87900-953a-4a10-88ac-50e1b9705317	First Export Win (Updated)	\N	\N	Updated details and metrics.	\N	\N	["https://example.com/img1.jpg", "https://example.com/img2.jpg"]	published	2025-09-04 07:36:32.368528+00	2025-09-04 07:50:47.722871+00	\N
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.uploads (id, user_id, file_url, file_type, file_name, uploaded_at) FROM stdin;
7f7c5712-ed6d-461d-9607-05cf571d9aee	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/profile/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756794881875-LaraValeReflections.png	profile	LaraValeReflections.png	2025-09-02 06:34:45.701197+00
12868e35-158d-4bd1-8f1d-7334a091e7e4	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/business/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756795167660-LaraValeReflections.png	business	LaraValeReflections.png	2025-09-02 06:39:30.733609+00
dd93398d-bc25-46a9-bf71-63fd0c2fbc2d	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/business/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756801132683-LaraValeReflections.png	business	LaraValeReflections.png	2025-09-02 08:18:56.638874+00
722e0955-dfa9-4fbc-bddc-e1d53aa6ae07	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/opportunity/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756801392427-test.pdf	opportunity	test.pdf	2025-09-02 08:23:16.609951+00
77345316-cf59-4a27-8463-db85f8b60ae4	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/document/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756801635267-test.pdf	document	test.pdf	2025-09-02 08:27:19.627529+00
96ea9a37-5a41-477f-b357-03e8134520ab	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/profile/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756802908420-LaraValeReflections.png	profile	LaraValeReflections.png	2025-09-02 08:48:32.458009+00
0da43b7f-e07e-42a5-a254-bf4cd1dc4f37	68a1a829-86a2-47a7-bb98-2922f7335c90	https://storage.googleapis.com/miharina-hub-production-uploads/uploads/opportunity/VHwXSfNVKwWXiqY4cLXcrbUrkHn1/1756803211061-test.pdf	opportunity	test.pdf	2025-09-02 08:53:35.616885+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, phone_number, email, password_hash, preferred_language, is_verified, role, created_at, updated_at, created_by, firebase_uid, display_name, last_login_at, avatar_upload_id) FROM stdin;
a1ec5f1b-295e-473b-8dbd-89c1cb391654	+261340000009	roxabog792@cotasen.com	\N	mg	f	entrepreneur	2025-08-12 11:25:04.907342+00	2025-08-12 11:25:04.907342+00	\N	LqTut4ZmyZfGaTIUTMgWThkY5QM2	huitre tekat	\N	\N
951eefad-7fcb-4afe-9699-fa0c6cc45373	+261340000003	pokel89064@dekpal.com	\N	fr	f	entrepreneur	2025-08-05 11:44:16.368977+00	2025-08-05 11:44:16.368977+00	\N	zYQ6GNYWgxSoB6tqpHhQd2sLIBl2	Test User	\N	\N
90faa376-5b93-4331-974f-50f813b40495	+261340000002	roloreb313@efpaper.com	\N	fr	f	entrepreneur	2025-08-05 12:08:04.040968+00	2025-08-05 12:08:04.040968+00	\N	cNnNgErNGNdIhqzGBTds9bzqku82	Rolo Reb	\N	\N
588ba85f-3c05-45a6-9271-b95bebc76841	\N	nabow17189@nicext.com	\N	fr	f	entrepreneur	2025-08-06 11:46:40.354734+00	2025-08-06 11:46:40.354734+00	\N	yNhZIT99KUQzQkLulQFQWi0HbwI3	John Doe	\N	\N
ebb6bc72-1ade-4561-b618-b3802cabdb5b	+261340000005	xexedev474@hostbyt.com	\N	fr	f	entrepreneur	2025-08-07 05:15:28.84393+00	2025-08-07 05:15:28.84393+00	\N	zqItacQNlqeOU2bmKW9NSjwKG933	John Doe	\N	\N
f51d036f-d08a-42b3-9dff-ab95589a8534	+261340000054	lojit25789@dekpal.com	\N	fr	f	entrepreneur	2025-08-07 05:13:47.413945+00	2025-08-07 05:31:31.983283+00	\N	FHHxfXojb3fkaxXaoJyrMg9eigv1	LOHARANONTSOA Tsiky Lalaina	2025-08-07 05:25:25.579974+00	\N
a9a341f1-9935-4ac5-9f1c-ac0735a4a06d	+261340000011	hafap73534@im5z.com	\N	mg	f	entrepreneur	2025-08-05 12:04:49.132941+00	2025-08-07 06:06:43.413024+00	\N	1LxYTZVdBVZ1fEarK0DSycZ0G693	Nom Mis à Jour	2025-08-05 13:30:14.43179+00	\N
567f59ba-bbf3-42ea-b327-b4cad1b29410	+261340000010	bihiwi3862@aravites.com	\N	fr	f	entrepreneur	2025-08-08 12:12:10.709936+00	2025-08-08 12:12:10.709936+00	\N	sj3TwzBVlcbYb80eg78mmBoHMqW2	Bihiwi 3862	\N	\N
9896f89c-179b-4c9e-aa3e-74eb19eec233	+261340000006	gahafiy264@bizmud.com	\N	fr	f	entrepreneur	2025-08-12 11:06:31.832825+00	2025-08-12 11:06:31.832825+00	\N	AjXCp8CRhkRq93ucy1QxmNyz7F52	gahai fy	\N	\N
3b00110c-63bc-45ba-8cc0-f0756a2b9f86	+261340000008	tekat57701@discrip.com	\N	fr	f	entrepreneur	2025-08-12 11:12:33.965678+00	2025-08-12 11:12:33.965678+00	\N	2HfpnGBat4OpabZd4rCFola7OnC2	huitre tekat	\N	\N
cc1e3d72-873c-410c-ac2c-e4632d6fc5f8	+261340000012	new.email@example.com	\N	mg	f	entrepreneur	2025-08-12 12:57:14.862929+00	2025-08-12 13:47:04.804796+00	\N	40ADJ97GWOVUhiOIrToZ3cP1he52	New Name	2025-08-12 13:18:37.791732+00	\N
993a9ad5-2e3b-4af8-9a42-750d3a9f1d83	+261322827063	tsikyloharanontsoa@gmail.com	\N	mg	f	admin	2025-08-13 06:29:28.97778+00	2025-08-13 06:39:22.617675+00	\N	nbilH9IoHdTP4dr4WnzqEK1NaLn1	LOHARANONTSOA Tsiky Lalaina	\N	\N
28f5234d-23a2-4600-8278-f550510c8df2	\N	tsikyloharantsoa@gmail.com	\N	fr	f	admin	2025-08-13 06:47:06.288081+00	2025-08-13 06:47:06.288081+00	993a9ad5-2e3b-4af8-9a42-750d3a9f1d83	3uLZ86Pia6b0uti5k5DNI2mEp8E3	tsiky	\N	\N
5e150229-3649-4746-b11d-82c4e38b12be	\N	kolohis823@discrip.com	\N	fr	f	partner	2025-08-13 06:49:47.6169+00	2025-08-13 06:49:47.6169+00	993a9ad5-2e3b-4af8-9a42-750d3a9f1d83	kDie2hD3L4ZvLSr3rh0YXll4CSr2	Kolohis Partner	\N	\N
4a8e63d7-da17-49ff-919d-f4c1bfee3b8c	\N	senes66508@ahvin.com	\N	fr	f	entrepreneur	2025-08-13 06:52:26.13274+00	2025-08-13 06:52:26.13274+00	993a9ad5-2e3b-4af8-9a42-750d3a9f1d83	0RQk8xpGZlUZL5f6RAsoifUSEIE3	Entrepreneur Test	\N	\N
68a1a829-86a2-47a7-bb98-2922f7335c90	\N	wekace2484@ahvin.com	\N	fr	f	partner	2025-08-13 10:03:24.913386+00	2025-09-02 08:48:32.759123+00	28f5234d-23a2-4600-8278-f550510c8df2	VHwXSfNVKwWXiqY4cLXcrbUrkHn1	We Cake	2025-08-13 10:09:56.987652+00	96ea9a37-5a41-477f-b357-03e8134520ab
\.


--
-- Name: business_profiles business_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_pkey PRIMARY KEY (business_id);


--
-- Name: business_profiles business_profiles_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_registration_number_key UNIQUE (registration_number);


--
-- Name: matches matches_business_id_opportunity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_business_id_opportunity_id_key UNIQUE (business_id, opportunity_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (match_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (opportunity_id);


--
-- Name: opportunity_uploads opportunity_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_uploads
    ADD CONSTRAINT opportunity_uploads_pkey PRIMARY KEY (opportunity_id, upload_id);


--
-- Name: success_stories success_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_stories
    ADD CONSTRAINT success_stories_pkey PRIMARY KEY (story_id);


--
-- Name: uploads uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_business_profiles_business_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_business_type ON public.business_profiles USING btree (business_type);


--
-- Name: idx_business_profiles_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_region ON public.business_profiles USING btree (region);


--
-- Name: idx_business_profiles_search_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_search_en ON public.business_profiles USING gin (to_tsvector('english'::regconfig, (((name_en)::text || ' '::text) || description_en)));


--
-- Name: idx_business_profiles_search_fr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_search_fr ON public.business_profiles USING gin (to_tsvector('french'::regconfig, (((name_fr)::text || ' '::text) || description_fr)));


--
-- Name: idx_business_profiles_search_mg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_search_mg ON public.business_profiles USING gin (to_tsvector('simple'::regconfig, (((name_mg)::text || ' '::text) || description_mg)));


--
-- Name: idx_business_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profiles_user_id ON public.business_profiles USING btree (user_id);


--
-- Name: idx_matches_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_business_id ON public.matches USING btree (business_id);


--
-- Name: idx_matches_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_created_by ON public.matches USING btree (created_by);


--
-- Name: idx_matches_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_opportunity_id ON public.matches USING btree (opportunity_id);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_messages_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_match_id ON public.messages USING btree (match_id);


--
-- Name: idx_messages_receiver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_receiver_id ON public.messages USING btree (receiver_id);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_opportunities_business_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_business_type ON public.opportunities USING btree (business_type);


--
-- Name: idx_opportunities_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_created_by ON public.opportunities USING btree (created_by);


--
-- Name: idx_opportunities_search_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_search_en ON public.opportunities USING gin (to_tsvector('english'::regconfig, (((title_en)::text || ' '::text) || description_en)));


--
-- Name: idx_opportunities_search_fr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_search_fr ON public.opportunities USING gin (to_tsvector('french'::regconfig, (((title_fr)::text || ' '::text) || description_fr)));


--
-- Name: idx_opportunities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_status ON public.opportunities USING btree (status);


--
-- Name: idx_opportunity_uploads_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_uploads_opportunity_id ON public.opportunity_uploads USING btree (opportunity_id);


--
-- Name: idx_opportunity_uploads_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_uploads_upload_id ON public.opportunity_uploads USING btree (upload_id);


--
-- Name: idx_success_stories_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_success_stories_business_id ON public.success_stories USING btree (business_id);


--
-- Name: idx_success_stories_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_success_stories_created_by ON public.success_stories USING btree (created_by);


--
-- Name: idx_success_stories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_success_stories_status ON public.success_stories USING btree (status);


--
-- Name: idx_uploads_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_uploaded_at ON public.uploads USING btree (uploaded_at DESC);


--
-- Name: idx_uploads_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uploads_user_id ON public.uploads USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone_number ON public.users USING btree (phone_number);


--
-- Name: notifications trg_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: business_profiles update_business_profiles_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_profiles_timestamp BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: matches update_matches_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_matches_timestamp BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: messages update_messages_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_timestamp BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: opportunities update_opportunities_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_opportunities_timestamp BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: success_stories update_success_stories_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_success_stories_timestamp BEFORE UPDATE ON public.success_stories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: users update_users_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: business_profiles business_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: business_profiles business_profiles_logo_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_logo_upload_id_fkey FOREIGN KEY (logo_upload_id) REFERENCES public.uploads(id) ON DELETE SET NULL;


--
-- Name: business_profiles business_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: matches matches_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_profiles(business_id);


--
-- Name: matches matches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: matches matches_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id);


--
-- Name: messages messages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: messages messages_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(match_id);


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(user_id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id);


--
-- Name: opportunities opportunities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: opportunity_uploads opportunity_uploads_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_uploads
    ADD CONSTRAINT opportunity_uploads_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(opportunity_id) ON DELETE CASCADE;


--
-- Name: opportunity_uploads opportunity_uploads_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_uploads
    ADD CONSTRAINT opportunity_uploads_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.uploads(id) ON DELETE CASCADE;


--
-- Name: success_stories success_stories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_stories
    ADD CONSTRAINT success_stories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business_profiles(business_id);


--
-- Name: success_stories success_stories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_stories
    ADD CONSTRAINT success_stories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: uploads uploads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_avatar_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_avatar_upload_id_fkey FOREIGN KEY (avatar_upload_id) REFERENCES public.uploads(id) ON DELETE SET NULL;


--
-- Name: users users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: SCHEMA miharina; Type: ACL; Schema: -; Owner: -
--

GRANT ALL ON SCHEMA miharina TO miharina_app;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

REVOKE ALL ON SCHEMA public FROM cloudsqladmin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

