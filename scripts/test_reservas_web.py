#!/usr/bin/env python3
"""Tests end-to-end del flujo de reservas web de Neboa.

Cadena bajo prueba:
  landing -> Edge Function `reservas-web`
          -> nexum-restaurant  agent-check-availability / agent-create-reservation
          -> side effect n8n (NEBOA-RESERVAS-SIDEFFECT: Calendar + Gmail + WhatsApp)

Uso:  python3 scripts/test_reservas_web.py
Requiere en .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
Las reservas creadas por los tests se borran al final.
"""
import datetime
import json
import os
import re
import sys

import httpx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env(path):
    env = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip().strip('"')
    return env


ENV = load_env(os.path.join(ROOT, '.env'))
BASE = ENV['VITE_SUPABASE_URL']
ANON = ENV['VITE_SUPABASE_ANON_KEY']
URL = f'{BASE}/functions/v1/reservas-web'
HEADERS = {'Content-Type': 'application/json', 'apikey': ANON}
TEST_PHONE = '+34632079379'
TEST_TAG = 'SMOKETEST-AUTO'

RESULTS = []
CREADAS = []


def check(nombre, cond, detalle=''):
    RESULTS.append((nombre, bool(cond), detalle))
    print(f"{'PASS' if cond else 'FALLA'}  {nombre}" + (f'  -> {detalle}' if detalle else ''))
    return bool(cond)


def post(payload, timeout=60):
    r = httpx.post(URL, headers=HEADERS, json=payload, timeout=timeout)
    try:
        return r.status_code, r.json()
    except Exception:
        return r.status_code, {'_raw': r.text}


def fecha_valida(dias=3):
    """Primer dia a partir de hoy+dias en el que el restaurante sirve a las 14:00."""
    for extra in range(0, 14):
        d = datetime.date.today() + datetime.timedelta(days=dias + extra)
        code, body = post({'action': 'check', 'fecha': d.isoformat(), 'hora': '14:00', 'invitados': 2})
        if code == 200 and body.get('estado') == 'disponible':
            return d.isoformat()
    return None


def main():
    print(f'Endpoint: {URL}\n')

    # 1. CORS preflight
    r = httpx.options(URL, headers={'Origin': 'https://restaurante-neboa.com',
                                    'Access-Control-Request-Method': 'POST'}, timeout=30)
    check('1. CORS preflight responde 2xx', r.status_code < 300, f'status={r.status_code}')

    # 2. accion desconocida -> 400
    code, body = post({'action': 'nope'})
    check('2. action invalida -> 400', code == 400, f'status={code} body={body}')

    # 3. check sin campos -> 400
    code, body = post({'action': 'check'})
    check('3. check sin campos -> 400', code == 400, f'status={code}')

    # 4. check valido -> disponibilidad
    fecha = fecha_valida()
    if not check('4. check devuelve disponibilidad', fecha is not None, f'fecha={fecha}'):
        return finish()

    # 5. create sin nombre -> 400
    code, body = post({'action': 'create', 'fecha': fecha, 'hora': '14:00',
                       'invitados': 2, 'telefono': TEST_PHONE, 'source': 'web'})
    check('5. create sin nombre -> 400', code == 400, f'status={code}')

    # 6. create con telefono invalido -> 400
    code, body = post({'action': 'create', 'fecha': fecha, 'hora': '14:00', 'invitados': 2,
                       'nombre': TEST_TAG, 'telefono': '123', 'source': 'web'})
    check('6. create con telefono invalido -> 400', code == 400, f'status={code}')

    # 7. create en el pasado -> 400
    ayer = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    code, body = post({'action': 'create', 'fecha': ayer, 'hora': '14:00', 'invitados': 2,
                       'nombre': TEST_TAG, 'telefono': TEST_PHONE, 'source': 'web'})
    check('7. create con fecha pasada -> 400', code == 400, f'status={code}')

    # 8. create valido
    code, body = post({'action': 'create', 'fecha': fecha, 'hora': '14:00', 'invitados': 2,
                       'nombre': TEST_TAG, 'telefono': TEST_PHONE,
                       'notas': 'test automatico', 'source': 'web'}, timeout=90)
    ok = code == 200 and body.get('estado') == 'reserva_creada'
    rid = body.get('reserva_id')
    if rid:
        CREADAS.append(rid)
    check('8. create valido -> reserva_creada', ok, f'status={code} id={rid}')

    # 8b. la reserva vive en nexum: trae localizador y mesa asignada
    check('8b. nexum devuelve localizador', bool(body.get('codigo')), str(body.get('codigo')))
    check('8c. nexum asigna mesa', bool(body.get('mesa')), str(body.get('mesa')))

    # 9. el side effect se ha disparado
    check('9. side effect n8n ejecutado', body.get('sideeffect', {}).get('ok') is True,
          json.dumps(body.get('sideeffect'), ensure_ascii=False))

    # 10. el side effect creo el evento de calendar
    check('10. side effect devuelve evento de calendar',
          bool(body.get('sideeffect', {}).get('calendar_event_id')),
          str(body.get('sideeffect', {}).get('calendar_event_id')))

    # 11. el token de nexum NUNCA sale al cliente
    crudo = json.dumps(body)
    check('11. la respuesta no filtra el token de nexum',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' not in crudo and 'NEXUM_AGENT_TOKEN' not in crudo)

    # 12. el bundle publicado no contiene el token (no debe ir al navegador)
    try:
        home = httpx.get('https://restaurante-neboa.com/', timeout=30, follow_redirects=True).text
        assets = re.findall(r'/assets/[A-Za-z0-9_\-.]+\.js', home)
        bundle = httpx.get('https://restaurante-neboa.com' + assets[0], timeout=60).text
        sucio = ('nexum-agent' in bundle or 'NEXUM_AGENT_TOKEN' in bundle
                 or 'agent-create-reservation' in bundle)
        check('12. el bundle no lleva el token ni ataca nexum directo', not sucio, assets[0])
    except Exception as exc:  # la landing puede no estar publicada aun
        check('12. el bundle no lleva el token ni ataca nexum directo', False, f'error: {exc}')

    return finish()


def finish():
    print('\n--- Reservas creadas en NEXUM por el test (borrar):', CREADAS)
    fallos = [n for n, ok, _ in RESULTS if not ok]
    print(f'\n{len(RESULTS) - len(fallos)}/{len(RESULTS)} OK')
    if fallos:
        print('FALLAN:', fallos)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
