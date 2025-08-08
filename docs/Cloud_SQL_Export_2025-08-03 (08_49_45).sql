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
    CONSTRAINT business_profiles_business_type_check CHECK (((business_type)::text = ANY ((ARRAY['agricultural'::character varying, 'artisan'::character varying, 'digital_services'::character varying, 'manufacturing'::character varying])::text[]))),
    CONSTRAINT business_profiles_contact_phone_check CHECK (((contact_phone)::text ~ '^\+261[0-9]{9}$'::text)),
    CONSTRAINT business_profiles_currency_check CHECK (((currency)::text = ANY ((ARRAY['MGA'::character varying, 'USD'::character varying, 'EUR'::character varying])::text[]))),
    CONSTRAINT business_profiles_region_check CHECK (((region)::text = ANY ((ARRAY['Antananarivo'::character varying, 'Fianarantsoa'::character varying, 'Toamasina'::character varying, 'Mahajanga'::character varying, 'Toliara'::character varying, 'Antsiranana'::character varying])::text[]))),
    CONSTRAINT business_profiles_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
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
    CONSTRAINT matches_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    message_id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    CONSTRAINT messages_original_language_check CHECK (((original_language)::text = ANY ((ARRAY['fr'::character varying, 'mg'::character varying, 'en'::character varying])::text[])))
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
    CONSTRAINT opportunities_business_type_check CHECK (((business_type)::text = ANY ((ARRAY['agricultural'::character varying, 'artisan'::character varying, 'digital_services'::character varying, 'manufacturing'::character varying])::text[]))),
    CONSTRAINT opportunities_currency_check CHECK (((currency)::text = ANY ((ARRAY['MGA'::character varying, 'USD'::character varying, 'EUR'::character varying])::text[]))),
    CONSTRAINT opportunities_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: success_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.success_stories (
    story_id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    CONSTRAINT success_stories_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(15),
    email character varying(255),
    password_hash character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    preferred_language character varying(2) DEFAULT 'fr'::character varying,
    is_verified boolean DEFAULT false,
    role character varying(20) DEFAULT 'entrepreneur'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    firebase_uid character varying(255),
    display_name character varying(255),
    last_login_at timestamp with time zone,
    CONSTRAINT users_phone_number_check CHECK (((phone_number)::text ~ '^\+261[0-9]{9}$'::text)),
    CONSTRAINT users_preferred_language_check CHECK (((preferred_language)::text = ANY ((ARRAY['fr'::character varying, 'mg'::character varying, 'en'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['entrepreneur'::character varying, 'admin'::character varying, 'partner'::character varying])::text[])))
);


--
-- Data for Name: business_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_profiles (business_id, user_id, name_fr, name_mg, name_en, description_fr, description_mg, description_en, region, business_type, registration_number, export_interests, contact_phone, contact_email, website_url, is_verified, verification_status, currency, created_at, updated_at, created_by) FROM stdin;
a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d	550e8400-e29b-41d4-a716-446655440001	Ferme Ranjana	Toeram-pambolena Ranjana	Ranjana Farm	Production de vanille de qualit‚	Fambolena vanila tsara kalitao	High-quality vanilla production	Antananarivo	agricultural	REG123456	{"products": ["vanilla", "spices"], "countries": ["Mauritius", "South Africa"]}	+261330123456	rana@farm.mg	\N	t	approved	MGA	2025-07-25 05:38:45.596286+00	2025-07-25 05:38:45.596286+00	\N
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.matches (match_id, business_id, opportunity_id, match_score, match_reason, status, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (message_id, sender_id, receiver_id, match_id, content, original_language, translated_content, is_read, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.opportunities (opportunity_id, title_fr, title_mg, title_en, description_fr, description_mg, description_en, business_type, target_countries, industry, estimated_value, currency, expiration_date, status, created_at, updated_at, created_by) FROM stdin;
b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e	Exportation de vanille	Fanondranana vanila	Vanilla Export	Recherche de partenaires pour exportation de vanille	Mitady mpiara-miasa amin'ny fanondranana vanila	Seeking partners for vanilla export	agricultural	{"countries": ["Mauritius"]}	Spices	1000000.00	USD	2026-01-01	active	2025-07-25 05:38:47.802908+00	2025-07-25 05:38:47.802908+00	550e8400-e29b-41d4-a716-446655440000
\.


--
-- Data for Name: success_stories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.success_stories (story_id, business_id, title_fr, title_mg, title_en, content_fr, content_mg, content_en, media_urls, status, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, phone_number, email, password_hash, first_name, last_name, preferred_language, is_verified, role, created_at, updated_at, created_by, firebase_uid, display_name, last_login_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	+261320123456	admin@miharina.mg	$2b$10$hashedpassword	Admin	Miharina	fr	t	admin	2025-07-25 05:38:45.308609+00	2025-07-25 05:38:45.308609+00	\N	\N	\N	\N
550e8400-e29b-41d4-a716-446655440001	+261330123456	rana@farm.mg	$2b$10$hashedpassword	Ranjana	Andria	mg	t	entrepreneur	2025-07-25 05:38:45.308609+00	2025-07-25 05:38:45.308609+00	\N	\N	\N	\N
ebb404a9-a40d-47f7-8856-fb40ed9c90fd	\N	test@example.com	\N	\N	\N	fr	f	entrepreneur	2025-08-01 13:57:01.492953+00	2025-08-01 13:57:01.492953+00	\N	BXLqvwE2FLgeajursi3GByr6QP62	Test User	\N
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
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (opportunity_id);


--
-- Name: success_stories success_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.success_stories
    ADD CONSTRAINT success_stories_pkey PRIMARY KEY (story_id);


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
-- Name: idx_opportunities_business_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_business_type ON public.opportunities USING btree (business_type);


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
-- Name: idx_success_stories_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_success_stories_business_id ON public.success_stories USING btree (business_id);


--
-- Name: idx_success_stories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_success_stories_status ON public.success_stories USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone_number ON public.users USING btree (phone_number);


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
-- Name: business_profiles business_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


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

