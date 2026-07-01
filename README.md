# Budgeting Dashboard

[![Live Demo](https://img.shields.io/badge/Live%20App-Click%20Here-brightgreen?style=for-the-badge)](https://budget.ondrejkutil.com)

## Tech Stack

### **Frontend**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

- **React** - UI Library
- **Vite** - Build tool
- **TailwindCSS** - Utility-first CSS framework
- **Recharts** - Composable charting library for React components

### **Backend**

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)

- **FastAPI** - High-performance async API framework
- **Pydantic** - Data validation and serialization
- **PyJWT** - JSON Web Token implementation
- **Polars** - Blazingly fast DataFrames

### **Database & Infrastructure**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

- **Supabase** - PostgreSQL database with auth handling

## CI/CD Pipeline

This project uses a CI/CD workflow built with **GitHub Actions** and **Render**:

- **CI (GitHub Actions):** on every push/PR to `main`, the pipeline runs backend type-checking + tests and frontend lint/type-check/build.
- **CD (Render):** deployments are triggered **only after CI passes**, ensuring the live services update from verified builds.

---

### **Development Process**

To accelerate development, the first version of the UI was scaffolded using Lovable.
From there, the application was iteratively redesigned, extended, and connected to a custom backend API, including authentication, analytics endpoints, and state handling.

The final implementation reflects deliberate architectural and UX decisions beyond the initial scaffold.

Crucially, the entire backend and database development was performed manually, ensuring a robust and custom-tailored solution.

## Project Structure

```bash
budgeting_dashboard/
├── CLAUDE.md                       # Project guide (start here — for devs & AI agents)
├── src/
│   ├── backend/                    # FastAPI backend
│   │   ├── backend_server.py       # Main application (middleware + routers)
│   │   ├── Dockerfile              # Container build
│   │   ├── auth/                   # API-key + JWT authentication
│   │   ├── routers/                # API endpoints (one file per domain)
│   │   ├── schemas/                # Pydantic models
│   │   ├── helper/                 # Utilities + calculations/
│   │   ├── data/                   # Supabase client factory
│   │   └── tests/                  # Automated tests
│   └── frontend/                   # React + Vite frontend
│       └── src/
│           ├── main.tsx            # Application entry point
│           ├── pages/              # Route components
│           ├── components/         # UI components (ui/, layout/, …)
│           ├── contexts/           # Auth / User / Privacy
│           └── lib/api/            # API client, endpoints, types
├── supabase/                       # Database as code
│   ├── migrations/                 # Versioned schema migrations
│   └── functions/                  # Edge Functions
├── scripts/                        # Ops scripts (e.g. daily FX-rate refresh)
├── docs/                           # backend / frontend / database docs
└── README.md
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — project hub: architecture, repo map, commands, and design decisions (for developers and AI agents alike). **Start here.**
- **[docs/backend](./docs/backend/README.md)** — auth, rate limiting, routers, schemas, DB access.
- **[docs/frontend](./docs/frontend/README.md)** — state, API client, routing, patterns.
- **[docs/database](./docs/database/README.md)** — data model + the Supabase migration workflow.
- Live API reference: Swagger at `/docs`, ReDoc at `/redoc` on the running backend.

### **Real-World Application**

- **Problem Solving** - Addresses genuine personal finance management needs with intuitive design
- **Production Ready** - Live deployed application with proper error handling and environment configuration
- **CI/CD Pipeline** - Automated testing and deployment pipeline
- **OAuth Authentication** - Secure user authentication with GitHub
- **AI Voice Transaction Ingestion** - An n8n workflow uses Groq for transcription and GPT-4o for transaction logic, fetches user context, and automatically categorizes and creates transactions in the database from phone/watch voice input

### **Modern Development Practices**

- **RESTful API Design** - Well-structured endpoints following REST principles with Pydantic validation
- **Data Visualization** - Interactive charts and analytics using modern visualization libraries

This application showcases the ability to **transform complex financial requirements into an elegant, user-friendly solution** while maintaining high standards for security, performance, and code quality.

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.
