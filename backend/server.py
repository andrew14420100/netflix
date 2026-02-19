from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
import os
from pymongo import MongoClient, DESCENDING, ASCENDING
import logging
from dotenv import load_dotenv
import bcrypt
import jwt
import re
import httpx

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Netflix Clone API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "netflix_clone")

# TMDB Configuration
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "4f153630f8d7e92d542dde3a38fbddf2")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

logger.info(f"Connecting to MongoDB: {MONGO_URL}, DB: {DB_NAME}")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
user_lists = db["user_lists"]
user_likes = db["user_likes"]
contents = db["contents"]
hero_settings = db["hero_settings"]
sections = db["sections"]
admin_logs = db["admin_logs"]
admin_users = db["admin_users"]
menu_items = db["menu_items"]
users = db["users"]
tv_seasons = db["tv_seasons"]
tv_episodes = db["tv_episodes"]
user_ratings = db["user_ratings"]

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "netflix-admin-super-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# Create indexes
contents.create_index("tmdbId", unique=True)
contents.create_index([("release_date", DESCENDING)])
contents.create_index([("popularity", DESCENDING)])
contents.create_index([("vote_average", DESCENDING)])
contents.create_index([("createdAt", DESCENDING)])
contents.create_index("type")
admin_users.create_index("email", unique=True)
menu_items.create_index("order")
tv_seasons.create_index([("tmdbId", 1), ("season_number", 1)], unique=True)
tv_episodes.create_index([("tmdbId", 1), ("season_number", 1), ("episode_number", 1)], unique=True)

# =====================
# MODELS
# =====================

class MenuItem(BaseModel):
    id: Optional[str] = None
    name: str
    path: str
    order: int = 1
    active: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    order: Optional[int] = None
    active: Optional[bool] = None

class ListItem(BaseModel):
    user_id: str
    media_id: int
    media_type: str
    title: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None

class LikeItem(BaseModel):
    user_id: str
    media_id: int
    media_type: str

class AdminLogin(BaseModel):
    email: str
    password: str

class ContentCreate(BaseModel):
    tmdbId: int
    type: Literal["movie", "tv"]
    available: bool = True
    availableSeason: Optional[int] = None

class ContentUpdate(BaseModel):
    available: Optional[bool] = None
    availableSeason: Optional[int] = None

class HeroUpdate(BaseModel):
    contentId: str
    mediaType: Optional[Literal["movie", "tv"]] = "tv"
    customTitle: Optional[str] = None
    customDescription: Optional[str] = None
    customBackdrop: Optional[str] = None
    seasonLabel: Optional[str] = None

class SectionCreate(BaseModel):
    name: str
    apiString: str
    mediaType: Literal["movie", "tv"]
    active: bool = True
    order: int = 0

class SectionUpdate(BaseModel):
    active: Optional[bool] = None
    order: Optional[int] = None

class RatingItem(BaseModel):
    user_id: str
    media_id: int
    media_type: str
    rating: int

# =====================
# HELPER FUNCTIONS
# =====================

