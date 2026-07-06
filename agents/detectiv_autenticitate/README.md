# Detectivul de Autenticitate

Agent AI autonom (Python, Anthropic SDK) care analizează descrieri textuale de anunțuri
auto clasice și identifică semnale de alarmă, neconcordanțe istorice sau limbaj evitant
folosit de vânzători pentru a ascunde defecte.

Prototip **standalone** — nu e integrat (încă) în aplicația Next.js din acest repo. Poate fi
conectat ulterior la fluxul de import de oferte (`lib/offers.ts`) sau la câmpul `note` al unui
anunț, ca pas suplimentar de verificare înainte de moderare (AD-02).

## Componente

| Fișier | Rol |
|---|---|
| `system_prompt.py` | Persona, scopul și logica de analiză (contradicțiile explicite de căutat) |
| `schemas.py` | Modelul Pydantic al raportului + JSON Schema al uneltei `submit_report` |
| `tools.py` | `regex_vin_matcher` (pur Python) + `translation_tool` (apel Claude dedicat) |
| `agent.py` | Bucla de orchestrare: mesaj → unelte → `submit_report` → raport validat |
| `main.py` | Exemplu de rulare din linia de comandă |
| `tests/` | Teste unitare pentru partea fără apel API (regex + validare schemă) |

## Instalare și rulare

```bash
cd agents/detectiv_autenticitate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python -m agents.detectiv_autenticitate.main "textul anunțului aici"
```

Din cod:

```python
from agents.detectiv_autenticitate import DetectivAutenticitate

raport = DetectivAutenticitate().analizeaza(descriere_anunt)
print(raport.scor_risc, raport.puncte_critice_detectate)
```

## Output

```json
{
  "scor_risc": 7,
  "puncte_critice_detectate": [
    {
      "categorie": "vopsea_restaurare",
      "descriere": "...",
      "severitate": "ridicata"
    }
  ],
  "intrebari_de_pus_vanzatorului": ["..."],
  "limba_originala_detectata": "de",
  "coduri_extrase": { "vin_iso": [], "mercedes_chassis_code": ["124.023-12-345678"] }
}
```

## Limitări cunoscute

- `regex_vin_matcher` acoperă formate comune de cod de șasiu/motor, dar nu e exhaustiv —
  formatele variază mult între mărci/epoci/țări; extinde regex-urile din `tools.py` dacă
  apar formate noi consecvent ratate.
- `translation_tool` face un apel Claude separat per traducere (cost/latență suplimentară)
  — pentru volum mare, ar merita cache pe hash-ul textului sursă.
- Nu verifică nimic extern (nu confirmă că un cod de motor extras chiar corespunde
  modelului/anului — raționamentul rămâne al modelului, pe baza cunoștințelor lui generale).
