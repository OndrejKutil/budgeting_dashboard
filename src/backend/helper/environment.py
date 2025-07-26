from dotenv import load_dotenv
import os

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE")
API_KEY = os.getenv("API_KEY")
ADMIN_KEY = os.getenv("ADMIN_KEY")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")