# 💧 AquaConnect

**AquaConnect** is a full-stack web platform for discovering and booking **water tanker deliveries**, similar to an on-demand logistics system for water supply.

The application allows users to search tanker companies based on **location, capacity, and time slot**, compare prices, and book deliveries seamlessly.

---

# 🚀 Live Demo

https://aquaconnect-zeta.vercel.app

---

# 🧠 Project Overview

Water supply shortages in many cities create demand for tanker deliveries.
AquaConnect simplifies the process by providing:

• Location-based tanker search
• Capacity & price comparison
• Real-time availability
• Quick booking workflow

The platform acts as a **marketplace connecting users with tanker companies**.

---

# ⚙️ Tech Stack

### Frontend

* HTML
* CSS
* JavaScript
* Tailwind UI components

### Backend

* FastAPI
* SQLAlchemy
* Pydantic
* SlowAPI (Rate limiting)

### Database

* SQLite

### Deployment

Frontend → Vercel
Backend → Render

---

# ✨ Features

### 🔎 Search Tanker Companies

Users can search tanker companies by:

* City / district
* Water capacity
* Delivery time slot

---

### 📊 Compare Prices

Companies display:

* Capacity
* Price per delivery
* Distance from user
* Availability status

---

### 🚚 Tanker Availability

Each company shows:

• Available
• Fully Booked

based on tanker availability.

---

### 💳 Booking Flow

Users can:

1. Select tanker company
2. Confirm price
3. Proceed to payment page

---

### ⚡ Fast API Backend

The backend provides REST endpoints for:

* User management
* Company listings
* Tanker search
* Booking system
* Payment simulation
* GPS tracking endpoints

---

# 📡 API Example

Search tanker companies:

```
GET /api/v1/companies/search
```

Example request:

```
/api/v1/companies/search?district=Pune&capacity=5000
```

Example response:

```json
[
  {
    "company_name": "Pune Water Tankers",
    "capacity": 5000,
    "price": 800,
    "district": "Pune",
    "distance_km": 4.2
  }
]
```

---

# 🏗️ System Architecture

```
Browser (User)
      │
      ▼
Frontend (Vercel)
HTML / CSS / JS
      │
      ▼
FastAPI Backend (Render)
      │
      ▼
SQLite Database
```

---

# 📁 Project Structure

```
aquaconnect
│
├── backend
│   ├── app
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── limiter.py
│   │
│   ├── routers
│   │   ├── users.py
│   │   ├── companies.py
│   │   ├── bookings.py
│   │   ├── payments.py
│   │   └── tracking.py
│   │
│   └── requirements.txt
│
├── frontend
│   ├── js
│   ├── pages
│   └── index.html
│
└── README.md
```

---

# 🛠️ Run Locally

### Clone the repository

```
git clone https://github.com/aryawaikar/aquaconnect.git
cd aquaconnect
```

---

### Backend

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Open API docs:

```
http://localhost:8001/docs
```

---

### Frontend

Open the frontend pages directly:

```
frontend/pages/search.html
```

---

# 🔐 Security & Performance

The backend includes:

* Rate limiting using **SlowAPI**
* CORS configuration for frontend integration
* API versioning (`/api/v1`)
* SQLAlchemy ORM for database safety

---

# 📈 Future Improvements

Potential upgrades:

* Real-time tanker tracking using GPS
* Map view with Leaflet / Mapbox
* Online payment gateway integration
* PostgreSQL database
* Recommendation system for tanker selection
* Push notifications for booking status

---

# 👨‍💻 Author

Arya Waikar

GitHub
https://github.com/aryawaikar

---

# 📄 License

This project is developed for educational and demonstration purposes.

