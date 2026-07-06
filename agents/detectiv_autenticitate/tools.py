"""Implementarea celor două unelte cerute explicit + definițiile lor JSON Schema
(formatul așteptat de Anthropic tool-use). `regex_vin_matcher` e pur Python, fără
apel de rețea — testabil izolat. `translation_tool` apelează Claude printr-un
prompt dedicat, minimal, doar pentru traducere (nu reutilizează contextul
conversației principale, ca traducerea să rămână literală, necontaminată de
instrucțiunile de analiză).
"""

import re
from anthropic import Anthropic

# ============================================================
# regex_vin_matcher — extragere coduri șasiu/motor, fără apel API.
# ============================================================

# VIN standard ISO 3779 (17 caractere, fără I/O/Q ca să evite confuzia cu 1/0).
_VIN_ISO_RE = re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b")

# Cod de șasiu „de fabrică" Mercedes-Benz clasic, ex: „124.023-12-345678"
# (cod caroserie.cod motor-cod verificare-serie) — format aproximativ, extins ușor.
_MB_CHASSIS_RE = re.compile(r"\b\d{3}\.\d{3}-\d{2}-\d{5,8}\b")

# Numere etichetate explicit în text („Fahrgestellnummer: ABC123", „chassis no. ABC123" etc.)
_LABELED_CHASSIS_RE = re.compile(
    r"(?:fahrgestellnummer|numero\s+di\s+telaio|num[ée]ro\s+de\s+ch[âa]ssis|"
    r"chassis\s*(?:number|no\.?)?|serie\s+ș?asiu)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\.\-]{4,19})",
    re.IGNORECASE,
)
_LABELED_ENGINE_RE = re.compile(
    r"(?:motornummer|numero\s+di\s+motore|num[ée]ro\s+de\s+moteur|"
    r"engine\s*(?:number|no\.?)?|serie\s+motor)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\.\-]{4,19})",
    re.IGNORECASE,
)


def regex_vin_matcher(text: str) -> dict:
    """Extrage toate codurile de șasiu/motor candidate dintr-un text de anunț.

    Nu deduce nimic despre validitatea codurilor — doar le extrage, ca agentul
    să le poată folosi ca bază factuală în raționamentul de „matching numbers".
    """
    return {
        "vin_iso": _VIN_ISO_RE.findall(text),
        "mercedes_chassis_code": _MB_CHASSIS_RE.findall(text),
        "labeled_chassis_number": [m.strip(" .-") for m in _LABELED_CHASSIS_RE.findall(text)],
        "labeled_engine_number": [m.strip(" .-") for m in _LABELED_ENGINE_RE.findall(text)],
    }


REGEX_VIN_MATCHER_TOOL = {
    "name": "regex_vin_matcher",
    "description": (
        "Extrage din textul original (nu din traducere) orice cod de șasiu (VIN/Fahrgestellnummer) "
        "sau cod de motor (Motornummer) menționat explicit. Rulează o singură dată, la începutul analizei."
    ),
    "input_schema": {
        "type": "object",
        "properties": {"text": {"type": "string", "description": "Textul original al anunțului."}},
        "required": ["text"],
    },
}


# ============================================================
# translation_tool — traducere literală printr-un apel Claude dedicat.
# ============================================================

_TRANSLATION_SYSTEM_PROMPT = (
    "Ești un traducător tehnic specializat în anunțuri auto. Traduci EXACT, fără să "
    "adaugi, omiți sau interpretezi nimic — inclusiv termenii tehnici ambigui, tradu-i "
    "literal și, dacă e cazul, pune originalul între paranteze. Nu comenta, nu adăuga "
    "context, nu semnala suspiciuni — doar tradu. Răspunde DOAR cu textul tradus."
)


def translation_tool(client: Anthropic, text: str, target_language: str = "română") -> str:
    """Traduce `text` către `target_language` printr-un apel Claude separat,
    izolat de conversația principală a agentului (fără să moștenească
    instrucțiunile de analiză, ca traducerea să rămână strict literală).
    """
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=_TRANSLATION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Tradu în {target_language}:\n\n{text}"}],
    )
    return "".join(block.text for block in response.content if block.type == "text")


TRANSLATION_TOOL_SCHEMA = {
    "name": "translation_tool",
    "description": (
        "Traduce un text din germană, italiană sau franceză în română. Folosește-o ÎNTÂI, "
        "înainte de analiză, dacă textul original nu e în română sau engleză."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Textul de tradus."},
            "target_language": {
                "type": "string",
                "description": "Limba țintă (implicit 'română').",
                "default": "română",
            },
        },
        "required": ["text"],
    },
}
