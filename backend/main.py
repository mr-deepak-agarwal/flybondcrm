from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime
import uuid

load_dotenv()

app = FastAPI(title="CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ─── Schemas ──────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Optional[float] = None

class ProductCreate(ProductBase): pass
class ProductUpdate(ProductBase): pass

class ContactBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class ContactCreate(ContactBase): pass
class ContactUpdate(ContactBase): pass

class ProjectBase(BaseModel):
    client_name: str
    address: Optional[str] = None
    work_description: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    status: Optional[str] = "active"

class ProjectCreate(ProjectBase): pass
class ProjectUpdate(ProjectBase): pass


# ─── Products ─────────────────────────────────────────────

@app.get("/products", tags=["Products"])
def list_products(supabase: Client = Depends(get_supabase)):
    res = supabase.table("products").select("*").order("name").execute()
    return res.data

@app.get("/products/{id}", tags=["Products"])
def get_product(id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("products").select("*").eq("id", id).single().execute()
    if not res.data:
        raise HTTPException(404, "Product not found")
    return res.data

@app.post("/products", status_code=201, tags=["Products"])
def create_product(body: ProductCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("products").insert({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).execute()
    return res.data[0]

@app.put("/products/{id}", tags=["Products"])
def update_product(id: str, body: ProductUpdate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("products").update({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(404, "Product not found")
    return res.data[0]

@app.delete("/products/{id}", status_code=204, tags=["Products"])
def delete_product(id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("products").delete().eq("id", id).execute()


# ─── Contacts ─────────────────────────────────────────────

@app.get("/contacts", tags=["Contacts"])
def list_contacts(supabase: Client = Depends(get_supabase)):
    res = supabase.table("contacts").select("*").order("created_at", desc=True).execute()
    return res.data

@app.get("/contacts/{id}", tags=["Contacts"])
def get_contact(id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("contacts").select("*").eq("id", id).single().execute()
    if not res.data:
        raise HTTPException(404, "Contact not found")
    return res.data

@app.post("/contacts", status_code=201, tags=["Contacts"])
def create_contact(body: ContactCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("contacts").insert({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).execute()
    return res.data[0]

@app.put("/contacts/{id}", tags=["Contacts"])
def update_contact(id: str, body: ContactUpdate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("contacts").update({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(404, "Contact not found")
    return res.data[0]

@app.delete("/contacts/{id}", status_code=204, tags=["Contacts"])
def delete_contact(id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("contacts").delete().eq("id", id).execute()


# ─── Projects ─────────────────────────────────────────────

@app.get("/projects", tags=["Projects"])
def list_projects(supabase: Client = Depends(get_supabase)):
    res = supabase.table("projects").select("*").order("created_at", desc=True).execute()
    return res.data

@app.get("/projects/{id}", tags=["Projects"])
def get_project(id: str, supabase: Client = Depends(get_supabase)):
    res = supabase.table("projects").select("*").eq("id", id).single().execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    return res.data

@app.post("/projects", status_code=201, tags=["Projects"])
def create_project(body: ProjectCreate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("projects").insert({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).execute()
    return res.data[0]

@app.put("/projects/{id}", tags=["Projects"])
def update_project(id: str, body: ProjectUpdate, supabase: Client = Depends(get_supabase)):
    res = supabase.table("projects").update({**body.model_dump(), "updated_at": datetime.utcnow().isoformat()}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(404, "Project not found")
    return res.data[0]

@app.delete("/projects/{id}", status_code=204, tags=["Projects"])
def delete_project(id: str, supabase: Client = Depends(get_supabase)):
    supabase.table("projects").delete().eq("id", id).execute()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "CRM API is running"}
