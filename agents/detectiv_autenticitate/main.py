"""Exemplu de rulare din linia de comandă:

    export ANTHROPIC_API_KEY=sk-ant-...
    python -m agents.detectiv_autenticitate.main "Vopsea originală de fabrică, ..."

Sau, dintr-un alt script Python:

    from agents.detectiv_autenticitate import DetectivAutenticitate
    raport = DetectivAutenticitate().analizeaza(descriere_anunt)
    print(raport.model_dump_json(indent=2))
"""

import sys
import json

from .agent import DetectivAutenticitate

EXEMPLU_SUSPECT = """
Vand Mercedes W123 280CE, an 1982, vopsea originala de fabrica, stare impecabila.
Caroseria a fost complet refacuta acum 2 ani intr-un atelier de specialitate (tinichigerie
completa, praguri noi sudate). Kilometraj 89.000 km, cu toate acestea bordul a fost
schimbat integral anul trecut. Matching numbers, motor original. Motornummer: 110988-12-004567.
Fara rugina, tratament anticorosiv aplicat recent la toate punctele critice.
Istoric de service complet, insa multe facturi s-au pierdut in timp.
"""


def main() -> None:
    text = sys.argv[1] if len(sys.argv) > 1 else EXEMPLU_SUSPECT
    raport = DetectivAutenticitate().analizeaza(text)
    print(json.dumps(raport.model_dump(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
