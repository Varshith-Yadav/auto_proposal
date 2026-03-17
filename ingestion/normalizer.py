from datetime import datetime

def normalize(raw):

    return {
        "id": raw.get("noticeId"),
        "title": raw.get("title"),
        "description": raw.get("description"),
        "naics_codes": [raw.get("naicsCode")],
        "response_deadline": raw.get("responseDeadline"),
        "posted_date": raw.get("postedDate"),
        "agency": {
            "name": raw.get("fullParentPathName")
        },
        "documents": [],
        "status": "active"
    }


