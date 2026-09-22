--
-- PostgreSQL database dump
--

\restrict aufHdMESu9fihTRoFPaMfAggGXXdJii4cQrb6pW1IcSWlB7AimvbgN3fvvIzjqy

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: fraud_user
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    step integer,
    type character varying(50),
    amount double precision,
    oldbalanceorg double precision,
    newbalanceorig double precision,
    oldbalancedest double precision,
    newbalancedest double precision,
    fraud_probability double precision,
    prediction character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transactions OWNER TO fraud_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: fraud_user
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO fraud_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: fraud_user
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: fraud_user
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: fraud_user
--

COPY public.transactions (id, step, type, amount, oldbalanceorg, newbalanceorig, oldbalancedest, newbalancedest, fraud_probability, prediction, created_at) FROM stdin;
1	1	PAYMENT	9839.64	170136	160296.36	0	0	0	NORMAL	2026-09-18 09:26:38.539184
2	1	PAYMENT	1864.28	21249	19384.72	0	0	0	NORMAL	2026-09-18 09:26:39.518183
3	1	TRANSFER	181	181	0	0	0	0.9388	FRAUD	2026-09-18 09:26:40.522438
4	1	CASH_OUT	181	181	0	21182	0	0.9476	FRAUD	2026-09-18 09:26:41.523432
5	1	PAYMENT	11668.14	41554	29885.86	0	0	0	NORMAL	2026-09-18 09:26:42.527518
6	1	PAYMENT	7817.71	53860	46042.29	0	0	0	NORMAL	2026-09-18 09:26:43.531993
7	1	PAYMENT	7107.77	183195	176087.23	0	0	0	NORMAL	2026-09-18 09:26:44.534406
8	1	PAYMENT	7861.64	176087.23	168225.59	0	0	0	NORMAL	2026-09-18 09:26:45.535503
9	1	PAYMENT	4024.36	2671	0	0	0	0.0003	NORMAL	2026-09-18 09:26:46.541441
10	1	DEBIT	5337.77	41720	36382.23	41898	40348.79	0	NORMAL	2026-09-18 09:26:47.543874
11	1	DEBIT	9644.94	4465	0	10845	157982.12	0.0003	NORMAL	2026-09-18 09:26:48.54784
12	1	PAYMENT	3099.97	20771	17671.03	0	0	0	NORMAL	2026-09-18 09:26:49.548848
13	1	PAYMENT	2560.74	5070	2509.26	0	0	0	NORMAL	2026-09-18 09:26:50.551846
14	1	PAYMENT	11633.76	10127	0	0	0	0.0005	NORMAL	2026-09-18 09:26:51.556346
15	1	PAYMENT	4098.78	503264	499165.22	0	0	0	NORMAL	2026-09-18 09:26:52.558832
16	1	CASH_OUT	229133.94	15325	0	5083	51513.44	0.008	NORMAL	2026-09-18 09:26:53.563191
17	1	PAYMENT	1563.82	450	0	0	0	0.0001	NORMAL	2026-09-18 09:26:54.566468
18	1	PAYMENT	1157.86	21156	19998.14	0	0	0	NORMAL	2026-09-18 09:26:55.569552
19	1	PAYMENT	671.64	15123	14451.36	0	0	0	NORMAL	2026-09-18 09:26:56.572851
20	1	TRANSFER	215310.3	705	0	22425	0	0.004	NORMAL	2026-09-18 09:26:57.576666
21	1	PAYMENT	9839.64	170136	160296.36	0	0	0	NORMAL	2026-09-19 03:14:12.912133
22	1	PAYMENT	1864.28	21249	19384.72	0	0	0	NORMAL	2026-09-19 03:14:13.880276
23	1	TRANSFER	181	181	0	0	0	0.9388	FRAUD	2026-09-19 03:14:14.884461
24	1	CASH_OUT	181	181	0	21182	0	0.9476	FRAUD	2026-09-19 03:14:15.888507
25	1	PAYMENT	11668.14	41554	29885.86	0	0	0	NORMAL	2026-09-19 03:14:16.897702
26	1	PAYMENT	7817.71	53860	46042.29	0	0	0	NORMAL	2026-09-19 03:14:17.900807
27	1	PAYMENT	7107.77	183195	176087.23	0	0	0	NORMAL	2026-09-19 03:14:18.918731
28	1	PAYMENT	7861.64	176087.23	168225.59	0	0	0	NORMAL	2026-09-19 03:14:19.916967
29	1	PAYMENT	4024.36	2671	0	0	0	0.0003	NORMAL	2026-09-19 03:14:20.922616
30	1	DEBIT	5337.77	41720	36382.23	41898	40348.79	0	NORMAL	2026-09-19 03:14:21.925126
31	1	DEBIT	9644.94	4465	0	10845	157982.12	0.0003	NORMAL	2026-09-19 03:14:22.931031
32	1	PAYMENT	3099.97	20771	17671.03	0	0	0	NORMAL	2026-09-19 03:14:23.934885
33	1	PAYMENT	2560.74	5070	2509.26	0	0	0	NORMAL	2026-09-19 03:14:24.94042
34	1	PAYMENT	11633.76	10127	0	0	0	0.0005	NORMAL	2026-09-19 03:14:25.946031
35	1	PAYMENT	4098.78	503264	499165.22	0	0	0	NORMAL	2026-09-19 03:14:26.948843
36	1	CASH_OUT	229133.94	15325	0	5083	51513.44	0.008	NORMAL	2026-09-19 03:14:27.951164
37	1	PAYMENT	1563.82	450	0	0	0	0.0001	NORMAL	2026-09-19 03:14:28.955557
38	1	PAYMENT	1157.86	21156	19998.14	0	0	0	NORMAL	2026-09-19 03:14:29.960518
39	1	PAYMENT	671.64	15123	14451.36	0	0	0	NORMAL	2026-09-19 03:14:30.964294
40	1	TRANSFER	215310.3	705	0	22425	0	0.004	NORMAL	2026-09-19 03:14:31.97206
\.


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: fraud_user
--

SELECT pg_catalog.setval('public.transactions_id_seq', 40, true);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: fraud_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict aufHdMESu9fihTRoFPaMfAggGXXdJii4cQrb6pW1IcSWlB7AimvbgN3fvvIzjqy

