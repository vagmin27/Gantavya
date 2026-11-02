# Gantavya

Gantavya is a scalable travel intelligence platform architected with a decoupled, modular service topology:

- **Frontend:** React + Vite + Tailwind CSS (SPA)
- **Backend:** Node.js + Express (Modular Monolith, ES Modules, Mongoose, JWT HTTP-Only Cookies)
- **Intelligence Service:** Python + FastAPI (Stateless AI/Compute Engine)
- **Database:** MongoDB (Primary and only persistence layer)

---

## Architecture Principles

1. **Modular Monolith Backend:** Code is organized by domain modules (`health`, `auth`, `users`). Cross-cutting logic is handled via centralized middleware.
2. **Stateless Intelligence:** The Python FastAPI service holds zero direct database connections and relies strictly on REST payloads orchestrated by the Node.js backend.
3. **Primary Database Only:** MongoDB via Mongoose is the single source of truth. No Redis or secondary caching layer is used.
4. **Secure Authentication Boundary:** Authentication uses signed JWT tokens delivered in secure, HTTP-only cookies with CSRF mitigation.
5. **Quality & Testing First:** Every tier maintains an automated test suite (Vitest for Frontend and Backend, Pytest for Intelligence).

---

## Directory Layout

```text
Gantavya/
├── backend/            # Express modular monolith API
├── frontend/           # React + Vite client application
├── intelligence/       # FastAPI intelligence compute engine
├── .gitignore          # Repository-wide ignore rules
└── README.md           # Master setup & convention guide
```

---

## Git Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Formatting changes that do not affect code logic
- `refactor:` Code restructuring without functional alterations
- `test:` Adding or adjusting automated tests
- `chore:` Build process, dependency updates, or auxiliary tool configuration

**Branch Naming:**
- `feature/<ticket-or-name>`
- `fix/<ticket-or-name>`
- `chore/<ticket-or-name>`

---

## Service Setup & Execution

### 1. Backend (`/backend`)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
# Run tests:
npm run test
```
- API Base: `http://localhost:5000/api/v1`
- Health Check: `GET http://localhost:5000/api/v1/health`
- Swagger Docs: `http://localhost:5000/api/docs`

### 2. Frontend (`/frontend`)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Run tests:
npm run test
```
- Client App: `http://localhost:5173`

### 3. Intelligence Service (`/intelligence`)
```bash
cd intelligence
python -m venv .venv
# Activate:
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
# Run tests:
pytest
```
- Service Base: `http://localhost:8000/api/v1`
- Health Check: `GET http://localhost:8000/api/v1/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

