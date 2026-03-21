def chunk_document(text: str, source_id: str | None = None, source_title: str | None = None, source_url: str | None = None):
    sections = []

    keywords = [
        "scope of work",
        "requirements",
        "eligibility",
        "evaluation",
        "submission"
    ]

    current_chunk = ""
    for line in text.split("\n"):
        if any(k in line.lower() for k in keywords):
            if current_chunk:
                sections.append(
                    {
                        "text": current_chunk.strip(),
                        "source_id": source_id,
                        "source_title": source_title,
                        "source_url": source_url,
                    }
                )
            current_chunk = line
        
        else:
            current_chunk += " " + line
        
    if current_chunk:
        sections.append(
            {
                "text": current_chunk.strip(),
                "source_id": source_id,
                "source_title": source_title,
                "source_url": source_url,
            }
        )
    
    return sections

