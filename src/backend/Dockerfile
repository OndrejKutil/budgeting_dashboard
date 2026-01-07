FROM python:3.13-slim

WORKDIR /src

# Copy only pyproject.toml first for better layer caching
COPY pyproject.toml /src/backend/
COPY __init__.py /src/backend/

# Install dependencies and clean up in a single layer to minimize image size
# 1. Update package lists
# 2. Install build-essential (needed to compile some Python packages)
# 3. Install Python dependencies from pyproject.toml
# 4. Remove build-essential (no longer needed)
# 5. Clean apt cache and remove package lists
# 6. Remove pip cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    pip install --no-cache-dir ./backend && \
    apt-get purge -y --auto-remove build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /root/.cache

# Copy the rest of the application into the backend package
COPY . /src/backend/

# Set environment variables
ENV PYTHONPATH=/src
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)"

# Run the application as a package module
CMD ["python", "-m", "uvicorn", "backend.backend_server:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]