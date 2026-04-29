--
-- PostgreSQL database dump
--

\restrict Lk6cqUxGuoePXHt4UvUTEidZMxEmpV0A6o6vXdTdfT8MkKKcx0PunlGK6sCygfD

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

ALTER TABLE IF EXISTS ONLY public.vendor_passwords DROP CONSTRAINT IF EXISTS vendor_passwords_seat_id_org_chart_seats_id_fk;
ALTER TABLE IF EXISTS ONLY public.seat_tasks DROP CONSTRAINT IF EXISTS seat_tasks_seat_id_org_chart_seats_id_fk;
ALTER TABLE IF EXISTS ONLY public.seat_key_results DROP CONSTRAINT IF EXISTS seat_key_results_seat_id_org_chart_seats_id_fk;
ALTER TABLE IF EXISTS ONLY public.role_tasks DROP CONSTRAINT IF EXISTS role_tasks_role_id_roles_id_fk;
ALTER TABLE IF EXISTS ONLY public.role_key_results DROP CONSTRAINT IF EXISTS role_key_results_role_id_roles_id_fk;
ALTER TABLE IF EXISTS ONLY public.org_chart_seats DROP CONSTRAINT IF EXISTS org_chart_seats_parent_seat_id_org_chart_seats_id_fk;
ALTER TABLE IF EXISTS ONLY public.org_chart_seats DROP CONSTRAINT IF EXISTS org_chart_seats_organization_id_organizations_id_fk;
ALTER TABLE IF EXISTS ONLY public.meeting_key_topics DROP CONSTRAINT IF EXISTS meeting_key_topics_agenda_id_meeting_agendas_id_fk;
ALTER TABLE IF EXISTS ONLY public.meeting_agendas DROP CONSTRAINT IF EXISTS meeting_agendas_series_id_meeting_series_id_fk;
ALTER TABLE IF EXISTS ONLY public.meeting_action_items DROP CONSTRAINT IF EXISTS meeting_action_items_agenda_id_meeting_agendas_id_fk;
ALTER TABLE IF EXISTS ONLY public.direct_reports DROP CONSTRAINT IF EXISTS direct_reports_organization_id_organizations_id_fk;
ALTER TABLE IF EXISTS ONLY public.direct_report_view_as_me_grants DROP CONSTRAINT IF EXISTS direct_report_view_as_me_grants_grantee_report_id_direct_report;
ALTER TABLE IF EXISTS ONLY public.direct_report_view_as_me_grants DROP CONSTRAINT IF EXISTS direct_report_view_as_me_grants_direct_report_id_direct_reports;
ALTER TABLE IF EXISTS ONLY public.direct_report_additional_viewers DROP CONSTRAINT IF EXISTS direct_report_additional_viewers_viewer_report_id_direct_report;
ALTER TABLE IF EXISTS ONLY public.direct_report_additional_viewers DROP CONSTRAINT IF EXISTS direct_report_additional_viewers_direct_report_id_direct_report;
ALTER TABLE IF EXISTS ONLY public.action_items DROP CONSTRAINT IF EXISTS action_items_owner_user_id_users_id_fk;
DROP INDEX IF EXISTS public.weekly_review_year_week_field_uniq;
DROP INDEX IF EXISTS public.view_as_me_grants_pair_unique;
DROP INDEX IF EXISTS public.additional_viewers_pair_unique;
ALTER TABLE IF EXISTS ONLY public.yearly_planning_sections DROP CONSTRAINT IF EXISTS yearly_planning_sections_section_key_unique;
ALTER TABLE IF EXISTS ONLY public.yearly_planning_sections DROP CONSTRAINT IF EXISTS yearly_planning_sections_pkey;
ALTER TABLE IF EXISTS ONLY public.wisdom_quotes DROP CONSTRAINT IF EXISTS wisdom_quotes_pkey;
ALTER TABLE IF EXISTS ONLY public.weekly_top3 DROP CONSTRAINT IF EXISTS weekly_top3_pkey;
ALTER TABLE IF EXISTS ONLY public.weekly_review_entries DROP CONSTRAINT IF EXISTS weekly_review_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_passwords DROP CONSTRAINT IF EXISTS vendor_passwords_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.seat_tasks DROP CONSTRAINT IF EXISTS seat_tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.seat_key_results DROP CONSTRAINT IF EXISTS seat_key_results_pkey;
ALTER TABLE IF EXISTS ONLY public.schedule_blocks DROP CONSTRAINT IF EXISTS schedule_blocks_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.role_tasks DROP CONSTRAINT IF EXISTS role_tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.role_key_results DROP CONSTRAINT IF EXISTS role_key_results_pkey;
ALTER TABLE IF EXISTS ONLY public.ritual_items DROP CONSTRAINT IF EXISTS ritual_items_pkey;
ALTER TABLE IF EXISTS ONLY public.reading_list DROP CONSTRAINT IF EXISTS reading_list_pkey;
ALTER TABLE IF EXISTS ONLY public.playbooks DROP CONSTRAINT IF EXISTS playbooks_pkey;
ALTER TABLE IF EXISTS ONLY public.organizations DROP CONSTRAINT IF EXISTS organizations_pkey;
ALTER TABLE IF EXISTS ONLY public.org_chart_seats DROP CONSTRAINT IF EXISTS org_chart_seats_pkey;
ALTER TABLE IF EXISTS ONLY public.morning_ritual_completions DROP CONSTRAINT IF EXISTS morning_ritual_completions_pkey;
ALTER TABLE IF EXISTS ONLY public.meeting_series DROP CONSTRAINT IF EXISTS meeting_series_pkey;
ALTER TABLE IF EXISTS ONLY public.meeting_key_topics DROP CONSTRAINT IF EXISTS meeting_key_topics_pkey;
ALTER TABLE IF EXISTS ONLY public.meeting_agendas DROP CONSTRAINT IF EXISTS meeting_agendas_pkey;
ALTER TABLE IF EXISTS ONLY public.meeting_action_items DROP CONSTRAINT IF EXISTS meeting_action_items_pkey;
ALTER TABLE IF EXISTS ONLY public.journal_responses DROP CONSTRAINT IF EXISTS journal_responses_pkey;
ALTER TABLE IF EXISTS ONLY public.ideal_week_rituals DROP CONSTRAINT IF EXISTS ideal_week_rituals_pkey;
ALTER TABLE IF EXISTS ONLY public.ideal_week_completions DROP CONSTRAINT IF EXISTS ideal_week_completions_pkey;
ALTER TABLE IF EXISTS ONLY public.future_todos DROP CONSTRAINT IF EXISTS future_todos_pkey;
ALTER TABLE IF EXISTS ONLY public.direct_reports DROP CONSTRAINT IF EXISTS direct_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.direct_report_view_as_me_grants DROP CONSTRAINT IF EXISTS direct_report_view_as_me_grants_pkey;
ALTER TABLE IF EXISTS ONLY public.direct_report_additional_viewers DROP CONSTRAINT IF EXISTS direct_report_additional_viewers_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_top3 DROP CONSTRAINT IF EXISTS daily_top3_pkey;
ALTER TABLE IF EXISTS ONLY public.buildout_cards DROP CONSTRAINT IF EXISTS buildout_cards_pkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_pkey;
ALTER TABLE IF EXISTS ONLY public.activity DROP CONSTRAINT IF EXISTS activity_pkey;
ALTER TABLE IF EXISTS ONLY public.action_items DROP CONSTRAINT IF EXISTS action_items_pkey;
ALTER TABLE IF EXISTS public.yearly_planning_sections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.wisdom_quotes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.weekly_top3 ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.weekly_review_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendor_passwords ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.seat_tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.seat_key_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.schedule_blocks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.role_tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.role_key_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ritual_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reading_list ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.playbooks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.organizations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.org_chart_seats ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.morning_ritual_completions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.meeting_series ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.meeting_key_topics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.meeting_agendas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.meeting_action_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.journal_responses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ideal_week_rituals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ideal_week_completions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.future_todos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.direct_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.direct_report_view_as_me_grants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.direct_report_additional_viewers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_top3 ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.buildout_cards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.announcements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.activity ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.action_items ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.yearly_planning_sections_id_seq;
DROP TABLE IF EXISTS public.yearly_planning_sections;
DROP SEQUENCE IF EXISTS public.wisdom_quotes_id_seq;
DROP TABLE IF EXISTS public.wisdom_quotes;
DROP SEQUENCE IF EXISTS public.weekly_top3_id_seq;
DROP TABLE IF EXISTS public.weekly_top3;
DROP SEQUENCE IF EXISTS public.weekly_review_entries_id_seq;
DROP TABLE IF EXISTS public.weekly_review_entries;
DROP SEQUENCE IF EXISTS public.vendor_passwords_id_seq;
DROP TABLE IF EXISTS public.vendor_passwords;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.seat_tasks_id_seq;
DROP TABLE IF EXISTS public.seat_tasks;
DROP SEQUENCE IF EXISTS public.seat_key_results_id_seq;
DROP TABLE IF EXISTS public.seat_key_results;
DROP SEQUENCE IF EXISTS public.schedule_blocks_id_seq;
DROP TABLE IF EXISTS public.schedule_blocks;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.role_tasks_id_seq;
DROP TABLE IF EXISTS public.role_tasks;
DROP SEQUENCE IF EXISTS public.role_key_results_id_seq;
DROP TABLE IF EXISTS public.role_key_results;
DROP SEQUENCE IF EXISTS public.ritual_items_id_seq;
DROP TABLE IF EXISTS public.ritual_items;
DROP SEQUENCE IF EXISTS public.reading_list_id_seq;
DROP TABLE IF EXISTS public.reading_list;
DROP SEQUENCE IF EXISTS public.playbooks_id_seq;
DROP TABLE IF EXISTS public.playbooks;
DROP SEQUENCE IF EXISTS public.organizations_id_seq;
DROP TABLE IF EXISTS public.organizations;
DROP SEQUENCE IF EXISTS public.org_chart_seats_id_seq;
DROP TABLE IF EXISTS public.org_chart_seats;
DROP SEQUENCE IF EXISTS public.morning_ritual_completions_id_seq;
DROP TABLE IF EXISTS public.morning_ritual_completions;
DROP SEQUENCE IF EXISTS public.meeting_series_id_seq;
DROP TABLE IF EXISTS public.meeting_series;
DROP SEQUENCE IF EXISTS public.meeting_key_topics_id_seq;
DROP TABLE IF EXISTS public.meeting_key_topics;
DROP SEQUENCE IF EXISTS public.meeting_agendas_id_seq;
DROP TABLE IF EXISTS public.meeting_agendas;
DROP SEQUENCE IF EXISTS public.meeting_action_items_id_seq;
DROP TABLE IF EXISTS public.meeting_action_items;
DROP SEQUENCE IF EXISTS public.journal_responses_id_seq;
DROP TABLE IF EXISTS public.journal_responses;
DROP SEQUENCE IF EXISTS public.ideal_week_rituals_id_seq;
DROP TABLE IF EXISTS public.ideal_week_rituals;
DROP SEQUENCE IF EXISTS public.ideal_week_completions_id_seq;
DROP TABLE IF EXISTS public.ideal_week_completions;
DROP SEQUENCE IF EXISTS public.future_todos_id_seq;
DROP TABLE IF EXISTS public.future_todos;
DROP SEQUENCE IF EXISTS public.direct_reports_id_seq;
DROP TABLE IF EXISTS public.direct_reports;
DROP SEQUENCE IF EXISTS public.direct_report_view_as_me_grants_id_seq;
DROP TABLE IF EXISTS public.direct_report_view_as_me_grants;
DROP SEQUENCE IF EXISTS public.direct_report_additional_viewers_id_seq;
DROP TABLE IF EXISTS public.direct_report_additional_viewers;
DROP SEQUENCE IF EXISTS public.daily_top3_id_seq;
DROP TABLE IF EXISTS public.daily_top3;
DROP SEQUENCE IF EXISTS public.buildout_cards_id_seq;
DROP TABLE IF EXISTS public.buildout_cards;
DROP SEQUENCE IF EXISTS public.announcements_id_seq;
DROP TABLE IF EXISTS public.announcements;
DROP SEQUENCE IF EXISTS public.activity_id_seq;
DROP TABLE IF EXISTS public.activity;
DROP SEQUENCE IF EXISTS public.action_items_id_seq;
DROP TABLE IF EXISTS public.action_items;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_items (
    id integer NOT NULL,
    title text NOT NULL,
    source text NOT NULL,
    owner_name text NOT NULL,
    owner_initials text NOT NULL,
    due_by text DEFAULT '—'::text NOT NULL,
    due_by_full text DEFAULT ''::text NOT NULL,
    notes jsonb,
    starred boolean DEFAULT false NOT NULL,
    done boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_user_id text
);


--
-- Name: action_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.action_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: action_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.action_items_id_seq OWNED BY public.action_items.id;


