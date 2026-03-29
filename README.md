# POMS - Purchase Order Management System

A full-stack Purchase Order Management System with a FastAPI backend and a vanilla JavaScript frontend.

## Features
- JWT login and role-based access (`admin`, `manager`, `viewer`)
- Vendor CRUD operations
- Product CRUD operations
- Purchase order creation with line items
- Automatic 5% tax calculation
- Status workflow (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `RECEIVED`, `CANCELLED`)
- Dashboard metrics
- Optional AI product description endpoint

## Tech Stack
- Backend: FastAPI, SQLAlchemy, Pydantic, Uvicorn
- Database: PostgreSQL
- Frontend: HTML, CSS, JavaScript (no framework)

## Project Structure
```text
po-system-enhanced/
|-- backend/
|   |-- core/
|   |-- db/
|   |-- models/
|   |-- routers/
|   |-- schemas/
|   |-- main.py
|   |-- requirements.txt
|-- frontend/
|   |-- templates/index.html
|   |-- static/css/main.css
|   |-- static/js/
|-- schema_and_seed.sql
|-- docker-compose.yml
|-- .env.example
|-- README.md
```

## Prerequisites
- Python 3.10+
- PostgreSQL 15+

## Setup
1. Create the database and run schema:
   - Use `schema_and_seed.sql`
2. Create and activate virtual environment:
   - `cd backend`
   - `python -m venv venv`
   - `venv\\Scripts\\activate`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Create `.env` from `.env.example` and update values.

## Run
```bat
cd backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open:
- App: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Demo Credentials
- `admin / admin123`
- `manager / manager123`
- `viewer / viewer123`

## Environment Variables
Create `.env` in project root:
```env
DATABASE_URL=postgresql://po_user:po_pass@localhost:5432/po_management
JWT_SECRET_KEY=change-this-secret
ANTHROPIC_API_KEY=
APP_ENV=development
APP_PORT=8000
```

## Add Screenshots and Videos in README
Use this folder structure:
- `docs/images/` for screenshots
- `docs/videos/` for GIFs or video files

### Screenshot Example
```md
![Dashboard](docs/images/dashboard.png)
```

### GIF Demo Example (recommended for inline preview)
```md
![PO Flow Demo](docs/videos/po-flow.gif)
```

### Video Link Example
```md
[Watch Full Demo Video](docs/videos/demo.mp4)
```

Note: GitHub reliably renders images/GIFs inline. MP4 files are usually best shared as links.

## Notes for Git Push
- Keep local-only files out of Git (`venv`, `__pycache__`, `.env`)
- `.gitignore` is already included for this project
