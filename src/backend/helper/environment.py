from dotenv import load_dotenv
import os


FRONTEND_URL = os.getenv("FRONTEND_URL")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE")
API_KEY = os.getenv("API_KEY")
ADMIN_KEY = os.getenv("ADMIN_KEY")
BACKEND_HOST = os.getenv("BACKEND_HOST")
BACKEND_PORT = os.getenv("BACKEND_PORT")

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")