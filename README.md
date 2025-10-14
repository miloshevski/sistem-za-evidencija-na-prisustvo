# Систем за Евиденција на Присуство

Модерен веб-базиран систем за евиденција на присуство на студенти во училница преку скенирање на QR код со детекција на GPS локација.

## Содржина

- [Преглед](#преглед)
- [Главни Карактеристики](#главни-карактеристики)
- [Технологии](#технологии)
- [Безбедносни Мерки](#безбедносни-мерки)
- [Инсталација](#инсталација)
- [Конфигурација](#конфигурација)
- [Користење](#користење)
- [Структура на Проектот](#структура-на-проектот)
- [API Документација](#api-документација)
- [Упатства](#упатства)

## Преглед

Системот овозможува професорите да креираат сесии за присуство, генерираат QR кодови кои студентите ги скенираат со нивните мобилни уреди. Системот автоматски верификува дека студентите се физички присутни во училницата преку GPS координати и имплементира безбедносни мерки против измама.

## Главни Карактеристики

### За Професори
- Веб-базиран систем за логирање
- Креирање и управување со сесии за присуство
- Генерирање на QR кодови со ротирачки токени (секои 30 секунди)
- Преглед на валидни и невалидни скенирања во реално време
- Мануелно додавање на студенти (за оние со технички проблеми)
- Експортирање на податоци во CSV формат
- Архива на претходни сесии

### За Студенти
- Едноставен интерфејс за внесување на податоци
- QR скенер со zoom функција (за скенирање од далечина)
- Автоматско детектирање на GPS локација
- Инстантна потврда на успешна евиденција
- Зачувување на податоци за побрзо пополнување

### Безбедносни Функции
- GPS верификација (студентите мора да бидат во радиус од 50m)
- Детекција на дупликат скенирања (еден уред, еден скен по сесија)
- Ротирачки QR токени (важат 30 секунди)
- Верификација на server nonce (спречување на replay напади)
- Client nonce за дополнителна сигурност
- Tracking на device ID
- Временски печати (timestamp) за секое скенирање

## Технологии

### Frontend
- **Next.js 15** - React framework со App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **@zxing/library** - QR код скенер
- **qrcode** - QR код генератор

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL база на податоци
- **bcryptjs** - Хаширање на лозинки
- **jose** - JWT токени за автентикација

### Безбедност
- JWT автентикација
- bcrypt хаширање на лозинки
- HTTPS енкрипција
- CORS заштита
- Nonce верификација
- GPS валидација

## Безбедносни Мерки

### 1. GPS Верификација
```javascript
const distance = calculateDistance(
  professorLat, professorLon,
  studentLat, studentLon
);
if (distance > MAX_DISTANCE_M) {
  return "TOO_FAR"; // Невалиден скен
}
```

### 2. Ротирачки QR Токени
- Токените се генерираат на секои 30 секунди
- Стари токени автоматски се инвалидираат
- Спречување на скенирање на слики од QR код

### 3. Device Tracking
- Секој уред добива уникатен ID
- Еден уред = еден скен по сесија
- Спречување на повеќекратно скенирање

### 4. Nonce Верификација
- Server nonce (генериран од QR)
- Client nonce (генериран од уредот)
- Спречување на replay напади

## Инсталација

### Предуслови
- Node.js 18 или понова верзија
- npm или yarn
- Supabase акаунт

### Чекори

1. **Клонирање на проектот**
```bash
git clone <repository-url>
cd sistem_za_evidencija
```

2. **Инсталирање на зависности**
```bash
npm install
```

3. **Конфигурација на база на податоци**
- Креирајте Supabase проект на [supabase.com](https://supabase.com)
- Извршете ја `supabase-schema.sql` во SQL Editor
- Запишете ги credentials

4. **Конфигурација на околина**
Креирајте `.env.local` фајл:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key

# App
NEXT_PUBLIC_APP_VERSION=1.0.0
MAX_DISTANCE_M=50
```

5. **Стартување на development сервер**
```bash
npm run dev
```

6. **Отворете го апликацијата**
```
http://localhost:3000
```

## Конфигурација

### Параметри на Системот

#### Максимална Дистанца
```typescript
// Во .env.local
MAX_DISTANCE_M=50  // метри
```

#### QR Токен Ротација
```typescript
// Во src/app/professor/session/[sessionId]/page.tsx
const QR_ROTATION_INTERVAL = 30000; // 30 секунди
```

#### GPS Timeout
```typescript
// Во src/lib/gps.ts
timeout: 10000 // 10 секунди
```

## Користење

### За Професори

1. **Логирање**
   - Одете на `/professor/login`
   - Внесете email и лозинка

2. **Креирање на Сесија**
   - Кликнете "Start New Session"
   - Дозволете GPS пристап
   - Сесијата автоматски се креира

3. **Презентирање на QR Код**
   - Прикажете го QR кодот на проектор
   - Кодот се ажурира секои 30 секунди

4. **Мониторинг на Скенирања**
   - Гледајте валидни скенирања во реално време
   - Проверете ги невалидни обиди
   - Користете мануелно додавање за проблеми

5. **Завршување на Сесија**
   - Кликнете "End Session"
   - Експортирајте ги податоците во CSV

### За Студенти

1. **Внесување на Информации**
   - Одете на `/` (главна страна)
   - Внесете студентски индекс
   - Внесете име и презиме

2. **Скенирање на QR Код**
   - Дозволете пристап до камера и GPS
   - Користете zoom копчиња за подобра видливост
   - Скенирајте го QR кодот од проектор

3. **Потврда**
   - Почекајте на потврда
   - Зелена порака = успешно
   - Црвена порака = грешка

## Структура на Проектот

```
sistem_za_evidencija/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # Автентикација
│   │   │   ├── scans/                # Скенирање
│   │   │   └── sessions/             # Сесии
│   │   ├── professor/                # Професор интерфејс
│   │   │   ├── login/                # Login страна
│   │   │   ├── dashboard/            # Dashboard
│   │   │   └── session/[sessionId]/  # Активна сесија
│   │   ├── page.tsx                  # Студент главна страна
│   │   └── globals.css               # Глобални стилови
│   ├── components/                   # React компоненти
│   │   ├── QRScanner.tsx             # QR скенер со zoom
│   │   └── QRDisplay.tsx             # QR приказ
│   └── lib/                          # Utility функции
│       ├── supabase.ts               # Supabase клиент
│       ├── gps.ts                    # GPS функции
│       ├── crypto.ts                 # Криптографија
│       └── deviceId.ts               # Device tracking
├── supabase-schema.sql               # Database schema
├── .env.local                        # Околински променливи
└── package.json                      # Dependencies
```

## API Документација

### Автентикација

#### POST `/api/auth/login`
Логирање на професор
```typescript
Request: {
  email: string;
  password: string;
}
Response: {
  token: string;
  professor: { id, name, email }
}
```

### Сесии

#### POST `/api/sessions/start`
Креирање на нова сесија
```typescript
Request: {
  prof_lat: number;
  prof_lon: number;
}
Headers: {
  Authorization: "Bearer <token>"
}
Response: {
  session_id: string;
  start_ts: string;
  prof_lat: number;
  prof_lon: number;
}
```

#### POST `/api/sessions/end`
Завршување на сесија
```typescript
Request: {
  session_id: string;
}
Headers: {
  Authorization: "Bearer <token>"
}
```

#### GET `/api/sessions/list`
Листа на сесии
```typescript
Headers: {
  Authorization: "Bearer <token>"
}
Response: {
  sessions: Array<Session>
}
```

### Скенирања

#### POST `/api/scans/submit`
Поднесување на скен од студент
```typescript
Request: {
  session_id: string;
  token: string;
  server_nonce: string;
  student_index: string;
  name: string;
  surname: string;
  client_lat: number;
  client_lon: number;
  client_ts: string;
  device_id: string;
  client_nonce: string;
  app_version: string;
}
Response: {
  valid: boolean;
  reason?: string;
  message?: string;
  distance_m?: number;
}
```

## Упатства

За детални упатства, погледнете ги следните документи:

- **[ProfessorGuide.md](ProfessorGuide.md)** - Водич за професори
- **[StudentGuide.md](StudentGuide.md)** - Водич за студенти

## Troubleshooting

### Проблеми со GPS
- Проверете дали е дозволен пристап до локација
- Проверете дали сте на отворено (подобар сигнал)
- Почекајте 10-15 секунди за фиксирање на GPS

### QR Скенер не Работи
- Дозволете пристап до камера
- Проверете осветлување (избегнувајте рефлексии)
- Користете zoom функција за подобра видливост
- Проверете дали браузерот поддржува камера (Chrome, Safari, Firefox)

### Невалиден Скен
- **TOO_FAR**: Премногу далеку (> 50m) - приближете се кон професорот
- **DUPLICATE_DEVICE**: Веќе скенирано со истиот уред
- **EXPIRED_TOKEN**: QR кодот е истечен - скенирајте го новиот
- **GPS_UNAVAILABLE**: Не може да се добие GPS локација

## Развој

### Development Команди
```bash
# Стартување на dev сервер
npm run dev

# Build за продукција
npm run build

# Стартување на продукција
npm start

# Linting
npm run lint
```

### Тестирање
```bash
# Unit тестови (доколку се имплементирани)
npm test
```

## Deployment

### Vercel (Препорачано)
1. Push на GitHub
2. Поврзете го репото со Vercel
3. Конфигурирајте environment variables
4. Deploy автоматски на секој push

### Други Платформи
- Next.js може да се deploy-ува на било која платформа која поддржува Node.js
- Препорачуваме Vercel, Netlify или AWS

## Безбедност во Продукција

- Користете HTTPS (задолжително за GPS)
- Сменете ги JWT_SECRET и database credentials
- Овозможете RLS (Row Level Security) на Supabase
- Имплементирајте rate limiting
- Логирајте сомнителна активност
- Редовно ажурирајте зависности

## Лиценца

Овој проект е развиен за едукативни цели.

## Контакт

За прашања или проблеми, контактирајте ги развивачите на проектот.

---

**Верзија:** 1.0.0
**Последно ажурирање:** 2025
**Развиено со:** Next.js, TypeScript, Supabase
