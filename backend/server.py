print("\n\n>>> SERVER LOADING <<<\n\n")
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

import os
import uuid
import asyncio
import logging
import bcrypt
import jwt
import certifi
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import shutil
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, BackgroundTasks, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from ai_service import analyze_complaint


# ---------- Config ----------
# Prefer environment variables from .env, but fall back to sensible defaults
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "campusvoice")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
MONGO_CONNECT_TIMEOUT_MS = int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "10000"))
MONGO_SERVER_SELECTION_TIMEOUT_MS = int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "10000"))
MONGO_ALLOW_INSECURE_TLS = os.getenv("MONGO_ALLOW_INSECURE_TLS", "false").lower() in ("1", "true", "yes", "y")

# Warn if using insecure defaults (helps signal misconfiguration in development)
if JWT_SECRET == "dev-secret":
    logging.getLogger("ccms").warning(
        "JWT_SECRET not set — using insecure default. Set JWT_SECRET in .env for production."
    )
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

client_kwargs = {
    "serverSelectionTimeoutMS": MONGO_SERVER_SELECTION_TIMEOUT_MS,
    "connectTimeoutMS": MONGO_CONNECT_TIMEOUT_MS,
    "connect": False,
}

if MONGO_URL.startswith("mongodb+srv://"):
    client_kwargs["tls"] = True
    client_kwargs["tlsCAFile"] = certifi.where()
    if MONGO_ALLOW_INSECURE_TLS:
        client_kwargs["tlsAllowInvalidCertificates"] = True
        client_kwargs["tlsAllowInvalidHostnames"] = True
        client_kwargs["tlsDisableOCSPEndpointCheck"] = True

client = AsyncIOMotorClient(MONGO_URL, **client_kwargs)
db = client[DB_NAME]

app = FastAPI(title="College Complaint Management API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"REQUEST: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"RESPONSE: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"REQUEST ERROR: {e}")
        raise

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

# Ensure upload directory exists
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Disable automatic redirect-on-trailing-slash to avoid 307/308 redirects
# for preflight requests (browsers disallow redirects for CORS preflight).
api_router = APIRouter(prefix="/api", redirect_slashes=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ccms")

# Configure CORS early so preflight requests are handled before any routing redirects.
raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
print(f">>> CORS ORIGINS: {origins}")
logger.info(f"CORS origins configured: {origins}")
if "*" in origins:
    logger.warning("CORS_ORIGINS contains '*'. Credentials may be rejected by browsers.")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
RoleType = Literal["student", "staff", "admin"]
StatusType = Literal["Pending", "In Progress", "Resolved"]
CategoryType = Literal["Women Safety", "Anti Ragging", "Security", "Infrastructure", "Medical Emergency", "Discipline", "Examination", "Others"]
PriorityType = Literal["Critical", "High", "Medium", "Low", "Unrated"]


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Optional[RoleType] = "student"
    official_id: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: RoleType
    created_at: str


class AuthOut(BaseModel):
    token: str
    user: UserOut


class NameUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=2000)
    category: CategoryType


class ComplaintStatusUpdate(BaseModel):
    status: StatusType
    response: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: EmailStr
    title: str
    description: str
    category: CategoryType
    status: StatusType
    response: Optional[str] = None
    created_at: str
    updated_at: str
    priority: str = "Unrated"
    urgency_score: int = 0
    ai_reasoning: Optional[str] = None
    ai_tags: List[str] = []
    ai_status: str = "pending"
    attachments: List[str] = []


class RoleUpdate(BaseModel):
    role: RoleType


# ---------- Auth Dependency ----------
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


# ---------- Auth Routes ----------
@api_router.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Only allow self-registration as student or staff (not admin)
    role = body.role if body.role in ("student", "staff") else "student"

    if role == "staff":
        if not body.official_id:
            raise HTTPException(status_code=400, detail="Official ID is required for staff registration")
        
        auth_user = await db.authorized_users.find_one({"official_id": body.official_id})
        if not auth_user:
            raise HTTPException(status_code=401, detail="Invalid Official ID")
        
        if auth_user.get("is_registered"):
            raise HTTPException(status_code=400, detail="This Official ID is already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": role,
        "official_id": body.official_id if role == "staff" else None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)

    if role == "staff":
        await db.authorized_users.update_one(
            {"official_id": body.official_id},
            {"$set": {"is_registered": True, "user_id": user_id}}
        )

    token = create_access_token(user_id, email, role)
    user_out = UserOut(id=user_id, name=body.name, email=email, role=role, created_at=user_doc["created_at"])
    return AuthOut(token=token, user=user_out)


@api_router.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    user_out = UserOut(
        id=user["id"], name=user["name"], email=user["email"],
        role=user["role"], created_at=user["created_at"],
    )
    return AuthOut(token=token, user=user_out)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**{k: user[k] for k in ("id", "name", "email", "role", "created_at")})