--
-- Name: activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity (
    id integer NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    entity_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_id_seq OWNED BY public.activity.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: buildout_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildout_cards (
    id integer NOT NULL,
    title text NOT NULL,
    owner_name text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'backlog'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    kra_link text,
    target_done_date text,
    definition_of_done text DEFAULT ''::text NOT NULL,
    blocker text,
    escalation_trigger text,
    category_fields jsonb,
    activity_log jsonb,
    waiting_since timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_area text DEFAULT 'Operations'::text NOT NULL,
    organization_id integer
);


--
-- Name: buildout_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buildout_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buildout_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buildout_cards_id_seq OWNED BY public.buildout_cards.id;


--
-- Name: daily_top3; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_top3 (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean DEFAULT false NOT NULL,
    priority integer NOT NULL,
    date date DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: daily_top3_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_top3_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_top3_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_top3_id_seq OWNED BY public.daily_top3.id;


--
-- Name: direct_report_additional_viewers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_report_additional_viewers (
    id integer NOT NULL,
    direct_report_id integer NOT NULL,
    viewer_report_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: direct_report_additional_viewers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direct_report_additional_viewers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direct_report_additional_viewers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direct_report_additional_viewers_id_seq OWNED BY public.direct_report_additional_viewers.id;


--
-- Name: direct_report_view_as_me_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_report_view_as_me_grants (
    id integer NOT NULL,
    direct_report_id integer NOT NULL,
    grantee_report_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: direct_report_view_as_me_grants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direct_report_view_as_me_grants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direct_report_view_as_me_grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direct_report_view_as_me_grants_id_seq OWNED BY public.direct_report_view_as_me_grants.id;


--
-- Name: direct_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_reports (
    id integer NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    email text NOT NULL,
    phone text,
    organization_id integer,
    status text DEFAULT 'active'::text NOT NULL,
    hire_date date,
    performance_rating real,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization text
);


--
-- Name: direct_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direct_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direct_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direct_reports_id_seq OWNED BY public.direct_reports.id;


--
-- Name: future_todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.future_todos (
    id integer NOT NULL,
    title text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: future_todos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.future_todos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: future_todos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.future_todos_id_seq OWNED BY public.future_todos.id;


--
-- Name: ideal_week_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideal_week_completions (
    id integer NOT NULL,
    ritual_id integer NOT NULL,
    date text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideal_week_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ideal_week_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ideal_week_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ideal_week_completions_id_seq OWNED BY public.ideal_week_completions.id;


--
-- Name: ideal_week_rituals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideal_week_rituals (
    id integer NOT NULL,
    name text NOT NULL,
    frequency text DEFAULT 'daily'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideal_week_rituals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ideal_week_rituals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ideal_week_rituals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ideal_week_rituals_id_seq OWNED BY public.ideal_week_rituals.id;


--
-- Name: journal_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_responses (
    id integer NOT NULL,
    prompt_key text NOT NULL,
    date text NOT NULL,
    response text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: journal_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_responses_id_seq OWNED BY public.journal_responses.id;


--
-- Name: meeting_action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_action_items (
    id integer NOT NULL,
    agenda_id integer NOT NULL,
    item text NOT NULL,
    owner text,
    due_date text,
    is_daily_top_3 boolean DEFAULT false NOT NULL,
    notes text,
    completed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meeting_action_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meeting_action_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meeting_action_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meeting_action_items_id_seq OWNED BY public.meeting_action_items.id;


--
-- Name: meeting_agendas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_agendas (
    id integer NOT NULL,
    series_id integer NOT NULL,
    name text NOT NULL,
    section_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meeting_agendas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meeting_agendas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meeting_agendas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meeting_agendas_id_seq OWNED BY public.meeting_agendas.id;


--
-- Name: meeting_key_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_key_topics (
    id integer NOT NULL,
    agenda_id integer NOT NULL,
    core_issue text NOT NULL,
    owner text,
    notes text,
    resolved boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meeting_key_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meeting_key_topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meeting_key_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meeting_key_topics_id_seq OWNED BY public.meeting_key_topics.id;


--
-- Name: meeting_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_series (
    id integer NOT NULL,
    name text NOT NULL,
    members jsonb DEFAULT '[]'::jsonb NOT NULL,
    desired_future text,
    desired_future_status text DEFAULT 'on-pace'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization text
);


--
-- Name: meeting_series_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meeting_series_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meeting_series_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meeting_series_id_seq OWNED BY public.meeting_series.id;


--
-- Name: morning_ritual_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.morning_ritual_completions (
    id integer NOT NULL,
    item_key text NOT NULL,
    date text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: morning_ritual_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.morning_ritual_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: morning_ritual_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.morning_ritual_completions_id_seq OWNED BY public.morning_ritual_completions.id;


--
-- Name: org_chart_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_chart_seats (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    parent_seat_id integer,
    title text NOT NULL,
    name text,
    accountabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    key_results_area jsonb DEFAULT '[]'::jsonb NOT NULL,
    photo_url text
);


--
-- Name: org_chart_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.org_chart_seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: org_chart_seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.org_chart_seats_id_seq OWNED BY public.org_chart_seats.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    phone text,
    email text,
    provider_count integer DEFAULT 0,
    patient_count integer DEFAULT 0,
    monthly_revenue real DEFAULT 0,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'edge'::text NOT NULL,
    belt_classification text
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: playbooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playbooks (
    id integer NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'Operational Process'::text NOT NULL,
    purpose text DEFAULT ''::text NOT NULL,
    when_to_use text DEFAULT ''::text NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    decision_points text DEFAULT ''::text NOT NULL,
    common_pitfalls text DEFAULT ''::text NOT NULL,
    related_playbook_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    role_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_reviewed_by text DEFAULT ''::text NOT NULL,
    last_reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playbooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playbooks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playbooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playbooks_id_seq OWNED BY public.playbooks.id;


--
-- Name: reading_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_list (
    id integer NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed boolean DEFAULT false NOT NULL
);


--
-- Name: reading_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reading_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reading_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reading_list_id_seq OWNED BY public.reading_list.id;


--
-- Name: ritual_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ritual_items (
    id integer NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ritual_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ritual_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ritual_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ritual_items_id_seq OWNED BY public.ritual_items.id;


--
-- Name: role_key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_key_results (
    id integer NOT NULL,
    role_id integer NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_key_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_key_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_key_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_key_results_id_seq OWNED BY public.role_key_results.id;


--
-- Name: role_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_tasks (
    id integer NOT NULL,
    role_id integer NOT NULL,
    key_result_id integer,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assignee text,
    due_date text,
    completed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_tasks_id_seq OWNED BY public.role_tasks.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    title text NOT NULL,
    seat_holder_name text DEFAULT 'Open'::text NOT NULL,
    seat_holder_initials text DEFAULT ''::text NOT NULL,
    reports_to_role_id integer,
    business_area text DEFAULT 'Operations'::text NOT NULL,
    tier text DEFAULT 'Operations Support'::text NOT NULL,
    purpose_statement text DEFAULT ''::text NOT NULL,
    mission_alignment text DEFAULT ''::text NOT NULL,
    cultural_alignment text DEFAULT ''::text NOT NULL,
    veg_style_impact text DEFAULT ''::text NOT NULL,
    checklists jsonb DEFAULT '{"downtime": [], "endOfDay": [], "startOfDay": []}'::jsonb NOT NULL,
    decisions jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id integer,
    key_results_area jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: schedule_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_blocks (
    id integer NOT NULL,
    day text NOT NULL,
    start real NOT NULL,
    duration real NOT NULL,
    label text NOT NULL,
    category text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedule_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedule_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedule_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedule_blocks_id_seq OWNED BY public.schedule_blocks.id;


--
-- Name: seat_key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_key_results (
    id integer NOT NULL,
    seat_id integer NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seat_key_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seat_key_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seat_key_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seat_key_results_id_seq OWNED BY public.seat_key_results.id;


--
-- Name: seat_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_tasks (
    id integer NOT NULL,
    seat_id integer NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    due_date text,
    completed boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assignee text,
    key_result_id integer
);


--
-- Name: seat_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seat_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seat_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seat_tasks_id_seq OWNED BY public.seat_tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text,
    name text NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_passwords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_passwords (
    id integer NOT NULL,
    seat_id integer NOT NULL,
    vendor_name text NOT NULL,
    username text,
    password text,
    url text,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_passwords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_passwords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_passwords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_passwords_id_seq OWNED BY public.vendor_passwords.id;


--
-- Name: weekly_review_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_review_entries (
    id integer NOT NULL,
    year integer NOT NULL,
    week integer NOT NULL,
    field_key text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_review_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekly_review_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekly_review_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekly_review_entries_id_seq OWNED BY public.weekly_review_entries.id;


--
-- Name: weekly_top3; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_top3 (
    id integer NOT NULL,
    title text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    priority integer NOT NULL,
    week_start text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_top3_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weekly_top3_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weekly_top3_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weekly_top3_id_seq OWNED BY public.weekly_top3.id;


--
-- Name: wisdom_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wisdom_quotes (
    id integer NOT NULL,
    text text NOT NULL,
    author text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wisdom_quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wisdom_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wisdom_quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wisdom_quotes_id_seq OWNED BY public.wisdom_quotes.id;


--
-- Name: yearly_planning_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.yearly_planning_sections (
    id integer NOT NULL,
    section_key text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: yearly_planning_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.yearly_planning_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: yearly_planning_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.yearly_planning_sections_id_seq OWNED BY public.yearly_planning_sections.id;


--
-- Name: action_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items ALTER COLUMN id SET DEFAULT nextval('public.action_items_id_seq'::regclass);


--
-- Name: activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity ALTER COLUMN id SET DEFAULT nextval('public.activity_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: buildout_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildout_cards ALTER COLUMN id SET DEFAULT nextval('public.buildout_cards_id_seq'::regclass);


--
-- Name: daily_top3 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_top3 ALTER COLUMN id SET DEFAULT nextval('public.daily_top3_id_seq'::regclass);


--
-- Name: direct_report_additional_viewers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_additional_viewers ALTER COLUMN id SET DEFAULT nextval('public.direct_report_additional_viewers_id_seq'::regclass);


--
-- Name: direct_report_view_as_me_grants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_view_as_me_grants ALTER COLUMN id SET DEFAULT nextval('public.direct_report_view_as_me_grants_id_seq'::regclass);


--
-- Name: direct_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_reports ALTER COLUMN id SET DEFAULT nextval('public.direct_reports_id_seq'::regclass);


--
-- Name: future_todos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_todos ALTER COLUMN id SET DEFAULT nextval('public.future_todos_id_seq'::regclass);


--
-- Name: ideal_week_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideal_week_completions ALTER COLUMN id SET DEFAULT nextval('public.ideal_week_completions_id_seq'::regclass);


--
-- Name: ideal_week_rituals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideal_week_rituals ALTER COLUMN id SET DEFAULT nextval('public.ideal_week_rituals_id_seq'::regclass);


--
-- Name: journal_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_responses ALTER COLUMN id SET DEFAULT nextval('public.journal_responses_id_seq'::regclass);


--
-- Name: meeting_action_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_action_items ALTER COLUMN id SET DEFAULT nextval('public.meeting_action_items_id_seq'::regclass);


--
-- Name: meeting_agendas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agendas ALTER COLUMN id SET DEFAULT nextval('public.meeting_agendas_id_seq'::regclass);


--
-- Name: meeting_key_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_key_topics ALTER COLUMN id SET DEFAULT nextval('public.meeting_key_topics_id_seq'::regclass);


--
-- Name: meeting_series id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_series ALTER COLUMN id SET DEFAULT nextval('public.meeting_series_id_seq'::regclass);


--
-- Name: morning_ritual_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.morning_ritual_completions ALTER COLUMN id SET DEFAULT nextval('public.morning_ritual_completions_id_seq'::regclass);


--
-- Name: org_chart_seats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_chart_seats ALTER COLUMN id SET DEFAULT nextval('public.org_chart_seats_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: playbooks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playbooks ALTER COLUMN id SET DEFAULT nextval('public.playbooks_id_seq'::regclass);


--
-- Name: reading_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list ALTER COLUMN id SET DEFAULT nextval('public.reading_list_id_seq'::regclass);


--
-- Name: ritual_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ritual_items ALTER COLUMN id SET DEFAULT nextval('public.ritual_items_id_seq'::regclass);


--
-- Name: role_key_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_key_results ALTER COLUMN id SET DEFAULT nextval('public.role_key_results_id_seq'::regclass);


--
-- Name: role_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_tasks ALTER COLUMN id SET DEFAULT nextval('public.role_tasks_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: schedule_blocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_blocks ALTER COLUMN id SET DEFAULT nextval('public.schedule_blocks_id_seq'::regclass);


--
-- Name: seat_key_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_key_results ALTER COLUMN id SET DEFAULT nextval('public.seat_key_results_id_seq'::regclass);


--
-- Name: seat_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_tasks ALTER COLUMN id SET DEFAULT nextval('public.seat_tasks_id_seq'::regclass);


--
-- Name: vendor_passwords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_passwords ALTER COLUMN id SET DEFAULT nextval('public.vendor_passwords_id_seq'::regclass);


--
-- Name: weekly_review_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_review_entries ALTER COLUMN id SET DEFAULT nextval('public.weekly_review_entries_id_seq'::regclass);


--
-- Name: weekly_top3 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_top3 ALTER COLUMN id SET DEFAULT nextval('public.weekly_top3_id_seq'::regclass);


--
-- Name: wisdom_quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wisdom_quotes ALTER COLUMN id SET DEFAULT nextval('public.wisdom_quotes_id_seq'::regclass);


--
-- Name: yearly_planning_sections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.yearly_planning_sections ALTER COLUMN id SET DEFAULT nextval('public.yearly_planning_sections_id_seq'::regclass);


--
-- Data for Name: action_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.action_items (id, title, source, owner_name, owner_initials, due_by, due_by_full, notes, starred, done, "position", created_at, updated_at, owner_user_id) FROM stdin;
1	Check out the Leadership Team Meeting tool.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	[{"label": "Review your agenda."}]	f	f	0	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
2	Decide the details for your strategy meeting.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	\N	f	f	1	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
3	Strategy Meeting Prep: Plan your talking points.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	\N	f	f	2	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
4	Strategy Meeting Prep: Review your numbers.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	\N	f	f	3	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
5	Invite Your Team to Elite.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	\N	f	f	4	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
6	Host the Annual Strategy meeting.	Setup Journey	Brooks Paine	BP	Apr 23	4/23/2026	\N	f	f	5	2026-04-28 17:13:12.768245+00	2026-04-28 17:13:12.768245+00	\N
\.


--
-- Data for Name: activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity (id, type, message, entity_name, created_at) FROM stdin;
1	milestone	Bright Smile Austin reached 2,400 active patients	Bright Smile Family Dentistry	2026-04-15 15:51:50.326258+00
2	report_added	Lisa Chen was added as Clinical Lead at Coastal Dental	Lisa Chen	2026-04-15 15:51:50.326258+00
3	org_updated	Summit Dental Partners updated their provider count	Summit Dental Partners	2026-04-15 15:51:50.326258+00
4	announcement	New announcement: Q2 Performance Review Schedule	Q2 Performance Review Schedule	2026-04-15 15:51:50.326258+00
5	task_completed	Daily priority completed: Finalize insurance credentialing	\N	2026-04-15 15:51:50.326258+00
6	org_updated	Location "Urgent Dental " was updated	Urgent Dental 	2026-04-15 16:45:26.498352+00
7	org_updated	Location "Alston" was updated	Alston	2026-04-16 16:19:04.733495+00
8	org_updated	Location "Alston" was updated	Alston	2026-04-16 16:21:23.503608+00
9	org_updated	Location "Westside Bottling" was updated	Westside Bottling	2026-04-16 16:21:57.319587+00
10	org_updated	Location "Alston" was updated	Alston	2026-04-16 16:32:21.058242+00
11	report_added	Carrie Taylor was added as a direct report	Carrie Taylor	2026-04-16 17:39:11.170735+00
12	org_updated	Location "EDGE " was updated	EDGE 	2026-04-16 18:06:01.869821+00
13	org_updated	Location "Urgent Dental " was updated	Urgent Dental 	2026-04-17 13:18:35.089232+00
14	report_added	Chad was added as a direct report	Chad	2026-04-18 11:11:51.004932+00
15	report_added	Taylor was added as a direct report	Taylor	2026-04-18 11:19:22.691168+00
16	org_updated	New location "Test Vendor Co" was added	Test Vendor Co	2026-04-18 11:25:04.059952+00
17	org_updated	New location "Charlotte TBD" was added	Charlotte TBD	2026-04-18 11:25:16.995691+00
18	org_updated	New location "Test Vendor Co" was added	Test Vendor Co	2026-04-18 11:25:47.778898+00
19	org_updated	New location "Acme Vendor" was added	Acme Vendor	2026-04-18 11:26:30.665816+00
20	org_updated	New location "Test Vendor Co" was added	Test Vendor Co	2026-04-18 11:28:38.6445+00
21	report_added	Test Person 1776511649277 was added as a direct report	Test Person 1776511649277	2026-04-18 11:28:51.726498+00
22	org_updated	New location "Vend2" was added	Vend2	2026-04-18 11:30:45.566934+00
23	report_added	Test Person was added as a direct report	Test Person	2026-04-18 11:37:38.65454+00
24	report_added	Free Org Test 1776512302727 was added as a direct report	Free Org Test 1776512302727	2026-04-18 11:39:05.384399+00
25	org_updated	Location "Charlotte TBD" was updated	Charlotte TBD	2026-04-22 11:53:55.2249+00
26	org_updated	Location "Alston" was updated	Alston	2026-04-24 18:54:37.417294+00
27	org_updated	Location "Westside Bottling" was updated	Westside Bottling	2026-04-24 18:54:37.506491+00
28	org_updated	Location "Urgent Dental " was updated	Urgent Dental 	2026-04-24 18:54:37.682072+00
29	org_updated	Location "EDGE " was updated	EDGE 	2026-04-24 18:54:37.778433+00
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, title, content, type, created_at) FROM stdin;
1	Q2 Performance Review Schedule	All performance reviews will be conducted between June 15-30. Please have your self-assessments ready by June 10.	info	2026-04-15 15:51:46.3651+00
2	New Patient Management System Launch	We are transitioning to the new PMS starting July 1. Training sessions will be held at each location.	warning	2026-04-15 15:51:46.3651+00
3	Austin Location Hits Record Month	Bright Smile Family Dentistry had their best revenue month ever in May. Congratulations to the entire team!	success	2026-04-15 15:51:46.3651+00
\.


--
-- Data for Name: buildout_cards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.buildout_cards (id, title, owner_name, category, status, "position", kra_link, target_done_date, definition_of_done, blocker, escalation_trigger, category_fields, activity_log, waiting_since, created_at, updated_at, business_area, organization_id) FROM stdin;
2	Alston Lease	Brooks Paine	Lease & Legal	waiting_on	0	\N	2026-05-31	Lease signed.	\N	\N	{"positionAsk": "", "fallbackPosition": "", "documentReference": "", "adamWebbReviewStatus": "Returned", "counterpartyAndCounsel": ""}	[{"text": "Card created.", "timestamp": "2026-04-28T17:49:56.873Z"}, {"text": "Card details updated.", "timestamp": "2026-04-28T19:33:59.232Z"}]	2026-04-28 17:49:56.873+00	2026-04-28 17:49:56.877578+00	2026-04-28 19:33:59.232+00	Location	\N
3	Alston Preliminary Plans w/Chambliss	Brooks Paine	Design & Construction	backlog	0	\N	\N	Approved Preliminary Plans by Alston LL	\N	\N	{}	[{"text": "Card created.", "timestamp": "2026-04-28T17:49:56.873Z"}, {"text": "Card details updated.", "timestamp": "2026-04-28T19:38:05.198Z"}]	\N	2026-04-28 17:49:56.877578+00	2026-04-28 19:38:05.198+00	Location	\N
10	Draft EDGE Doctor Partner Track one-pager	Brooks Paine	Doctor Recruiting (Partner Track)	backlog	0	\N	\N	One-page recruiting doc explaining the EDGE Partner Track economics, vesting, and culture; reviewed by Adam Webb.	\N	\N	{}	[{"text": "Card created.", "timestamp": "2026-04-28 18:17:12.765124+00"}]	\N	2026-04-28 18:17:12.765124+00	2026-04-28 18:17:12.765124+00	People	\N
12	Westside Bottling Lease	Brooks Paine	Lease & Legal	waiting_on	0	\N	2026-05-31	Signed Westside Bottling Lease.	\N	\N	{}	[{"text": "Card created.", "timestamp": "2026-04-28T19:34:55.669Z"}]	2026-04-28 19:34:55.669+00	2026-04-28 19:34:55.677846+00	2026-04-28 19:34:55.677846+00	Location	\N
6	Execute Risk Strategies professional liability binder	Brooks Paine	Lease & Legal	backlog	2	\N	\N	Binder signed and returned; certificate of insurance issued naming EDGE.	\N	\N	{}	[{"text": "Card created.", "timestamp": "2026-04-28T17:49:56.873Z"}, {"text": "Business area changed: Operations → Location", "timestamp": "2026-04-28T19:40:31.273Z"}, {"text": "Card details updated.", "timestamp": "2026-04-28T19:40:31.273Z"}]	\N	2026-04-28 17:49:56.877578+00	2026-04-28 19:40:31.273+00	Location	\N
\.


--
-- Data for Name: daily_top3; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_top3 (id, title, description, completed, priority, date, created_at) FROM stdin;
5	Build EDGE OS	\N	f	1	2026-04-16	2026-04-16 11:34:26.438202+00
4	Create Living Your Best Year Ever, Reflection Systems	\N	t	1	2026-04-16	2026-04-16 11:34:20.758065+00
9	Respond to Averill Buy-In	\N	t	3	2026-04-17	2026-04-17 12:49:38.175603+00
\.


--
-- Data for Name: direct_report_additional_viewers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.direct_report_additional_viewers (id, direct_report_id, viewer_report_id, created_at) FROM stdin;
\.


--
-- Data for Name: direct_report_view_as_me_grants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.direct_report_view_as_me_grants (id, direct_report_id, grantee_report_id, created_at) FROM stdin;
\.


--
-- Data for Name: direct_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.direct_reports (id, name, role, email, phone, organization_id, status, hire_date, performance_rating, avatar_url, created_at, organization) FROM stdin;
5	Chad Paterra	Partner	cpaterradds@gmail.com	3046709637	4	active	\N	\N	\N	2026-04-18 11:11:50.961196+00	\N
6	Taylor Drouillard	CRE Broker	Taylor.Drouillard@tscg.com	480-313-8633	5	active	\N	\N	\N	2026-04-18 11:19:22.657573+00	TSCG
10	Brooks Paine	Owner	brooks@brookspaine.com	\N	4	active	\N	\N	/objects/uploads/300f4a08-e4c8-4638-8342-f7c3b9449f10	2026-04-24 00:48:45.962142+00	Urgent Dental
11	Mariah Paine	Team Member	mariahkpaine@gmail.com	\N	\N	invite_not_sent	\N	\N	\N	2026-04-24 00:57:13.558467+00	Brooks Paine
4	Carrie Taylor	Office Manager	carrieptaylor@gmail.com	7047247241	4	active	\N	\N	\N	2026-04-16 17:39:10.82907+00	Brooks Paine
\.


--
-- Data for Name: future_todos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.future_todos (id, title, completed, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ideal_week_completions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ideal_week_completions (id, ritual_id, date, completed, created_at) FROM stdin;
3	10	2026-04-15	t	2026-04-15 16:33:13.305309+00
4	11	2026-04-15	t	2026-04-15 16:34:26.187065+00
5	21	2026-05-03	t	2026-04-28 23:13:23.283491+00
\.


--
-- Data for Name: ideal_week_rituals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ideal_week_rituals (id, name, frequency, sort_order, created_at) FROM stdin;
10	Bed Before 9:30 PM	daily	1	2026-04-15 16:30:58.590438+00
11	Morning Ritual	daily	2	2026-04-15 16:30:58.590438+00
12	Morning Journal	daily	3	2026-04-15 16:30:58.590438+00
13	Movement or Workout	daily	4	2026-04-15 16:30:58.590438+00
14	Successful Provider CEO	daily	5	2026-04-15 16:30:58.590438+00
15	A Man of God	daily	6	2026-04-15 16:30:58.590438+00
16	A Man of Wisdom and Understanding	daily	7	2026-04-15 16:30:58.590438+00
17	Master Protector of My Time	daily	8	2026-04-15 16:30:58.590438+00
18	Legacy & Watch for the Future	daily	9	2026-04-15 16:30:58.590438+00
19	Grateful for God's Blessings	daily	10	2026-04-15 16:30:58.590438+00
20	Experience the World & Travel	daily	11	2026-04-15 16:30:58.590438+00
21	Best Friend Others Have	daily	12	2026-04-15 16:30:58.590438+00
\.


--
-- Data for Name: journal_responses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_responses (id, prompt_key, date, response, created_at) FROM stdin;
12	easy	2026-04-19	carefully map out top 3’s now, organize tasks in OS	2026-04-19 11:00:43.335671+00
1	grateful	2026-04-16	Opportunities in today’s world; finishing transferring the gravel	2026-04-16 11:35:15.242297+00
13	grateful	2026-04-20	Mariah home safely, good nights rest	2026-04-20 10:58:15.016255+00
2	stressors	2026-04-16	getting stuck in UD today, convo w/ Averill/Chad, lengthy Carrie Call	2026-04-16 11:35:51.942837+00
3	easy	2026-04-16	Leave when Chad Leaves (master protector of my time), write out a few small points for Averill convo	2026-04-16 11:36:10.698647+00
14	stressors	2026-04-20	Averill email response, what’s important right now	2026-04-20 10:58:32.093362+00
15	easy	2026-04-20	carefully map out top 3’s now, organize tasks in OS, revise email response to Averill	2026-04-20 11:00:03.626447+00
5	stressors	2026-04-17	Lease from Alston LL, getting work done this AM	2026-04-17 12:41:44.706273+00
6	easy	2026-04-17	Remember: control your controllables, and  prioritize work this AM	2026-04-17 12:42:02.577557+00
8	stressors	2026-04-18	Not knowing what is most important to work on next	2026-04-18 11:08:32.241623+00
9	easy	2026-04-18	write down top things to work on, today’s big 3, this week’s big 3	2026-04-18 11:08:57.690385+00
4	grateful	2026-04-17	Yesterday I was grateful for my team.	2026-04-17 12:40:51.829175+00
7	grateful	2026-04-18	Today fresh.	2026-04-18 11:08:16.032495+00
10	grateful	2026-04-19	96 sleep score last night, quiet time this morning, Callen sleeping well last night, nice evening with in-laws	2026-04-19 10:59:46.877346+00
11	stressors	2026-04-19	what’s most important right now, creating organization in this new OS	2026-04-19 11:00:20.060748+00
\.


--
-- Data for Name: meeting_action_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_action_items (id, agenda_id, item, owner, due_date, is_daily_top_3, notes, completed, sort_order, created_at) FROM stdin;
1	1	Post job listing	Brooks Paine	2026-04-23	t		f	0	2026-04-23 12:24:22.894553+00
\.


--
-- Data for Name: meeting_agendas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_agendas (id, series_id, name, section_data, created_at, updated_at) FROM stdin;
1	1	Weekly Agenda — Apr 23, 2026	{"iceBreaker": "Kickoff question: What is one win from this week?"}	2026-04-23 12:22:59.226767+00	2026-04-23 12:23:07.009+00
\.


--
-- Data for Name: meeting_key_topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_key_topics (id, agenda_id, core_issue, owner, notes, resolved, sort_order, created_at) FROM stdin;
1	1	Hiring is slow	Brooks Paine	\N	f	0	2026-04-23 12:23:41.927434+00
\.


--
-- Data for Name: meeting_series; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_series (id, name, members, desired_future, desired_future_status, created_at, organization) FROM stdin;
1	Weekly Growth Meeting	["Brooks Paine", "Jane Smith"]	By April 2027 we will implement alignment and accountability strategies, resulting in a 20% revenue growth. [DRAFT]	on-pace	2026-04-23 12:22:54.771375+00	\N
\.


--
-- Data for Name: morning_ritual_completions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.morning_ritual_completions (id, item_key, date, completed, created_at) FROM stdin;
1	devotional	2026-04-15	t	2026-04-15 16:58:03.108521+00
\.


--
-- Data for Name: org_chart_seats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_chart_seats (id, organization_id, parent_seat_id, title, name, accountabilities, sort_order, created_at, key_results_area, photo_url) FROM stdin;
2	1	\N	Practice Owner	Brooks Paine	["Vision", "Culture", "Finances"]	0	2026-04-18 20:14:13.656721+00	[]	\N
7	4	\N	Owner	Chad Paterra	["Vision", "Strategy", "Culture", "Accountability"]	0	2026-04-19 12:02:29.278446+00	[]	\N
10	4	8	Assistant	\N	["Triaging Patients", "Sterilization/Room Turnover", "Chairside Assisting", "Presenting Tx Plans", "Presenting Finances", "Post-Op Calls"]	0	2026-04-19 12:12:27.63624+00	[]	\N
12	4	8	Associate Dentist	\N	["Providing Dentistry"]	0	2026-04-19 12:16:17.845796+00	[]	\N
13	4	8	Practice Liason	\N	["Building Relationships with Local Dentists, ER/Urgent Cares", "Marketing Scorecard", "Referral Correspondences?"]	0	2026-04-19 12:17:21.64897+00	[]	\N
9	4	8	Front Desk	\N	["Answering Phones", "Greeting Patients", "Scheduling Patients", "Checking in Lab Cases", "Patient Intake/NP Paperwork"]	0	2026-04-19 12:10:27.841622+00	["Phones answered within 3 rings", "Same-day call-back rate >= 95%", "No-show rate <= 5%"]	\N
6	4	\N	Owner	Brooks Paine	["Vision", "Strategy and Growth", "Culture", "Accountability"]	0	2026-04-19 12:00:55.083822+00	[]	/objects/uploads/300f4a08-e4c8-4638-8342-f7c3b9449f10
1	5	\N	Visionary	Brooks Paine	["Vision", "Culture", "Big Relationships"]	0	2026-04-18 20:11:52.527942+00	[]	\N
11	4	8	Lead Assistant	Myka Johnson	["Supplies Ordering", "Supplies Budget Management", "Onboarding/Training", "Updating Guidebooks"]	0	2026-04-19 12:13:20.75085+00	[]	\N
14	4	\N	Lead Assistant	\N	[]	0	2026-04-24 18:02:36.415835+00	[]	\N
8	4	6	Office Manager	Carrie Taylor	["Leader of Office", "Office Profitability", "Payroll", "Staffing/HR", "Culture", "Operations"]	0	2026-04-19 12:07:17.707445+00	["Monthly collections >= $150k", "Staff retention >= 90%", "New patient conversion >= 80%", "Net Promoter Score >= 70"]	\N
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizations (id, name, address, city, state, phone, email, provider_count, patient_count, monthly_revenue, status, created_at, category, belt_classification) FROM stdin;
1	Alston		Cary	NC			0	0	0	inactive	2026-04-15 15:51:34.340059+00	edge	black
3	Westside Bottling		Durham	NC			0	0	0	inactive	2026-04-15 15:51:34.340059+00	edge	blue
4	Urgent Dental 	9607 NE Parkway	Matthews	NC	704-246-3507	Contactus@myurgentdental.com	0	0	0	active	2026-04-15 16:02:00.630952+00	urgent_dental	brown
5	EDGE DSO						0	0	0	active	2026-04-16 18:04:14.714292+00	edge_dso	black
\.


--
-- Data for Name: playbooks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.playbooks (id, title, category, purpose, when_to_use, steps, decision_points, common_pitfalls, related_playbook_ids, role_ids, last_reviewed_by, last_reviewed_at, created_at, updated_at) FROM stdin;
1	How to Take a CBCT	Clinical Procedure	Standardize cone-beam CT capture so every scan is diagnostic on the first attempt and patient exposure is minimized.	Indicated for endodontic evaluation, implant planning, impacted-tooth assessment, or any case where 2D imaging is insufficient.	[]	If patient cannot stabilize for the scan, reschedule rather than re-shoot. If image shows pathology outside the field of view, expand FOV with Lead Dentist approval.	Patient motion blur from poor positioning; failing to remove all metal artifacts; forgetting to log the exposure in the patient chart.	[]	[1]	EDGE Clinical Lead	2026-04-28 18:45:33.370051+00	2026-04-28 18:45:33.370051+00	2026-04-28 18:45:33.370051+00
2	How to Present a Tx Plan	Patient Communication	Deliver treatment plans in a way that builds trust, sets honest expectations, and earns same-visit acceptance.	After every diagnostic exam where treatment is recommended.	[]	If the patient hesitates on cost, offer phased treatment before discounting. If the patient asks for a second opinion, support it without defensiveness.	Leading with price instead of problem; using clinical jargon the patient cannot follow; failing to write down what was discussed for the patient to take home.	[]	[1]	EDGE Clinical Lead	2026-04-28 18:45:33.370051+00	2026-04-28 18:45:33.370051+00	2026-04-28 18:45:33.370051+00
\.


--
-- Data for Name: reading_list; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reading_list (id, title, sort_order, created_at, completed) FROM stdin;
8	Who's Got Your Back?	7	2026-04-15 19:41:02.102657+00	f
9	Tribes - We Need You to Lead Us	8	2026-04-15 19:41:02.102657+00	f
10	Thinking Fast and Slow - Daniel Kahneman	9	2026-04-15 19:41:02.102657+00	f
11	Shaka - How to Be Free	10	2026-04-15 19:41:02.102657+00	f
12	Shaka - Righting My Wrongs	11	2026-04-15 19:41:02.102657+00	f
13	The Weirdest People in the World	12	2026-04-15 19:41:02.102657+00	f
14	Man's Search for Meaning - Viktor Frankl	13	2026-04-15 19:41:02.102657+00	f
15	John Maxwell - 5 Levels of Leadership	14	2026-04-15 19:41:02.102657+00	f
16	Outliers - Malcolm Gladwell	15	2026-04-15 19:41:02.102657+00	f
17	Desire to Win/Succeed - Malcolm Gladwell	16	2026-04-15 19:41:02.102657+00	f
19	Inner Excellence	18	2026-04-15 19:41:02.102657+00	f
20	Building an Elite Organization	19	2026-04-15 19:41:02.102657+00	f
21	The Richest Man in Babylon	20	2026-04-15 19:41:02.102657+00	f
22	Deepwork	21	2026-04-15 19:41:02.102657+00	f
23	The Obstacle Is the Way	22	2026-04-15 19:41:02.102657+00	f
24	Drive - Daniel Pink	23	2026-04-15 19:41:02.102657+00	f
25	Art of Learning	24	2026-04-15 19:41:02.102657+00	f
26	Contagious	25	2026-04-15 19:41:02.102657+00	f
27	Mind Gym	26	2026-04-15 19:41:02.102657+00	f
28	Positive Intelligence	27	2026-04-15 19:41:02.102657+00	f
29	The Infinite Game - Simon Sinek	28	2026-04-15 19:41:02.102657+00	f
30	Thou Shall Prosper	29	2026-04-15 19:41:02.102657+00	f
31	No Bullshit Leadership	30	2026-04-15 19:41:02.102657+00	f
32	Crucial Accountability and Crucial Conversations	31	2026-04-15 19:41:02.102657+00	f
33	The Compound Effect - Darren Hardy	32	2026-04-15 19:41:02.102657+00	f
34	Empire Building - Adam Coffee	33	2026-04-15 19:41:02.102657+00	f
35	Noise - Daniel Kahneman	34	2026-04-15 19:41:02.102657+00	f
1	How to Win Friends and Influence People	0	2026-04-15 19:41:02.102657+00	t
2	Shoe Dog	1	2026-04-15 19:41:02.102657+00	t
3	No Ego	2	2026-04-15 19:41:02.102657+00	t
4	Living Your Best Year Ever	3	2026-04-15 19:41:02.102657+00	t
5	The Hard Thing About Hard Things - Ben Horowitz	4	2026-04-15 19:41:02.102657+00	t
6	What You Do Is Who You Are - Ben Horowitz	5	2026-04-15 19:41:02.102657+00	t
18	The One Page Marketing Plan - Allan Nib	17	2026-04-15 19:41:02.102657+00	f
7	High Management Output - Andy Grove	6	2026-04-15 19:41:02.102657+00	f
\.


--
-- Data for Name: ritual_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ritual_items (id, category, label, sort_order, created_at) FROM stdin;
1	morning	Daily Devotional	0	2026-04-15 19:02:25.842832+00
2	morning	Morning Journal Questions	1	2026-04-15 19:02:25.842832+00
3	morning	Get it out on paper (process thoughts, decisions, think, etc)	2	2026-04-15 19:02:25.842832+00
4	morning	Mindful Breathing/Meditation (Calm App)	3	2026-04-15 19:02:25.842832+00
5	morning	Read (15 min) – personal growth and develop wisdom	4	2026-04-15 19:02:25.842832+00
6	quarterly_review	Quarterly AMS	0	2026-04-15 19:02:25.891037+00
7	quarterly_review	Read Epic Year	1	2026-04-15 19:02:25.891037+00
8	quarterly_review	Review Vision Board and Goals	2	2026-04-15 19:02:25.891037+00
9	quarterly_review	Change Habits to focus on	3	2026-04-15 19:02:25.891037+00
10	quarterly_review	Review Book Takeaways from Books Read that Quarter\nhttps://docs.google.com/document/d/1W7XKQzw5akO3_Tyis5NsK5gEcvSh0Bkp0I1KKnJtjr8/edit?usp=sharing	4	2026-04-15 19:02:25.891037+00
16	monthly_review	Monthly Personal Assessment	0	2026-04-15 19:02:25.972261+00
17	monthly_review	Personal Finances/Wealth Review\n(pay CC, transfer $ to savings, Investments: HSA, brokerage)	1	2026-04-15 19:02:25.972261+00
18	monthly_review	Review Vision Board & Read Goals	2	2026-04-15 19:02:25.972261+00
19	startup	Daily Brainwashing Sheet or Words of Wisdom	0	2026-04-15 19:02:25.983215+00
21	startup	Set Big 3	2	2026-04-15 19:02:25.983215+00
22	startup	Block Deep Work session(s)	3	2026-04-15 19:02:25.983215+00
23	startup	Time Journal catch-up	4	2026-04-15 19:02:25.983215+00
24	startup	If I decide it's important → Reply to Emails\n(be timely, reply quickly, don't do other's jobs for them)	5	2026-04-15 19:02:25.983215+00
25	shutdown	Clear Inbox and capture open loops	0	2026-04-15 19:02:25.983834+00
26	shutdown	Time Journal	1	2026-04-15 19:02:25.983834+00
27	shutdown	Evening Ritual Reflection	2	2026-04-15 19:02:25.983834+00
28	shutdown	Disconnect and Intentionally Switch to Family Time	3	2026-04-15 19:02:25.983834+00
29	patient_care	BBB - Be brief, be brilliant, be done	0	2026-04-15 19:12:26.012716+00
30	patient_care	Patience in endo	1	2026-04-15 19:12:26.012716+00
31	patient_care	People see compassion and care	2	2026-04-15 19:12:26.012716+00
32	family_friends	phone away	0	2026-04-15 19:12:26.013544+00
33	family_friends	intentional energy	1	2026-04-15 19:12:26.013544+00
34	family_friends	focus on Mariah and Callen	2	2026-04-15 19:12:26.013544+00
35	deepwork	Get the big stuff done	0	2026-04-15 19:12:26.017312+00
36	deepwork	Don't get distracted by what you "feel" like doing	1	2026-04-15 19:12:26.017312+00
38	execution_block	Who, not how	0	2026-04-15 19:12:26.019147+00
39	execution_block	GSD (The right shit done)	1	2026-04-15 19:12:26.019147+00
37	anchor_meetings	Recurring Meetings, typically the who's that execute your core businesses	0	2026-04-15 19:12:26.019142+00
44	brainwashing	1) Should we do this? 2) Delete 3) Optimize 4) Accelerate 5) Automate.	4	2026-04-16 17:47:30.298649+00
45	brainwashing	Doing imperfectly is better than not doing at all. Initiation → Consistency → Intensity.	5	2026-04-16 17:47:30.298649+00
46	brainwashing	Management Debt — if you don't say anything, don't expect them to do anything.	6	2026-04-16 17:47:30.298649+00
47	brainwashing	Seek first to understand. Be the last in the room to speak. Sit in the gap.	7	2026-04-16 17:47:30.298649+00
48	brainwashing	PCS — Problem, Consequence, Solution Leader.	8	2026-04-16 17:47:30.298649+00
49	brainwashing	"Tough-minded on standards and tender-hearted with people."	9	2026-04-16 17:47:30.298649+00
50	brainwashing	Know your audience. Ask more questions, ask better questions.	10	2026-04-16 17:47:30.298649+00
51	brainwashing	Put yourself in the other person's shoes, then you'll know how to best influence them.	11	2026-04-16 17:47:30.298649+00
52	brainwashing	Have the team "Make it Their Own," and when implementing, make it YOUR own (frameworks).	12	2026-04-16 17:47:30.298649+00
53	brainwashing	Gratitude = Abundance Minded.	13	2026-04-16 17:47:30.298649+00
54	brainwashing	Nothing about life is fair. Deal with it as it is.	14	2026-04-16 17:47:30.298649+00
55	brainwashing	BBB — efficiency and speed in procedures for freedom.	15	2026-04-16 17:47:30.298649+00
20	startup	Review Living Your Best Year Ever	1	2026-04-15 19:02:25.983215+00
15	weekly_review		4	2026-04-15 19:02:25.969575+00
56	brainwashing	Drive accountability by asking questions.  Get those stuck in emotion to “what is the next best step to take to achieve “x”?”	16	2026-04-22 14:35:36.892014+00
42	brainwashing	Whatever anyone says or does, assume positive intent. 	2	2026-04-16 17:47:30.298649+00
40	brainwashing	“Managerial meddling” - negative managerial leverage - This occurs when a supervisor uses his superior knowledge to assume command of a situation, instead of letting the subordinate work things through himself. 	0	2026-04-16 17:47:30.298649+00
57	brainwashing	5 C’s of Leadership - Clarity, Commitment, Consistency, Consequences, Cut-ties.	17	2026-04-22 14:57:43.667394+00
41	brainwashing	Managerial Leverage: \nManagerial Output = Leverage x Activity \nManagerial Output = Output of organization under Manager	1	2026-04-16 17:47:30.298649+00
13	weekly_review	Review Living Your Best Year Ever	2	2026-04-15 19:02:25.969575+00
43	brainwashing	Clear, Concise, Compelling (no "I think, just, like"), Charisma, Composure, Conversation — 6 C's of Communication.a	3	2026-04-16 17:47:30.298649+00
14	weekly_review		3	2026-04-15 19:02:25.969575+00
12	weekly_review	Weekly Review	1	2026-04-15 19:02:25.969575+00
11	weekly_review	Review Vision Board & Read Goals	0	2026-04-15 19:02:25.969575+00
\.


--
-- Data for Name: role_key_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_key_results (id, role_id, title, description, sort_order, created_at, updated_at) FROM stdin;
1	20	Same-day emergency slots filled at >= 85% utilization.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
2	20	Treatment plans presented same-visit on >= 95% of completed exams.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
3	20	Case acceptance rate of >= 70% within 30 days of presentation.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
4	20	Production per clinical hour of >= $850.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
5	20	Patient NPS (post-visit) of >= 75.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
6	20	>= 5 chairside coaching touchpoints with associates per week.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
7	11	>= 95% of inbound calls answered within 3 rings during open hours.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
8	11	>= 80% of pain-related calls converted to a same-day appointment.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
9	11	>= 90% of patients leave with a follow-up appointment booked.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
10	11	Patient lobby NPS of >= 80.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
11	11	Insurance verified for 100% of next-day patients before end of business.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
12	17	>= 95% of inbound calls answered within 3 rings during open hours.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
13	17	>= 80% of pain-related calls converted to a same-day appointment.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
14	17	>= 90% of patients leave with a follow-up appointment booked.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
15	17	Patient lobby NPS of >= 80.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
16	17	Insurance verified for 100% of next-day patients before end of business.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
17	12	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
18	12	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
19	12	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
20	10	Morning huddle held 100% of operating days with full team present.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
21	10	>= 10 open A/R follow-ups closed per day.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
22	10	Schedule-block utilization (next 7 days) at >= 85%.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
23	10	Collections rate of >= 96% of production each month.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
24	10	Voluntary team turnover <= 15% over rolling 12 months.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
25	10	Average patient wait time (check-in to seated) <= 12 minutes.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
26	18	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
27	18	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
28	18	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
29	2	Morning huddle held 100% of operating days with full team present.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
30	2	>= 10 open A/R follow-ups closed per day.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
31	2	Schedule-block utilization (next 7 days) at >= 85%.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
32	2	Collections rate of >= 96% of production each month.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
33	2	Voluntary team turnover <= 15% over rolling 12 months.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
34	2	Average patient wait time (check-in to seated) <= 12 minutes.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
35	15	Practice EBITDA grows year-over-year per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
36	15	Annual practice strategy reviewed and approved each Q1.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
37	15	Each location has a named Office Manager and Lead Dentist accountable to a written role doc.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
38	13	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
39	13	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
40	13	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
41	21	Practice EBITDA grows year-over-year per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
42	21	Annual practice strategy reviewed and approved each Q1.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
43	21	Each location has a named Office Manager and Lead Dentist accountable to a written role doc.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
44	5	Practice EBITDA grows year-over-year per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
45	5	Annual practice strategy reviewed and approved each Q1.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
46	5	Each location has a named Office Manager and Lead Dentist accountable to a written role doc.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
47	19	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
48	19	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
49	19	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
50	8	Referral source pipeline grows >= 5 active GP partners per quarter per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
51	8	Community / employer health partnerships generate >= 20 new patients per month per location.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
52	8	Brand awareness lifts measured via monthly branded-search volume.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
53	6	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
54	6	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
55	6	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
56	16	Morning huddle held 100% of operating days with full team present.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
57	16	>= 10 open A/R follow-ups closed per day.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
58	16	Schedule-block utilization (next 7 days) at >= 85%.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
59	16	Collections rate of >= 96% of production each month.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
60	16	Voluntary team turnover <= 15% over rolling 12 months.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
61	16	Average patient wait time (check-in to seated) <= 12 minutes.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
62	4	Practice EBITDA grows year-over-year per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
63	4	Annual practice strategy reviewed and approved each Q1.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
64	4	Each location has a named Office Manager and Lead Dentist accountable to a written role doc.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
65	1	Same-day emergency slots filled at >= 85% utilization.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
66	1	Treatment plans presented same-visit on >= 95% of completed exams.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
67	1	Case acceptance rate of >= 70% within 30 days of presentation.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
68	1	Production per clinical hour of >= $850.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
69	1	Patient NPS (post-visit) of >= 75.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
70	1	>= 5 chairside coaching touchpoints with associates per week.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
71	3	>= 95% of inbound calls answered within 3 rings during open hours.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
72	3	>= 80% of pain-related calls converted to a same-day appointment.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
73	3	>= 90% of patients leave with a follow-up appointment booked.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
74	3	Patient lobby NPS of >= 80.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
75	3	Insurance verified for 100% of next-day patients before end of business.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
76	14	Same-day emergency slots filled at >= 85% utilization.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
77	14	Treatment plans presented same-visit on >= 95% of completed exams.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
78	14	Case acceptance rate of >= 70% within 30 days of presentation.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
79	14	Production per clinical hour of >= $850.	\N	4	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
80	14	Patient NPS (post-visit) of >= 75.	\N	5	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
81	14	>= 5 chairside coaching touchpoints with associates per week.	\N	6	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
82	9	Practice EBITDA grows year-over-year per location.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
83	9	Annual practice strategy reviewed and approved each Q1.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
84	9	Each location has a named Office Manager and Lead Dentist accountable to a written role doc.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
85	7	Operatory turnaround time <= 10 minutes between patients.	\N	1	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
86	7	Sterilization compliance audit score >= 98%.	\N	2	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
87	7	Doctor downtime in chair <= 5% of clinical day.	\N	3	2026-04-28 22:55:25.344905+00	2026-04-28 22:55:25.344905+00
\.


--
-- Data for Name: role_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_tasks (id, role_id, key_result_id, title, description, status, priority, assignee, due_date, completed, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, title, seat_holder_name, seat_holder_initials, reports_to_role_id, business_area, tier, purpose_statement, mission_alignment, cultural_alignment, veg_style_impact, checklists, decisions, last_reviewed_at, created_at, updated_at, organization_id, key_results_area) FROM stdin;
1	Associate Dentist	Open		2	Operations	Clinical	The Lead Emergency Dentist is the clinical anchor of EDGE. This role exists to deliver same-day relief for patients in dental pain, hold the standard for emergency-first clinical excellence, and mentor the next generation of EDGE doctors on the partner track.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Lead Dentist personally embodies this mission every shift — every walk-in seen, every diagnosis confirmed under pressure, every honest treatment plan presented advances it.	Lives the EDGE Cultural Code daily: "Patient first, ego last," "Move at the speed of pain," and "Teach what you know." The Lead Dentist's tone in the operatory sets the tone for the whole team.	Every emergency patient walks in scared and leaves understood. The Lead Dentist owns the warm handoff from front desk to chair, the calm explanation of options, and the unhurried treatment of patients who've been turned away elsewhere — the experience traditional dental practices simply do not offer.	{"downtime": [{"id": "d1", "task": "Review pending CBCT reads and finalize diagnoses.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Call patients with pending treatment plans not yet accepted.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Coach an associate through a recent case (15 min review).", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Update one playbook with anything you learned today.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d5", "task": "Be visible at the front — back up Patient Coordinator with walk-in triage.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Sign all chart notes from today's visits.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Confirm tomorrow's schedule with Practice Manager.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Hand off any open emergencies to on-call protocol.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Confirm sterilizers run final cycle; CBCT powered down.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e5", "task": "End-of-day text to associate(s) — one specific thing they did well.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Huddle with clinical team — review schedule, gaps, anticipated walk-ins.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm operatories are stocked, sterilizers are ready, CBCT is up.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review yesterday's open cases and call-back list.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Check pharmacy inventory for emergency medications.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s5", "task": "Confirm associate(s) on schedule are oriented and ready.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Clinical", "decisionType": "Clinical treatment plan approval under $5,000", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Single-visit or short-course care under $5,000 total. Patient is medically stable.", "escalationToRoleId": null}, {"id": "dc2", "category": "Clinical", "decisionType": "Emergency after-hours callout", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Active facial swelling, uncontrolled bleeding, or trauma. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Clinical", "decisionType": "Refer out to specialist (oral surgery / endo / perio)", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Case exceeds in-house clinical scope or equipment. Use approved specialist network.", "escalationToRoleId": null}, {"id": "dc4", "category": "Financial", "decisionType": "Comp / discount on a treatment plan", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Any discount over $250 — recommend to Practice Manager with rationale.", "escalationToRoleId": null}, {"id": "dc5", "category": "People", "decisionType": "Send associate home early due to low volume", "authorityLevel": "Escalate", "linkedPlaybookId": null, "boundaryConditions": "Always escalate to Practice Manager — affects payroll and morale.", "escalationToRoleId": null}]	2026-04-28 19:29:37.519+00	2026-04-28 18:45:33.370051+00	2026-04-28 19:38:30.777925+00	4	["Same-day emergency slots filled at >= 85% utilization.", "Treatment plans presented same-visit on >= 95% of completed exams.", "Case acceptance rate of >= 70% within 30 days of presentation.", "Production per clinical hour of >= $850.", "Patient NPS (post-visit) of >= 75.", ">= 5 chairside coaching touchpoints with associates per week."]
4	Owner — Brooks Paine	Brooks Paine	BP	\N	Operations	Leadership	The Owner exists to set the long-term direction of EDGE, allocate capital, hire and develop senior leadership, and protect the cultural standard of the practice. Brooks Paine is the final accountable seat for revenue, profit, and team trust.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Owner is the keeper of that mission — the one who decides what EDGE will and won't say yes to, and who personally sponsors the bets that make the mission real.	Lives the EDGE Cultural Code by being visibly present, transparent about the numbers, and willing to be coached. Sets the standard for "Patient first, ego last" in every leadership decision.	Patients trust EDGE because they sense an owner cares — even when they never meet one. Team members trust EDGE because the owner shows up, tells the truth about the business, and protects the people doing the work.	{"downtime": [{"id": "d0-kubsji", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-gizyhn", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-6mpr3j", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-k5ulk9", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-gmyns4", "task": "Confirm everything needed to deliver \\"vision\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-g0m37l", "task": "Confirm everything needed to deliver \\"strategy and growth\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-6riy7n", "task": "Confirm everything needed to deliver \\"culture\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-zavbxs", "category": "Financial", "decisionType": "Capital allocation up to $25k", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Single-line items above $25k go to a co-owner discussion before commitment.", "escalationToRoleId": null}, {"id": "dec1-tpv3s4", "category": "People", "decisionType": "Hiring senior leadership", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Always done in conversation with the co-owner. Document the rationale.", "escalationToRoleId": null}]	2026-04-28 19:38:07.120229+00	2026-04-28 19:38:07.120229+00	2026-04-28 19:38:07.120229+00	4	["Practice EBITDA grows year-over-year per location.", "Annual practice strategy reviewed and approved each Q1.", "Each location has a named Office Manager and Lead Dentist accountable to a written role doc."]
7	Lead Assistant	Myka Johnson	MJ	2	Operations	Operations Support	The Lead Assistant runs the supply chain, training program, and clinical-side operations of the practice so the doctors and assistants never have to think about anything except the patient in the chair.	Operational reliability is what lets EDGE deliver its emergency-first promise day after day. The Lead Assistant owns the systems that make that reliability invisible.	"Make the right thing the easy thing." Builds the guidebooks, the supply lists, and the onboarding paths that turn new hires into confident clinicians fast.	Every new assistant who gets up to speed in two weeks instead of two months is a gift to the next 500 emergency patients that team will see together.	{"downtime": [{"id": "d0-mzuxi3", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-7jkh0i", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-fou2mp", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-ag1fa3", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-l3ih0f", "task": "Confirm everything needed to deliver \\"supplies ordering\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-jozq67", "task": "Confirm everything needed to deliver \\"supplies budget management\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-tsr5u0", "task": "Confirm everything needed to deliver \\"onboarding/training\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-mx9bt5", "category": "Operational", "decisionType": "Day-to-day execution of Supplies Ordering", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-0e55no", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	2026-04-28 19:38:19.308038+00	2026-04-28 19:38:19.308038+00	2026-04-28 19:39:12.485569+00	4	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
3	Front Desk	Open		2	People	Operations Support	The Patient Coordinator is the first human a patient in pain talks to. This role exists to convert a scared phone call into a confident, on-the-schedule appointment — and to make sure every patient leaves understood, paid up, and rebooked when needed.	EDGE's mission lives or dies at the front desk. A patient turned away by tone or by clumsy scheduling is a patient who tells ten others EDGE is just like every other practice.	Embodies "Patient first, ego last" and "Speed of pain." Answers every call within three rings; never lets a walk-in stand for more than 30 seconds without acknowledgement.	Every patient is greeted by name when possible, walked back personally, and given a clear, written summary of next steps before they leave. The lobby never feels like a waiting room — it feels like a host station.	{"downtime": [{"id": "d1", "task": "Confirm appointments for next 48 hours.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Recall list — call patients overdue for follow-up.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Verify insurance for tomorrow's patients.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Restock front-desk supplies; confirm card reader.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's payments; close drawer.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Forward phones to on-call line.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Email tomorrow's schedule to clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lobby reset for tomorrow morning.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Open phone lines; check overnight voicemail and triage.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm today's appointments; send any missing reminders.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Lobby reset — water, magazines, music, scent.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Print day sheets for clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Schedule a same-day emergency walk-in", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Open clinical slot exists; patient symptoms match emergency criteria.", "escalationToRoleId": null}, {"id": "dc2", "category": "Financial", "decisionType": "Waive small balance under $50", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Goodwill / patient-experience reason. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Operational", "decisionType": "Reschedule a doctor's appointment block", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to Practice Manager.", "escalationToRoleId": null}]	2026-04-28 19:12:08.289+00	2026-04-28 18:45:33.370051+00	2026-04-28 19:38:26.96304+00	4	[">= 95% of inbound calls answered within 3 rings during open hours.", ">= 80% of pain-related calls converted to a same-day appointment.", ">= 90% of patients leave with a follow-up appointment booked.", "Patient lobby NPS of >= 80.", "Insurance verified for 100% of next-day patients before end of business."]
5	Owner — Chad Paterra	Chad Paterra	CP	\N	Operations	Leadership	The Owner exists to set the long-term direction of EDGE, allocate capital, hire and develop senior leadership, and protect the cultural standard of the practice. Chad Paterra is the final accountable seat for revenue, profit, and team trust.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Owner is the keeper of that mission — the one who decides what EDGE will and won't say yes to, and who personally sponsors the bets that make the mission real.	Lives the EDGE Cultural Code by being visibly present, transparent about the numbers, and willing to be coached. Sets the standard for "Patient first, ego last" in every leadership decision.	Patients trust EDGE because they sense an owner cares — even when they never meet one. Team members trust EDGE because the owner shows up, tells the truth about the business, and protects the people doing the work.	{"downtime": [{"id": "d0-sr4uo0", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-5y3twc", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-q03vt5", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-kl1y7x", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-bt7obz", "task": "Confirm everything needed to deliver \\"vision\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-eoz0v9", "task": "Confirm everything needed to deliver \\"strategy\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-apatp5", "task": "Confirm everything needed to deliver \\"culture\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-ego5je", "category": "Financial", "decisionType": "Capital allocation up to $25k", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Single-line items above $25k go to a co-owner discussion before commitment.", "escalationToRoleId": null}, {"id": "dec1-52ft8m", "category": "People", "decisionType": "Hiring senior leadership", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Always done in conversation with the co-owner. Document the rationale.", "escalationToRoleId": null}]	2026-04-28 19:38:11.325213+00	2026-04-28 19:38:11.325213+00	2026-04-28 19:38:11.325213+00	4	["Practice EBITDA grows year-over-year per location.", "Annual practice strategy reviewed and approved each Q1.", "Each location has a named Office Manager and Lead Dentist accountable to a written role doc."]
6	Assistant	Open		2	Operations	Operations Support	The Dental Assistant exists to keep the operatory flowing — turning rooms quickly, anticipating the doctor's next instrument, and making patients feel seen and safe from the moment they sit in the chair.	EDGE promises same-day relief. The Assistant is the speed multiplier that lets the doctor see one more emergency patient every hour without sacrificing safety or warmth.	Lives "Move at the speed of pain" in every room turnover and "Patient first, ego last" in every chairside conversation.	Patients remember the assistant who held their hand and explained what was about to happen. That is often the moment they decide whether to trust EDGE with the rest of their care.	{"downtime": [{"id": "d0-05z9jq", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-njtp07", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-o4ere1", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-gfv1fo", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-eu8oqh", "task": "Confirm everything needed to deliver \\"triaging patients\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-8966r3", "task": "Confirm everything needed to deliver \\"sterilization/room turnover\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-71rdlr", "task": "Confirm everything needed to deliver \\"chairside assisting\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-ts2n38", "category": "Operational", "decisionType": "Day-to-day execution of Triaging Patients", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-1o9jmj", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	2026-04-28 19:38:15.149563+00	2026-04-28 19:38:15.149563+00	2026-04-28 19:39:08.571012+00	4	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
2	Office Manager	Carrie Taylor	CT	4	Operations	Operations Support	The Practice Manager runs the operating system of the practice so that clinical can focus on clinical. This role exists to remove friction from every patient encounter and every team workflow.	Operational excellence is what lets EDGE deliver on its emergency-first promise — the Practice Manager is the multiplier that turns clinical talent into a scalable practice.	Embodies "Make the right thing the easy thing" and "Own the outcome." The Practice Manager is the most accountable seat in the building.	Patients feel a calm, well-run practice from check-in to checkout. Team members know their schedule, their role, and who has their back.	{"downtime": [{"id": "d1", "task": "Make follow-up calls on unpaid balances.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Review next week's schedule for gaps to fill.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Check inventory levels and reorder as needed.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "1-on-1 with one team member — listen first.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's collections and deposits.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Review tomorrow's schedule with Lead Dentist.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Confirm overnight on-call coverage.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lock up; arm security; confirm sterilizers complete.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Lead morning huddle.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm staffing for the day; cover gaps.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review production goal vs. schedule.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Walk the building — operatories, lobby, sterilization.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Supply reorder below $1,000 threshold", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Approved vendor list. Single PO under $1,000.", "escalationToRoleId": null}, {"id": "dc2", "category": "Operational", "decisionType": "Schedule changes & cover for call-outs", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Within posted scheduling guidelines; inform Lead Dentist by end of day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Financial", "decisionType": "Comp / discount up to $500", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Documented patient-experience reason; logged in PMS.", "escalationToRoleId": null}, {"id": "dc4", "category": "People", "decisionType": "Hire / fire decisions", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to ownership with documentation.", "escalationToRoleId": null}]	2026-04-28 19:51:36.094+00	2026-04-28 18:45:33.370051+00	2026-04-28 19:51:36.094+00	4	["Morning huddle held 100% of operating days with full team present.", ">= 10 open A/R follow-ups closed per day.", "Schedule-block utilization (next 7 days) at >= 85%.", "Collections rate of >= 96% of production each month.", "Voluntary team turnover <= 15% over rolling 12 months.", "Average patient wait time (check-in to seated) <= 12 minutes."]
8	Practice Liason	Open		2	People	Operations Support	The Practice Liaison is the face of EDGE in the local medical community — building referral relationships with general dentists, ER physicians, and urgent care clinics so emergency patients are routed to us first.	EDGE only wins if the community knows where to send emergency dental patients. The Liaison turns that awareness into a steady, named referral pipeline.	Lives "Teach what you know" by educating referral partners on what we treat, how we treat it, and how to send a patient cleanly. Lives "Patient first, ego last" by closing the loop on every referral with a thank-you and an outcome update.	Every referring provider who trusts EDGE with their emergency cases is a multiplier — they send patients we would never have reached on our own.	{"downtime": [{"id": "d0-m4kgub", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-9fwcqq", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-l74qy5", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-4shebe", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-hovu89", "task": "Confirm everything needed to deliver \\"building relationships with local dentists, er/urgent cares\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-nl3abh", "task": "Confirm everything needed to deliver \\"marketing scorecard\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-cpgayz", "task": "Confirm everything needed to deliver \\"referral correspondences?\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-pszuxx", "category": "Operational", "decisionType": "Day-to-day execution of Building Relationships with Local Dentists, ER/Urgent Cares", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-absvg2", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	2026-04-28 19:38:23.2448+00	2026-04-28 19:38:23.2448+00	2026-04-28 19:39:16.219287+00	4	["Referral source pipeline grows >= 5 active GP partners per quarter per location.", "Community / employer health partnerships generate >= 20 new patients per month per location.", "Brand awareness lifts measured via monthly branded-search volume."]
9	Owner — Brooks Paine	Brooks Paine	BP	\N	Operations	Leadership	The Owner exists to set the long-term direction of EDGE, allocate capital, hire and develop senior leadership, and protect the cultural standard of the practice. Brooks Paine is the final accountable seat for revenue, profit, and team trust.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Owner is the keeper of that mission — the one who decides what EDGE will and won't say yes to, and who personally sponsors the bets that make the mission real.	Lives the EDGE Cultural Code by being visibly present, transparent about the numbers, and willing to be coached. Sets the standard for "Patient first, ego last" in every leadership decision.	Patients trust EDGE because they sense an owner cares — even when they never meet one. Team members trust EDGE because the owner shows up, tells the truth about the business, and protects the people doing the work.	{"downtime": [{"id": "d0-kubsji", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-gizyhn", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-6mpr3j", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-k5ulk9", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-gmyns4", "task": "Confirm everything needed to deliver \\"vision\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-g0m37l", "task": "Confirm everything needed to deliver \\"strategy and growth\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-6riy7n", "task": "Confirm everything needed to deliver \\"culture\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-zavbxs", "category": "Financial", "decisionType": "Capital allocation up to $25k", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Single-line items above $25k go to a co-owner discussion before commitment.", "escalationToRoleId": null}, {"id": "dec1-tpv3s4", "category": "People", "decisionType": "Hiring senior leadership", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Always done in conversation with the co-owner. Document the rationale.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	["Practice EBITDA grows year-over-year per location.", "Annual practice strategy reviewed and approved each Q1.", "Each location has a named Office Manager and Lead Dentist accountable to a written role doc."]
10	Office Manager	Open		9	Operations	Operations Support	The Practice Manager runs the operating system of the practice so that clinical can focus on clinical. This role exists to remove friction from every patient encounter and every team workflow.	Operational excellence is what lets EDGE deliver on its emergency-first promise — the Practice Manager is the multiplier that turns clinical talent into a scalable practice.	Embodies "Make the right thing the easy thing" and "Own the outcome." The Practice Manager is the most accountable seat in the building.	Patients feel a calm, well-run practice from check-in to checkout. Team members know their schedule, their role, and who has their back.	{"downtime": [{"id": "d1", "task": "Make follow-up calls on unpaid balances.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Review next week's schedule for gaps to fill.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Check inventory levels and reorder as needed.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "1-on-1 with one team member — listen first.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's collections and deposits.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Review tomorrow's schedule with Lead Dentist.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Confirm overnight on-call coverage.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lock up; arm security; confirm sterilizers complete.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Lead morning huddle.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm staffing for the day; cover gaps.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review production goal vs. schedule.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Walk the building — operatories, lobby, sterilization.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Supply reorder below $1,000 threshold", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Approved vendor list. Single PO under $1,000.", "escalationToRoleId": null}, {"id": "dc2", "category": "Operational", "decisionType": "Schedule changes & cover for call-outs", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Within posted scheduling guidelines; inform Lead Dentist by end of day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Financial", "decisionType": "Comp / discount up to $500", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Documented patient-experience reason; logged in PMS.", "escalationToRoleId": null}, {"id": "dc4", "category": "People", "decisionType": "Hire / fire decisions", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to ownership with documentation.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	["Morning huddle held 100% of operating days with full team present.", ">= 10 open A/R follow-ups closed per day.", "Schedule-block utilization (next 7 days) at >= 85%.", "Collections rate of >= 96% of production each month.", "Voluntary team turnover <= 15% over rolling 12 months.", "Average patient wait time (check-in to seated) <= 12 minutes."]
11	Front Desk	Open		10	People	Operations Support	The Patient Coordinator is the first human a patient in pain talks to. This role exists to convert a scared phone call into a confident, on-the-schedule appointment — and to make sure every patient leaves understood, paid up, and rebooked when needed.	EDGE's mission lives or dies at the front desk. A patient turned away by tone or by clumsy scheduling is a patient who tells ten others EDGE is just like every other practice.	Embodies "Patient first, ego last" and "Speed of pain." Answers every call within three rings; never lets a walk-in stand for more than 30 seconds without acknowledgement.	Every patient is greeted by name when possible, walked back personally, and given a clear, written summary of next steps before they leave. The lobby never feels like a waiting room — it feels like a host station.	{"downtime": [{"id": "d1", "task": "Confirm appointments for next 48 hours.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Recall list — call patients overdue for follow-up.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Verify insurance for tomorrow's patients.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Restock front-desk supplies; confirm card reader.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's payments; close drawer.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Forward phones to on-call line.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Email tomorrow's schedule to clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lobby reset for tomorrow morning.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Open phone lines; check overnight voicemail and triage.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm today's appointments; send any missing reminders.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Lobby reset — water, magazines, music, scent.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Print day sheets for clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Schedule a same-day emergency walk-in", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Open clinical slot exists; patient symptoms match emergency criteria.", "escalationToRoleId": null}, {"id": "dc2", "category": "Financial", "decisionType": "Waive small balance under $50", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Goodwill / patient-experience reason. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Operational", "decisionType": "Reschedule a doctor's appointment block", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to Practice Manager.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	[">= 95% of inbound calls answered within 3 rings during open hours.", ">= 80% of pain-related calls converted to a same-day appointment.", ">= 90% of patients leave with a follow-up appointment booked.", "Patient lobby NPS of >= 80.", "Insurance verified for 100% of next-day patients before end of business."]
12	Assistant	Open		10	Operations	Operations Support	The Dental Assistant exists to keep the operatory flowing — turning rooms quickly, anticipating the doctor's next instrument, and making patients feel seen and safe from the moment they sit in the chair.	EDGE promises same-day relief. The Assistant is the speed multiplier that lets the doctor see one more emergency patient every hour without sacrificing safety or warmth.	Lives "Move at the speed of pain" in every room turnover and "Patient first, ego last" in every chairside conversation.	Patients remember the assistant who held their hand and explained what was about to happen. That is often the moment they decide whether to trust EDGE with the rest of their care.	{"downtime": [{"id": "d0-05z9jq", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-njtp07", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-o4ere1", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-gfv1fo", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-eu8oqh", "task": "Confirm everything needed to deliver \\"triaging patients\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-8966r3", "task": "Confirm everything needed to deliver \\"sterilization/room turnover\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-71rdlr", "task": "Confirm everything needed to deliver \\"chairside assisting\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-ts2n38", "category": "Operational", "decisionType": "Day-to-day execution of Triaging Patients", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-1o9jmj", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
13	Lead Assistant	Open		10	Operations	Operations Support	The Lead Assistant runs the supply chain, training program, and clinical-side operations of the practice so the doctors and assistants never have to think about anything except the patient in the chair.	Operational reliability is what lets EDGE deliver its emergency-first promise day after day. The Lead Assistant owns the systems that make that reliability invisible.	"Make the right thing the easy thing." Builds the guidebooks, the supply lists, and the onboarding paths that turn new hires into confident clinicians fast.	Every new assistant who gets up to speed in two weeks instead of two months is a gift to the next 500 emergency patients that team will see together.	{"downtime": [{"id": "d0-mzuxi3", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-7jkh0i", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-fou2mp", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-ag1fa3", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-l3ih0f", "task": "Confirm everything needed to deliver \\"supplies ordering\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-jozq67", "task": "Confirm everything needed to deliver \\"supplies budget management\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-tsr5u0", "task": "Confirm everything needed to deliver \\"onboarding/training\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-mx9bt5", "category": "Operational", "decisionType": "Day-to-day execution of Supplies Ordering", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-0e55no", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
14	Associate Dentist	Open		10	Operations	Clinical	The Lead Emergency Dentist is the clinical anchor of EDGE. This role exists to deliver same-day relief for patients in dental pain, hold the standard for emergency-first clinical excellence, and mentor the next generation of EDGE doctors on the partner track.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Lead Dentist personally embodies this mission every shift — every walk-in seen, every diagnosis confirmed under pressure, every honest treatment plan presented advances it.	Lives the EDGE Cultural Code daily: "Patient first, ego last," "Move at the speed of pain," and "Teach what you know." The Lead Dentist's tone in the operatory sets the tone for the whole team.	Every emergency patient walks in scared and leaves understood. The Lead Dentist owns the warm handoff from front desk to chair, the calm explanation of options, and the unhurried treatment of patients who've been turned away elsewhere — the experience traditional dental practices simply do not offer.	{"downtime": [{"id": "d1", "task": "Review pending CBCT reads and finalize diagnoses.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Call patients with pending treatment plans not yet accepted.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Coach an associate through a recent case (15 min review).", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Update one playbook with anything you learned today.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d5", "task": "Be visible at the front — back up Patient Coordinator with walk-in triage.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Sign all chart notes from today's visits.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Confirm tomorrow's schedule with Practice Manager.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Hand off any open emergencies to on-call protocol.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Confirm sterilizers run final cycle; CBCT powered down.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e5", "task": "End-of-day text to associate(s) — one specific thing they did well.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Huddle with clinical team — review schedule, gaps, anticipated walk-ins.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm operatories are stocked, sterilizers are ready, CBCT is up.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review yesterday's open cases and call-back list.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Check pharmacy inventory for emergency medications.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s5", "task": "Confirm associate(s) on schedule are oriented and ready.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Clinical", "decisionType": "Clinical treatment plan approval under $5,000", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Single-visit or short-course care under $5,000 total. Patient is medically stable.", "escalationToRoleId": null}, {"id": "dc2", "category": "Clinical", "decisionType": "Emergency after-hours callout", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Active facial swelling, uncontrolled bleeding, or trauma. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Clinical", "decisionType": "Refer out to specialist (oral surgery / endo / perio)", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Case exceeds in-house clinical scope or equipment. Use approved specialist network.", "escalationToRoleId": null}, {"id": "dc4", "category": "Financial", "decisionType": "Comp / discount on a treatment plan", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Any discount over $250 — recommend to Practice Manager with rationale.", "escalationToRoleId": null}, {"id": "dc5", "category": "People", "decisionType": "Send associate home early due to low volume", "authorityLevel": "Escalate", "linkedPlaybookId": null, "boundaryConditions": "Always escalate to Practice Manager — affects payroll and morale.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	1	["Same-day emergency slots filled at >= 85% utilization.", "Treatment plans presented same-visit on >= 95% of completed exams.", "Case acceptance rate of >= 70% within 30 days of presentation.", "Production per clinical hour of >= $850.", "Patient NPS (post-visit) of >= 75.", ">= 5 chairside coaching touchpoints with associates per week."]
15	Owner — Brooks Paine	Brooks Paine	BP	\N	Operations	Leadership	The Owner exists to set the long-term direction of EDGE, allocate capital, hire and develop senior leadership, and protect the cultural standard of the practice. Brooks Paine is the final accountable seat for revenue, profit, and team trust.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Owner is the keeper of that mission — the one who decides what EDGE will and won't say yes to, and who personally sponsors the bets that make the mission real.	Lives the EDGE Cultural Code by being visibly present, transparent about the numbers, and willing to be coached. Sets the standard for "Patient first, ego last" in every leadership decision.	Patients trust EDGE because they sense an owner cares — even when they never meet one. Team members trust EDGE because the owner shows up, tells the truth about the business, and protects the people doing the work.	{"downtime": [{"id": "d0-kubsji", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-gizyhn", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-6mpr3j", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-k5ulk9", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-gmyns4", "task": "Confirm everything needed to deliver \\"vision\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-g0m37l", "task": "Confirm everything needed to deliver \\"strategy and growth\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-6riy7n", "task": "Confirm everything needed to deliver \\"culture\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-zavbxs", "category": "Financial", "decisionType": "Capital allocation up to $25k", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Single-line items above $25k go to a co-owner discussion before commitment.", "escalationToRoleId": null}, {"id": "dec1-tpv3s4", "category": "People", "decisionType": "Hiring senior leadership", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Always done in conversation with the co-owner. Document the rationale.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	["Practice EBITDA grows year-over-year per location.", "Annual practice strategy reviewed and approved each Q1.", "Each location has a named Office Manager and Lead Dentist accountable to a written role doc."]
20	Associate Dentist	Open		16	Operations	Clinical	The Lead Emergency Dentist is the clinical anchor of EDGE. This role exists to deliver same-day relief for patients in dental pain, hold the standard for emergency-first clinical excellence, and mentor the next generation of EDGE doctors on the partner track.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Lead Dentist personally embodies this mission every shift — every walk-in seen, every diagnosis confirmed under pressure, every honest treatment plan presented advances it.	Lives the EDGE Cultural Code daily: "Patient first, ego last," "Move at the speed of pain," and "Teach what you know." The Lead Dentist's tone in the operatory sets the tone for the whole team.	Every emergency patient walks in scared and leaves understood. The Lead Dentist owns the warm handoff from front desk to chair, the calm explanation of options, and the unhurried treatment of patients who've been turned away elsewhere — the experience traditional dental practices simply do not offer.	{"downtime": [{"id": "d1", "task": "Review pending CBCT reads and finalize diagnoses.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Call patients with pending treatment plans not yet accepted.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Coach an associate through a recent case (15 min review).", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Update one playbook with anything you learned today.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d5", "task": "Be visible at the front — back up Patient Coordinator with walk-in triage.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Sign all chart notes from today's visits.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Confirm tomorrow's schedule with Practice Manager.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Hand off any open emergencies to on-call protocol.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Confirm sterilizers run final cycle; CBCT powered down.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e5", "task": "End-of-day text to associate(s) — one specific thing they did well.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Huddle with clinical team — review schedule, gaps, anticipated walk-ins.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm operatories are stocked, sterilizers are ready, CBCT is up.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review yesterday's open cases and call-back list.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Check pharmacy inventory for emergency medications.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s5", "task": "Confirm associate(s) on schedule are oriented and ready.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Clinical", "decisionType": "Clinical treatment plan approval under $5,000", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Single-visit or short-course care under $5,000 total. Patient is medically stable.", "escalationToRoleId": null}, {"id": "dc2", "category": "Clinical", "decisionType": "Emergency after-hours callout", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Active facial swelling, uncontrolled bleeding, or trauma. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Clinical", "decisionType": "Refer out to specialist (oral surgery / endo / perio)", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Case exceeds in-house clinical scope or equipment. Use approved specialist network.", "escalationToRoleId": null}, {"id": "dc4", "category": "Financial", "decisionType": "Comp / discount on a treatment plan", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Any discount over $250 — recommend to Practice Manager with rationale.", "escalationToRoleId": null}, {"id": "dc5", "category": "People", "decisionType": "Send associate home early due to low volume", "authorityLevel": "Escalate", "linkedPlaybookId": null, "boundaryConditions": "Always escalate to Practice Manager — affects payroll and morale.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	["Same-day emergency slots filled at >= 85% utilization.", "Treatment plans presented same-visit on >= 95% of completed exams.", "Case acceptance rate of >= 70% within 30 days of presentation.", "Production per clinical hour of >= $850.", "Patient NPS (post-visit) of >= 75.", ">= 5 chairside coaching touchpoints with associates per week."]
16	Office Manager	Open		15	Operations	Operations Support	The Practice Manager runs the operating system of the practice so that clinical can focus on clinical. This role exists to remove friction from every patient encounter and every team workflow.	Operational excellence is what lets EDGE deliver on its emergency-first promise — the Practice Manager is the multiplier that turns clinical talent into a scalable practice.	Embodies "Make the right thing the easy thing" and "Own the outcome." The Practice Manager is the most accountable seat in the building.	Patients feel a calm, well-run practice from check-in to checkout. Team members know their schedule, their role, and who has their back.	{"downtime": [{"id": "d1", "task": "Make follow-up calls on unpaid balances.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Review next week's schedule for gaps to fill.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Check inventory levels and reorder as needed.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "1-on-1 with one team member — listen first.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's collections and deposits.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Review tomorrow's schedule with Lead Dentist.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Confirm overnight on-call coverage.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lock up; arm security; confirm sterilizers complete.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Lead morning huddle.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm staffing for the day; cover gaps.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Review production goal vs. schedule.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Walk the building — operatories, lobby, sterilization.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Supply reorder below $1,000 threshold", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Approved vendor list. Single PO under $1,000.", "escalationToRoleId": null}, {"id": "dc2", "category": "Operational", "decisionType": "Schedule changes & cover for call-outs", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Within posted scheduling guidelines; inform Lead Dentist by end of day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Financial", "decisionType": "Comp / discount up to $500", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Documented patient-experience reason; logged in PMS.", "escalationToRoleId": null}, {"id": "dc4", "category": "People", "decisionType": "Hire / fire decisions", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to ownership with documentation.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	["Morning huddle held 100% of operating days with full team present.", ">= 10 open A/R follow-ups closed per day.", "Schedule-block utilization (next 7 days) at >= 85%.", "Collections rate of >= 96% of production each month.", "Voluntary team turnover <= 15% over rolling 12 months.", "Average patient wait time (check-in to seated) <= 12 minutes."]
17	Front Desk	Open		16	People	Operations Support	The Patient Coordinator is the first human a patient in pain talks to. This role exists to convert a scared phone call into a confident, on-the-schedule appointment — and to make sure every patient leaves understood, paid up, and rebooked when needed.	EDGE's mission lives or dies at the front desk. A patient turned away by tone or by clumsy scheduling is a patient who tells ten others EDGE is just like every other practice.	Embodies "Patient first, ego last" and "Speed of pain." Answers every call within three rings; never lets a walk-in stand for more than 30 seconds without acknowledgement.	Every patient is greeted by name when possible, walked back personally, and given a clear, written summary of next steps before they leave. The lobby never feels like a waiting room — it feels like a host station.	{"downtime": [{"id": "d1", "task": "Confirm appointments for next 48 hours.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d2", "task": "Recall list — call patients overdue for follow-up.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d3", "task": "Verify insurance for tomorrow's patients.", "estimatedMinutes": 30, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d4", "task": "Restock front-desk supplies; confirm card reader.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e1", "task": "Reconcile day's payments; close drawer.", "estimatedMinutes": 20, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e2", "task": "Forward phones to on-call line.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e3", "task": "Email tomorrow's schedule to clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e4", "task": "Lobby reset for tomorrow morning.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s1", "task": "Open phone lines; check overnight voicemail and triage.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2", "task": "Confirm today's appointments; send any missing reminders.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s3", "task": "Lobby reset — water, magazines, music, scent.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s4", "task": "Print day sheets for clinical team.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dc1", "category": "Operational", "decisionType": "Schedule a same-day emergency walk-in", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Open clinical slot exists; patient symptoms match emergency criteria.", "escalationToRoleId": null}, {"id": "dc2", "category": "Financial", "decisionType": "Waive small balance under $50", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Goodwill / patient-experience reason. Inform Practice Manager same day.", "escalationToRoleId": null}, {"id": "dc3", "category": "Operational", "decisionType": "Reschedule a doctor's appointment block", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Always recommend to Practice Manager.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	[">= 95% of inbound calls answered within 3 rings during open hours.", ">= 80% of pain-related calls converted to a same-day appointment.", ">= 90% of patients leave with a follow-up appointment booked.", "Patient lobby NPS of >= 80.", "Insurance verified for 100% of next-day patients before end of business."]
18	Assistant	Open		16	Operations	Operations Support	The Dental Assistant exists to keep the operatory flowing — turning rooms quickly, anticipating the doctor's next instrument, and making patients feel seen and safe from the moment they sit in the chair.	EDGE promises same-day relief. The Assistant is the speed multiplier that lets the doctor see one more emergency patient every hour without sacrificing safety or warmth.	Lives "Move at the speed of pain" in every room turnover and "Patient first, ego last" in every chairside conversation.	Patients remember the assistant who held their hand and explained what was about to happen. That is often the moment they decide whether to trust EDGE with the rest of their care.	{"downtime": [{"id": "d0-05z9jq", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-njtp07", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-o4ere1", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-gfv1fo", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-eu8oqh", "task": "Confirm everything needed to deliver \\"triaging patients\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-8966r3", "task": "Confirm everything needed to deliver \\"sterilization/room turnover\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-71rdlr", "task": "Confirm everything needed to deliver \\"chairside assisting\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-ts2n38", "category": "Operational", "decisionType": "Day-to-day execution of Triaging Patients", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-1o9jmj", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
19	Lead Assistant	Open		16	Operations	Operations Support	The Lead Assistant runs the supply chain, training program, and clinical-side operations of the practice so the doctors and assistants never have to think about anything except the patient in the chair.	Operational reliability is what lets EDGE deliver its emergency-first promise day after day. The Lead Assistant owns the systems that make that reliability invisible.	"Make the right thing the easy thing." Builds the guidebooks, the supply lists, and the onboarding paths that turn new hires into confident clinicians fast.	Every new assistant who gets up to speed in two weeks instead of two months is a gift to the next 500 emergency patients that team will see together.	{"downtime": [{"id": "d0-mzuxi3", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-7jkh0i", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-fou2mp", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-ag1fa3", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-l3ih0f", "task": "Confirm everything needed to deliver \\"supplies ordering\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-jozq67", "task": "Confirm everything needed to deliver \\"supplies budget management\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-tsr5u0", "task": "Confirm everything needed to deliver \\"onboarding/training\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-mx9bt5", "category": "Operational", "decisionType": "Day-to-day execution of Supplies Ordering", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Within budget and within role scope — escalate anything that requires changing the schedule for another team member.", "escalationToRoleId": null}, {"id": "dec1-0e55no", "category": "Operational", "decisionType": "Escalating a stuck patient or operational issue", "authorityLevel": "Recommend Only", "linkedPlaybookId": null, "boundaryConditions": "Anything that is going to affect the day's revenue, the patient's experience, or another teammate's workflow gets escalated within the hour.", "escalationToRoleId": null}]	\N	2026-04-28 22:34:24.914123+00	2026-04-28 22:34:24.914123+00	3	["Operatory turnaround time <= 10 minutes between patients.", "Sterilization compliance audit score >= 98%.", "Doctor downtime in chair <= 5% of clinical day."]
27	Owner	Frank Alderman	FA	\N	Operations	Operations Support					{"downtime": [], "endOfDay": [], "startOfDay": []}	[]	2026-04-28 22:45:32.437+00	2026-04-28 22:45:14.180547+00	2026-04-28 22:45:32.437+00	5	[]
21	Owner	Brooks Paine	BP	\N	Operations	Leadership	The Owner exists to set the long-term direction of EDGE, allocate capital, hire and develop senior leadership, and protect the cultural standard of the practice. Brooks Paine is the final accountable seat for revenue, profit, and team trust.	EDGE exists to make emergency dental the most respected and accessible specialty in the country. The Owner is the keeper of that mission — the one who decides what EDGE will and won't say yes to, and who personally sponsors the bets that make the mission real.	Lives the EDGE Cultural Code by being visibly present, transparent about the numbers, and willing to be coached. Sets the standard for "Patient first, ego last" in every leadership decision.	Patients trust EDGE because they sense an owner cares — even when they never meet one. Team members trust EDGE because the owner shows up, tells the truth about the business, and protects the people doing the work.	{"downtime": [{"id": "d0-kubsji", "task": "Catch up on documentation and any open follow-ups.", "estimatedMinutes": 15, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "d1-gizyhn", "task": "Restock and prep for the next patient block.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}], "endOfDay": [{"id": "e0-6mpr3j", "task": "Close out today's work — log anything outstanding.", "estimatedMinutes": 10, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "e1-k5ulk9", "task": "Confirm tomorrow is set up for success.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}], "startOfDay": [{"id": "s0-gmyns4", "task": "Confirm everything needed to deliver \\"vision\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s1-g0m37l", "task": "Confirm everything needed to deliver \\"strategy and growth\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}, {"id": "s2-6riy7n", "task": "Confirm everything needed to deliver \\"culture\\" today is in place.", "estimatedMinutes": 5, "linkedDecisionId": null, "linkedPlaybookId": null}]}	[{"id": "dec0-zavbxs", "category": "Financial", "decisionType": "Capital allocation up to $25k", "authorityLevel": "Decide & Inform", "linkedPlaybookId": null, "boundaryConditions": "Single-line items above $25k go to a co-owner discussion before commitment.", "escalationToRoleId": null}, {"id": "dec1-tpv3s4", "category": "People", "decisionType": "Hiring senior leadership", "authorityLevel": "Decide & Act", "linkedPlaybookId": null, "boundaryConditions": "Always done in conversation with the co-owner. Document the rationale.", "escalationToRoleId": null}]	2026-04-28 22:45:50.512+00	2026-04-28 22:34:24.914123+00	2026-04-28 22:45:50.512+00	5	["Practice EBITDA grows year-over-year per location.", "Annual practice strategy reviewed and approved each Q1.", "Each location has a named Office Manager and Lead Dentist accountable to a written role doc."]
28	Marketing Liason	Open		21	Operations	Operations Support					{"downtime": [], "endOfDay": [], "startOfDay": []}	[]	2026-04-28 22:47:40.968+00	2026-04-28 22:47:40.979013+00	2026-04-28 22:47:40.979013+00	5	[]
\.


--
-- Data for Name: schedule_blocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedule_blocks (id, day, start, duration, label, category, sort_order, created_at) FROM stdin;
8	Mon	19	1	Evening Ritual	evening	7	2026-04-15 19:25:13.597779+00
12	Tue	10	2	Deepwork	deepwork	3	2026-04-15 19:25:13.597779+00
15	Tue	16	1	Shutdown Ritual	shutdown	6	2026-04-15 19:25:13.597779+00
17	Tue	19	1	Evening Ritual	evening	8	2026-04-15 19:25:13.597779+00
20	Wed	8.5	1.5	Deepwork	deepwork	2	2026-04-15 19:25:13.597779+00
22	Wed	10.5	1.5	Deepwork	deepwork	4	2026-04-15 19:25:13.597779+00
25	Wed	16	1	Shutdown Ritual	shutdown	7	2026-04-15 19:25:13.597779+00
28	Wed	19	1	Evening Ritual	evening	10	2026-04-15 19:25:13.597779+00
33	Thu	12	1	Deepwork	deepwork	4	2026-04-15 19:25:13.597779+00
36	Thu	16	1	Shutdown Ritual	shutdown	7	2026-04-15 19:25:13.597779+00
38	Thu	19	1	Evening Ritual	evening	9	2026-04-15 19:25:13.597779+00
55	Sat	19	1	Evening Ritual	evening	7	2026-04-15 19:25:13.597779+00
63	Sun	19	1	Evening Ritual	evening	7	2026-04-15 19:25:13.597779+00
73	Tue	7	0.5	Morning Ritual	morning	0	2026-04-16 00:49:44.143343+00
10	Tue	7.5	0.5	Startup Ritual	startup	1	2026-04-15 19:25:13.597779+00
77	Tue	8	1	Workout	workout	0	2026-04-16 00:51:27.732898+00
76	Mon	6.5	1	Workout	workout	0	2026-04-16 00:51:05.859738+00
75	Fri	6.5	1	Workout	workout	0	2026-04-16 00:50:59.16441+00
24	Wed	14	1	Execution Block	executive	6	2026-04-15 19:25:13.597779+00
34	Thu	13	1	Execution Block	executive	5	2026-04-15 19:25:13.597779+00
78	Wed	15	1	Workout	workout	0	2026-04-16 00:54:30.403962+00
79	Thu	15	1	Workout	workout	0	2026-04-16 00:54:32.214148+00
47	Fri	19	1	Evening Ritual	evening	8	2026-04-15 19:25:13.597779+00
80	Thu	8.5	0.5	Gordon/Chad Meeting	meeting	0	2026-04-16 00:56:24.831054+00
49	Sat	7	0.5	Startup Ritual	startup	1	2026-04-15 19:25:13.597779+00
66	Sat	6.5	0.5	Morning Ritual	morning	0	2026-04-16 00:16:40.88777+00
69	Sun	6.5	0.5	Morning Ritual	morning	0	2026-04-16 00:17:09.623467+00
70	Sun	7	0.5	Startup Ritual	startup	0	2026-04-16 00:17:13.68786+00
82	Thu	10	0.5	Post-Meeting Action Items	meeting	0	2026-04-16 01:00:46.069076+00
84	Sun	7.5	1.5	Deepwork	deepwork	0	2026-04-18 12:15:11.666076+00
42	Fri	10	9	Patient Care	patient	3	2026-04-15 19:25:13.597779+00
51	Sat	9	6	Patient Care	patient	3	2026-04-15 19:25:13.597779+00
58	Sun	9	6	Patient Care	patient	2	2026-04-15 19:25:13.597779+00
65	Mon	10	9	Patient Care	patient	0	2026-04-16 00:15:30.308476+00
14	Tue	15	1	Execution Block	executive	5	2026-04-15 19:25:13.597779+00
30	Thu	8	0.5	Startup Ritual	startup	1	2026-04-15 19:25:13.597779+00
19	Wed	8	0.5	Startup Ritual	startup	1	2026-04-15 19:25:13.597779+00
71	Thu	7.5	0.5	Morning Ritual	morning	0	2026-04-16 00:49:41.096859+00
72	Wed	7.5	0.5	Morning Ritual	morning	0	2026-04-16 00:49:42.713649+00
2	Mon	8.5	0.5	Startup Ritual	startup	1	2026-04-15 19:25:13.597779+00
74	Mon	8	0.5	Morning Ritual	morning	0	2026-04-16 00:49:53.109292+00
67	Fri	8.5	0.5	Startup Ritual	startup	0	2026-04-16 00:16:56.787903+00
39	Fri	8	0.5	Morning Ritual	morning	0	2026-04-15 19:25:13.597779+00
11	Tue	9.5	0.5	Weekly Review	review	2	2026-04-15 19:25:13.597779+00
83	Sat	7.5	1.5	Deepwork	deepwork	0	2026-04-18 12:15:09.554985+00
60	Sun	15	1	Shutdown Ritual	shutdown	4	2026-04-15 19:25:13.597779+00
85	Sat	15	1	Shutdown Ritual	shutdown	0	2026-04-18 12:16:14.060774+00
86	Mon	9	1.5	Deepwork	deepwork	0	2026-04-20 10:57:59.161407+00
87	Fri	9	1.5	Deepwork	deepwork	0	2026-04-20 10:58:05.256631+00
64	Tue	17	2	Family	family	0	2026-04-15 21:30:32.919058+00
88	Tue	17	2	Family	family	0	2026-04-26 18:31:43.861422+00
16	Wed	17	2	Family	family	7	2026-04-15 19:25:13.597779+00
37	Thu	17	2	Family	family	8	2026-04-15 19:25:13.597779+00
54	Sat	16	3	Family	family	6	2026-04-15 19:25:13.597779+00
62	Sun	16	3	Family	family	6	2026-04-15 19:25:13.597779+00
\.


--
-- Data for Name: seat_key_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seat_key_results (id, seat_id, title, description, sort_order, created_at, updated_at) FROM stdin;
2	8	Staffing/HR	\N	1	2026-04-21 16:05:41.604021+00	2026-04-21 16:12:07.749+00
3	8	Office Profitability	\N	1	2026-04-21 16:22:34.349424+00	2026-04-21 16:22:42.929+00
4	8	Operations	\N	2	2026-04-21 16:24:36.231371+00	2026-04-21 16:24:42.183+00
5	11	Supplies Budget	\N	0	2026-04-21 16:43:16.865701+00	2026-04-21 16:43:24.747+00
\.


--
-- Data for Name: seat_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.seat_tasks (id, seat_id, title, description, status, due_date, completed, sort_order, created_at, updated_at, priority, assignee, key_result_id) FROM stdin;
5	1	Approve Q2 hiring plan	Final sign-off needed before recruiter outreach.	todo	2026-04-25	f	0	2026-04-20 00:17:47.31296+00	2026-04-20 00:17:47.31296+00	high	Brooks Paine	\N
6	1	Review monthly P&L	\N	in_progress	2026-05-01	f	1	2026-04-20 00:17:47.31296+00	2026-04-20 00:17:47.31296+00	medium	Jane Doe	\N
7	1	Update vision deck for all-hands	Refresh slides with new EDGE locations.	todo	\N	f	2	2026-04-20 00:17:47.31296+00	2026-04-20 00:17:47.31296+00	low	\N	\N
8	1	Sign new Pearland lease	Counter-signed copy in Dropbox.	done	2026-04-15	t	3	2026-04-20 00:17:47.31296+00	2026-04-20 00:17:47.31296+00	high	Brooks Paine	\N
9	1	Coach Office Manager on KPIs	\N	in_progress	2026-04-22	f	4	2026-04-20 00:17:47.31296+00	2026-04-20 00:17:47.31296+00	high	Brooks Paine	\N
21	8	Robin beginning Marketing Liason	\N	todo	2026-04-23	f	0	2026-04-21 16:22:01.713819+00	2026-04-21 16:22:01.713819+00	medium	Carrie Taylor	2
22	8	Meet with Brian about Prod/Coll discrepancy (Ask about expenses from CED)	\N	todo	2026-04-23	f	0	2026-04-21 16:23:13.392317+00	2026-04-21 16:23:13.392317+00	medium	Carrie Taylor	3
23	8	Positional Manuals 30/60/90 FD	\N	todo	2026-04-23	f	0	2026-04-21 16:25:04.210037+00	2026-04-21 16:25:09.023+00	medium	Carrie Taylor	4
24	8	Main Tasks for OM - Daily, Weekly, Monthly Tasks	\N	todo	2026-04-23	f	0	2026-04-21 16:25:28.801452+00	2026-04-21 16:25:28.801452+00	medium	Carrie Taylor	4
25	8	Team members signing guidebooks, received input from team members	\N	todo	2026-04-30	f	0	2026-04-21 16:42:40.401147+00	2026-04-21 16:42:40.401147+00	medium	Carrie Taylor	4
20	8	Define Interview Steps	\N	done	2026-04-23	t	0	2026-04-21 16:21:17.771983+00	2026-04-28 19:48:25.929+00	medium	Carrie Taylor	2
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, image_url, created_at, updated_at) FROM stdin;
user_3CzsefqVJn4XKyGAju53uxOR6GZ	brookspaine@gmail.com	brookspaine	https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zQ3pvQTN6anlXT0pyTkdhWG5zVkFwNjZCemYiLCJyaWQiOiJ1c2VyXzNDenNlZnFWSm40WEt5R0FqdTUzdXhPUjZHWiJ9	2026-04-28 18:10:31.512178+00	2026-04-28 18:30:39.767+00
dev-user	\N	Dev User	\N	2026-04-28 18:31:04.249825+00	2026-04-29 00:19:37.593+00
\.


--
-- Data for Name: vendor_passwords; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_passwords (id, seat_id, vendor_name, username, password, url, notes, sort_order, created_at, updated_at) FROM stdin;
3	11	TashMed	brookspaine@gmail.com	Matthews9607!	www.tashmed.com	\N	0	2026-04-21 14:42:52.176464+00	2026-04-21 14:42:52.176464+00
4	11	Brasseler USA	drbrookspaine@nccompletedentistry.com	Matthews9607!	\N	\N	0	2026-04-21 14:45:19.05919+00	2026-04-21 14:45:19.05919+00
5	11	Patterson	drbrookspaine@nccompletedentistry.com	Matthews1	\N	\N	1	2026-04-21 14:45:19.101327+00	2026-04-21 14:45:19.101327+00
6	11	Darby Dental	brookspaine@gmail.com	Matthews1!	\N	\N	2	2026-04-21 14:45:19.108821+00	2026-04-21 14:45:19.108821+00
7	11	Maxxeus Dental	drbrookspaine@nccompletedentistry.com	Matthews1!	\N	\N	3	2026-04-21 14:45:19.11659+00	2026-04-21 14:45:19.11659+00
8	11	Kettenbach USA	brookspaine@gmail.com	Matthews1!	\N	\N	4	2026-04-21 14:45:19.123975+00	2026-04-21 14:45:19.123975+00
9	11	DS Core	brookspaine@gmail.com	Matthews 9607!	\N	\N	5	2026-04-21 14:45:19.130167+00	2026-04-21 14:45:19.130167+00
10	11	SICAT SUITE	contactus@myurgentdental.com	Matthews1!	\N	\N	6	2026-04-21 14:45:19.13994+00	2026-04-21 14:45:19.13994+00
11	11	Medit IOS	contactus@myurgentdental.com	Matthews1!	\N	\N	7	2026-04-21 14:45:19.147121+00	2026-04-21 14:45:19.147121+00
12	11	Edge Endo	brookspaine@gmail.com	Timeflies2134	\N	\N	8	2026-04-21 14:45:19.154734+00	2026-04-21 14:45:19.154734+00
13	11	Sicat Portal	brookspaine@gmail.com	Timeflies2134!	\N	\N	9	2026-04-21 14:45:19.165915+00	2026-04-21 14:45:19.165915+00
14	11	Straumann	contactus@myurgentdental.com	Matthews1!	\N	\N	10	2026-04-21 14:45:19.171285+00	2026-04-21 14:45:19.171285+00
15	11	Neodent	contactus@myurgentdental.com	Matthews1!	\N	\N	11	2026-04-21 14:45:19.175994+00	2026-04-21 14:45:19.175994+00
16	11	BioHorizons Implant supplies	contactus@myurgentdental.com	UrgentD3ntal!	\N	\N	12	2026-04-21 14:45:19.181574+00	2026-04-21 14:45:19.181574+00
\.


--
-- Data for Name: weekly_review_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weekly_review_entries (id, year, week, field_key, content, updated_at) FROM stdin;
\.


--
-- Data for Name: weekly_top3; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.weekly_top3 (id, title, completed, priority, week_start, created_at) FROM stdin;
1	Get Alston Lease to LL	t	1	2026-04-13	2026-04-15 16:47:08.426443+00
2	7/7 Workouts this week; back on track with low-carb Med Diet	f	2	2026-04-13	2026-04-15 16:47:42.033913+00
3	Finish Guidebook Template (Assessments, Onboarding/Training)	f	3	2026-04-13	2026-04-15 19:06:43.055157+00
\.


--
-- Data for Name: wisdom_quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wisdom_quotes (id, text, author, created_at) FROM stdin;
6	Biggest reason why Founder-CEO's fail is due to confidence.	\N	2026-04-18 11:08:47.906536+00
7	You can't hesitate. Make the decision. Run at the pain and darkness.	\N	2026-04-18 11:08:47.906536+00
8	What You Do Is Who You Are - Ben Horowitz - cultural checklist - cultural design, culture orientation, shocking rules, incorporate outside leadership, object lessons, make ethics explicit, give cultural tenets deep meaning, walk the talk, make decisions that demonstrate priorities	\N	2026-04-18 11:08:47.906536+00
9	Every company goes through a few WFIO's (whiff-ee-yo), "We're Fucked, It's Over	Ben Horowitz	2026-04-18 11:08:47.906536+00
10	By far the most difficult skill I learned as CEO was the ability to manage my own psychology.	Ben Horowitz	2026-04-18 11:08:47.906536+00
11	Trust is the foundation of communication	Ben Horowitz	2026-04-18 11:08:47.906536+00
12	One of the best ways to change culture is through constant contact.	Ben Horowitz	2026-04-18 11:08:47.906536+00
13	Nothing in life is fair. It never will be. Don't think otherwise or it will consume you. When shit happens, don't think you were owed anything despite the scenario. Move on to what is the best thing to do next?" Ben Horowitz	\N	2026-04-18 11:08:47.906536+00
14	One of the best positions to be in: young, talented, and the underdog." "That's like a cocktail for making something great. You're hungry to prove yourself. You're young enough to not care about how it's previously been done. And, usually, you have fewer responsibilities to pull you away from the work.	\N	2026-04-18 11:08:47.906536+00
15	A person's thoughts are like water in a deep well, but someone with insight can draw them out." Proverbs 20:5 (GNT) "Ask more open-ended questions. "Tell Me More..	\N	2026-04-18 11:08:47.906536+00
16	Every time you make the hard, correct decision you become a bit more courageous.	Ben Horowitz	2026-04-18 11:08:47.906536+00
17	Keep death in mind at all times" - Bushido - The Way of the Warrior	\N	2026-04-18 11:08:47.906536+00
18	The loser has more in common with the winner than with the person sitting on the sidelines." The winner and the loser each had the courage to try. Both risked embarrassment. Both were willing to face uncertainty. Both were stubborn enough to continue. "Success is endurance in disguise. It belongs to the person who can absorb the losses without absorbing the identity of "loser." It's the courage to start — and to stick with it — that is the real separator. Results tend to find the person who stays in the game." "The sidelines are safe, but sterile. Nothing grows there.	\N	2026-04-18 11:08:47.906536+00
19	Culture - virtues, it's a way of being - It's not a set of ideas, it's a set of behaviors. It's a set of actions. You're fired if you talk shit about an entrepreneur. Every 10 min you miss of an entrepreneurs' meeting time, you're fined $10.	\N	2026-04-18 11:08:47.906536+00
20	Communication is biggest issue as you get bigger.	\N	2026-04-18 11:08:47.906536+00
21	To be different, you must think different.. the best CEOs out there put themselves in others shoes, then from that they know how to best influence them on how to do what you want them to do.	\N	2026-04-18 11:08:47.906536+00
22	If big problems, you just start meeting every day/week until it gets fixed. Throw time at it until it gets fixed. Most of the time its a dumb problem and based on communication.	\N	2026-04-18 11:08:47.906536+00
23	We suffer much more often in imagination than in reality	Seneca	2026-04-18 11:08:47.906536+00
24	Slow is smooth. Smooth is fast. No hurry, no pause.	\N	2026-04-18 11:08:47.906536+00
25	When things go wrong in your company, Nobody cares.	Ben Horowitz	2026-04-18 11:08:47.906536+00
26	Hire for Strength rather than lack of weakness	Colin Powell	2026-04-18 11:08:47.906536+00
27	Run the departments and understand the process/needs - then clearly define the skills for the person to hire in that seat." Ben Horowitz	\N	2026-04-18 11:08:47.906536+00
28	We take care of the people, the products, and the profits -- in that order	Ben Horowitz	2026-04-18 11:08:47.906536+00
29	What if I let them make decisions up to $100? $500? $1,000? - People's IQs seem to double as soon as you give them responsibility and indicate that you trust them.	\N	2026-04-18 11:08:47.906536+00
30	What if I just do the opposite for 48 hours? What if I could only subtact to solve problems? What should I put on my not-to-do list? What might I put in place to allow me to go off the grid for 4 to 8 weeks, with no phone or email?	\N	2026-04-18 11:08:47.906536+00
31	Why It's Imperative to Tell It Like It Is: 1) Trust 2) The more brains working on the hard problems, the better. 3) Build a culture that rewards - not punishes - people for getting problems into the open where they can be solved.	\N	2026-04-18 11:08:47.906536+00
32	First principle of the Bushido - the way of the warrior: keep death in mind at all times.	\N	2026-04-18 11:08:47.906536+00
33	To simplify before you understand the details is ignorance. To simplify after you understand the details is genius.	James Clear	2026-04-18 11:08:47.906536+00
34	Success is often found by practicing the fundamentals everyone knows they should be doing, but find too boring or basic to practice routinely.	James Clear	2026-04-18 11:08:47.906536+00
35	Success is about incremental wins. Internalize the reward. Chain and Games.	\N	2026-04-18 11:08:47.906536+00
36	Measure the gain, not the gap.	\N	2026-04-18 11:08:47.906536+00
37	Doing imperfectly is better than not doing at all.	\N	2026-04-18 11:08:47.906536+00
38	What's next - you can't just try to keep up or you'll be left in the dust.	\N	2026-04-18 11:08:47.906536+00
39	We don't need to think more, we need to think differently	Albert Eistein	2026-04-18 11:08:47.906536+00
40	Your willpower will never beat your environment.	\N	2026-04-18 11:08:47.906536+00
41	Rocks, pebbles, sand, and water in jar	Jar of Life	2026-04-18 11:08:47.906536+00
42	Until you can be thankful for the things you have, you will not receive the things you want.	\N	2026-04-18 11:08:47.906536+00
43	Don't overthink the outcome; just do the next right thing.	\N	2026-04-18 11:08:47.906536+00
44	I can do anything I want. I just can't do everything I want.	\N	2026-04-18 11:08:47.906536+00
45	There comes a point in every experience when I'm too far in to quit but almost certain I can't finish. If I keep moving forward, I'll eventually get to the other side.	\N	2026-04-18 11:08:47.906536+00
46	The greatest developments in history are the result of someone wanting something that did not yet exist, and helping others to want more than they thought wantable." Luke Bargis	\N	2026-04-18 11:08:47.906536+00
47	2 Timothy 1:7, "For God has not given us a spirit of fear and timidity, but of power, love, and self-discipline" (NLT).	\N	2026-04-18 11:08:47.906536+00
48	Self-reflection Exercise: "I want you to do this: reflect on what has bothered you over the next 3 days and write the main points down. Then write down what "great" looks like to move past this and grow from it as an organization	\N	2026-04-18 11:08:47.906536+00
49	No Ego Takeaways: 1) Eliminate Workplace Drama by Refusing to Participate In it What is the best thing you could do from here to help us move forward? What can you do next? What part of this is within your control?	\N	2026-04-18 11:08:47.906536+00
50	2) Replace Engagement Efforts with Accountability What result are you committing to? Are you committed to this?	\N	2026-04-18 11:08:47.906536+00
51	3) Teach People to See Reality, Not Their Stories "Let's look at problem solving here... "What do we know for sure?	\N	2026-04-18 11:08:47.906536+00
52	4) "Stop rescuring people from Discomfort"" What have you tried so far?	\N	2026-04-18 11:08:47.906536+00
53	5) Expect Buy-In - Don't Negotiate It Here's what's happening. How will you move forward?	\N	2026-04-18 11:08:47.906536+00
54	Nothing in this world can take the place of persistence. Talent will not: nothing is more common than unsuccessful men with talent. Genius will not; unrewarded genius is almost a proverb. Education will not: the world is full of educated derelicts. Persistence and determination alone are omnipotent. The Slogan "Press On" has solved and always will solve problems of the human race.	Calvin Coolidge	2026-04-18 11:08:47.906536+00
55	BBB - Be brief, Be brilliant, Be done." - Darren Hardy" The Gatorade effect "When there is a void in communication, negativity will fill it.	Darren Hardy	2026-04-18 11:08:47.906536+00
56	Fewer deeper relationships - find really good WHO's - people who like to GSD	\N	2026-04-18 11:08:47.906536+00
57	The cowards never started and the weak died along the way. That leaves us.	Phil Knight	2026-04-18 11:08:47.906536+00
58	Life is growth. You grow or you die.	Phil Knight	2026-04-18 11:08:47.906536+00
59	Don't tell people how to do things, tell them what to do and let them surprise you with their results.	Phil Knight	2026-04-18 11:08:47.906536+00
60	DON'T BE SLOW - Speed killers: 1)Perfectionism 2) Overthinking 3) Permission Seeking	\N	2026-04-18 11:08:47.906536+00
61	Mindset of Speed - 1) Set ridiculous deadlines 2) Ready, Fire, Aim 3) Your fifth version will be better than your first perfect version that you never release In today's world, the fast devour the slow.	\N	2026-04-18 11:08:47.906536+00
62	Done is better than perfect	\N	2026-04-18 11:08:47.906536+00
63	If you wait for perfect conditions, you will never get anything done" (Ecclesiastes 11:4).	\N	2026-04-18 11:08:47.906536+00
64	A man is what he thinks about all day long.	\N	2026-04-18 11:08:47.906536+00
65	Your adversities are your advantage..	\N	2026-04-18 11:08:47.906536+00
66	Working hard for something we don't care about is called stress; working hard for something we love is called passion.	Simon Sinek	2026-04-18 11:08:47.906536+00
67	A drop of honey catches more flies than a gallon of gall	Abraham Lincoln	2026-04-18 11:08:47.906536+00
68	Leadership is more than making decisions, it's about living by those decisions and guiding others to do the same.	\N	2026-04-18 11:08:47.906536+00
69	Why am I doing this? If it really is a necessity, ask yourself: What's behind my reluctance? Fear? Spite? Fatique? Don't be the person who says yes by their mouth and no by their actions.	\N	2026-04-18 11:08:47.906536+00
70	Sometimes people chase success, when what they want to achieve is significance	\N	2026-04-18 11:08:47.906536+00
71	Always measure success against your own goals.	\N	2026-04-18 11:08:47.906536+00
72	Show your passion, while sharing your humility. Tell a story that others can follow" - me	\N	2026-04-18 11:08:47.906536+00
73	Do not let anyone look down on you because you are young, but be an example for the believers in your speech, your conduct, your love, faith, and purity. . . . Do not neglect the spiritual gift that is in you. . . . Practice these things and devote yourself to them, in order that your progress may be seen by all" (1 Timothy 4:12, 14-15 GNT).	\N	2026-04-18 11:08:47.906536+00
74	In your actions, don't procrastinate. In your conversations, don't confuse. In your thoughts, don't wonder. In your soul, don't be passive or aggressive. In your life, don't be all about business." - Macrus Aurelius, Meditations, 8.51	\N	2026-04-18 11:08:47.906536+00
75	Busyness and focusing on results vs activity" — results vs activity — busyness is often mistaken for productivity — busyness is a form of procrastination	\N	2026-04-18 11:08:47.906536+00
76	Choose to be interested, instead of interesting.	\N	2026-04-18 11:08:47.906536+00
77	Matthew 5:5 says, "Blessed are the meek, for they will inherit the earth" (NIV). Franks wisdom: - no one specific books just experience and lots of reading * PCS - identify the problem first before thinking of a solution* .... Problem, consequence, solution * Charisma/be genuine * Problem, consequence, solution * - always know your audience - keep things simple ""Remember that the real issue is not the problem itself but how you react to it." - Steven Covey - 7 Habits of Highly Successful People" - tell a story people can follow	\N	2026-04-18 11:08:47.906536+00
78	Self-expression is the dominant necessity of human nature." - Dale Carnegie - How to Win Friends & Influence People" 1) assume the best in people ""Knowledge is not power, Implementation and discipline of said knowledge is where real power comes from." - Jason Tanoory" 2) the only errors simply are errors in communication	\N	2026-04-18 11:08:47.906536+00
79	Learn to be the last to speak" - 1) let them be heard 2) gain their opinions and understand them 3) have the opportunity to be the last to share your thoughts	\N	2026-04-18 11:08:47.906536+00
80	Be curious in conversation. Stop, pause, and breathe before your response in tense conversation. Listen to understand before responding.	\N	2026-04-18 11:08:47.906536+00
81	Where there is no vision, the people perish." - Proverbs 19:18" Discipline	\N	2026-04-18 11:08:47.906536+00
82	Let the other person do a great deal of the talking." - HTWFIP" fortitude ""The desire to be important is the deepest urge in human nature." - John Dewey" courage cleadheadedness ""The deepest principle in human nature is the craving to feel appreciated." - William James" selflessness sacrifice ""If you want to change your behavior or emotions, start with your thoughts and attitude." Rick Warren	\N	2026-04-18 11:08:47.906536+00
83	The role of a leader is not to come up with a bunch of great ideas. The role of a leader is to create an environment in which great ideas can happen.	Simon Sinek	2026-04-18 11:08:47.906536+00
84	We lead people, we manage things.	\N	2026-04-18 11:08:47.906536+00
85	To achieve something you have never achieved before you must become someone you have never been.	Les Brown	2026-04-18 11:08:47.906536+00
86	Fundamental Techniques in Handling People ""Do not criticize, condemn, or complain." - Rule #1 - How To Win Friends and Influence People	\N	2026-04-18 11:08:47.906536+00
87	Give honest and sincere appreciation." Rule #2 - How To Win Friends and Influence People	\N	2026-04-18 11:08:47.906536+00
88	Arouse in the other person an eager want." - Rule 3 - How to Win Friends & Influence People	\N	2026-04-18 11:08:47.906536+00
89	Six Ways to Get People To Like You ""Become genuinely interested in other people." - Principle 1	\N	2026-04-18 11:08:47.906536+00
90	Success is not something you pursue. What you pursue eludes you. Success is something you attract by the person you become. If you want to have more, you must become more.	Jim Rohan	2026-04-18 11:08:47.906536+00
91	The key is to raise your set point, or self-worth, self-esteem, mindset, attitude, philosophy and character. When those get raised, everything in your life will be raised with them.	Darren Hardy	2026-04-18 11:08:47.906536+00
92	Nothing can stop the man with the right mental attitude from achieving his goal; nothing on earth can help the man with the wrong mental attitude.	Thomas Jefferson	2026-04-18 11:08:47.906536+00
93	Be thankful for what you have; you'll end up having more. If you concentrate on what you don't have, you will never, ever have enough.	Oprah Winfrey	2026-04-18 11:08:47.906536+00
94	You see, when the reason is big enough, you will be willing to perform almost any how.	Darren Hardy	2026-04-18 11:08:47.906536+00
95	Those who cannot learn from history are doomed to repeat it.	George Santayana	2026-04-18 11:08:47.906536+00
96	When you prioritize the important over the urgent, you don't get more done - you get the right things done. And that's the difference between a busy life and a meaningful life.	Greg McKeown	2026-04-18 11:08:47.906536+00
97	As a business coach named Tim Conley once told me: It's easier to shift the direction of a car going 100 mph than it is to shift a car going 0 mph.	\N	2026-04-18 11:08:47.906536+00
98	To win, you must visualize what winning means and then implement it. - Steven Covey - 7 Habits of Highly Successful People	\N	2026-04-18 11:08:47.906536+00
99	We hardly listen to understand; we listen to reply." - Steven Covey - 7 Habits of Highly Successful People	\N	2026-04-18 11:08:47.906536+00
100	Create an atmosphere of Trust. With a healthy work environment, excellent results will come.	\N	2026-04-18 11:08:47.906536+00
101	Delegation is lengthening or shortening of the rope while the person learns. It's not blindly handing off something just to get it done. Only a fool would do that.	Dave Ramsey	2026-04-18 11:08:47.906536+00
102	Delegation is not a blind handoff	Dave Ramsey	2026-04-18 11:08:47.906536+00
103	Some of the smartest people in the world know how to use debt in a smart way	\N	2026-04-18 11:08:47.906536+00
104	Learn from your mistakes and make the changes necessary	\N	2026-04-18 11:08:47.906536+00
105	Top Habits of Successful Entrepreneurs: Be willing to get out of your comfort zone Have a long-term vision for the business youre trying to build Focus on taking the correct actions day in and day out Build the skills you need to make your dreams a reality Be disciplined enough to do what's necessary even when you don't feel like it	\N	2026-04-18 11:08:47.906536+00
106	What do I have to lose?	\N	2026-04-18 11:08:47.906536+00
107	But our goal as believers is to develop the kind of faith that persists above feelings.	Rick Warren	2026-04-18 11:08:47.906536+00
108	Unfortunately, many people spend hours, days, and even weeks learning how to do stuff they have no intention of implementing. But because learning about business feels similar to doing business—and is one step removed from actually doing the work—it gives people a sense of accomplishment. Unfortunately, you can't deposit knowledge credits at the bank. And last time I checked, you can't pay your rent with tidbits of information.	\N	2026-04-18 11:08:47.906536+00
109	Accountability at work is the repeated pattern of verifying that expectations are turning into results. Accountability isn't micromanagement. It's about setting clear expectations and providing support—not controlling every detail. Clear expectations are the foundation. Without them, accountability feels frustrating and confusing for everyone. Micromanaging kills trust and slows your team down. If you're constantly checking in, redoing work, or refusing to delegate, it's time to step back. Set expectations that stick. Define what winning looks like, empower your team, and ask for commitment. Regular feedback matters. One-on-one meetings and team check-ins help reinforce accountability and prevent misalignment. Accountability should be measurable. Self-assess, get team feedback, and check for signs that your systems are working.	\N	2026-04-18 11:08:47.906536+00
110	Leadership is: 1) Clearly defining what success looks like in each position of your organization 2) Ability to objectively measure the performance of each position 3) Holding them accountable to what your expectations are for each position	\N	2026-04-18 11:08:47.906536+00
\.


--
-- Data for Name: yearly_planning_sections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.yearly_planning_sections (id, section_key, content, updated_at) FROM stdin;
1	mindset	{"identity":["A Man of Grit & Perseverance","A Man of Wisdom and Influence","Master Protector of My Time"],"why":["Nothing will be easy — Grit and Perseverance are needed to get through and accomplish my goals.","Wisdom and Influence are essential qualities to being a successful entrepreneur and CEO.","Preserve time to focus on achieving my goals."],"howIPreserve":["Read 15 minutes daily","Daily habits through Ideal week, daily brainwashing, Words of Wisdom","Daily meditation","Stay grounded in my Faith","Focus on becoming the identity of the person you need to be for your goals","Emotional Intelligence ***"],"feelsLike":["Nothing can stop me with determination and persistence","Confidence in wisdom to make better decision to serve my family and others","Freedom to cherish moments with family, friends, and serve others"],"outcomeGoals":[{"text":"A Man of Grit & Perseverance","status":"Launched","nextSteps":"Discussion with Chad"},{"text":"A Man of Wisdom and Influence","status":"Launched","nextSteps":""},{"text":"Master Protector of My Time","status":"Launched","nextSteps":""}],"performanceGoals":[],"processContinue":[{"text":"Ideal Week Framework","status":"Consistent/Achieved","nextSteps":""},{"text":"Weekly Reflections","status":"Consistent/Achieved","nextSteps":"Today"},{"text":"Read 15 minutes daily","status":"Consistent/Achieved","nextSteps":""}],"processMoreConsistent":[{"text":"Evening Reflections","status":"Launched","nextSteps":""}],"processBegin":[{"text":"Building Emotional Intelligence","status":"Not started","nextSteps":"Start Reading Emotional Intelligence (Goleman)"}]}	2026-04-22 12:20:18.590321+00
2	business	{"identity":["An extremely successful entrepreneur and CEO who built and sold EDGE for multimillion dollars all while making a difference in dentistry."],"why":["There is such a need for a place to immediately go for people in pain","The process of building something truly special makes me feel alive.","Future freedom for my family and resources to serve others.","Other fields of dentistry are dying","I don't want to be at the chair all my life","Embarrassment by not taking action from those knowing how far I am in with this from friends, family, coaches, and mentors"],"howIPreserve":["number 1 priority over other business involvements ***","doing imperfectly is better than not doing at all","don't get in your own way"],"feelsLike":["Feeling alive","A sense of accomplishment and ability to do more from growth","Fulfillment that I provided freedom for my family","Badass"],"outcomeGoals":[{"text":"Build and sell EDGE platform for multimillion dollars","status":"In progress","nextSteps":""}],"performanceGoals":[{"text":"Sign lease on winning space by March 1","status":"Launched","nextSteps":"1) Alston - Review Lease - Get to Yes\\nReceived Lease"},{"text":"Open first Op Co and hit 150k production by year end","status":"Not started","nextSteps":""},{"text":"Ready for sites #2, 3 by EOY","status":"In progress","nextSteps":"South Square LOI Update\\nCloser to Agreement"}],"processContinue":[],"processMoreConsistent":[{"text":"Spend 1 hr on site selection each day","status":"In progress","nextSteps":"See above\\nLock in South Square, Alston"},{"text":"Read 15 min per day on Leadership","status":"Consistent/Achieved","nextSteps":"Continue down Ben Horowitz' path"}],"processBegin":[{"text":"Cultivate 1-2 business relationships to start building our team and partners","status":"In progress","nextSteps":"TSCG, Adam Webb - Promising"}]}	2026-04-22 12:20:18.60403+00
3	faith	{"identity":["Serving others by being a testament of God"],"why":["God created me and put me here for a purpose","To serve God's Kingdom and be a testament of God","To help others become followers of Christ and bring more to Heaven"],"howIPreserve":["daily Rick Warren devotionals","Read Bible nightly","pray each morning and spend quiet time with God","Don't get caught up in worldly desires"],"feelsLike":[],"outcomeGoals":[{"text":"Finish reading the Bible in 2026","status":"In progress","nextSteps":""},{"text":"Find a way to serve others with current resources to the community, career, or mentor young entrepreneurs and devote time to it.","status":"In progress","nextSteps":"Vilma and her new cleaning business"}],"performanceGoals":[],"processContinue":[],"processMoreConsistent":[],"processBegin":[{"text":"Nightly devotionals before bed with Mariah","status":"Not started","nextSteps":"Start back up"}]}	2026-04-22 12:20:18.604406+00
5	legacy-wealth	{"identity":["Legacy wealth for future freedom"],"why":["Future freedom for my family","Resources to serve others","Freedom and resources to build more platforms to serve others"],"howIPreserve":["Budget and know expenses","Share budget and expenses with Mariah to improve spending habits","Discipline to invest monthly","Spend little, build the war chest"],"feelsLike":[],"outcomeGoals":[{"text":"Legacy wealth for future freedom","status":"In progress","nextSteps":""}],"performanceGoals":[{"text":"Produce 110k/mo at UD","status":"In progress","nextSteps":"110k prod. in Jan."},{"text":"Earn 120k in UD distributions in 2026 (10k/mo)","status":"Launched","nextSteps":"16k check from Dec."},{"text":"Save 100k and reinvest in EDGE","status":"In progress","nextSteps":"Distribution checks going into savings vault"}],"processContinue":[{"text":"Monthly Financial Review","status":"Consistent/Achieved","nextSteps":"today"},{"text":"Primerica 401k Transfer to John Hancock","status":"In progress","nextSteps":"Do Mon AM"}],"processMoreConsistent":[],"processBegin":[{"text":"Future RE investments (EDGE, Morgantown, etc.)","status":"Not started","nextSteps":""},{"text":"Start Callen college account","status":"Not started","nextSteps":"Invest when the market corrects this year"},{"text":"Follow sticky budget w/ Mariah","status":"Not started","nextSteps":""}]}	2026-04-22 12:20:18.606091+00
6	family	{"identity":["Dad of the Year","Soulmate to Mariah"],"why":["Mariah is my best friend and soul mate. I can't imagine life without her.","She makes me the happiest man alive and she's always there for me.","Callen is our miracle child. He's part of my DNA and a growth of my family tree.","Callen will be a future reflection of how I parent him and the type of father I am to him.","How good a father I am to him will help determine the success he has in the future."],"howIPreserve":["Prioritize family over work","Block time for work early to allow for time with family","Don't work while with family"],"feelsLike":[],"outcomeGoals":[{"text":"Dad of the Year","status":"Launched","nextSteps":"Spend time later with"},{"text":"Soulmate to Mariah","status":"Launched","nextSteps":""}],"performanceGoals":[],"processContinue":[{"text":"Spend 1 hr per day being Dad of the Year with Callen","status":"Consistent/Achieved","nextSteps":""},{"text":"One date per week with Mariah","status":"Consistent/Achieved","nextSteps":"Date night this week? Coffee with her and Callen?\\nMust be intentionally planned. Can be night out, coffee date, Netflix date after Callen goes down, etc."}],"processMoreConsistent":[],"processBegin":[{"text":"Weekly check-ins with Mariah when EDGE starts up","status":"Not started","nextSteps":""}]}	2026-04-22 12:20:18.606372+00
8	relationships	{"identity":["Best Friend Others Have","Loving Son and Sibling my family has"],"why":["My parents love me, they raised me when times weren't always easy, and I owe them everything.","It makes my parents' day when I talk with them or visit them. They won't always be here for me to do that.","Having fun with friends gives me joy and resets me mentally.","At the end of the day we are only left with our relationships, integrity, and relationship with God."],"howIPreserve":["Keep in touch with friendships to maintain (calls, questions with things, plan trips)","Prioritize family and parents (plan holidays, visits, talk on phone)"],"feelsLike":[],"outcomeGoals":[],"performanceGoals":[{"text":"Talk to my parents at least once per week.","status":"Launched","nextSteps":"Call Today"},{"text":"Spend dedicated time with in person or catching up with friends each week.","status":"Consistent/Achieved","nextSteps":""}],"processContinue":[],"processMoreConsistent":[],"processBegin":[]}	2026-04-22 12:20:18.895184+00
7	lifestyle-travel	{"identity":["Freedom to experience the world with family and create memories."],"why":["Explore the beautiful world","Cherish experiences and moments with family and friends.","Allow time for mindfulness and gratitude to reset and be at my best."],"howIPreserve":["Discuss ideas with Mariah","Intentionally plan logistics (who watches Callen and Rosie, responsibilities while away from work, etc.)"],"feelsLike":[],"outcomeGoals":[{"text":"Non-negotiable family trip each year","status":"Launched","nextSteps":"Italy in May\\nTrip is booked!"},{"text":"Non-negotiable husband/wife trip w/ Mariah each year","status":"Not started","nextSteps":"Plan*"}],"performanceGoals":[],"processContinue":[],"processMoreConsistent":[],"processBegin":[]}	2026-04-22 12:20:18.894887+00
4	health-fitness	{"identity":["The fit husband and father who has a six-pack.","He has the confidence and energy to be the most productive version of himself that helps achieve goals in all other areas of life."],"why":["I'm tired of not being fit","I want to be in the best shape of my life","I want to have confidence and energy to be the most productive version of myself to achieve all other goals in life"],"howIPreserve":["follow specific diet plan in ideal week","follows habits in AMS","no candy / one cheat meal / dessert per week","commit to a time each day around schedule when you'll workout"],"feelsLike":["Confidence, shredded when shirt is off, trim and fit in all fits","Super dad that kids look up to and model habits of","Great energy and confidence that allows me to be most productive version of myself"],"outcomeGoals":[{"text":"Six Pack Abs","status":"In progress","nextSteps":"Low-carb Mediterranean diet"}],"performanceGoals":[{"text":"185-190 lbs","status":"Consistent/Achieved","nextSteps":""},{"text":"14% BF by July 1","status":"In progress","nextSteps":"BF measure EOM"}],"processContinue":[{"text":"Workouts 5 days/week","status":"In progress","nextSteps":"Workout/movement each day"},{"text":"No sugars from candy 2026","status":"Consistent/Achieved","nextSteps":""}],"processMoreConsistent":[{"text":"Walking pad for extra steps","status":"In progress","nextSteps":""}],"processBegin":[{"text":"Go keto last week each month","status":"Not started","nextSteps":"Maybe after blood test this week"},{"text":"Improve each quarterly blood panels","status":"In progress","nextSteps":"Next draw: March 12 @ 6:50am"},{"text":"Prioritize my dental health","status":"In progress","nextSteps":"Check in with Marquita"}]}	2026-04-22 12:28:21.704+00
\.


--
-- Name: action_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.action_items_id_seq', 6, true);


--
-- Name: activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_id_seq', 29, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcements_id_seq', 3, true);


--
-- Name: buildout_cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.buildout_cards_id_seq', 12, true);


--
-- Name: daily_top3_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_top3_id_seq', 14, true);


--
-- Name: direct_report_additional_viewers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.direct_report_additional_viewers_id_seq', 2, true);


--
-- Name: direct_report_view_as_me_grants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.direct_report_view_as_me_grants_id_seq', 2, true);


--
-- Name: direct_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.direct_reports_id_seq', 11, true);


--
-- Name: future_todos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.future_todos_id_seq', 2, true);


--
-- Name: ideal_week_completions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ideal_week_completions_id_seq', 5, true);


--
-- Name: ideal_week_rituals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ideal_week_rituals_id_seq', 21, true);


--
-- Name: journal_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.journal_responses_id_seq', 15, true);


--
-- Name: meeting_action_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.meeting_action_items_id_seq', 1, true);


--
-- Name: meeting_agendas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.meeting_agendas_id_seq', 1, true);


--
-- Name: meeting_key_topics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.meeting_key_topics_id_seq', 1, true);


--
-- Name: meeting_series_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.meeting_series_id_seq', 1, true);


--
-- Name: morning_ritual_completions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.morning_ritual_completions_id_seq', 1, true);


--
-- Name: org_chart_seats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.org_chart_seats_id_seq', 14, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizations_id_seq', 12, true);


--
-- Name: playbooks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.playbooks_id_seq', 2, true);


--
-- Name: reading_list_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reading_list_id_seq', 35, true);


--
-- Name: ritual_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ritual_items_id_seq', 57, true);


--
-- Name: role_key_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_key_results_id_seq', 89, true);


--
-- Name: role_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_tasks_id_seq', 3, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 28, true);


--
-- Name: schedule_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedule_blocks_id_seq', 88, true);


--
-- Name: seat_key_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seat_key_results_id_seq', 5, true);


--
-- Name: seat_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seat_tasks_id_seq', 25, true);


--
-- Name: vendor_passwords_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_passwords_id_seq', 16, true);


--
-- Name: weekly_review_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weekly_review_entries_id_seq', 1, false);


--
-- Name: weekly_top3_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.weekly_top3_id_seq', 3, true);


--
-- Name: wisdom_quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wisdom_quotes_id_seq', 110, true);


--
-- Name: yearly_planning_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.yearly_planning_sections_id_seq', 8, true);


--
-- Name: action_items action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_pkey PRIMARY KEY (id);


--
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: buildout_cards buildout_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildout_cards
    ADD CONSTRAINT buildout_cards_pkey PRIMARY KEY (id);


--
-- Name: daily_top3 daily_top3_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_top3
    ADD CONSTRAINT daily_top3_pkey PRIMARY KEY (id);


--
-- Name: direct_report_additional_viewers direct_report_additional_viewers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_additional_viewers
    ADD CONSTRAINT direct_report_additional_viewers_pkey PRIMARY KEY (id);


--
-- Name: direct_report_view_as_me_grants direct_report_view_as_me_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_view_as_me_grants
    ADD CONSTRAINT direct_report_view_as_me_grants_pkey PRIMARY KEY (id);


--
-- Name: direct_reports direct_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_reports
    ADD CONSTRAINT direct_reports_pkey PRIMARY KEY (id);


--
-- Name: future_todos future_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.future_todos
    ADD CONSTRAINT future_todos_pkey PRIMARY KEY (id);


--
-- Name: ideal_week_completions ideal_week_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideal_week_completions
    ADD CONSTRAINT ideal_week_completions_pkey PRIMARY KEY (id);


--
-- Name: ideal_week_rituals ideal_week_rituals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideal_week_rituals
    ADD CONSTRAINT ideal_week_rituals_pkey PRIMARY KEY (id);


--
-- Name: journal_responses journal_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_responses
    ADD CONSTRAINT journal_responses_pkey PRIMARY KEY (id);


--
-- Name: meeting_action_items meeting_action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_action_items
    ADD CONSTRAINT meeting_action_items_pkey PRIMARY KEY (id);


--
-- Name: meeting_agendas meeting_agendas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agendas
    ADD CONSTRAINT meeting_agendas_pkey PRIMARY KEY (id);


--
-- Name: meeting_key_topics meeting_key_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_key_topics
    ADD CONSTRAINT meeting_key_topics_pkey PRIMARY KEY (id);


--
-- Name: meeting_series meeting_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_series
    ADD CONSTRAINT meeting_series_pkey PRIMARY KEY (id);


--
-- Name: morning_ritual_completions morning_ritual_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.morning_ritual_completions
    ADD CONSTRAINT morning_ritual_completions_pkey PRIMARY KEY (id);


--
-- Name: org_chart_seats org_chart_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_chart_seats
    ADD CONSTRAINT org_chart_seats_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: playbooks playbooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playbooks
    ADD CONSTRAINT playbooks_pkey PRIMARY KEY (id);


--
-- Name: reading_list reading_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_list
    ADD CONSTRAINT reading_list_pkey PRIMARY KEY (id);


--
-- Name: ritual_items ritual_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ritual_items
    ADD CONSTRAINT ritual_items_pkey PRIMARY KEY (id);


--
-- Name: role_key_results role_key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_key_results
    ADD CONSTRAINT role_key_results_pkey PRIMARY KEY (id);


--
-- Name: role_tasks role_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_tasks
    ADD CONSTRAINT role_tasks_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schedule_blocks schedule_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_blocks
    ADD CONSTRAINT schedule_blocks_pkey PRIMARY KEY (id);


--
-- Name: seat_key_results seat_key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_key_results
    ADD CONSTRAINT seat_key_results_pkey PRIMARY KEY (id);


--
-- Name: seat_tasks seat_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_tasks
    ADD CONSTRAINT seat_tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_passwords vendor_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_passwords
    ADD CONSTRAINT vendor_passwords_pkey PRIMARY KEY (id);


--
-- Name: weekly_review_entries weekly_review_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_review_entries
    ADD CONSTRAINT weekly_review_entries_pkey PRIMARY KEY (id);


--
-- Name: weekly_top3 weekly_top3_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_top3
    ADD CONSTRAINT weekly_top3_pkey PRIMARY KEY (id);


--
-- Name: wisdom_quotes wisdom_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wisdom_quotes
    ADD CONSTRAINT wisdom_quotes_pkey PRIMARY KEY (id);


--
-- Name: yearly_planning_sections yearly_planning_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.yearly_planning_sections
    ADD CONSTRAINT yearly_planning_sections_pkey PRIMARY KEY (id);


--
-- Name: yearly_planning_sections yearly_planning_sections_section_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.yearly_planning_sections
    ADD CONSTRAINT yearly_planning_sections_section_key_unique UNIQUE (section_key);


--
-- Name: additional_viewers_pair_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX additional_viewers_pair_unique ON public.direct_report_additional_viewers USING btree (direct_report_id, viewer_report_id);


--
-- Name: view_as_me_grants_pair_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX view_as_me_grants_pair_unique ON public.direct_report_view_as_me_grants USING btree (direct_report_id, grantee_report_id);


--
-- Name: weekly_review_year_week_field_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX weekly_review_year_week_field_uniq ON public.weekly_review_entries USING btree (year, week, field_key);


--
-- Name: action_items action_items_owner_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_owner_user_id_users_id_fk FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: direct_report_additional_viewers direct_report_additional_viewers_direct_report_id_direct_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_additional_viewers
    ADD CONSTRAINT direct_report_additional_viewers_direct_report_id_direct_report FOREIGN KEY (direct_report_id) REFERENCES public.direct_reports(id) ON DELETE CASCADE;


--
-- Name: direct_report_additional_viewers direct_report_additional_viewers_viewer_report_id_direct_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_additional_viewers
    ADD CONSTRAINT direct_report_additional_viewers_viewer_report_id_direct_report FOREIGN KEY (viewer_report_id) REFERENCES public.direct_reports(id) ON DELETE CASCADE;


--
-- Name: direct_report_view_as_me_grants direct_report_view_as_me_grants_direct_report_id_direct_reports; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_view_as_me_grants
    ADD CONSTRAINT direct_report_view_as_me_grants_direct_report_id_direct_reports FOREIGN KEY (direct_report_id) REFERENCES public.direct_reports(id) ON DELETE CASCADE;


--
-- Name: direct_report_view_as_me_grants direct_report_view_as_me_grants_grantee_report_id_direct_report; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_report_view_as_me_grants
    ADD CONSTRAINT direct_report_view_as_me_grants_grantee_report_id_direct_report FOREIGN KEY (grantee_report_id) REFERENCES public.direct_reports(id) ON DELETE CASCADE;


--
-- Name: direct_reports direct_reports_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_reports
    ADD CONSTRAINT direct_reports_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: meeting_action_items meeting_action_items_agenda_id_meeting_agendas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_action_items
    ADD CONSTRAINT meeting_action_items_agenda_id_meeting_agendas_id_fk FOREIGN KEY (agenda_id) REFERENCES public.meeting_agendas(id) ON DELETE CASCADE;


--
-- Name: meeting_agendas meeting_agendas_series_id_meeting_series_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_agendas
    ADD CONSTRAINT meeting_agendas_series_id_meeting_series_id_fk FOREIGN KEY (series_id) REFERENCES public.meeting_series(id) ON DELETE CASCADE;


--
-- Name: meeting_key_topics meeting_key_topics_agenda_id_meeting_agendas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_key_topics
    ADD CONSTRAINT meeting_key_topics_agenda_id_meeting_agendas_id_fk FOREIGN KEY (agenda_id) REFERENCES public.meeting_agendas(id) ON DELETE CASCADE;


--
-- Name: org_chart_seats org_chart_seats_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_chart_seats
    ADD CONSTRAINT org_chart_seats_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_chart_seats org_chart_seats_parent_seat_id_org_chart_seats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_chart_seats
    ADD CONSTRAINT org_chart_seats_parent_seat_id_org_chart_seats_id_fk FOREIGN KEY (parent_seat_id) REFERENCES public.org_chart_seats(id) ON DELETE SET NULL;


--
-- Name: role_key_results role_key_results_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_key_results
    ADD CONSTRAINT role_key_results_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_tasks role_tasks_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_tasks
    ADD CONSTRAINT role_tasks_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: seat_key_results seat_key_results_seat_id_org_chart_seats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_key_results
    ADD CONSTRAINT seat_key_results_seat_id_org_chart_seats_id_fk FOREIGN KEY (seat_id) REFERENCES public.org_chart_seats(id) ON DELETE CASCADE;


--
-- Name: seat_tasks seat_tasks_seat_id_org_chart_seats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_tasks
    ADD CONSTRAINT seat_tasks_seat_id_org_chart_seats_id_fk FOREIGN KEY (seat_id) REFERENCES public.org_chart_seats(id) ON DELETE CASCADE;


--
-- Name: vendor_passwords vendor_passwords_seat_id_org_chart_seats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_passwords
    ADD CONSTRAINT vendor_passwords_seat_id_org_chart_seats_id_fk FOREIGN KEY (seat_id) REFERENCES public.org_chart_seats(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Lk6cqUxGuoePXHt4UvUTEidZMxEmpV0A6o6vXdTdfT8MkKKcx0PunlGK6sCygfD

