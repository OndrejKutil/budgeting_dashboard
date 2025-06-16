# general
import os
from dotenv import load_dotenv

# fastapi
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import api_key_auth

# logging
import logging


# ================================================================================================
#                                   Settings and Configuration
# ================================================================================================


# set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('src/backend/backend.log'),
        logging.StreamHandler()
    ]
)

# Create logger for this module
logger = logging.getLogger(__name__)
logger.info("Starting backend server...")


# Load environment variables
load_dotenv("src/.env")
PROJECT_URL = os.getenv("PROJECT_URL")
ANON_KEY = os.getenv("ANON_KEY")

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# from src.backend.routers import example_router
# app.include_router(example_router.router, prefix="/example", tags=["example"])

# ================================================================================================
#                                       Root API Endpoints
# ================================================================================================


@app.get("/")
async def root():
    """
    Root endpoint to check if the server is running.
    """
    logger.info("GET / - Root endpoint accessed")
    return {"message": "Backend server is running!"}


@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify server status.
    """
    logger.info("GET /health - Health check endpoint accessed")
    return {"status": "healthy"}

@app.get("/verification_check")
async def api_key_verification_check(
    api_key: str = Depends(api_key_auth)
):
    """
    Endpoint to verify API key.
    Returns a success message if the API key is valid.
    """
    logger.info("GET /verification_check - API key verification endpoint accessed")
    return {"message": "API key is valid!"}



if __name__ == "__main__":
    import uvicorn
    # Run the FastAPI app with Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