@api_router.patch("/auth/me", response_model=UserOut)
async def update_profile(body: NameUpdate, user: dict = Depends(get_current_user)):
    res = await db.users.find_one_and_update(
        {"id": user["id"]},
        {"$set": {"name": body.name}},
        return_document=True,
        projection={"_id": 0, "password_hash": 0}
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also update user_name in complaints submitted by this user
    await db.complaints.update_many(
        {"user_id": user["id"]},
        {"$set": {"user_name": body.name}}
    )
    
    return UserOut(**res)


@api_router.post("/auth/change-password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    # Fetch user with password_hash
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user or not verify_password(body.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}}
    )
    return {"message": "Password updated successfully"}


@api_router.delete("/auth/me")
async def delete_my_account(user: dict = Depends(get_current_user)):
    # We could also delete their complaints, but usually we keep them or anonymize.
    # For now, let's just delete the user.
    await db.users.delete_one({"id": user["id"]})
    return {"message": "Account deleted successfully"}


# ---------- Complaint Routes ----------
async def run_ai_triage(complaint_id: str, title: str, description: str, category: str):
    """Background task: analyze complaint with AI, then persist results."""
    result = await analyze_complaint(title, description, category)
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "priority": result.get("priority", "Unrated"),
            "urgency_score": result.get("urgency_score", 0),
            "ai_reasoning": result.get("ai_reasoning"),
            "ai_tags": result.get("ai_tags", []),
            "ai_status": result.get("ai_status", "failed"),
            "ai_analyzed_at": now_iso(),
        }},
    )


