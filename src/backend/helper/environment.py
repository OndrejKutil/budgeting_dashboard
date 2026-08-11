import os

from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL : list[str] = [url.strip() for url in os.getenv("FRONTEND_URL", "").split(",") if url.strip()]
DEVELOPMENT_MODE : bool = bool(os.getenv("DEVELOPMENT_MODE")) if os.getenv("DEVELOPMENT_MODE") else False
API_KEY : str = str(os.getenv("API_KEY")) if os.getenv("API_KEY") else ""
ADMIN_KEY : str = str(os.getenv("ADMIN_KEY")) if os.getenv("ADMIN_KEY") else ""

SUPABASE_JWT_SECRET : str = str(os.getenv("SUPABASE_JWT_SECRET")) if os.getenv("SUPABASE_JWT_SECRET") else ""
PROJECT_URL : str = str(os.getenv("PROJECT_URL")) if os.getenv("PROJECT_URL") else ""
ANON_KEY : str = str(os.getenv("ANON_KEY")) if os.getenv("ANON_KEY") else ""
SERVICE_ROLE_KEY : str = str(os.getenv("SERVICE_ROLE_KEY")) if os.getenv("SERVICE_ROLE_KEY") else ""

# Inference provider for screenshot import. Provider-agnostic on purpose — no SDK is committed,
# so these are whatever the chosen provider needs (httpx is already a dependency for REST calls).
INFERENCE_API_KEY : str = str(os.getenv("INFERENCE_API_KEY")) if os.getenv("INFERENCE_API_KEY") else ""
INFERENCE_MODEL : str = str(os.getenv("INFERENCE_MODEL")) if os.getenv("INFERENCE_MODEL") else ""
REASONING_MODEL : str = str(os.getenv("REASONING_MODEL")) if os.getenv("REASONING_MODEL") else ""
