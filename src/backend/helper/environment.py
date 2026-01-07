from dotenv import load_dotenv
import os

load_dotenv()

FRONTEND_URL : str = str(os.getenv("FRONTEND_URL")) if os.getenv("FRONTEND_URL") else ""
DEVELOPMENT_MODE : bool = bool(os.getenv("DEVELOPMENT_MODE")) if os.getenv("DEVELOPMENT_MODE") else False
API_KEY : str = str(os.getenv("API_KEY")) if os.getenv("API_KEY") else ""
ADMIN_KEY : str = str(os.getenv("ADMIN_KEY")) if os.getenv("ADMIN_KEY") else ""

SUPABASE_JWT_SECRET : str = str(os.getenv("SUPABASE_JWT_SECRET")) if os.getenv("SUPABASE_JWT_SECRET") else ""
PROJECT_URL : str = str(os.getenv("PROJECT_URL")) if os.getenv("PROJECT_URL") else ""
ANON_KEY : str = str(os.getenv("ANON_KEY")) if os.getenv("ANON_KEY") else ""