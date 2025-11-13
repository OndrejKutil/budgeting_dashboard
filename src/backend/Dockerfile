FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

# Install dependencies and clean up in a single layer to minimize image size
# 1. Update package lists
# 2. Install build-essential (needed to compile some Python packages)
# 3. Install Python dependencies
# 4. Remove build-essential (no longer needed)
# 5. Clean apt cache and remove package lists
# 6. Remove pip cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /root/.cache

COPY . /app/

CMD ["uvicorn", "src/main:app", "--host", "0.0.0.0", "--port", "8000"]