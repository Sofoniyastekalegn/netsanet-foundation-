from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json
import re
import asyncio
from sqlalchemy.orm import Session
from database import get_db, engine
from models import Base, Story, LegalAdviceRequest, AppealLetter, SupportOrganization, User
from admin import router as admin_router
from auth_routes import router as auth_router
from auth import get_current_user, get_current_admin_user, verify_token
from init_db import init_db

# Load environment variables
load_dotenv()
init_db()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash-latest')

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Netsanet API", description="AI-Powered Support for Women in Ethiopia")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://netsanet.aiwaveagency.com",
        "https://www.netsanet.aiwaveagency.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)

# Pydantic models
class CaseDescription(BaseModel):
    description: str
    region: Optional[str] = None

class AppealForm(BaseModel):
    name: str
    case_type: str
    incident_date: str
    location: str
    description: str
    evidence: Optional[str] = None
    contact_info: str

class StorySubmission(BaseModel):
    title: str
    content: str
    category: str
    region: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Netsanet API - Supporting Women in Ethiopia"}

@app.post("/api/legal-advice")
async def get_legal_advice(case: CaseDescription, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get AI-powered legal advice based on case description"""
    if not model:
        raise HTTPException(
            status_code=503,
            detail="AI service not available. Please configure GEMINI_API_KEY in the .env file. Get your API key from: https://makersuite.google.com/app/apikey"
        )
    
    try:
        prompt = f"""
        You are a legal advisor specializing in Ethiopian law and women's rights. 
        Based on the Ethiopian Constitution and relevant laws, provide clear, actionable guidance for this case.
        
        Case Description: {case.description}
        Region: {case.region or 'Not specified'}
        
        Provide structured advice in the following format:
        
        CASE CLASSIFICATION:
        [Classify the case type]
        
        YOUR RIGHTS:
        [List relevant rights under Ethiopian Constitution and laws]
        
        RECOMMENDED ACTIONS:
        [Step-by-step actions the person can take]
        
        LEGAL CONSIDERATIONS:
        [Important legal points to consider]
        
        EMERGENCY CONTACTS:
        [Relevant emergency contacts if needed]
        
        Be supportive, clear, and provide practical advice. Focus on Ethiopian legal context. Do not include any introductory text or explanations outside of the structured format above.
        """
        
        response = model.generate_content(prompt)
        advice = response.text
        
        # Store the request in database with user_id
        db_request = LegalAdviceRequest(
            description=case.description,
            region=case.region,
            advice_generated=advice,
            case_type="classified_by_ai",
            user_id=current_user.id
        )
        db.add(db_request)
        db.commit()
        
        return {
            "advice": advice,
            "case_type": "classified_by_ai",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating legal advice: {str(e)}")

@app.post("/api/generate-appeal")
async def generate_appeal(form: AppealForm, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate a formal appeal letter using AI"""
    if not model:
        raise HTTPException(
            status_code=503,
            detail="AI service not available. Please configure GEMINI_API_KEY in the .env file. Get your API key from: https://makersuite.google.com/app/apikey"
        )
    
    try:
        prompt = f"""
        Generate ONLY a formal appeal letter in both Amharic and English for the following case. Do not include any explanations, introductions, or additional text - just the letter content.

        Case Details:
        Name: {form.name}
        Case Type: {form.case_type}
        Incident Date: {form.incident_date}
        Location: {form.location}
        Description: {form.description}
        Evidence: {form.evidence or 'Not provided'}
        Contact Information: {form.contact_info}
        
        Requirements:
        - Write a formal, professional appeal letter
        - Include relevant Ethiopian legal references
        - Clearly state the complaint and requested actions
        - Follow proper legal letter format
        - Provide BOTH English and Amharic versions
        
        Format your response EXACTLY as follows (no other text):
        
        ENGLISH VERSION:
        [Complete English appeal letter with proper formatting]
        
        AMHARIC VERSION:
        [Complete Amharic appeal letter with proper formatting]
        """
        
        response = model.generate_content(prompt)
        appeal_letter = response.text
        
        # Parse the response to separate English and Amharic versions
        english_match = re.search(r'English Version:?\s*([\s\S]*?)(?=Amharic Version:|$)', appeal_letter, re.IGNORECASE)
        amharic_match = re.search(r'Amharic Version:?\s*([\s\S]*?)(?=English Version:|$)', appeal_letter, re.IGNORECASE)
        
        english_letter = english_match.group(1).strip() if english_match else appeal_letter
        amharic_letter = amharic_match.group(1).strip() if amharic_match else ""
        
        # Store the appeal letter in database with user_id
        db_appeal = AppealLetter(
            name=form.name,
            case_type=form.case_type,
            incident_date=form.incident_date,
            location=form.location,
            description=form.description,
            evidence=form.evidence,
            contact_info=form.contact_info,
            english_letter=english_letter,
            amharic_letter=amharic_letter,
            user_id=current_user.id
        )
        db.add(db_appeal)
        db.commit()
        
        return {
            "appeal_letter": appeal_letter,
            "generated_at": "2024-01-01T00:00:00Z",
            "case_details": form.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating appeal letter: {str(e)}")

@app.post("/api/legal-advice-stream")
async def legal_advice_stream(request: Request, db: Session = Depends(get_db)):
    """Stream legal advice using Gemini — no auth required (demo mode).
    If a valid Bearer token is present the advice is also saved to the user's history."""

    # --- optional auth: resolve user if token provided, else None ---
    current_user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token_str = auth_header.split(" ", 1)[1]
        payload = verify_token(token_str)
        if payload:
            uid = payload.get("sub")
            if uid:
                current_user = db.query(User).filter(User.id == int(uid)).first()
                if current_user and not current_user.is_active:
                    current_user = None

    # --- parse body: { description, region, history } ---
    try:
        body = await request.json()
        description: str = body.get("description", "").strip()
        region: str = body.get("region", "") or ""
        history: list = body.get("history", [])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid request body: {str(e)}")

    if not description:
        raise HTTPException(status_code=422, detail="description is required")

    if not model:
        raise HTTPException(status_code=503, detail="AI service not available")

    system_context = (
        "You are a compassionate and knowledgeable legal advisor specializing in Ethiopian law "
        "and women's rights. You provide clear, actionable, and empathetic guidance grounded in "
        "the Ethiopian Constitution, Family Law, Criminal Code, and relevant proclamations. "
        "Always structure your responses clearly. If asked follow-up questions, continue from "
        "the previous context."
    )

    chat_history = []
    if not history:
        chat_history = [
            {"role": "user", "parts": [{"text": system_context}]},
            {"role": "model", "parts": [{"text": "Understood. I am ready to provide legal guidance based on Ethiopian law and women's rights. Please describe your situation."}]},
        ]
    else:
        chat_history = history

    user_message = description
    if region and not history:
        user_message += f"\n\nRegion: {region}"

    async def stream_advice():
        full_text = ""
        try:
            chat = model.start_chat(history=chat_history)
            response = chat.send_message(user_message, stream=True)
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    await asyncio.sleep(0)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save to DB only when a logged-in user made the request
        if current_user:
            try:
                db_request = LegalAdviceRequest(
                    description=description,
                    region=region or None,
                    advice_generated=full_text,
                    case_type="classified_by_ai",
                    user_id=current_user.id,
                )
                db.add(db_request)
                db.commit()
            except Exception:
                pass

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        stream_advice(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/generate-appeal-stream")
async def generate_appeal_stream(request: Request, db: Session = Depends(get_db)):
    """Stream a formal appeal letter using Gemini — no auth required (demo mode).
    If a valid Bearer token is present the letter is also saved to the user's history."""

    # --- optional auth ---
    current_user = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token_str = auth_header.split(" ", 1)[1]
        payload = verify_token(token_str)
        if payload:
            uid = payload.get("sub")
            if uid:
                current_user = db.query(User).filter(User.id == int(uid)).first()
                if current_user and not current_user.is_active:
                    current_user = None

    # --- parse body ---
    try:
        body = await request.json()
        follow_up: str = body.get("followUp", "").strip()
        history: list = body.get("history", [])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid request body: {str(e)}")

    if not model:
        raise HTTPException(status_code=503, detail="AI service not available")

    if follow_up and history:
        chat_history = history
        user_message = follow_up
        is_first_generation = False
    else:
        try:
            form = AppealForm(**body)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid form data: {str(e)}")
        chat_history = []
        is_first_generation = True
        user_message = (
            f"Please generate a formal appeal letter in BOTH English and Amharic for this case:\n\n"
            f"Full Name: {form.name}\n"
            f"Case Type: {form.case_type.replace('_', ' ').title()}\n"
            f"Incident Date: {form.incident_date}\n"
            f"Location: {form.location}\n"
            f"Description: {form.description}\n"
            f"Evidence Available: {form.evidence or 'Not specified'}\n"
            f"Contact Information: {form.contact_info}\n\n"
            f"Format EXACTLY as:\n\nENGLISH VERSION:\n[full English appeal letter]\n\nAMHARIC VERSION:\n[full Amharic translation]\n\n"
            f"Keep both professional, empathetic, and grounded in Ethiopian law."
        )

    async def stream_and_save():
        full_text = ""
        try:
            system_turn = [
                {"role": "user", "parts": [{"text": "You are a legal assistant for Netsanet, an AI platform supporting women's rights in Ethiopia. Help users generate formal appeal letters and answer follow-up questions about their letters."}]},
                {"role": "model", "parts": [{"text": "Understood. I will help generate formal, professional appeal letters grounded in Ethiopian law, and assist with any follow-up requests."}]},
            ]
            full_history = (system_turn + chat_history) if not chat_history else chat_history
            chat = model.start_chat(history=full_history)
            response = chat.send_message(user_message, stream=True)
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    await asyncio.sleep(0)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save to DB only on first generation and only when logged in
        if is_first_generation and current_user:
            try:
                english_match = re.search(r'ENGLISH VERSION:\s*([\s\S]*?)(?=AMHARIC VERSION:|$)', full_text, re.IGNORECASE)
                amharic_match = re.search(r'AMHARIC VERSION:\s*([\s\S]*?)$', full_text, re.IGNORECASE)
                english_letter = english_match.group(1).strip() if english_match else full_text
                amharic_letter = amharic_match.group(1).strip() if amharic_match else ""
                form_data = AppealForm(**body)
                db_appeal = AppealLetter(
                    name=form_data.name,
                    case_type=form_data.case_type,
                    incident_date=form_data.incident_date,
                    location=form_data.location,
                    description=form_data.description,
                    evidence=form_data.evidence,
                    contact_info=form_data.contact_info,
                    english_letter=english_letter,
                    amharic_letter=amharic_letter,
                    user_id=current_user.id,
                )
                db.add(db_appeal)
                db.commit()
            except Exception:
                pass

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        stream_and_save(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/support-organizations")
async def get_support_organizations(region: Optional[str] = None, db: Session = Depends(get_db)):
    """Get list of support organizations, optionally filtered by region"""
    query = db.query(SupportOrganization).filter(SupportOrganization.is_active == True)
    
    if region:
        query = query.filter(SupportOrganization.region.ilike(f"%{region}%"))
    
    organizations = query.all()
    
    result = []
    for org in organizations:
        result.append({
            "name": org.name,
            "region": org.region,
            "services": json.loads(org.services),
            "contact": org.contact,
            "address": org.address,
            "website": org.website
        })
    
    return {"organizations": result}

@app.get("/api/case-stories")
async def get_case_stories(category: Optional[str] = None, region: Optional[str] = None, db: Session = Depends(get_db)):
    """Get case stories, optionally filtered by category or region"""
    # Normal users only see approved stories, admins see all
    query = db.query(Story).filter(Story.is_approved == True)
    
    if category:
        query = query.filter(Story.category == category)
    
    if region:
        query = query.filter(Story.region.ilike(f"%{region}%"))
    
    stories = query.all()
    
    result = []
    for story in stories:
        result.append({
            "id": story.id,
            "title": story.title,
            "content": story.content,
            "category": story.category,
            "region": story.region,
            "outcome": "positive",  # Default outcome
            "is_approved": story.is_approved
        })
    
    return {"stories": result}

@app.post("/api/submit-story")
async def submit_story(story: StorySubmission, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Submit an anonymous story"""
    try:
        db_story = Story(
            title=story.title,
            content=story.content,
            category=story.category,
            region=story.region,
            is_approved=False,  # Requires moderation
            user_id=current_user.id
        )
        db.add(db_story)
        db.commit()
        
        return {
            "message": "Story submitted successfully and is pending approval",
            "story_id": db_story.id,
            "submitted_at": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting story: {str(e)}")

# User-specific endpoints
@app.get("/api/my/stories")
async def get_my_stories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's stories"""
    stories = db.query(Story).filter(Story.user_id == current_user.id).all()
    
    result = []
    for story in stories:
        result.append({
            "id": story.id,
            "title": story.title,
            "content": story.content,
            "category": story.category,
            "region": story.region,
            "is_approved": story.is_approved,
            "created_at": story.created_at.isoformat() if story.created_at else None
        })
    
    return {"stories": result}

@app.get("/api/my/legal-advice")
async def get_my_legal_advice(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's legal advice history"""
    requests = db.query(LegalAdviceRequest).filter(LegalAdviceRequest.user_id == current_user.id).order_by(LegalAdviceRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        result.append({
            "id": req.id,
            "description": req.description,
            "region": req.region,
            "advice_generated": req.advice_generated,
            "case_type": req.case_type,
            "created_at": req.created_at.isoformat() if req.created_at else None
        })
    
    return {"legal_advice": result}

@app.get("/api/my/appeal-letters")
async def get_my_appeal_letters(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's appeal letters"""
    appeals = db.query(AppealLetter).filter(AppealLetter.user_id == current_user.id).order_by(AppealLetter.created_at.desc()).all()
    
    result = []
    for appeal in appeals:
        result.append({
            "id": appeal.id,
            "name": appeal.name,
            "case_type": appeal.case_type,
            "location": appeal.location,
            "english_letter": appeal.english_letter,
            "amharic_letter": appeal.amharic_letter,
            "created_at": appeal.created_at.isoformat() if appeal.created_at else None
        })
    
    return {"appeal_letters": result}

@app.post("/api/approve-story/{story_id}")
async def approve_story(story_id: int, current_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Approve a story (admin only)"""
    story = db.query(Story).filter(Story.id == story_id).first()
    
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    story.is_approved = True
    db.commit()
    
    return {
        "message": "Story approved successfully",
        "story_id": story.id
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Netsanet API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 