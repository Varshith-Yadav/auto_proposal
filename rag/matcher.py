def match_requirements(requirements, user_profile):

    matches = []

    for req in requirements:
        for exp in user_profile["past_rxperience"]:
            if req.lower() in exp.lower():
                matches.append({
                    "requirement": req,
                    "matched_experience": exp
                })
    
    return matches