def sanitize_string(s: str) -> str:
    """Sanitize string to prevent XSS"""
    if not s:
        return s
    return re.sub(r'<[^>]*>', '', s)

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return admin user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        admin = admin_users.find_one({"email": email}, {"_id": 0, "password": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def log_admin_action(action: str, content_id: Optional[str] = None, metadata: Optional[dict] = None):
    """Log admin action"""
    admin_logs.insert_one({
        "action": action,
        "contentId": content_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {}
    })

# Anime genre IDs to exclude (Animation genre often contains anime)
# We exclude content that is primarily Japanese animation
ANIME_GENRE_ID = 16  # Animation genre
EXCLUDED_ORIGIN_COUNTRIES = ["JP"]  # Japan

def is_anime_content(item: dict) -> bool:
    """
    Check if content is anime based on:
    - Genre ID 16 (Animation) + origin country JP
    - Original language 'ja' (Japanese) + Animation genre
    """
    genre_ids = item.get("genre_ids", [])
    origin_country = item.get("origin_country", [])
    original_language = item.get("original_language", "")
    
    # If it has Animation genre AND is from Japan, likely anime
    if ANIME_GENRE_ID in genre_ids:
        if any(country in EXCLUDED_ORIGIN_COUNTRIES for country in origin_country):
            return True
        if original_language == "ja":
            return True
    
    return False

async def fetch_tmdb_data(endpoint: str, params: dict = None) -> dict:
    """Fetch data from TMDB API"""
    if params is None:
        params = {}
    params["api_key"] = TMDB_API_KEY
    params["language"] = "it-IT"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TMDB_BASE_URL}{endpoint}", params=params)
        if response.status_code == 200:
            return response.json()
        logger.error(f"TMDB API error: {response.status_code} - {response.text}")
        return None

async def check_vixsrc_availability(tmdb_id: int, content_type: str) -> dict:
    """
    Check if content is available on vixsrc.to
    Returns dict with available status and source_url
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    # Build URL based on content type
    if content_type == "tv":
        url = f"https://vixsrc.to/tv/{tmdb_id}/1/1"
    else:
        url = f"https://vixsrc.to/movie/{tmdb_id}"
    
    is_available = False
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.head(url)
            if response.status_code == 200:
                is_available = True
            else:
                response = await client.get(url)
                if response.status_code == 200 and "not found" not in response.text.lower():
                    is_available = True
    except Exception as e:
        logger.warning(f"Vixsrc check failed for {tmdb_id}: {e}")
    
    return {
        "available": is_available,
        "source_url": url if is_available else None,
        "checked_at": now_iso
    }

async def check_vixsrc_episode_availability(
    tmdb_id: int,
    season: int,
    episode: int
) -> bool:
    """
    Check availability of specific TV episode with DB cache
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    cache_query = {
        "tmdbId": tmdb_id,
        "type": "tv",
        "season": season,
        "episode": episode
    }

    # Check cache first
    cached = vixsrc_cache.find_one(cache_query)
    if cached:
        try:
            cached_at = cached.get("checked_at", "")
            if cached_at:
                if "+" in cached_at or "Z" in cached_at:
                    cache_time = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
                else:
                    cache_time = datetime.fromisoformat(cached_at).replace(tzinfo=timezone.utc)
                if now - cache_time < timedelta(hours=6):
                    return cached.get("available", False)
        except Exception as e:
            logger.warning(f"Cache time parse error: {e}")

    url = f"https://vixsrc.to/tv/{tmdb_id}/{season}/{episode}"
    is_available = False

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.head(url)
            if response.status_code == 200:
                is_available = True
            else:
                response = await client.get(url)
                if response.status_code == 200 and "not found" not in response.text.lower():
                    is_available = True
    except Exception as e:
        logger.warning(f"Vixsrc episode check failed for {tmdb_id} S{season}E{episode}: {e}")

    # Save cache
    vixsrc_cache.update_one(
        cache_query,
        {
            "$set": {
                "tmdbId": tmdb_id,
                "type": "tv",
                "season": season,
                "episode": episode,
                "available": is_available,
                "source_url": url if is_available else None,
                "checked_at": now_iso
            }
        },
        upsert=True
    )

    return is_available

async def import_content_from_tmdb(tmdb_id: int, content_type: str, check_vixsrc: bool = True) -> dict:
    """Import content data from TMDB and optionally verify vixsrc availability"""
    endpoint = f"/{content_type}/{tmdb_id}"
    data = await fetch_tmdb_data(endpoint)
    
    if not data:
        return None
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check vixsrc availability if requested
    vixsrc_available = False
    vixsrc_url = None
    if check_vixsrc:
        vixsrc_status = await check_vixsrc_availability(tmdb_id, content_type)
        vixsrc_available = vixsrc_status["available"]
        vixsrc_url = vixsrc_status.get("source_url")
    
    content = {
        "tmdbId": tmdb_id,
        "type": content_type,
        "title": data.get("title") or data.get("name"),
        "original_title": data.get("original_title") or data.get("original_name"),
        "overview": data.get("overview"),
        "poster_path": data.get("poster_path"),
        "backdrop_path": data.get("backdrop_path"),
        "release_date": data.get("release_date") or data.get("first_air_date"),
        "vote_average": data.get("vote_average", 0),
        "vote_count": data.get("vote_count", 0),
        "popularity": data.get("popularity", 0),
        "genres": data.get("genres", []),
        "runtime": data.get("runtime"),
        "status": data.get("status"),
        "tagline": data.get("tagline"),
        "spoken_languages": data.get("spoken_languages", []),
        "production_companies": data.get("production_companies", []),
        "production_countries": data.get("production_countries", []),
        "available": vixsrc_available,
        "vixsrc_available": vixsrc_available,
        "vixsrc_url": vixsrc_url,
        "vixsrc_checked_at": now if check_vixsrc else None,
        "createdAt": now,
        "updatedAt": now
    }
    
    # For TV shows, add additional fields
    if content_type == "tv":
        content["number_of_seasons"] = data.get("number_of_seasons", 0)
        content["number_of_episodes"] = data.get("number_of_episodes", 0)
        content["episode_run_time"] = data.get("episode_run_time", [])
        content["in_production"] = data.get("in_production", False)
        content["networks"] = data.get("networks", [])
        content["created_by"] = data.get("created_by", [])
        content["seasons_info"] = data.get("seasons", [])
    
    return content

async def import_tv_seasons_episodes(tmdb_id: int) -> dict:
    """Import all seasons and episodes for a TV show from TMDB"""
    # First get TV show details to know number of seasons
    tv_data = await fetch_tmdb_data(f"/tv/{tmdb_id}")
    if not tv_data:
        return {"success": False, "error": "TV show not found"}
    
    seasons_imported = 0
    episodes_imported = 0
    
    seasons_list = tv_data.get("seasons", [])
    
    for season_info in seasons_list:
        season_number = season_info.get("season_number")
        if season_number is None or season_number == 0:  # Skip specials (season 0)
            continue
        
        # Fetch season details
        season_data = await fetch_tmdb_data(f"/tv/{tmdb_id}/season/{season_number}")
        if not season_data:
            continue
        
        # Save season
        season_doc = {
            "tmdbId": tmdb_id,
            "season_number": season_number,
            "name": season_data.get("name"),
            "overview": season_data.get("overview"),
            "poster_path": season_data.get("poster_path"),
            "air_date": season_data.get("air_date"),
            "episode_count": len(season_data.get("episodes", [])),
            "vote_average": season_data.get("vote_average", 0),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        tv_seasons.update_one(
            {"tmdbId": tmdb_id, "season_number": season_number},
            {"$set": season_doc},
            upsert=True
        )
        seasons_imported += 1
        
        # Save episodes
        for ep in season_data.get("episodes", []):
            episode_doc = {
                "tmdbId": tmdb_id,
                "season_number": season_number,
                "episode_number": ep.get("episode_number"),
                "name": ep.get("name"),
                "overview": ep.get("overview"),
                "still_path": ep.get("still_path"),
                "air_date": ep.get("air_date"),
                "runtime": ep.get("runtime"),
                "vote_average": ep.get("vote_average", 0),
                "vote_count": ep.get("vote_count", 0),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }
            
            tv_episodes.update_one(
                {"tmdbId": tmdb_id, "season_number": season_number, "episode_number": ep.get("episode_number")},
                {"$set": episode_doc},
                upsert=True
            )
            episodes_imported += 1
    
    return {
        "success": True,
        "seasons_imported": seasons_imported,
        "episodes_imported": episodes_imported
    }

def format_italian_date(date_str: str) -> str:
    """Convert date string to Italian format (es. 15 Gennaio 2024)"""
    if not date_str:
        return None
    
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        months = {
            1: "Gennaio", 2: "Febbraio", 3: "Marzo", 4: "Aprile",
            5: "Maggio", 6: "Giugno", 7: "Luglio", 8: "Agosto",
            9: "Settembre", 10: "Ottobre", 11: "Novembre", 12: "Dicembre"
        }
        return f"{date_obj.day} {months[date_obj.month]} {date_obj.year}"
    except:
        return date_str

def init_default_admin():
    """Create default admin if not exists"""
    existing = admin_users.find_one({"email": "admin@admin.com"})
    if not existing:
        hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt())
        admin_users.insert_one({
            "email": "admin@admin.com",
            "password": hashed.decode(),
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Default admin created: admin@admin.com / admin123")

def init_default_sections():
    """Create default sections if not exists - Admin can modify/delete these"""
    existing = sections.count_documents({})
    if existing == 0:
        default_sections = [
            {"name": "In Tendenza", "apiString": "trending", "mediaType": "mixed", "active": True, "order": 0},
            {"name": "Film Popolari", "apiString": "popular", "mediaType": "movie", "active": True, "order": 1},
            {"name": "Film Più Votati", "apiString": "top_rated", "mediaType": "movie", "active": True, "order": 2},
            {"name": "Nuove Uscite", "apiString": "now_playing", "mediaType": "movie", "active": True, "order": 3},
            {"name": "Prossimamente", "apiString": "upcoming", "mediaType": "movie", "active": True, "order": 4},
            {"name": "Serie TV Popolari", "apiString": "popular", "mediaType": "tv", "active": True, "order": 5},
            {"name": "Serie TV Più Votate", "apiString": "top_rated", "mediaType": "tv", "active": True, "order": 6},
            {"name": "In Onda Oggi", "apiString": "airing_today", "mediaType": "tv", "active": True, "order": 7},
            {"name": "In Onda Questa Settimana", "apiString": "on_the_air", "mediaType": "tv", "active": True, "order": 8},
        ]
        for section in default_sections:
            section["createdAt"] = datetime.now(timezone.utc).isoformat()
            sections.insert_one(section)
        logger.info("Default sections created - Admin can modify these from the panel")

# Initialize defaults on startup
init_default_admin()
init_default_sections()

# Health Check
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# =====================
# ADMIN AUTH ENDPOINTS
# =====================

@app.post("/api/admin/login")
def admin_login(data: AdminLogin):
    """Admin login endpoint"""
    admin = admin_users.find_one({"email": data.email})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode(), admin["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    payload = {
        "email": admin["email"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    log_admin_action("LOGIN", metadata={"email": admin["email"]})
    
    return {
        "token": token,
        "email": admin["email"],
        "expiresIn": JWT_EXPIRATION_HOURS * 3600
    }

@app.get("/api/admin/me")
def get_admin_profile(admin = Depends(get_current_admin)):
    """Get current admin profile"""
    return admin

# =====================
# CONTENT MANAGEMENT ENDPOINTS
# =====================

@app.post("/api/admin/contents")
async def create_content(data: ContentCreate, admin = Depends(get_current_admin)):
    """Add new content to managed list - imports from TMDB and verifies vixsrc availability"""
    existing = contents.find_one({"tmdbId": data.tmdbId})
    if existing:
        raise HTTPException(status_code=400, detail="Content already exists")
    
    # Import from TMDB and verify vixsrc
    content = await import_content_from_tmdb(data.tmdbId, data.type, check_vixsrc=True)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found on TMDB")
    
    # Override available status if manually set
    if data.available is not None:
        content["available"] = data.available
    content["availableSeason"] = data.availableSeason
    
    result = contents.insert_one(content)
    
    # If TV show, import all seasons and episodes
    if data.type == "tv":
        import_result = await import_tv_seasons_episodes(data.tmdbId)
        logger.info(f"Imported TV show {data.tmdbId}: {import_result}")
    
    log_admin_action("CREATE_CONTENT", str(data.tmdbId), {
        "type": data.type,
        "vixsrc_available": content.get("vixsrc_available", False)
    })
    
    # Return without _id
    content.pop("_id", None)
    return {"success": True, "content": content, "vixsrc_available": content.get("vixsrc_available", False)}

@app.get("/api/admin/contents")
def get_contents(
    available: Optional[bool] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "createdAt",
    sort_order: str = "desc",
    admin = Depends(get_current_admin)
):
    """Get all managed contents with filters and sorting"""
    query = {}
    if available is not None:
        query["available"] = available
    if type:
        query["type"] = type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"original_title": {"$regex": search, "$options": "i"}}
        ]
    
    total = contents.count_documents(query)
    skip = (page - 1) * limit
    
    sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
    items = list(contents.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit))
    
    # Add formatted Italian date
    for item in items:
        item["release_date_it"] = format_italian_date(item.get("release_date"))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "totalPages": (total + limit - 1) // limit
    }

@app.get("/api/admin/contents/{tmdb_id}")
def get_content(tmdb_id: int, admin = Depends(get_current_admin)):
    """Get single content by TMDB ID"""
    content = contents.find_one({"tmdbId": tmdb_id}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    content["release_date_it"] = format_italian_date(content.get("release_date"))
    return content

@app.put("/api/admin/contents/{tmdb_id}")
def update_content(tmdb_id: int, data: ContentUpdate, admin = Depends(get_current_admin)):
    """Update content availability or season"""
    content = contents.find_one({"tmdbId": tmdb_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    if data.available is not None:
        update_data["available"] = data.available
    if data.availableSeason is not None:
        update_data["availableSeason"] = data.availableSeason
    
    contents.update_one({"tmdbId": tmdb_id}, {"$set": update_data})
    log_admin_action("UPDATE_CONTENT", str(tmdb_id), update_data)
    
    return {"success": True}

@app.delete("/api/admin/contents/{tmdb_id}")
def delete_content(tmdb_id: int, admin = Depends(get_current_admin)):
    """Delete content from managed list"""
    result = contents.delete_one({"tmdbId": tmdb_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Also delete associated seasons and episodes
    tv_seasons.delete_many({"tmdbId": tmdb_id})
    tv_episodes.delete_many({"tmdbId": tmdb_id})
    
    log_admin_action("DELETE_CONTENT", str(tmdb_id))
    
    return {"success": True}

@app.post("/api/admin/contents/{tmdb_id}/refresh")
async def refresh_content(tmdb_id: int, admin = Depends(get_current_admin)):
    """Refresh content data from TMDB and re-check vixsrc availability"""
    existing = contents.find_one({"tmdbId": tmdb_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Content not found")
    
    content = await import_content_from_tmdb(tmdb_id, existing["type"], check_vixsrc=True)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found on TMDB")
    
    # Keep local fields but update vixsrc status
    content["availableSeason"] = existing.get("availableSeason")
    content["createdAt"] = existing.get("createdAt")
    
    contents.update_one({"tmdbId": tmdb_id}, {"$set": content})
    
    # Refresh seasons/episodes for TV shows
    if existing["type"] == "tv":
        await import_tv_seasons_episodes(tmdb_id)
    
    log_admin_action("REFRESH_CONTENT", str(tmdb_id))
    
    return {"success": True, "vixsrc_available": content.get("vixsrc_available", False)}

@app.post("/api/admin/contents/{tmdb_id}/check-vixsrc")
async def check_content_vixsrc(tmdb_id: int, admin = Depends(get_current_admin)):
    """Check vixsrc availability for a specific content"""
    existing = contents.find_one({"tmdbId": tmdb_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Content not found")
    
    vixsrc_status = await check_vixsrc_availability(tmdb_id, existing["type"])
    
    # Update content with vixsrc status
    contents.update_one(
        {"tmdbId": tmdb_id},
        {"$set": {
            "available": vixsrc_status["available"],
            "vixsrc_available": vixsrc_status["available"],
            "vixsrc_url": vixsrc_status.get("source_url"),
            "vixsrc_checked_at": vixsrc_status.get("checked_at"),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "vixsrc_available": vixsrc_status["available"], "vixsrc_url": vixsrc_status.get("source_url")}

@app.post("/api/admin/import-from-tmdb")
async def import_trending_from_tmdb(
    content_type: str = "movie",
    category: str = "popular",
    page: int = 1,
    verify_vixsrc: bool = True,
    admin = Depends(get_current_admin)
):
    """
    Import trending/popular content from TMDB and verify availability on vixsrc.to
    Categories: popular, top_rated, trending, now_playing (movies), on_the_air (tv)
    """
    # Fetch from TMDB based on category
    if category == "trending":
        endpoint = f"/trending/{content_type}/week"
    elif category == "now_playing" and content_type == "movie":
        endpoint = "/movie/now_playing"
    elif category == "on_the_air" and content_type == "tv":
        endpoint = "/tv/on_the_air"
    else:
        endpoint = f"/{content_type}/{category}"
    
    tmdb_data = await fetch_tmdb_data(endpoint, {"page": page})
    if not tmdb_data or "results" not in tmdb_data:
        raise HTTPException(status_code=500, detail="Failed to fetch from TMDB")
    
    imported = 0
    available_on_vixsrc = 0
    skipped = 0
    results = []
    
    for item in tmdb_data["results"][:20]:  # Limit to 20 per request
        tmdb_id = item.get("id")
        media_type = item.get("media_type", content_type)
        
        # Skip if already exists
        existing = contents.find_one({"tmdbId": tmdb_id})
        if existing:
            skipped += 1
            continue
        
        # Import with vixsrc check
        content = await import_content_from_tmdb(tmdb_id, media_type, check_vixsrc=verify_vixsrc)
        if not content:
            continue
        
        # Only save if available on vixsrc (or if verify_vixsrc is False)
        if not verify_vixsrc or content.get("vixsrc_available", False):
            try:
                contents.insert_one(content)
                imported += 1
                if content.get("vixsrc_available"):
                    available_on_vixsrc += 1
                
                # Import seasons/episodes for TV
                if media_type == "tv":
                    await import_tv_seasons_episodes(tmdb_id)
                
                results.append({
                    "tmdbId": tmdb_id,
                    "title": content.get("title"),
                    "type": media_type,
                    "vixsrc_available": content.get("vixsrc_available", False)
                })
            except Exception as e:
                logger.error(f"Error importing {tmdb_id}: {e}")
    
    log_admin_action("IMPORT_FROM_TMDB", metadata={
        "category": category,
        "content_type": content_type,
        "imported": imported,
        "available_on_vixsrc": available_on_vixsrc
    })
    
    return {
        "success": True,
        "imported": imported,
        "available_on_vixsrc": available_on_vixsrc,
        "skipped": skipped,
        "results": results
    }

@app.post("/api/admin/verify-all-vixsrc")
async def verify_all_vixsrc_availability(admin = Depends(get_current_admin)):
    """Re-verify vixsrc availability for all contents in database"""
    all_contents = list(contents.find({}, {"tmdbId": 1, "type": 1, "_id": 0}))
    
    verified = 0
    available = 0
    unavailable = 0
    
    for item in all_contents:
        vixsrc_status = await check_vixsrc_availability(item["tmdbId"], item["type"])
        
        contents.update_one(
            {"tmdbId": item["tmdbId"]},
            {"$set": {
                "available": vixsrc_status["available"],
                "vixsrc_available": vixsrc_status["available"],
                "vixsrc_url": vixsrc_status.get("source_url"),
                "vixsrc_checked_at": vixsrc_status.get("checked_at"),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        verified += 1
        if vixsrc_status["available"]:
            available += 1
        else:
            unavailable += 1
    
    log_admin_action("VERIFY_ALL_VIXSRC", metadata={
        "verified": verified,
        "available": available,
        "unavailable": unavailable
    })
    
    return {
        "success": True,
        "verified": verified,
        "available": available,
        "unavailable": unavailable
    }

@app.post("/api/admin/cleanup")
async def cleanup_database(admin = Depends(get_current_admin)):
    """Clean up and reimport all content from database"""
    # Get all existing content IDs
    existing_ids = list(contents.find({}, {"tmdbId": 1, "type": 1, "_id": 0}))
    
    # Clear all data
    contents.delete_many({})
    tv_seasons.delete_many({})
    tv_episodes.delete_many({})
    
    # Reimport everything
    reimported = 0
    for item in existing_ids:
        try:
            content = await import_content_from_tmdb(item["tmdbId"], item["type"])
            if content:
                content["available"] = True
                contents.insert_one(content)
                
                if item["type"] == "tv":
                    await import_tv_seasons_episodes(item["tmdbId"])
                
                reimported += 1
        except Exception as e:
            logger.error(f"Error reimporting {item['tmdbId']}: {e}")
    
    log_admin_action("CLEANUP_DATABASE", metadata={"reimported": reimported})
    
    return {"success": True, "reimported": reimported, "total": len(existing_ids)}

# =====================
# HERO MANAGEMENT ENDPOINTS
# =====================

@app.get("/api/admin/hero")
def get_hero(admin = Depends(get_current_admin)):
    """Get current hero settings"""
    from fastapi.responses import JSONResponse
    
    hero = hero_settings.find_one({}, {"_id": 0})
    return JSONResponse(
        content=hero if hero else {},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.put("/api/admin/hero")
def update_hero(data: HeroUpdate, admin = Depends(get_current_admin)):
    """Update hero section"""
    hero_data = {
        "contentId": sanitize_string(data.contentId),
        "mediaType": data.mediaType,
        "customTitle": sanitize_string(data.customTitle) if data.customTitle else None,
        "customDescription": sanitize_string(data.customDescription) if data.customDescription else None,
        "customBackdrop": data.customBackdrop,
        "seasonLabel": sanitize_string(data.seasonLabel) if data.seasonLabel else None,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    hero_settings.update_one({}, {"$set": hero_data}, upsert=True)
    log_admin_action("UPDATE_HERO", data.contentId, {"mediaType": data.mediaType})
    
    return {"success": True, "hero": hero_data}

# =====================
# SECTIONS MANAGEMENT ENDPOINTS
# =====================

class SectionCreateFull(BaseModel):
    name: str
    section_type: str = "popular"
    media_type: str = "movie"
    visible: bool = True
    order: int = 0

class SectionUpdateFull(BaseModel):
    name: Optional[str] = None
    section_type: Optional[str] = None
    media_type: Optional[str] = None
    visible: Optional[bool] = None
    order: Optional[int] = None

@app.get("/api/admin/sections")
def get_sections(admin = Depends(get_current_admin)):
    """Get all sections"""
    items = list(sections.find({}, {"_id": 0}).sort("order", 1))
    for i, item in enumerate(items):
        item["id"] = item.get("name", f"section_{i}")
    return {"sections": items, "items": items}

@app.post("/api/admin/sections")
def create_section(data: SectionCreateFull, admin = Depends(get_current_admin)):
    """Create new section"""
    existing = sections.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Section with this name already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    section = {
        "name": data.name,
        "section_type": data.section_type,
        "apiString": data.section_type,
        "media_type": data.media_type,
        "mediaType": data.media_type,
        "visible": data.visible,
        "active": data.visible,
        "order": data.order,
        "createdAt": now,
        "updatedAt": now
    }
    sections.insert_one(section)
    
    log_admin_action("CREATE_SECTION", data.name, {"section_type": data.section_type})
    
    section["id"] = data.name
    section.pop("_id", None)
    return section

@app.put("/api/admin/sections/{section_id}")
def update_section(section_id: str, data: SectionUpdateFull, admin = Depends(get_current_admin)):
    """Update section by id/name"""
    existing = sections.find_one({"name": section_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Section not found")
    
    update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update_data["name"] = data.name
    if data.section_type is not None:
        update_data["section_type"] = data.section_type
        update_data["apiString"] = data.section_type
    if data.media_type is not None:
        update_data["media_type"] = data.media_type
        update_data["mediaType"] = data.media_type
    if data.visible is not None:
        update_data["visible"] = data.visible
        update_data["active"] = data.visible
    if data.order is not None:
        update_data["order"] = data.order
    
    sections.update_one({"name": section_id}, {"$set": update_data})
    log_admin_action("UPDATE_SECTION", section_id, update_data)
    
    updated = sections.find_one({"name": data.name if data.name else section_id}, {"_id": 0})
    updated["id"] = updated["name"]
    return updated

@app.delete("/api/admin/sections/{section_id}")
def delete_section(section_id: str, admin = Depends(get_current_admin)):
    """Delete section by id/name"""
    result = sections.delete_one({"name": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section not found")
    
    log_admin_action("DELETE_SECTION", section_id)
    return {"success": True}

@app.put("/api/admin/sections/reorder")
def reorder_sections(orders: List[dict], admin = Depends(get_current_admin)):
    """Reorder all sections"""
    for item in orders:
        section_id = item.get("id") or item.get("name")
        sections.update_one(
            {"name": section_id},
            {"$set": {"order": item["order"], "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
    
    log_admin_action("REORDER_SECTIONS")
    return {"success": True}

# =====================
# MENU MANAGEMENT ENDPOINTS
# =====================

class MenuItemCreate(BaseModel):
    name: str
    path: str = ""
    order: int = 0
    active: bool = True

@app.get("/api/admin/menu")
def get_menu_items(admin = Depends(get_current_admin)):
    """Get all menu items"""
    items = list(menu_items.find({}, {"_id": 0}).sort("order", 1))
    return {"items": items}

@app.post("/api/admin/menu")
def create_menu_item(data: MenuItemCreate, admin = Depends(get_current_admin)):
    """Create new menu item"""
    import uuid
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "id": str(uuid.uuid4())[:8],
        "name": data.name,
        "path": data.path,
        "order": data.order,
        "active": data.active,
        "createdAt": now,
        "updatedAt": now
    }
    menu_items.insert_one(item)
    
    log_admin_action("CREATE_MENU_ITEM", item["id"], {"name": data.name})
    
    item.pop("_id", None)
    return item

class MenuReorderItem(BaseModel):
    id: str
    order: int

class MenuReorderRequest(BaseModel):
    items: List[MenuReorderItem]

@app.put("/api/admin/menu/reorder")
def reorder_menu_items(request: MenuReorderRequest, admin = Depends(get_current_admin)):
    """Reorder menu items"""
    for item in request.items:
        menu_items.update_one(
            {"id": item.id},
            {"$set": {"order": item.order, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
    
    log_admin_action("REORDER_MENU")
    return {"success": True}

@app.put("/api/admin/menu/{item_id}")
def update_menu_item(item_id: str, data: MenuItemUpdate, admin = Depends(get_current_admin)):
    """Update menu item"""
    existing = menu_items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    for field in ["name", "path", "order", "active"]:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value
    
    menu_items.update_one({"id": item_id}, {"$set": update_data})
    log_admin_action("UPDATE_MENU_ITEM", item_id, update_data)
    
    updated = menu_items.find_one({"id": item_id}, {"_id": 0})
    return updated

@app.delete("/api/admin/menu/{item_id}")
def delete_menu_item(item_id: str, admin = Depends(get_current_admin)):
    """Delete menu item"""
    result = menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    log_admin_action("DELETE_MENU_ITEM", item_id)
    return {"success": True}

@app.get("/api/public/menu")
def get_public_menu():
    """Get visible menu items for public frontend"""
    items = list(menu_items.find({"active": True}, {"_id": 0}).sort("order", 1))
    return {"items": items}

# =====================
# USER ACCOUNT ENDPOINTS
# =====================

users.create_index("email", unique=True)

class UserRegister(BaseModel):
    email: str
    password: str
    name: str = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    profileImage: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/auth/register")
def register_user(data: UserRegister):
    """Register new user"""
    import uuid
    
    existing = users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    now = datetime.now(timezone.utc).isoformat()
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt())
    
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "password": hashed.decode(),
        "name": sanitize_string(data.name) or data.email.split("@")[0],
        "profileImage": None,
        "createdAt": now,
        "updatedAt": now
    }
    users.insert_one(user)
    
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS * 7),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "profileImage": user["profileImage"]
        }
    }

@app.post("/api/auth/login")
def login_user(data: UserLogin):
    """Login user"""
    user = users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS * 7),
        "iat": datetime.now(timezone.utc)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "profileImage": user.get("profileImage")
        }
    }

@app.get("/api/auth/me")
def get_user_profile(user = Depends(get_current_user)):
    """Get current user profile"""
    return user

@app.put("/api/auth/profile")
def update_user_profile(data: UserUpdate, user = Depends(get_current_user)):
    """Update user profile"""
    update_data = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_data["name"] = sanitize_string(data.name)
    
    if data.email is not None:
        existing = users.find_one({"email": data.email.lower(), "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', data.email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        update_data["email"] = data.email.lower()
    
    if data.password is not None:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt())
        update_data["password"] = hashed.decode()
    
    if data.profileImage is not None:
        update_data["profileImage"] = data.profileImage
    
    users.update_one({"id": user["id"]}, {"$set": update_data})
    updated = users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated

@app.get("/api/auth/history")
def get_user_history(user = Depends(get_current_user)):
    """Get user watch history"""
    history = list(user_lists.find({"user_id": user["id"]}, {"_id": 0}).sort("added_at", -1).limit(50))
    return {"items": history}

# =====================
# STATISTICS ENDPOINTS
# =====================

@app.get("/api/admin/stats")
def get_stats(admin = Depends(get_current_admin)):
    """Get dashboard statistics"""
    total = contents.count_documents({})
    movies = contents.count_documents({"type": "movie"})
    tv = contents.count_documents({"type": "tv"})
    visible = contents.count_documents({"available": True})
    hidden = contents.count_documents({"available": False})
    vixsrc_available = contents.count_documents({"vixsrc_available": True})
    total_seasons = tv_seasons.count_documents({})
    total_episodes = tv_episodes.count_documents({})
    
    last_added = contents.find_one({}, {"_id": 0}, sort=[("createdAt", -1)])
    hero = hero_settings.find_one({}, {"_id": 0})
    
    return {
        "total": total,
        "movies": movies,
        "tvShows": tv,
        "visible": visible,
        "hidden": hidden,
        "vixsrc_available": vixsrc_available,
        "totalSeasons": total_seasons,
        "totalEpisodes": total_episodes,
        "lastAdded": last_added,
        "currentHero": hero
    }

# =====================
# ADMIN LOGS ENDPOINTS
# =====================

@app.get("/api/admin/logs")
def get_admin_logs(
    action: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin = Depends(get_current_admin)
):
    """Get admin activity logs"""
    query = {}
    if action:
        query["action"] = action
    
    total = admin_logs.count_documents(query)
    skip = (page - 1) * limit
    
    items = list(admin_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit))
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "totalPages": (total + limit - 1) // limit
    }

# =====================
# PUBLIC API ENDPOINTS (for frontend)
# =====================

# Cache for vixsrc availability checks (to avoid too many requests)
vixsrc_cache = db["vixsrc_cache"]
# Drop old index and create compound index for episodes
try:
    vixsrc_cache.drop_index("tmdbId_1")
except:
    pass
vixsrc_cache.create_index([("tmdbId", 1), ("type", 1), ("season", 1), ("episode", 1)], unique=True)
vixsrc_cache.create_index("checked_at")

async def check_vixsrc_with_cache(tmdb_id: int, content_type: str, cache_hours: int = 24) -> bool:
    """Check vixsrc availability with caching"""
    # Check cache first
    cached = vixsrc_cache.find_one({"tmdbId": tmdb_id, "type": content_type})
    if cached:
        cache_time = datetime.fromisoformat(cached["checked_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - cache_time < timedelta(hours=cache_hours):
            return cached.get("available", False)
    
    # Check vixsrc
    result = await check_vixsrc_availability(tmdb_id, content_type)
    
    # Update cache
    vixsrc_cache.update_one(
        {"tmdbId": tmdb_id},
        {"$set": {
            "tmdbId": tmdb_id,
            "type": content_type,
            "available": result["available"],
            "checked_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return result["available"]

@app.get("/api/public/tmdb/trending/{media_type}")
async def get_tmdb_trending(media_type: str = "all", page: int = 1, verify_vixsrc: bool = True):
    """Get trending content directly from TMDB, filtered by vixsrc availability and NO ANIME"""
    endpoint = f"/trending/{media_type}/week"
    data = await fetch_tmdb_data(endpoint, {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        # ❌ SKIP ANIME CONTENT
        if is_anime_content(item):
            continue
            
        tmdb_id = item.get("id")
        item_type = item.get("media_type", media_type if media_type != "all" else "movie")
        
        # Check vixsrc availability
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, item_type)
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": item_type,
            "title": item.get("title") or item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "genre_ids": item.get("genre_ids", []),
            "vixsrc_available": True
        })
    
    # ✅ SORT BY TMDB ID for deterministic order
    items.sort(key=lambda x: x["tmdbId"])
    
    return {"items": items, "total": len(items), "page": page}

@app.get("/api/public/tmdb/popular/{media_type}")
async def get_tmdb_popular(media_type: str = "movie", page: int = 1, verify_vixsrc: bool = True):
    """Get popular content directly from TMDB, filtered by vixsrc availability and NO ANIME"""
    endpoint = f"/{media_type}/popular"
    data = await fetch_tmdb_data(endpoint, {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        # ❌ SKIP ANIME CONTENT
        if is_anime_content(item):
            continue
            
        tmdb_id = item.get("id")
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, media_type)
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": media_type,
            "title": item.get("title") or item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "genre_ids": item.get("genre_ids", []),
            "vixsrc_available": True
        })
    
    # ✅ SORT BY TMDB ID for deterministic order
    items.sort(key=lambda x: x["tmdbId"])
    
    return {"items": items, "total": len(items), "page": page}

@app.get("/api/public/tmdb/top_rated/{media_type}")
async def get_tmdb_top_rated(media_type: str = "movie", page: int = 1, verify_vixsrc: bool = True):
    """Get top rated content directly from TMDB, filtered by vixsrc availability"""
    endpoint = f"/{media_type}/top_rated"
    data = await fetch_tmdb_data(endpoint, {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        tmdb_id = item.get("id")
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, media_type)
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": media_type,
            "title": item.get("title") or item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "genre_ids": item.get("genre_ids", []),
            "vixsrc_available": True
        })
    
    return {"items": items, "total": len(items), "page": page}

@app.get("/api/public/tmdb/now_playing")
async def get_tmdb_now_playing(page: int = 1, verify_vixsrc: bool = True):
    """Get now playing movies from TMDB, filtered by vixsrc availability"""
    data = await fetch_tmdb_data("/movie/now_playing", {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        tmdb_id = item.get("id")
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, "movie")
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": "movie",
            "title": item.get("title"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date"),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "genre_ids": item.get("genre_ids", []),
            "vixsrc_available": True
        })
    
    return {"items": items, "total": len(items), "page": page}

@app.get("/api/public/tmdb/on_the_air")
async def get_tmdb_on_the_air(page: int = 1, verify_vixsrc: bool = True):
    """Get TV shows on the air from TMDB, filtered by vixsrc availability"""
    data = await fetch_tmdb_data("/tv/on_the_air", {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        tmdb_id = item.get("id")
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, "tv")
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": "tv",
            "title": item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("first_air_date"),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "genre_ids": item.get("genre_ids", []),
            "vixsrc_available": True
        })
    
    return {"items": items, "total": len(items), "page": page}

@app.get("/api/public/contents/home")
async def get_home_contents(limit: int = 50, verify_vixsrc: bool = True):
    """Get contents for home page directly from TMDB, filtered by vixsrc availability"""
    all_items = []
    
    # Fetch trending
    trending_data = await fetch_tmdb_data("/trending/all/week", {"page": 1})
    if trending_data and "results" in trending_data:
        for item in trending_data["results"][:20]:
            tmdb_id = item.get("id")
            item_type = item.get("media_type", "movie")
            
            if verify_vixsrc:
                is_available = await check_vixsrc_with_cache(tmdb_id, item_type)
                if not is_available:
                    continue
            
            all_items.append({
                "tmdbId": tmdb_id,
                "type": item_type,
                "title": item.get("title") or item.get("name"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "_section": "trending",
                "vixsrc_available": True
            })
    
    # Fetch popular movies
    popular_movies = await fetch_tmdb_data("/movie/popular", {"page": 1})
    if popular_movies and "results" in popular_movies:
        for item in popular_movies["results"][:15]:
            tmdb_id = item.get("id")
            
            if verify_vixsrc:
                is_available = await check_vixsrc_with_cache(tmdb_id, "movie")
                if not is_available:
                    continue
            
            all_items.append({
                "tmdbId": tmdb_id,
                "type": "movie",
                "title": item.get("title"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "_section": "popular_movies",
                "vixsrc_available": True
            })
    
    # Fetch popular TV
    popular_tv = await fetch_tmdb_data("/tv/popular", {"page": 1})
    if popular_tv and "results" in popular_tv:
        for item in popular_tv["results"][:15]:
            tmdb_id = item.get("id")
            
            if verify_vixsrc:
                is_available = await check_vixsrc_with_cache(tmdb_id, "tv")
                if not is_available:
                    continue
            
            all_items.append({
                "tmdbId": tmdb_id,
                "type": "tv",
                "title": item.get("name"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("first_air_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "_section": "popular_tv",
                "vixsrc_available": True
            })
    
    # Fetch top rated
    top_rated = await fetch_tmdb_data("/movie/top_rated", {"page": 1})
    if top_rated and "results" in top_rated:
        for item in top_rated["results"][:10]:
            tmdb_id = item.get("id")
            
            if verify_vixsrc:
                is_available = await check_vixsrc_with_cache(tmdb_id, "movie")
                if not is_available:
                    continue
            
            all_items.append({
                "tmdbId": tmdb_id,
                "type": "movie",
                "title": item.get("title"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "_section": "top_rated",
                "vixsrc_available": True
            })
    
    # Remove duplicates
    seen = set()
    unique_items = []
    for item in all_items:
        if item["tmdbId"] not in seen:
            seen.add(item["tmdbId"])
            item["release_date_it"] = format_italian_date(item.get("release_date"))
            unique_items.append(item)
    
    # Group by section
    sections = {
        "trending": [c for c in unique_items if c.get("_section") == "trending"][:12],
        "popular_movies": [c for c in unique_items if c.get("_section") == "popular_movies"][:12],
        "popular_tv": [c for c in unique_items if c.get("_section") == "popular_tv"][:12],
        "top_rated": [c for c in unique_items if c.get("_section") == "top_rated"][:12],
    }
    
    return {
        "items": unique_items[:limit],
        "total": len(unique_items),
        "sections": sections
    }

@app.get("/api/public/contents/all")
async def get_all_contents(
    media_type: str = None,
    limit: int = 100,
    sort_by: str = "popularity",
    verify_vixsrc: bool = True
):
    """Get all contents from TMDB, filtered by vixsrc availability"""
    items = []
    
    # Determine which endpoint to use
    if media_type == "tv":
        endpoints = ["/tv/popular", "/tv/top_rated", "/tv/on_the_air"]
    elif media_type == "movie":
        endpoints = ["/movie/popular", "/movie/top_rated", "/movie/now_playing"]
    else:
        endpoints = ["/trending/all/week", "/movie/popular", "/tv/popular"]
    
    for endpoint in endpoints:
        data = await fetch_tmdb_data(endpoint, {"page": 1})
        if not data or "results" not in data:
            continue
        
        for item in data["results"]:
            tmdb_id = item.get("id")
            item_type = item.get("media_type") or ("tv" if "/tv/" in endpoint else "movie")
            
            if media_type and media_type != "mixed" and item_type != media_type:
                continue
            
            if verify_vixsrc:
                is_available = await check_vixsrc_with_cache(tmdb_id, item_type)
                if not is_available:
                    continue
            
            items.append({
                "tmdbId": tmdb_id,
                "type": item_type,
                "title": item.get("title") or item.get("name"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "vixsrc_available": True
            })
    
    # Remove duplicates
    seen = set()
    unique_items = []
    for item in items:
        if item["tmdbId"] not in seen:
            seen.add(item["tmdbId"])
            item["release_date_it"] = format_italian_date(item.get("release_date"))
            unique_items.append(item)
    
    # Sort
    if sort_by == "vote_average":
        unique_items.sort(key=lambda x: x.get("vote_average", 0), reverse=True)
    elif sort_by == "release_date":
        unique_items.sort(key=lambda x: x.get("release_date", ""), reverse=True)
    else:
        unique_items.sort(key=lambda x: x.get("popularity", 0), reverse=True)
    
    return {"items": unique_items[:limit], "total": len(unique_items)}

@app.get("/api/public/contents/available")
async def get_available_contents():
    """Get available content IDs from TMDB trending, verified on vixsrc"""
    data = await fetch_tmdb_data("/trending/all/week", {"page": 1})
    
    if not data or "results" not in data:
        return {"items": []}
    
    items = []
    for item in data["results"]:
        tmdb_id = item.get("id")
        item_type = item.get("media_type", "movie")
        
        is_available = await check_vixsrc_with_cache(tmdb_id, item_type)
        if is_available:
            items.append({
                "tmdbId": tmdb_id,
                "type": item_type,
                "vixsrc_available": True
            })
    
    return {"items": items}

@app.get("/api/public/hero")
async def get_public_hero():
    """Get hero settings - fetch content details from TMDB"""
    from fastapi.responses import JSONResponse
    
    hero = hero_settings.find_one({}, {"_id": 0})
    if hero and hero.get("contentId"):
        # Fetch content details from TMDB
        tmdb_id = int(hero["contentId"])
        media_type = hero.get("mediaType", "tv")
        
        tmdb_data = await fetch_tmdb_data(f"/{media_type}/{tmdb_id}")
        
        hero_response = dict(hero)
        if tmdb_data:
            hero_response["mediaType"] = media_type
            hero_response["release_date_it"] = format_italian_date(
                tmdb_data.get("release_date") or tmdb_data.get("first_air_date")
            )
        else:
            hero_response["mediaType"] = media_type
        
        return JSONResponse(
            content=hero_response,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return JSONResponse(
        content={},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@app.get("/api/public/sections")
def get_public_sections():
    """Get active sections for public frontend"""
    items = list(sections.find({"active": True}, {"_id": 0}).sort("order", 1))
    return {"items": items}

@app.get("/api/public/check-availability/{media_type}/{tmdb_id}")
async def check_content_availability(media_type: str, tmdb_id: int):
    """
    Check if a specific content is available on vixsrc.to
    Now returns availability status but doesn't block content display
    """
    # First verify it exists on TMDB
    tmdb_data = await fetch_tmdb_data(f"/{media_type}/{tmdb_id}")
    if not tmdb_data:
        return {
            "tmdb_exists": False,
            "vixsrc_available": False,
            "available": True,  # Still allow to show details
            "show_warning": True,
            "reason": "Content not found on TMDB"
        }
    
    # Check vixsrc availability
    vixsrc_result = await check_vixsrc_with_cache(tmdb_id, media_type)
    
    return {
        "tmdb_exists": True,
        "vixsrc_available": vixsrc_result,
        "available": True,  # Always allow content to be shown
        "show_warning": not vixsrc_result,  # Show warning if not on vixsrc
        "tmdb_id": tmdb_id,
        "media_type": media_type,
        "title": tmdb_data.get("title") or tmdb_data.get("name"),
        "warning_message": "Questo contenuto potrebbe non essere disponibile per la visione" if not vixsrc_result else None
    }

@app.get("/api/public/sections/data")
async def get_sections_with_content():
    """
    Get all active sections with their content filtered by vixsrc availability.
    This is the main endpoint for the home page.
    """
    # Get active sections from database ordered by order field
    active_sections = list(sections.find({"active": True}, {"_id": 0}).sort("order", 1))
    
    if not active_sections:
        return {"sections": [], "message": "No sections configured. Admin must create sections."}
    
    result_sections = []
    
    for section in active_sections:
        section_type = section.get("apiString") or section.get("section_type", "popular")
        media_type = section.get("mediaType") or section.get("media_type", "movie")
        section_name = section.get("name", "Contenuti")
        
        # Determine the TMDB endpoint based on section type
        if section_type == "trending":
            if media_type == "mixed" or media_type == "all":
                endpoint = "/trending/all/week"
            else:
                endpoint = f"/trending/{media_type}/week"
        elif section_type == "popular":
            endpoint = f"/{media_type}/popular"
        elif section_type == "top_rated":
            endpoint = f"/{media_type}/top_rated"
        elif section_type == "now_playing":
            endpoint = "/movie/now_playing"
        elif section_type == "upcoming":
            endpoint = "/movie/upcoming"
        elif section_type == "airing_today":
            endpoint = "/tv/airing_today"
        elif section_type == "on_the_air":
            endpoint = "/tv/on_the_air"
        else:
            endpoint = f"/{media_type}/popular"
        
        # Fetch from TMDB
        tmdb_data = await fetch_tmdb_data(endpoint, {"page": 1})
        
        if not tmdb_data or "results" not in tmdb_data:
            continue
        
        # Filter by vixsrc availability
        items = []
        for item in tmdb_data["results"][:20]:
            item_id = item.get("id")
            item_type = item.get("media_type", media_type if media_type not in ["mixed", "all"] else "movie")
            
            # Check vixsrc availability
            is_available = await check_vixsrc_with_cache(item_id, item_type)
            if not is_available:
                continue
            
            items.append({
                "tmdbId": item_id,
                "id": item_id,
                "type": item_type,
                "media_type": item_type,
                "title": item.get("title") or item.get("name"),
                "name": item.get("name") or item.get("title"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date") or item.get("first_air_date"),
                "vote_average": item.get("vote_average", 0),
                "popularity": item.get("popularity", 0),
                "genre_ids": item.get("genre_ids", []),
                "vixsrc_available": True
            })
            
            # Limit to 12 items per section
            if len(items) >= 12:
                break
        
        if items:
            result_sections.append({
                "name": section_name,
                "section_type": section_type,
                "media_type": media_type,
                "order": section.get("order", 0),
                "items": items
            })
    
    return {"sections": result_sections}

# =====================
# TV SERIES ENDPOINTS - FROM TMDB
# =====================

@app.get("/api/public/tv/{tmdb_id}/seasons")
async def get_tv_seasons(tmdb_id: int):
    """Get all seasons for a TV show - OTTIMIZZATO per velocità"""
    # Fetch TV show details from TMDB
    tv_data = await fetch_tmdb_data(f"/tv/{tmdb_id}")
    if not tv_data:
        raise HTTPException(status_code=404, detail="TV show not found on TMDB")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get seasons from TMDB data
    seasons_list = tv_data.get("seasons", [])
    
    # Return ALL seasons (except specials), SENZA check vixsrc per velocità
    all_seasons = []
    for season in seasons_list:
        season_number = season.get("season_number", 0)
        if season_number == 0:  # Skip specials
            continue
        
        season_air_date = season.get("air_date")
        
        # Check if season has aired
        is_aired = season_air_date and season_air_date <= today
        
        all_seasons.append({
            "season_number": season_number,
            "name": season.get("name"),
            "overview": season.get("overview"),
            "poster_path": season.get("poster_path"),
            "air_date": season_air_date,
            "air_date_it": format_italian_date(season_air_date),
            "episode_count": season.get("episode_count", 0),
            "vote_average": season.get("vote_average", 0),
            "is_aired": is_aired,
            "vixsrc_available": is_aired  # Se aired, consideriamo disponibile
        })
    
    return {
        "tmdbId": tmdb_id,
        "title": tv_data.get("name"),
        "status": tv_data.get("status"),
        "in_production": tv_data.get("in_production", False),
        "total_seasons": len(all_seasons),
        "seasons": all_seasons
    }

@app.get("/api/public/tv/{tmdb_id}/season/{season_number}")
async def get_tv_season_episodes(tmdb_id: int, season_number: int):
    """Get episodes for a specific season - OTTIMIZZATO per velocità"""
    # Fetch season details from TMDB
    season_data = await fetch_tmdb_data(f"/tv/{tmdb_id}/season/{season_number}")
    if not season_data:
        raise HTTPException(status_code=404, detail="Season not found on TMDB")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    season_air_date = season_data.get("air_date")
    
    # Check if season has aired at all
    season_is_aired = season_air_date and season_air_date <= today
    
    if not season_is_aired:
        # Season not yet aired - return info with release date
        return {
            "tmdbId": tmdb_id,
            "season": {
                "season_number": season_number,
                "name": season_data.get("name"),
                "overview": season_data.get("overview"),
                "poster_path": season_data.get("poster_path"),
                "air_date": season_air_date,
                "air_date_it": format_italian_date(season_air_date),
            },
            "total_episodes": 0,
            "episodes": [],
            "is_aired": False,
            "release_date": season_air_date,
            "release_date_it": format_italian_date(season_air_date),
            "message": f"Questa stagione sarà disponibile dal {format_italian_date(season_air_date)}" if season_air_date else "Data di uscita non ancora annunciata"
        }
    
    # OTTIMIZZAZIONE: Mostra tutti gli episodi aired senza controllare vixsrc singolarmente
    # Questo rende il cambio stagione IMMEDIATO
    episodes_list = []
    for ep in season_data.get("episodes", []):
        air_date = ep.get("air_date")
        ep_number = ep.get("episode_number")
        
        # Skip episodes not yet aired
        if not air_date or air_date > today:
            continue
        
        # Include episode (vixsrc check rimosso per velocità)
        episodes_list.append({
            "episode_number": ep_number,
            "name": ep.get("name"),
            "overview": ep.get("overview"),
            "still_path": ep.get("still_path"),
            "air_date": air_date,
            "air_date_it": format_italian_date(air_date),
            "runtime": ep.get("runtime"),
            "vote_average": ep.get("vote_average", 0),
            "vote_count": ep.get("vote_count", 0),
            "vixsrc_available": True  # Assunto disponibile
        })
    
    season_info = {
        "season_number": season_number,
        "name": season_data.get("name"),
        "overview": season_data.get("overview"),
        "poster_path": season_data.get("poster_path"),
        "air_date": season_data.get("air_date"),
        "air_date_it": format_italian_date(season_data.get("air_date"))
    }
    
    return {
        "tmdbId": tmdb_id,
        "season": season_info,
        "total_episodes": len(episodes_list),
        "episodes": episodes_list
    }

@app.get("/api/public/content/{tmdb_id}")
async def get_content_by_tmdb_id(tmdb_id: int, media_type: str = "movie"):
    """Get single content by TMDB ID directly from TMDB, verify vixsrc availability"""
    # Try movie first, then TV
    content = await fetch_tmdb_data(f"/{media_type}/{tmdb_id}")
    if not content:
        # Try the other type
        other_type = "tv" if media_type == "movie" else "movie"
        content = await fetch_tmdb_data(f"/{other_type}/{tmdb_id}")
        if content:
            media_type = other_type
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found on TMDB")
    
    # Check vixsrc availability
    is_available = await check_vixsrc_with_cache(tmdb_id, media_type)
    
    result = {
        "tmdbId": tmdb_id,
        "type": media_type,
        "title": content.get("title") or content.get("name"),
        "original_title": content.get("original_title") or content.get("original_name"),
        "overview": content.get("overview"),
        "poster_path": content.get("poster_path"),
        "backdrop_path": content.get("backdrop_path"),
        "release_date": content.get("release_date") or content.get("first_air_date"),
        "release_date_it": format_italian_date(content.get("release_date") or content.get("first_air_date")),
        "vote_average": content.get("vote_average", 0),
        "vote_count": content.get("vote_count", 0),
        "popularity": content.get("popularity", 0),
        "genres": content.get("genres", []),
        "runtime": content.get("runtime"),
        "status": content.get("status"),
        "tagline": content.get("tagline"),
        "vixsrc_available": is_available
    }
    
    # Add TV-specific fields
    if media_type == "tv":
        result["number_of_seasons"] = content.get("number_of_seasons", 0)
        result["number_of_episodes"] = content.get("number_of_episodes", 0)
        result["networks"] = content.get("networks", [])
        result["created_by"] = content.get("created_by", [])
    
    return result

@app.get("/api/public/contents/by-section/{section_type}/{media_type}")
async def get_contents_by_section(
    section_type: str,
    media_type: str,
    page: int = 1,
    limit: int = 20,
    verify_vixsrc: bool = True
):
    """Get contents by section directly from TMDB, filtered by vixsrc availability"""
    # Map section type to TMDB endpoint
    endpoint_map = {
        "popular": f"/{media_type}/popular",
        "trending": f"/trending/{media_type}/week",
        "top_rated": f"/{media_type}/top_rated",
        "now_playing": "/movie/now_playing",
        "upcoming": "/movie/upcoming",
        "airing_today": "/tv/airing_today",
        "on_the_air": "/tv/on_the_air",
    }
    
    endpoint = endpoint_map.get(section_type, f"/{media_type}/popular")
    data = await fetch_tmdb_data(endpoint, {"page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0, "page": page, "totalPages": 0}
    
    items = []
    for item in data["results"][:limit]:
        tmdb_id = item.get("id")
        item_type = item.get("media_type", media_type)
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, item_type)
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": item_type,
            "title": item.get("title") or item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "release_date_it": format_italian_date(item.get("release_date") or item.get("first_air_date")),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "vixsrc_available": True
        })
    
    return {
        "items": items,
        "total": len(items),
        "page": page,
        "totalPages": 1
    }

@app.get("/api/public/search")
async def search_contents(q: str, page: int = 1, limit: int = 20, verify_vixsrc: bool = True):
    """Search contents on TMDB, filtered by vixsrc availability"""
    if not q or len(q) < 2:
        return {"items": [], "total": 0}
    
    # Search on TMDB
    data = await fetch_tmdb_data("/search/multi", {"query": q, "page": page})
    
    if not data or "results" not in data:
        return {"items": [], "total": 0}
    
    items = []
    for item in data["results"]:
        media_type = item.get("media_type")
        if media_type not in ["movie", "tv"]:
            continue
        
        tmdb_id = item.get("id")
        
        if verify_vixsrc:
            is_available = await check_vixsrc_with_cache(tmdb_id, media_type)
            if not is_available:
                continue
        
        items.append({
            "tmdbId": tmdb_id,
            "type": media_type,
            "title": item.get("title") or item.get("name"),
            "overview": item.get("overview"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "release_date_it": format_italian_date(item.get("release_date") or item.get("first_air_date")),
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "vixsrc_available": True
        })
    
    return {
        "items": items[:limit],
        "total": len(items),
        "page": page,
        "totalPages": data.get("total_pages", 1)
    }

# =====================
# USER LIST ENDPOINTS
# =====================

@app.post("/api/user/list/add")
def add_to_list(item: ListItem):
    """Add item to user's list"""
    existing = user_lists.find_one({
        "user_id": item.user_id,
        "media_id": item.media_id,
        "media_type": item.media_type
    }, {"_id": 0})
    
    if existing:
        return {"success": True, "in_list": True, "message": "Already in list"}
    
    user_lists.insert_one({
        "user_id": item.user_id,
        "media_id": item.media_id,
        "media_type": item.media_type,
        "title": item.title,
        "poster_path": item.poster_path,
        "backdrop_path": item.backdrop_path,
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "in_list": True, "message": "Added to list"}

@app.post("/api/user/list/remove")
def remove_from_list(item: ListItem):
    """Remove item from user's list"""
    result = user_lists.delete_one({
        "user_id": item.user_id,
        "media_id": item.media_id,
        "media_type": item.media_type
    })
    
    return {"success": True, "in_list": False, "deleted": result.deleted_count > 0}

@app.get("/api/user/list/check/{user_id}/{media_type}/{media_id}")
def check_in_list(user_id: str, media_type: str, media_id: int):
    """Check if item is in user's list"""
    existing = user_lists.find_one({
        "user_id": user_id,
        "media_id": media_id,
        "media_type": media_type
    }, {"_id": 0})
    
    return {"in_list": existing is not None}

@app.get("/api/user/list/{user_id}")
def get_user_list(user_id: str):
    """Get all items in user's list"""
    items = list(user_lists.find({"user_id": user_id}, {"_id": 0}))
    return {"items": items, "count": len(items)}

# =====================
# USER RATING ENDPOINTS
# =====================

@app.post("/api/user/rating")
def set_rating(item: RatingItem):
    """Set or update user rating for a media item"""
    if item.rating < 1 or item.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    user_ratings.update_one(
        {
            "user_id": item.user_id,
            "media_id": item.media_id,
            "media_type": item.media_type
        },
        {
            "$set": {
                "rating": item.rating,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "rating": item.rating}

@app.get("/api/user/rating/{user_id}/{media_type}/{media_id}")
def get_rating(user_id: str, media_type: str, media_id: int):
    """Get user rating for a media item"""
    rating = user_ratings.find_one({
        "user_id": user_id,
        "media_id": media_id,
        "media_type": media_type
    }, {"_id": 0})
    
    return {"rating": rating.get("rating") if rating else 0}

# =====================
# USER LIKE ENDPOINTS
# =====================

@app.post("/api/user/like/toggle")
def toggle_like(item: LikeItem):
    """Toggle like status for an item"""
    existing = user_likes.find_one({
        "user_id": item.user_id,
        "media_id": item.media_id,
        "media_type": item.media_type
    }, {"_id": 0})
    
    if existing:
        user_likes.delete_one({
            "user_id": item.user_id,
            "media_id": item.media_id,
            "media_type": item.media_type
        })
        return {"success": True, "liked": False, "message": "Like removed"}
    
    user_likes.insert_one({
        "user_id": item.user_id,
        "media_id": item.media_id,
        "media_type": item.media_type,
        "liked_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "liked": True, "message": "Liked"}

@app.get("/api/user/like/check/{user_id}/{media_type}/{media_id}")
def check_like(user_id: str, media_type: str, media_id: int):
    """Check if item is liked by user"""
    existing = user_likes.find_one({
        "user_id": user_id,
        "media_id": media_id,
        "media_type": media_type
    }, {"_id": 0})
    
    return {"liked": existing is not None}

@app.get("/api/user/likes/{user_id}")
def get_user_likes(user_id: str):
    """Get all liked items for user"""
    items = list(user_likes.find({"user_id": user_id}, {"_id": 0}))
    return {"items": items, "count": len(items)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
