from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import ChatRequest, ChatResponse

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Chatbot API está rodando!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME, "scope": "backend/api only"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Campo 'message' é obrigatório.")

    return ChatResponse(
        response=f"Pergunta recebida: {request.message}"
    )
