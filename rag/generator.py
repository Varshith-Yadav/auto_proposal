from langchanin_ollama import chatOllama

client = chatOllama(model="")


def generate_proposal(context, user_profile):
    prompt = f"""
    You are a government contractin expert.

    STRICT RULES:
    - Use ONLY provided context
    - Do  NOT hallucinate
    - If missing info, say "Not Provided"

    CONTEXT:
    {context}

    USER PROFILE:
    {user_profile}

    TASK:
    Generate a proposal with:

    1. Execute Summary
    2. Techinical Approch
    3. Past Performance Mapping 
    4. Compliance Checklist

    Tone: Professinoal, compiant, formal

    """

    response = client.chat.completions.create(
        model = "",
        message=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content
