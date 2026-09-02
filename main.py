from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt

app = FastAPI(
    title="My Analytics Software",
    description="Subscription-based data analytics platform",
    version="1.0.0"
)

# -----------------------------
# SECURITY SETTINGS
# -----------------------------

SECRET_KEY = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"
ALGORITHM = "HS256"

password_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# Temporary database
# We'll replace this with PostgreSQL later.
users = {}


# -----------------------------
# DATA MODELS
# -----------------------------

class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# -----------------------------
# HOME
# -----------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to My Analytics Software",
        "status": "online"
    }


# -----------------------------
# REGISTER
# -----------------------------

@app.post("/register")
def register(user: UserRegister):

    # Check whether email already exists
    if user.email in users:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = password_context.hash(user.password)

    # Save user
    users[user.email] = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "plan": "free"
    }

    return {
        "message": "Account created successfully",
        "username": user.username,
        "plan": "free"
    }


# -----------------------------
# LOGIN
# -----------------------------

@app.post("/login")
def login(user: UserLogin):

    # Find user
    existing_user = users.get(user.email)

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check password
    password_correct = password_context.verify(
        user.password,
        existing_user["password"]
    )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create token
    token = jwt.encode(
        {
            "email": user.email,
            "plan": existing_user["plan"]
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer"
    }


# -----------------------------
# USER ACCOUNT
# -----------------------------

@app.get("/account/{email}")
def account(email: str):

    user = users.get(email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "username": user["username"],
        "email": user["email"],
        "plan": user["plan"]
    }
