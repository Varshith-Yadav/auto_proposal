import os
from langchain_ollama import ChatOllama

MODEL_NAME = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
client = ChatOllama(model=MODEL_NAME)

REQUIRED_SECTIONS = [
    "Executive Summary",
    "Technical Approach",
    "Past Performance",
    "Compliance Checklist",
]


def generate_proposal(context, user_profile):
    prompt = f"""
    You are a government contractin expert.

    STRICT RULES:
    - Use ONLY provided context
    - Do  NOT hallucinate
    - If missing info, say "Not Provided"
    - Do NOT assume cybersecurity unless the context or user profile explicitly mentions it
    - If the opportunity domain differs from the user profile, highlight the closest overlap

    CONTEXT:
    {context}

    USER PROFILE:
    {user_profile}

    TASK:
    Generate a proposal with exactly these section headings:
    - Executive Summary
    - Technical Approach
    - Past Performance
    - Compliance Checklist

    Tone: Professional, government compliant, formal.

    """

    response = client.invoke(prompt)
    return _ensure_sections(response.content)


def refine_section(context: str, user_profile: dict, section_title: str, section_text: str, instruction: str | None, action: str | None):
    instruction_text = instruction or ""
    action_text = action or "refine"
    prompt = f"""
    You are a government contracting expert.

    STRICT RULES:
    - Use ONLY provided context
    - Do NOT hallucinate
    - If missing info, say "Not Provided"
    - Do NOT assume cybersecurity unless the context or user profile explicitly mentions it

    CONTEXT:
    {context}

    USER PROFILE:
    {user_profile}

    TASK:
    Update ONLY the section titled "{section_title}".
    Action: {action_text}
    Additional instruction (optional): {instruction_text}

    Current section text:
    {section_text}

    Return ONLY the revised text for this section. No headings, no markdown fences.
    """

    response = client.invoke(prompt)
    return response.content.strip()


def _ensure_sections(text: str) -> str:
    normalized = text or ""
    for heading in REQUIRED_SECTIONS:
        if heading.lower() not in normalized.lower():
            normalized = f"{normalized}\n\n{heading}\nNot Provided."
    return normalized.strip()
