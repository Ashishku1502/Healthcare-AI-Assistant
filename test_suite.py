import httpx
import uuid
import sys
from datetime import datetime, timedelta

BASE = 'http://localhost:8000'

results = []
def check(desc, ok, details=''):
    results.append((desc, ok, details))
    status_str = "PASS" if ok else "FAIL"
    print(f"[{status_str}] {desc}: {details}")

client = httpx.Client(timeout=10.0)

try:
    # 1. Health check
    r = client.get(f'{BASE}/health')
    check('Health check', r.status_code == 200 and r.json().get('status') == 'ok', f'code={r.status_code}')

    # 2. Auth: Bad credentials
    r = client.post(f'{BASE}/auth/login', json={'email': 'owner@clinic.com', 'password': 'wrongpassword'})
    check('Auth: Reject bad password', r.status_code == 401, f'code={r.status_code}')

    # 3. Auth: Good credentials
    r = client.post(f'{BASE}/auth/login', json={'email': 'owner@clinic.com', 'password': 'clinic1234'})
    token = r.json().get('token') if r.status_code == 200 else None
    check('Auth: Owner login success', r.status_code == 200 and token is not None, f"role={r.json().get('role')}")

    headers = {'Authorization': f'Bearer {token}'}

    # 4. Clinic Details
    r = client.get(f'{BASE}/clinic', headers=headers)
    c_data = r.json()
    check('Clinic: Read details', r.status_code == 200 and c_data.get('name') == 'Care Clinic', f"name={c_data.get('name')}, is_demo={c_data.get('is_demo')}")

    # 5. Doctor Management
    r = client.get(f'{BASE}/doctors', headers=headers)
    docs = r.json()
    check('Doctors: List doctors', r.status_code == 200 and len(docs) > 0, f"count={len(docs)}, first={docs[0]['name']}")
    doc_id = docs[0]['id']

    # 5b. Update Doctor status (One-tap wait time)
    r = client.put(f'{BASE}/doctors/{doc_id}/status', headers=headers, json={'state': 'late', 'late_minutes': 20})
    check('Doctors: Update live status to late 20 min', r.status_code == 200, f'code={r.status_code}')

    # 6. Patient Creation
    phone = '9998887776'
    r = client.post(f'{BASE}/patients', headers=headers, json={'name': 'Ramesh Kumar', 'phone': phone, 'consent': True})
    if r.status_code == 409:
        r = client.get(f'{BASE}/patients?q=Ramesh', headers=headers)
        pat_id = r.json()[0]['id']
        check('Patients: Existing patient found', True, f'id={pat_id}')
    else:
        pat_id = r.json().get('id')
        check('Patients: Register new patient', r.status_code == 201, f'id={pat_id}')

    # 7. Appointment Booking & Server-side Confirmation Enforced
    target_dt = (datetime.now() + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    if target_dt.weekday() == 6:  # skip Sunday if clinic closed
        target_dt += timedelta(days=1)
    slot_iso = target_dt.isoformat()

    r = client.post(f'{BASE}/appointments', headers=headers, json={
        'doctor_id': doc_id, 'patient_id': pat_id, 'start': slot_iso, 'confirmed': False
    })
    check('Booking: Reject unconfirmed appointment', r.status_code == 422, f'code={r.status_code}')

    # 7b. Confirm booking & verify double-booking blocked (409 Conflict)
    r_ok = client.post(f'{BASE}/appointments', headers=headers, json={
        'doctor_id': doc_id, 'patient_id': pat_id, 'start': slot_iso, 'confirmed': True
    })
    if r_ok.status_code == 201:
        r_dup = client.post(f'{BASE}/appointments', headers=headers, json={
            'doctor_id': doc_id, 'patient_id': pat_id, 'start': slot_iso, 'confirmed': True
        })
        check('Booking: Double-booking blocked (409 Conflict)', r_dup.status_code == 409, f"code={r_dup.status_code}, error={r_dup.json().get('detail')}")
    else:
        check('Booking: Double-booking blocked (409 Conflict)', r_ok.status_code == 409, f"code={r_ok.status_code}, error={r_ok.json().get('detail')}")

    # 8. AI Receptionist - Routine inquiry
    r = client.post(f'{BASE}/chat', headers=headers, json={'session_id': f'sess-{uuid.uuid4().hex[:6]}', 'message': 'Clinic kab khulti hai?'})
    check('AI Receptionist: Hours query in Hinglish', r.status_code == 200 and 'Mon-Sat' in r.json().get('reply', ''), f"reply={r.json().get('reply')[:60]}...")

    # 8b. AI Receptionist - Red flag / Emergency safety rule
    urgent_sess = f'sess-{uuid.uuid4().hex[:6]}'
    r = client.post(f'{BASE}/chat', headers=headers, json={'session_id': urgent_sess, 'message': 'Seene me tez dard ho raha hai'})
    reply_text = r.json().get('reply', '').lower()
    is_emergency = ('emergency' in reply_text or '112' in reply_text or 'aspataal' in reply_text or 'hospital' in reply_text or 'doctor' in reply_text)
    check('AI Receptionist: Emergency medical triage', r.status_code == 200 and is_emergency, f"reply={r.json().get('reply')[:60]}...")

    # 9. Attention queue (urgent triage event created)
    r = client.get(f'{BASE}/attention', headers=headers)
    att_items = r.json()
    check('Attention queue: Urgent items detected', r.status_code == 200 and len(att_items) > 0, f'count={len(att_items)}')

    # 9b. Resolve attention queue item
    if len(att_items) > 0:
        att_id = att_items[0]['id']
        r = client.post(f'{BASE}/attention/{att_id}/resolve', headers=headers)
        check('Attention queue: Resolve item', r.status_code == 200, f'resolved id={att_id}')

    # 10. Analytics
    r = client.get(f'{BASE}/analytics', headers=headers)
    check('Analytics: Aggregation by outcome & channel', r.status_code == 200 and 'by_outcome' in r.json(), f"contacts={r.json().get('contacts')}")

    # 11. Reminders engine
    r = client.post(f'{BASE}/reminders/run', headers=headers)
    check('Reminders: Cron run trigger', r.status_code == 200, f"sent={r.json().get('sent')}")

    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\nTotal checks: {total} | Passed: {passed} | Failed: {total - passed}")

    if total != passed:
        sys.exit(1)
except Exception as e:
    print(f"Exception during verification: {e}")
    sys.exit(1)
