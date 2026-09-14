MyTicket — Booking Events System

A concert/event ticket-selling system built for our database course project.

**GitHub repo:** https://github.com/VinnBe/SIT24_CS311V_MyTickets

---

## Overview

myTickets manages the full lifecycle of selling concert tickets — from creating venues and events, to booking seats and processing payments, to verifying tickets at the gate via QR code.

As live music and concert culture keeps growing in Vietnam, ticket sales need to be fast, accurate, and able to handle many people booking at once. myTickets replaces manual processes (Facebook posts, Google Forms, spreadsheets) with a proper database-backed system that keeps seat availability, payment status, and ticket validity consistent.

---

## Features

- **Venue & seat management** — create/update venues, organize seats by zone
- **Event management** — create events, link to a venue, track status (upcoming/ongoing/finished/cancelled)
- **Ticket types & pricing** — multiple ticket tiers per event (VIP, Standard, etc.), track remaining availability
- **Ticket issuing** — each ticket gets a unique QR code and a status (not_used/used/cancelled)
- **Customer management** — store customer contact info
- **Orders & payment** — customers place an order, total is calculated, payment method chosen, status tracked (pending/paid/failed) — max 2 tickets per order
- **Gate check-in** — validate tickets via QR code scan, update status

---

## Tech Stack

```
[Java GUI (NetBeans)]
        |  HTTP request (REST API, JSON)
        v
[Python Backend (Flask)]
        |  pymysql
        v
[TiDB Cloud (MySQL-compatible)]
```

- **Frontend:** Java (NetBeans / Swing)
- **Backend:** Python (Flask)
- **Database:** TiDB Cloud (MySQL-compatible), shared by the whole team

---

## Project Structure

```
.
├── app.py              # Flask backend (API endpoints)
├── config.py            # DB credentials (local only, NOT committed to git)
├── requirements.txt      # Python dependencies
├── database/             # SQL schema + sample data scripts
├── SETUP_GUIDE.md        # Step-by-step backend setup instructions
└── README.md             # This file
```

---

## Getting Started

See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for full step-by-step instructions on setting up the Python backend, including:
- Creating a virtual environment
- Installing dependencies
- Setting up your local `config.py` with database credentials
- Running and testing the Flask server

---

## Database

The database schema (7 tables: VENUE, CUSTOMER, EVENT, SEAT, TICKET_TYPE, ORDERS, TICKET) is hosted on **TiDB Cloud**, shared live by all team members — no need to export/import `.sql` files between machines. Schema and constraints (NOT NULL, UNIQUE, CHECK, foreign keys) are defined in `database/`.

---

## Team

SIT24 CS311V group project.
