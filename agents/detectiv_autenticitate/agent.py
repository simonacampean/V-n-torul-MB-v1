"""Orchestrarea agentului „Detectivul de Autenticitate".

Bucla e simplă și explicită (nu un framework gen LangChain), ca structura să
rămână ușor de citit/adaptat: trimite mesaj → dacă modelul cere unelte, le
execută și trimite rezultatele înapoi → repetă până modelul apelează
`submit_report`, moment în care bucla se oprește și raportul e validat cu
Pydantic înainte de a fi întors apelantului.
"""

import os
from typing import Optional, Union
from anthropic import Anthropic

from .system_prompt import SYSTEM_PROMPT
from .schemas import RaportAutenticitate, SUBMIT_REPORT_TOOL
from .tools import (
    regex_vin_matcher,
    REGEX_VIN_MATCHER_TOOL,
    translation_tool,
    TRANSLATION_TOOL_SCHEMA,
)

MODEL = "claude-sonnet-4-5"
MAX_TOOL_ROUNDS = 8  # plasă de siguranță — oprește bucla dacă modelul nu apelează submit_report


class DetectivAutenticitate:
    """Agent AI autonom care analizează descrieri de anunțuri auto pentru
    semnale de fraudă/ascundere a defectelor. Vezi system_prompt.py pentru
    rolul, scopul și logica de analiză exacte.
    """

    def __init__(self, api_key: Optional[str] = None):
        self._client = Anthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self._tools = [TRANSLATION_TOOL_SCHEMA, REGEX_VIN_MATCHER_TOOL, SUBMIT_REPORT_TOOL]

    def _execute_tool(self, name: str, tool_input: dict) -> Union[dict, str]:
        if name == "regex_vin_matcher":
            return regex_vin_matcher(tool_input["text"])
        if name == "translation_tool":
            return translation_tool(
                self._client, tool_input["text"], tool_input.get("target_language", "română")
            )
        raise ValueError(f"Unealtă necunoscută: {name}")

    def analizeaza(self, descriere_anunt: str) -> RaportAutenticitate:
        """Rulează analiza completă pe textul unui anunț și întoarce raportul
        validat. Aruncă `ValueError` dacă modelul nu produce un raport valid
        în `MAX_TOOL_ROUNDS` runde (nu ar trebui să se întâmple în practică —
        promptul de sistem cere explicit apelul `submit_report`).
        """
        messages = [{"role": "user", "content": descriere_anunt}]

        for _ in range(MAX_TOOL_ROUNDS):
            response = self._client.messages.create(
                model=MODEL,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=self._tools,
                messages=messages,
            )
            messages.append({"role": "assistant", "content": response.content})

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                # modelul a răspuns cu text liber în loc să apeleze submit_report —
                # nu ar trebui să se întâmple, dar nu presupunem un format anume.
                continue

            submit_call = next((b for b in tool_uses if b.name == "submit_report"), None)
            if submit_call is not None:
                return RaportAutenticitate.model_validate(submit_call.input)

            tool_results = []
            for call in tool_uses:
                result = self._execute_tool(call.name, call.input)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": result if isinstance(result, str) else str(result),
                    }
                )
            messages.append({"role": "user", "content": tool_results})

        raise ValueError(
            f"Agentul nu a apelat submit_report în {MAX_TOOL_ROUNDS} runde — verifică system_prompt.py."
        )
