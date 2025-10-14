# Водич за Професори - Систем за Евиденција на Присуство

Кратко упатство за користење на системот за евиденција на присуство.

## Содржина

1. [Брзо Стартување](#брзо-стартување)
2. [Управување со Сесии](#управување-со-сесии)
3. [Експорт на Податоци](#експорт-на-податоци)
4. [Референца](#референца)

---

## Брзо Стартување

### Логирање
```
URL: /professor/login
Credentials: Од администратор
```

### Креирање на Сесија
1. Dashboard → "Start New Session"
2. Дозволи GPS пристап
3. Систем автоматски ја добива локацијата и креира сесија

### Завршување на Сесија
1. "End Session" копче
2. Податоците се зачувуваат автоматски

---

## Управување со Сесии

### Активна Сесија

**QR Функционалност:**
- Автоматска ротација на секои 30 секунди
- Содржи: `session_id`, `token`, `server_nonce`
- За fullscreen: F11

**Мониторинг:**
- Valid scans: Real-time листа на успешни евиденции
- Invalid scans: Неуспешни обиди со причини

**Причини за Невалидност:**
| Код | Објаснување |
|-----|-------------|
| `TOO_FAR` | Растојание > 50m |
| `DUPLICATE_DEVICE` | Device ID веќе користен |
| `EXPIRED_TOKEN` | QR токен истечен (> 30s) |
| `INVALID_TOKEN` | Невалиден токен |
| `GPS_UNAVAILABLE` | GPS недостапен |

### Мануелно Додавање

За студенти со технички проблеми:
```
Manual Override → Внеси податоци → Add Student
```
Полиња: `student_index`, `name`, `surname`, `reason` (optional)

Евиденцијата се означува како `MANUAL_OVERRIDE` во базата.

---

## Експорт на Податоци

### CSV Формат

Системот генерира 3 фајлови:

**1. Valid Scans**
```csv
Index,Name,Surname,Time,Distance(m),Device,GPS_Lat,GPS_Lon,Is_Manual
```

**2. Invalid Scans**
```csv
Index,Name,Surname,Time,Reason,Distance(m),GPS_Lat,GPS_Lon
```

**3. Session Info**
```csv
Session_ID,Professor,Start_Time,End_Time,Professor_GPS_Lat,Professor_GPS_Lon,Total_Valid,Total_Invalid
```

### Експорт Опции
- Од активна сесија: "Export CSV" копче
- Од архива: Dashboard → Session → "Export CSV"

Фајлови: `session_[ID]_valid_scans.csv`, `session_[ID]_invalid_scans.csv`, `session_[ID]_info.csv`

---

## Референца

### Системски Параметри

```env
MAX_DISTANCE_M=50          # Максимална дистанца за валиден скен
QR_ROTATION_INTERVAL=30000 # QR ротација (ms)
GPS_TIMEOUT=10000          # GPS timeout (ms)
```

### Безбедносни Мерки

- **GPS Верификација**: Haversine формула за пресметка на дистанца
- **Device Tracking**: UUID базиран на browser fingerprint
- **Nonce Систем**: Server + Client nonce за replay prevention
- **Token Lifecycle**: 30s validity window
- **Unique Constraint**: `(session_id, device_id)` на DB ниво

### QR Payload Structure

```json
{
  "session_id": "uuid",
  "token": "rotating_token",
  "server_nonce": "cryptographic_nonce"
}
```

### API Endpoints

**Креирање на Сесија:**
```
POST /api/sessions/start
Headers: Authorization: Bearer <token>
Body: { prof_lat, prof_lon }
```

**QR Token:**
```
GET /api/sessions/[sessionId]/qr-token
Headers: Authorization: Bearer <token>
Response: { token, server_nonce }
```

**Завршување:**
```
POST /api/sessions/end
Headers: Authorization: Bearer <token>
Body: { session_id }
```

**Листа на Сесии:**
```
GET /api/sessions/list
Headers: Authorization: Bearer <token>
```

**Експорт:**
```
GET /api/sessions/[sessionId]/export
Headers: Authorization: Bearer <token>
```

### Database Schema

Релевантни табели:
- `sessions` - Активни/архивирани сесии
- `scans_valid` - Валидни скенирања
- `scans_invalid` - Невалидни обиди
- `used_server_nonces` - Replay prevention

За детална schema: `supabase-schema.sql`

### Troubleshooting

**GPS Issues:**
- Browser permissions: `navigator.geolocation`
- Accuracy: 5-20m типично
- Indoor degradation: Препорака за прозорци

**Performance:**
- Polling interval: 3s за real-time updates
- QR refresh: Client-side timer

**Browser Compatibility:**
- Chrome/Edge: Recommended
- Firefox: Supported
- Safari: Supported (iOS >= 14)

---

**Технички Документација:** README.md
**Student Guide:** StudentGuide.md

**Верзија:** 1.0.0
