# 💰 Budgeting Dashboard

*A comprehensive personal finance analytics web application for smart money management*

[![Live Demo](https://img.shields.io/badge/Live%20App-Click%20Here-brightgreen?style=for-the-badge)](https://budgeting-dashboard-frontend.onrender.com)

## 🛠 Tech Stack

### **Frontend**

![Plotly](https://img.shields.io/badge/plotly-3F4F75?style=for-the-badge&logo=plotly&logoColor=white)
![Dash](https://img.shields.io/badge/dash-008DE4?style=for-the-badge&logo=plotly&logoColor=white)
![Bootstrap](https://img.shields.io/badge/bootstrap-%23563D7C.svg?style=for-the-badge&logo=bootstrap&logoColor=white)

- **Plotly Dash** - Interactive web framework
- **Dash Bootstrap Components** - Responsive UI components
- **Plotly** - Advanced data visualizations

### **Backend**

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)

- **FastAPI** - High-performance async API framework
- **Pydantic** - Data validation and serialization
- **PyJWT** - JSON Web Token implementation
- **Pandas** - Data manipulation and analysis

### **Database & Infrastructure**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Row-Level Security (RLS)** - Database-level security policies

## 📸 Screenshots

| Dashboard Overview | Transaction Management |
|:------------------:|:---------------------:|
| ![Dashboard](screenshots/yearly_metrics_and_upper_charts.png) | ![Transactions](screenshots/transactions_page_table.png) |
| Main dashboard with key metrics | Complete transaction CRUD interface |

| Analytics & Reports | Investment Calculator |
|:------------------:|:--------------------:|
| ![Analytics](screenshots/monthly_charts.png) | ![Investment](screenshots/investing_growth_calculator.png) |
| Detailed financial analytics | Growth projection tools |

| User Registration | Transaction Modals |
|:-----------------:|:-----------------:|
| ![Register](screenshots/register_page.png) | ![Modal](screenshots/add_transaction_modal.png) |
| Secure user onboarding | Intuitive data entry |

## 📁 Project Structure

```text
budgeting_dashboard/
├── src/
│   ├── backend/                 # FastAPI backend
│   │   ├── backend_server.py    # Main application
│   │   ├── auth/               # Authentication
│   │   ├── routers/            # API endpoints
│   │   ├── schemas/            # Data models
│   │   └── helper/             # Utilities
│   └── frontend/               # Plotly Dash frontend
│       ├── main.py             # Main application
│       ├── components/         # UI components
│       ├── pages/              # Application pages
│       └── helper/             # Frontend utilities
├── scripts/                    # Deployment scripts
├── screenshots/                # Application screenshots
└── README.md
```

## 🎯 Portfolio Highlight

This project demonstrates comprehensive **full-stack development expertise** across multiple domains:

### **Technical Excellence**

- **🏗 Architecture Design** - Clean separation between FastAPI backend and Plotly Dash frontend
- **🔒 Security Implementation** - JWT authentication with refresh tokens and database-level Row-Level Security

### **Real-World Application**

- **💡 Problem Solving** - Addresses genuine personal finance management needs with intuitive design
- **🚀 Production Ready** - Live deployed application with proper error handling and environment configuration

### **Modern Development Practices**

- **🔄 RESTful API Design** - Well-structured endpoints following REST principles with Pydantic validation
- **📊 Data Visualization** - Interactive charts and analytics using modern visualization libraries

This application showcases the ability to **transform complex financial requirements into an elegant, user-friendly solution** while maintaining high standards for security, performance, and code quality.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.
