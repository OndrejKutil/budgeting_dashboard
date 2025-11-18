FROM python:3.9-slim

WORKDIR /app

COPY pyproject.toml .

# Install dependencies and clean up in a single layer to minimize image size
# 1. Update package lists
# 2. Install build-essential (needed to compile some Python packages)
# 3. Install Python dependencies from pyproject.toml
# 4. Remove build-essential (no longer needed)
# 5. Clean apt cache and remove package lists
# 6. Remove pip cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    pip install --no-cache-dir . && \
    apt-get purge -y --auto-remove build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /root/.cache

COPY . /app/

CMD ["uvicorn", "backend_server:app", "--host", "0.0.0.0", "--port", "8000"]