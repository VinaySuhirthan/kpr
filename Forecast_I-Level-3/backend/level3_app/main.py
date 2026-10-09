from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from level3_app.api.routes_amr import router as amr_router
from level3_app.api.routes_genome import router as genome_router
from level3_app.api.routes_health import router as health_router
from level3_app.config.settings import settings
from level3_app.utils.logging import logger

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade API for Antimicrobial Resistance (AMR) gene detection powered by NCBI AMRFinderPlus."
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router)
app.include_router(amr_router)
app.include_router(genome_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": f"Internal server error: {str(exc)}"}
    )

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "health_check": "/health",
        "tool_status": "/api/v1/amr/tool-status",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("level3_app.main:app", host="0.0.0.0", port=8000, reload=True)
