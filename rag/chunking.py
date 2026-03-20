def chunk_document(text: str):
    sections = []

    keywords = [
        "scope of work",
        "requirements",
        "eligibility",
        "evaluation",
        "sunmission"
    ]

    current_chunk = ""
    for line in text.split("\n"):
        if any(k in line.lower() for k in keywords):
            if current_chunk:
                sections.append(current_chunk)
            current_chunk = line
        
        else:
            current_chunk += " " + line
        
    if current_chunk:
        sections.append(current_chunk)
    
    return sections

