import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db
from routers import auth, account, dm, comments, posts, queue, logs, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Instagram Bot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/bot-api/auth", tags=["auth"])
app.include_router(account.router, prefix="/bot-api/account", tags=["account"])
app.include_router(dm.router, prefix="/bot-api/dm", tags=["dm"])
app.include_router(comments.router, prefix="/bot-api/comments", tags=["comments"])
app.include_router(posts.router, prefix="/bot-api/posts", tags=["posts"])
app.include_router(queue.router, prefix="/bot-api/queue", tags=["queue"])
app.include_router(logs.router, prefix="/bot-api/logs", tags=["logs"])
app.include_router(settings.router, prefix="/bot-api/settings", tags=["settings"])


@app.get("/bot-api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("BOT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
