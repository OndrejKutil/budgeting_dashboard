# Backend Deployment Guide

## Quick Start

### Local Development

1. **Setup Environment**
   ```bash
   cd src/backend
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Install Dependencies**
   ```bash
   # Install production dependencies
   pip install -e .
   
   # Or install with dev dependencies (includes mypy)
   pip install -e ".[dev]"
   ```

3. **Run the Server**
   ```bash
   # From src/backend directory
   uvicorn backend_server:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API**
   - API: http://localhost:8000
   - Health Check: http://localhost:8000/health
   - API Docs: http://localhost:8000/docs

---

## Type Checking with MyPy

### Setup

MyPy is configured via `mypy.ini` and `pyproject.toml`.

```bash
# Install mypy and type stubs
pip install -e ".[dev]"
```

### Running MyPy

```bash
# Check all Python files in the backend
mypy .

# Check specific file or directory
mypy backend_server.py
mypy routers/

# With verbose output
mypy --verbose .

# Generate HTML report
mypy --html-report ./mypy-report .
```

### Configuration

The `mypy.ini` file is set up with moderate strictness to start:
- ✅ Basic type checking enabled
- ✅ Warns about return types and unused configs
- ⚠️ Lenient with untyped definitions (can be increased gradually)
- ✅ Ignores missing imports for third-party libraries without stubs

**To increase strictness gradually:**
1. Start fixing type hints in your code
2. Enable stricter checks in `mypy.ini`:
   ```ini
   disallow_untyped_defs = True
   disallow_incomplete_defs = True
   ```

### Common MyPy Issues

**Issue: "Module has no attribute"**
- Solution: Install type stubs: `pip install types-<package>`

**Issue: Supabase import errors**
- Already handled: `ignore_missing_imports = True` for supabase modules

**Issue: Too many errors**
- Gradually increase strictness by enabling one check at a time
- Use `# type: ignore` comments sparingly for complex cases

---

## Docker Deployment

### Building the Image

```bash
# From src/backend directory
docker build -t budgeting-backend:latest .

# Build with specific tag
docker build -t budgeting-backend:v1.0.0 .
```

### Running the Container

```bash
# Using environment variables
docker run -d \
  -p 8000:8000 \
  -e FRONTEND_URL="https://your-frontend.com" \
  -e API_KEY="your_api_key" \
  -e ADMIN_KEY="your_admin_key" \
  -e PROJECT_URL="https://your-project.supabase.co" \
  -e ANON_KEY="your_anon_key" \
  -e SUPABASE_JWT_SECRET="your_jwt_secret" \
  -e DEVELOPMENT_MODE="False" \
  --name budgeting-backend \
  budgeting-backend:latest

# Or using .env file
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name budgeting-backend \
  budgeting-backend:latest
```

### Docker Health Check

The container includes a health check that runs every 30 seconds:
```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' budgeting-backend | python -m json.tool
```

### Docker Compose (Optional)

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./src/backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

Run with:
```bash
docker-compose up -d
```

---

## Production Deployment

### Environment Variables

**Required:**
- `PROJECT_URL` - Supabase project URL
- `ANON_KEY` - Supabase anonymous key
- `SUPABASE_JWT_SECRET` - Supabase JWT secret
- `API_KEY` - Your API authentication key
- `ADMIN_KEY` - Admin authentication key
- `FRONTEND_URL` - Frontend URL for CORS

**Optional:**
- `DEVELOPMENT_MODE` - Set to `False` for production (default: `False`)

### Security Checklist

- [ ] Set `DEVELOPMENT_MODE=False`
- [ ] Use HTTPS for `FRONTEND_URL` and `PROJECT_URL`
- [ ] Generate strong random keys for `API_KEY` and `ADMIN_KEY`
- [ ] Never commit `.env` file to version control
- [ ] Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Enable HTTPS/TLS on your deployment platform
- [ ] Set up proper firewall rules
- [ ] Monitor logs for suspicious activity

### Deployment Platforms

#### **AWS ECS/Fargate**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag budgeting-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/budgeting-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/budgeting-backend:latest
```

#### **Google Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project-id>/budgeting-backend
gcloud run deploy budgeting-backend \
  --image gcr.io/<project-id>/budgeting-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### **Azure Container Instances**
```bash
# Build and push to ACR
az acr build --registry <registry-name> --image budgeting-backend:latest .
az container create \
  --resource-group myResourceGroup \
  --name budgeting-backend \
  --image <registry-name>.azurecr.io/budgeting-backend:latest \
  --dns-name-label budgeting-backend \
  --ports 8000
```

#### **Digital Ocean App Platform**
- Connect your GitHub repository
- Set build command: `docker build -t budgeting-backend .`
- Set run command: Auto-detected from Dockerfile
- Add environment variables in the dashboard

#### **Railway/Render**
- Connect GitHub repository
- Dockerfile will be auto-detected
- Add environment variables in the dashboard
- Deploy automatically on push

---

## Monitoring & Logs

### Access Logs

**Docker:**
```bash
# View logs
docker logs budgeting-backend

# Follow logs
docker logs -f budgeting-backend

# Last 100 lines
docker logs --tail 100 budgeting-backend
```

**Via API (requires admin key):**
```bash
curl -X GET "http://localhost:8000/log" \
  -H "X-API-Key: your_api_key" \
  -H "X-Admin-Key: your_admin_key"
```

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:8000/health

# Version info
curl http://localhost:8000/version
```

---

## Troubleshooting

### Issue: Module Import Errors

**Error:** `ModuleNotFoundError: No module named 'backend_server'`

**Solution:** Ensure `PYTHONPATH` is set correctly:
```bash
export PYTHONPATH=/app:$PYTHONPATH
```

### Issue: Database Connection Failed

**Error:** `Database connection failed`

**Solution:**
1. Verify `PROJECT_URL` and `ANON_KEY` are correct
2. Check Supabase project is active
3. Verify network connectivity to Supabase

### Issue: CORS Errors

**Error:** `CORS policy blocked`

**Solution:**
1. Ensure `FRONTEND_URL` matches your frontend domain exactly
2. Include protocol: `https://` or `http://`
3. No trailing slashes

### Issue: Authentication Failed

**Error:** `Invalid API key`

**Solution:**
1. Verify `API_KEY` matches between frontend and backend
2. Check `SUPABASE_JWT_SECRET` is correct
3. Ensure tokens haven't expired

---

## Development Tips

### Hot Reload
```bash
uvicorn backend_server:app --reload
```

### Debug Mode
Set `DEVELOPMENT_MODE=True` in `.env` for verbose logging

### API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Testing
```bash
# Install test dependencies
pip install -e ".[test]"

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html
```

---

## Project Structure

```
src/backend/
├── backend_server.py       # Main FastAPI application
├── Dockerfile             # Docker configuration
├── pyproject.toml         # Dependencies and configs
├── mypy.ini              # MyPy type checker config
├── .env.example          # Environment template
├── .env                  # Your environment (gitignored)
├── .dockerignore         # Docker ignore rules
├── __init__.py           # Package marker
├── auth/                 # Authentication logic
├── helper/               # Helper functions
├── routers/              # API route handlers
└── schemas/              # Pydantic models
```

---

## Support

For issues or questions:
1. Check the API documentation: http://localhost:8000/docs
2. Review logs: `docker logs budgeting-backend`
3. Check environment variables are set correctly
4. Verify Supabase project is active and accessible
