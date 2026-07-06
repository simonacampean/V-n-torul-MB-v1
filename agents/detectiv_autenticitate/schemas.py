"""Schema de output a agentului — atât Pydantic (validare/tipare în Python),
cât și JSON Schema (definiția uneltei `submit_report` trimisă către Claude).
Cele două trebuie ținute în sincron manual dacă se modifică unul dintre ele.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class PunctCritic(BaseModel):
    """Un singur semnal de alarmă/contradicție detectată în text."""

    categorie: Literal[
        "vopsea_restaurare",
        "matching_numbers",
        "kilometraj",
        "rugina_coroziune",
        "documentatie",
        "pret",
        "limbaj_evitant",
        "altul",
    ] = Field(description="Tipul contradicției detectate.")
    descriere: str = Field(description="Explicația exactă a contradicției — citează fragmentul relevant din text.")
    severitate: Literal["scazuta", "medie", "ridicata"] = Field(description="Cât de gravă e suspiciunea izolat.")


class RaportAutenticitate(BaseModel):
    """Output-ul final al agentului „Detectivul de Autenticitate"."""

    scor_risc: int = Field(ge=1, le=10, description="1 = anunț de încredere, 10 = risc foarte ridicat.")
    puncte_critice_detectate: List[PunctCritic] = Field(default_factory=list)
    intrebari_de_pus_vanzatorului: List[str] = Field(
        default_factory=list,
        description="Întrebări directe, punctuale, derivate din punctele critice găsite.",
    )
    limba_originala_detectata: Optional[str] = Field(
        default=None, description="Limba în care era scrisă descrierea originală (ex: 'de', 'it', 'fr', 'ro', 'en')."
    )
    coduri_extrase: dict = Field(
        default_factory=dict,
        description="Codurile de șasiu/motor găsite de regex_vin_matcher, păstrate pentru audit.",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "scor_risc": 7,
                "puncte_critice_detectate": [
                    {
                        "categorie": "vopsea_restaurare",
                        "descriere": (
                            "Anunțul afirmă 'vopsea originală de fabrică' dar menționează separat "
                            "'refăcută complet caroseria acum 2 ani' — vopseaua originală nu ar "
                            "supraviețui unei refaceri complete de caroserie."
                        ),
                        "severitate": "ridicata",
                    }
                ],
                "intrebari_de_pus_vanzatorului": [
                    "Puteți confirma dacă vopseaua e cea din fabrică sau a fost aplicată la refacerea caroseriei menționată?"
                ],
                "limba_originala_detectata": "de",
                "coduri_extrase": {"vin_iso": [], "mercedes_chassis_code": ["124.023-12-345678"], "labeled_engine_number": []},
            }
        }


# JSON Schema pentru unealta `submit_report` (input schema, format Anthropic tool-use).
# Generat manual (nu din Pydantic direct), ca să controlăm exact ce vede modelul —
# Pydantic's .model_json_schema() include metadate ($defs, title) inutile pentru un tool call.
SUBMIT_REPORT_TOOL = {
    "name": "submit_report",
    "description": (
        "Trimite raportul final de autenticitate. Apelează această unealtă O SINGURĂ DATĂ, "
        "la finalul analizei — nu răspunde cu text liber în locul ei."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "scor_risc": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10,
                "description": "1 = anunț de încredere, 10 = risc foarte ridicat de fraudă/ascundere defecte.",
            },
            "puncte_critice_detectate": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "categorie": {
                            "type": "string",
                            "enum": [
                                "vopsea_restaurare",
                                "matching_numbers",
                                "kilometraj",
                                "rugina_coroziune",
                                "documentatie",
                                "pret",
                                "limbaj_evitant",
                                "altul",
                            ],
                        },
                        "descriere": {"type": "string"},
                        "severitate": {"type": "string", "enum": ["scazuta", "medie", "ridicata"]},
                    },
                    "required": ["categorie", "descriere", "severitate"],
                },
            },
            "intrebari_de_pus_vanzatorului": {"type": "array", "items": {"type": "string"}},
            "limba_originala_detectata": {"type": ["string", "null"]},
            "coduri_extrase": {"type": "object"},
        },
        "required": ["scor_risc", "puncte_critice_detectate", "intrebari_de_pus_vanzatorului"],
    },
}
