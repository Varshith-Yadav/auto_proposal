import os
import re
from functools import lru_cache
from openai import OpenAI

MODEL_NAME = os.getenv("NVIDIA_MODEL", "deepseek-ai/deepseek-v3.1")
BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
TEMPERATURE = float(os.getenv("NVIDIA_TEMPERATURE", "0.2"))
TOP_P = float(os.getenv("NVIDIA_TOP_P", "0.7"))
MAX_TOKENS = int(os.getenv("NVIDIA_MAX_TOKENS", "4096"))
THINKING = os.getenv("NVIDIA_THINKING", "false").lower() in {"1", "true", "yes"}

REQUIRED_SECTIONS = [
    "Executive Summary",
    "Technical Approach",
    "Past Performance",
    "Compliance Checklist",
]


@lru_cache
def _client() -> OpenAI:
    api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("NVIDIA_API_KEY is not set. Add it to your .env file before running the backend.")
    return OpenAI(base_url=BASE_URL, api_key=api_key)


def _extra_body():
    if THINKING:
        return {"chat_template_kwargs": {"thinking": True}}
    return None


def generate_proposal(context, user_profile):
    prompt = f"""
    You are a government contractin expert.

    STRICT RULES:
    - Use ONLY provided context
    - Do  NOT hallucinate
    - If missing info, say "Information Not Provided"
    - If some information is missing: generate as much as possible from available context
      and explicitly mark missing parts as "Information Not Provided"
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

    Writing guidance:
    - Write 3-6 sentences per section using available context.
    - Use the user profile to populate Technical Approach and Past Performance when RFP details are limited.
    - If a detail is missing, include "Information Not Provided" for that specific point (do not leave the section empty).

    Tone: Professional, government compliant, formal.

    """

    response = _client().chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=TEMPERATURE,
        top_p=TOP_P,
        max_tokens=MAX_TOKENS,
        extra_body=_extra_body(),
        stream=False,
    )
    content = response.choices[0].message.content if response.choices else ""
    normalized = _normalize_sections(content or "")
    if _all_sections_missing(normalized):
        return _fallback_from_context(context, user_profile)
    return normalized


def refine_section(context: str, user_profile: dict, section_title: str, section_text: str, instruction: str | None, action: str | None):
    instruction_text = instruction or ""
    action_text = action or "refine"
    prompt = f"""
    You are a government contracting expert.

    STRICT RULES:
    - Use ONLY provided context
    - Do NOT hallucinate
    - If missing info, say "Information Not Provided"
    - If some information is missing: generate as much as possible from available context
      and explicitly mark missing parts as "Information Not Provided"
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

    response = _client().chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=TEMPERATURE,
        top_p=TOP_P,
        max_tokens=MAX_TOKENS,
        extra_body=_extra_body(),
        stream=False,
    )
    content = response.choices[0].message.content if response.choices else ""
    return content.strip()


def _normalize_sections(text: str) -> str:
    """
    Ensure exactly one instance of each required heading, and fill empty sections.
    Handles headings with markdown bold or inline content like "Executive Summary: ...".
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return "\n\n".join([f"{h}\nInformation Not Provided." for h in REQUIRED_SECTIONS]).strip()

    heading_pattern = r"^(?:#+\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?(?P<title>{})(?:\\*\\*)?\\s*(?:[:\\-–—])?\\s*(?P<inline>.*)$"
    headings_regex = re.compile(
        heading_pattern.format("|".join(map(re.escape, REQUIRED_SECTIONS))),
        re.IGNORECASE,
    )

    content_by_heading = {h: [] for h in REQUIRED_SECTIONS}
    current_heading = None

    for raw_line in cleaned.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        match = headings_regex.match(line)
        if match:
            heading = match.group("title") or ""
            canon = next((h for h in REQUIRED_SECTIONS if h.lower() == heading.lower()), heading)
            current_heading = canon
            inline = (match.group("inline") or "").strip()
            if inline:
                content_by_heading[canon].append(inline)
            continue
        if current_heading:
            content_by_heading[current_heading].append(line)

    output_sections = []
    for heading in REQUIRED_SECTIONS:
        content = "\n".join(content_by_heading[heading]).strip()
        if not content:
            content = "Information Not Provided."
        output_sections.append(f"{heading}\n{content}")

    return "\n\n".join(output_sections).strip()


def _all_sections_missing(text: str) -> bool:
    if not text:
        return True
    missing_lines = {
        "information not provided.",
        "information not provided",
        "not provided.",
        "not provided",
    }
    sections = _normalize_sections(text).split("\n\n")
    if not sections:
        return True
    for section in sections:
        parts = section.split("\n", 1)
        if len(parts) < 2:
            return False
        body = parts[1].strip().lower()
        if body not in missing_lines:
            return False
    return True


def _fallback_from_context(context: str, user_profile: dict) -> str:
    """
    Build a minimal, compliant proposal from metadata and user profile.
    This avoids fully empty sections when RFP text is unavailable.
    """
    def _get(label: str) -> str | None:
        pattern = re.compile(rf"^{re.escape(label)}\\s*:\\s*(.*)$", re.IGNORECASE | re.MULTILINE)
        match = pattern.search(context or "")
        if not match:
            return None
        value = match.group(1).strip()
        return value or None

    title = _get("OPPORTUNITY TITLE") or "Opportunity"
    agency = _get("AGENCY") or "Information Not Provided"
    deadline = _get("DEADLINE") or "Information Not Provided"
    naics = _get("NAICS CODES") or "Information Not Provided"
    summary = _get("SUMMARY") or ""

    exec_lines = [
        f"This proposal responds to {title}.",
        f"Agency: {agency}.",
    ]
    if summary:
        exec_lines.append(f"Summary: {summary}.")
    exec_lines.append(f"Response deadline: {deadline}.")

    capabilities = (user_profile or {}).get("capabilities") or []
    tech_lines = [
        "Approach overview: Plan, execute, validate, and close out work aligned to the solicitation requirements.",
        f"Relevant NAICS codes: {naics}.",
        f"Core capabilities: {', '.join(capabilities) if capabilities else 'Information Not Provided.'}",
        "Schedule and milestones: Information Not Provided.",
        "Key deliverables: Information Not Provided.",
    ]

    past_lines = []
    experiences = (user_profile or {}).get("past_experience") or []
    if experiences:
        past_lines.extend([f"- {item}" for item in experiences])
    else:
        past_lines.append("Information Not Provided.")

    comp_lines = [
        "FAR/DFARS clauses and agency supplements: Information Not Provided.",
        "Security, safety, and quality requirements: Information Not Provided.",
        "Reporting cadence and deliverable formats: Information Not Provided.",
    ]

    return (
        f"Executive Summary\n" + "\n".join(exec_lines) + "\n\n" +
        f"Technical Approach\n" + "\n".join(tech_lines) + "\n\n" +
        f"Past Performance\n" + "\n".join(past_lines) + "\n\n" +
        f"Compliance Checklist\n" + "\n".join(comp_lines)
    ).strip()
