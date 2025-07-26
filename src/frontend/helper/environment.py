from dotenv import load_dotenv
import os

load_dotenv()

FRONTEND_HOST = os.getenv("FRONTEND_HOST")
FRONTEND_PORT = os.getenv("FRONTEND_PORT")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE")
BACKEND_URL = os.getenv("BACKEND_URL")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")