@api_router.post("/complaints", response_model=ComplaintOut)
async def create_complaint(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    attachments: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user),
):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit complaints")
    
    cid = str(uuid.uuid4())
    ts = now_iso()
    
    saved_attachments = []
    for file in attachments:
        if not file.filename:
            continue
        # Check file extension
        ext = file.filename.split(".")[-1].lower()
        if ext not in ("jpg", "jpeg", "png", "mp4", "mov"):
            continue
            
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.{ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            await file.seek(0)
            
        saved_attachments.append(f"/uploads/{filename}")

    doc = {
        "id": cid,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "title": title,
        "description": description,
        "category": category,
        "status": "Pending",
        "response": None,
        "created_at": ts,
        "updated_at": ts,
        "priority": "Unrated",
        "urgency_score": 0,
        "ai_reasoning": None,
        "ai_tags": [],
        "ai_status": "pending",
        "attachments": saved_attachments,
    }
    await db.complaints.insert_one(doc)
    doc.pop("_id", None)
    background_tasks.add_task(run_ai_triage, cid, title, description, category)
    return ComplaintOut(**doc)


@api_router.post("/complaints/{cid}/reanalyze", response_model=ComplaintOut)
async def reanalyze_complaint(
    cid: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_roles("staff", "admin")),
):
    existing = await db.complaints.find_one({"id": cid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Complaint not found")
    await db.complaints.update_one({"id": cid}, {"$set": {"ai_status": "pending"}})
    existing["ai_status"] = "pending"
    background_tasks.add_task(
        run_ai_triage, cid, existing["title"], existing["description"], existing["category"]
    )
    return ComplaintOut(**existing)


@api_router.get("/complaints", response_model=List[ComplaintOut])
async def list_complaints(
    user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    order: Optional[str] = Query("desc"),
):
    query: dict = {}
    if user["role"] == "student":
        query["user_id"] = user["id"]
    if status and status != "All":
        query["status"] = status
    if category and category != "All":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
        ]
    sort_field = sort_by if sort_by in ("created_at", "updated_at", "status", "category", "urgency_score", "priority") else "created_at"
    direction = -1 if order == "desc" else 1
    # Multi-key sort: when sorting by priority, fall back to urgency_score then created_at
    sort_spec = [(sort_field, direction)]
    if sort_field == "priority":
        sort_spec = [("urgency_score", direction), ("created_at", -1)]
    elif sort_field != "created_at":
        sort_spec.append(("created_at", -1))
    cursor = db.complaints.find(query, {"_id": 0}).sort(sort_spec)
    items = await cursor.to_list(1000)
    # Ensure backwards-compatible defaults for older docs without AI fields
    for it in items:
        it.setdefault("priority", "Unrated")
        it.setdefault("urgency_score", 0)
        it.setdefault("ai_reasoning", None)
        it.setdefault("ai_tags", [])
        it.setdefault("ai_status", "pending")
    return [ComplaintOut(**i) for i in items]


@api_router.get("/complaints/stats")
async def complaint_stats(user: dict = Depends(get_current_user)):
    base: dict = {}
    if user["role"] == "student":
        base["user_id"] = user["id"]
    pipeline = [{"$match": base}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    rows = await db.complaints.aggregate(pipeline).to_list(100)
    counts = {r["_id"]: r["count"] for r in rows}
    total = sum(counts.values())
    # Category breakdown
    cat_rows = await db.complaints.aggregate(
        [{"$match": base}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ).to_list(100)
    by_category = {r["_id"]: r["count"] for r in cat_rows}
    return {
        "total": total,
        "pending": counts.get("Pending", 0),
        "in_progress": counts.get("In Progress", 0),
        "resolved": counts.get("Resolved", 0),
        "by_category": by_category,
    }


@api_router.patch("/complaints/{cid}/status", response_model=ComplaintOut)
async def update_status(
    cid: str,
    body: ComplaintStatusUpdate,
    user: dict = Depends(require_roles("staff", "admin")),
):
    update = {"status": body.status, "updated_at": now_iso()}
    if body.response is not None:
        update["response"] = body.response
    result = await db.complaints.find_one_and_update(
        {"id": cid}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Complaint not found")
    result.pop("_id", None)
    result.setdefault("priority", "Unrated")
    result.setdefault("urgency_score", 0)
    result.setdefault("ai_reasoning", None)
    result.setdefault("ai_tags", [])
    result.setdefault("ai_status", "pending")
    result.setdefault("attachments", [])
    return ComplaintOut(**result)


@api_router.patch("/complaints/{cid}", response_model=ComplaintOut)
async def update_complaint(
    cid: str,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    attachments: List[UploadFile] = File([]),
    user: dict = Depends(get_current_user),
):
    existing = await db.complaints.find_one({"id": cid})
    if not existing:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if user["role"] != "student" or existing["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this complaint")
    
    # Check 10-minute limit
    created_at = datetime.fromisoformat(existing["created_at"])
    now = datetime.now(timezone.utc)
    if (now - created_at) > timedelta(minutes=10):
        raise HTTPException(status_code=403, detail="Edit time expired (10-minute limit)")

    saved_attachments = existing.get("attachments", [])
    for file in attachments:
        if not file.filename:
            continue
        ext = file.filename.split(".")[-1].lower()
        if ext not in ("jpg", "jpeg", "png", "mp4", "mov"):
            continue
            
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.{ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            await file.seek(0)
            
        saved_attachments.append(f"/uploads/{filename}")

    update_doc = {
        "title": title,
        "description": description,
        "category": category,
        "attachments": saved_attachments,
        "updated_at": now_iso(),
    }
    
    # If title, description, or category changed, re-run AI triage
    ai_needed = (
        title != existing["title"] or 
        description != existing["description"] or 
        category != existing["category"]
    )
    
    if ai_needed:
        update_doc["ai_status"] = "pending"

    result = await db.complaints.find_one_and_update(
        {"id": cid}, {"$set": update_doc}, return_document=True
    )
    result.pop("_id", None)
    
    if ai_needed:
        background_tasks.add_task(run_ai_triage, cid, title, description, category)
        
    return ComplaintOut(**result)


@api_router.delete("/complaints/{cid}")
async def delete_complaint(cid: str, user: dict = Depends(get_current_user)):
    existing = await db.complaints.find_one({"id": cid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Complaint not found")
    # Student can only delete own pending complaint
    if user["role"] == "student":
        if existing["user_id"] != user["id"] or existing["status"] != "Pending":
            raise HTTPException(status_code=403, detail="Cannot delete this complaint")
    await db.complaints.delete_one({"id": cid})
    return {"deleted": True}


# ---------- Admin / Users ----------
@api_router.get("/users", response_model=List[UserOut])
async def list_users(user: dict = Depends(require_roles("admin"))):
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserOut(**r) for r in rows]


@api_router.patch("/users/{uid}/role", response_model=UserOut)
async def update_user_role(uid: str, body: RoleUpdate, user: dict = Depends(require_roles("admin"))):
    res = await db.users.find_one_and_update(
        {"id": uid}, {"$set": {"role": body.role}}, return_document=True,
        projection={"_id": 0, "password_hash": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**res)


@api_router.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_roles("admin"))):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"id": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": True}


@api_router.post("/contact")
async def contact_support(body: ContactIn):
    """Send a contact support email using Gmail SMTP."""
    sender_email = os.getenv("EMAIL")
    app_password = os.getenv("PASSWORD")

    if not sender_email or not app_password:
        logger.error("Email credentials not configured in .env")
        # Return success to frontend but log error internally to avoid exposing server config
        # OR return error if user expects it. The prompt says "Return proper JSON response (success / error)"
        raise HTTPException(
            status_code=500, 
            detail="Support email service is not configured. Please contact support.campusdesk@gmail.com directly."
        )

    try:
        # Create message
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = "support.campusdesk@gmail.com"  # Hardcoded recipient as per frontend UI
        msg["Subject"] = f"Contact Support: {body.name}"

        email_content = f"""
        Name: {body.name}
        Email: {body.email}
        
        Message:
        {body.message}
        """
        msg.attach(MIMEText(email_content, "plain"))

        # Connect and send
        # Using context manager for safe connection closing
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.send_message(msg)

        logger.info(f"Support email sent from {body.email}")
        return {"message": "Message sent successfully!"}

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


@api_router.get("/")
async def root():
    return {"message": "College Complaint Management API", "status": "ok"}


# ---------- Startup: indexes + seed admin ----------
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.complaints.create_index("id", unique=True)
        await db.complaints.create_index("user_id")
        await db.complaints.create_index("status")
        await db.authorized_users.create_index("official_id", unique=True)
    except Exception as exc:
        logger.exception("MongoDB startup failed while creating indexes")
        raise RuntimeError(
            "MongoDB startup failed. Verify that MONGO_URL is correct, "
            "Atlas network access/IP whitelist is configured, and port 27017/TLS "
            "access is allowed from this machine."
        ) from exc

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gmail.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "System Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    else:
        # Ensure password matches env (idempotent)
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )
            logger.info(f"Admin password refreshed for {admin_email}")

    # Seed sample staff and student for quick testing if not present
    sample = [
        ("staff@gmail.com", "Staff Demo", "Staff@123", "staff"),
        ("student@gmail.com", "Student Demo", "Student@123", "student"),
    ]
    for email, name, pw, role in sample:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "name": name,
                "email": email,
                "password_hash": hash_password(pw),
                "role": role,
                "created_at": now_iso(),
            })

    # Seed authorized staff IDs
    staff_ids = [f"STAFF{str(i).zfill(3)}" for i in range(1, 21)]
    for sid in staff_ids:
        if not await db.authorized_users.find_one({"official_id": sid}):
            await db.authorized_users.insert_one({
                "official_id": sid,
                "role": "staff",
                "is_registered": False
            })
            logger.info(f"Authorized staff ID seeded: {sid}")

    # One-time migration: map old categories to new ones
    await _migrate_categories()

    # One-time backfill: triage any complaints missing AI fields or stuck pending.
    asyncio.create_task(_backfill_ai_triage())


async def _migrate_categories():
    """Migrate old complaint categories to the new system."""
    mapping = {
        "IT": "Security",
        "Hostel": "Infrastructure",
        "Academic": "Examination",
        "Library": "Others",
        "Mess": "Infrastructure",
        "Transport": "Discipline"
    }
    try:
        for old, new in mapping.items():
            res = await db.complaints.update_many(
                {"category": old},
                {"$set": {"category": new}}
            )
            if res.modified_count > 0:
                logger.info(f"Migrated {res.modified_count} complaints from '{old}' to '{new}'")
    except Exception as e:
        logger.warning("Category migration failed: %s", e)


async def _backfill_ai_triage():
    """Run AI on legacy complaints that never went through triage."""
    try:
        cursor = db.complaints.find(
            {"$or": [{"ai_status": {"$exists": False}}, {"ai_status": "pending"}]},
            {"_id": 0, "id": 1, "title": 1, "description": 1, "category": 1},
        )
        async for c in cursor:
            try:
                await run_ai_triage(c["id"], c["title"], c["description"], c["category"])
            except Exception as e:
                logger.warning("Backfill AI failed for %s: %s", c.get("id"), e)
    except Exception as e:
        logger.warning("Backfill scanner error: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)
