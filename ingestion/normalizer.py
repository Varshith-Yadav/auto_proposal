def normalize(raw):
    naics_primary = raw.get("naicsCode")
    naics_codes = raw.get("naicsCodes") or ([naics_primary] if naics_primary else [])
    documents = _extract_documents(raw)

    description = raw.get("description")
    if isinstance(description, str) and description.startswith("http"):
        documents.append(
            {
                "title": "Notice Description",
                "url": description,
                "type": "notice_description",
            }
        )

    return {
        "id": raw.get("noticeId"),
        "title": raw.get("title"),
        "description": description,
        "solicitation_number": raw.get("solicitationNumber"),
        "notice_type": raw.get("type"),
        "base_type": raw.get("baseType"),
        "archive_type": raw.get("archiveType"),
        "archive_date": raw.get("archiveDate"),
        "set_aside": raw.get("typeOfSetAside"),
        "set_aside_description": raw.get("typeOfSetAsideDescription"),
        "naics_primary": naics_primary,
        "naics_codes": naics_codes,
        "classification_code": raw.get("classificationCode"),
        "response_deadline": raw.get("responseDeadLine") or raw.get("responseDeadline"),
        "posted_date": raw.get("postedDate"),
        "agency": {
            "name": raw.get("fullParentPathName"),
            "code": raw.get("fullParentPathCode"),
        },
        "award": _normalize_award(raw.get("award")),
        "points_of_contact": raw.get("pointOfContact") or [],
        "documents": documents,
        "active": raw.get("active"),
        "status": "active",
        "source": "sam.gov",
    }


def _extract_documents(raw: dict):
    docs = []
    for key in ("resourceLinks", "attachments", "fileLinks", "documents"):
        items = raw.get(key)
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            url = item.get("url") or item.get("link") or item.get("href") or item.get("uri")
            if not url:
                continue
            docs.append(
                {
                    "title": item.get("title") or item.get("name"),
                    "url": url,
                    "type": item.get("type") or item.get("fileType"),
                    "description": item.get("description"),
                }
            )
    return docs


def _normalize_award(award: dict | None):
    if not isinstance(award, dict):
        return None
    awardee = award.get("awardee") or {}
    return {
        "date": award.get("date"),
        "number": award.get("number"),
        "amount": award.get("amount"),
        "awardee": {
            "name": awardee.get("name"),
            "uei": awardee.get("ueiSAM") or awardee.get("uei"),
            "cage_code": awardee.get("cageCode"),
        },
    }


