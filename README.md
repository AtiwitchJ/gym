# 🏋️ Atiwitch Workout Log — Personal Strength Protocol & Tracker

โปรแกรมออกกำลังกาย 4 วัน สำหรับการฝึกส่วนบุคคล เน้นการสร้างกล้ามเนื้อ (Hypertrophy) และความแข็งแรง ด้วยรูปแบบเซ็ต:
- **ท่าประจำวัน 5 ท่า:** 4 เซ็ตต่อท่า = 1 วอร์ม (15 ครั้ง) + 3 เล่นจริง (6–8 ครั้ง เน้นน้ำหนักท้าทาย)
- **ซ้อมเสริมท่าหลักส่วนที่เหลือท้ายคาบ (Bonus Touch-Up):** 2 เซ็ตต่อส่วน = 1 วอร์ม (15 ครั้ง) + 1 เล่นจริง (6–8 ครั้ง RPE 7–8 ห้ามหมดแรง)

---

## 🔒 สถานะ Repository: Private (Self-Hosted via Tailscale VPN)

Repository นี้เป็น **Private** และออกแบบมาเพื่อ **Self-Host ใช้งานส่วนตัวผ่าน Tailscale VPN** ซิงค์ข้อมูลระหว่างมือถือในยิมกับคอมพิวเตอร์ที่บ้านผ่านฐานข้อมูล **SQLite (`gym.db`)** ปลอดภัย 100%

---

## 🌟 จุดเด่นของเวอร์ชันใหม่ (Vue 3 + SQLite + Tailwind)

1. **🎨 Precision Athletic UI (ไม่ใช่หน้าตาเทมเพลต AI):**
   - ธีม Titanium Slate + Signal Crimson ได้แรงบันดาลใจจากอุปกรณ์และแอปฟิตเนสระดับโปร (Hevy, Whoop, Eleiko)
   - ตัดการใช้อีโมจิพร่ำเพรื่อทิ้งทั้งหมด แทนที่ด้วย SVG ไอคอนคมชัด
   - แถวเซ็ตแบบ Tactile แตะง่ายด้วยนิ้วโป้งตอนเหงื่อออก พร้อมปุ่มลัด `[+2.5]`
   - ตัวเลขแบบ **Tabular Numerals (`tabular-nums`)** สไตล์นาฬิกาดิจิทัล ตัวเลขไม่สั่น/ไม่เลื่อนตอนนับเวลา
2. **🗄️ SQLite Server Database (`gym.db`):**
   - บันทึกข้อมูลลงฐานข้อมูล SQLite กลางบน Docker หรือ Mac
   - ซิงค์ประวัติน้ำหนักและ Draft การกรอกระหว่างมือถือและคอมพิวเตอร์ผ่าน Tailscale VPN อัตโนมัติ
   - ทำงานแบบ Offline-First: เน็ตหลุดในจุดอับสัญญาณของยิมก็ยังกรอกและติ๊กได้ตามปกติ
3. **📊 Dual Export (Excel & SQLite):**
   - 📗 **Export Excel (.xlsx):** ดาวน์โหลดตารางสถิติแยกตามท่า/เซ็ต/น้ำหนัก/Reps สวยงาม
   - 🗄️ **ดาวน์โหลด .db (SQLite):** โหลดไฟล์ฐานข้อมูลจริงออกมาสำรอง (Backup) ได้ตลอดเวลา
4. **⏱️ Background-Safe Rest Timer:**
   - ระบบนับถอยหลังด้วย Timestamp (`Date.now()`) พร้อมตรวจจับ `visibilitychange`
   - แม้หน้าจอดับ ล็อกเครื่อง หรือสลับไปฟังเพลง Spotify เวลาจะไม่กระตุก/ไม่ค้าง และคำนวณวินาทีที่เหลือจริงเมื่อเปิดจอกลับมา พร้อมเสียง Beep และสั่นเตือน

---

## 🌐 วิธีเปิดใช้งาน Web App ผ่าน Tailscale VPN

### วิธีที่ 1: รันผ่าน Docker Compose (แนะนำ)
```bash
./serve.sh docker
# หรือ
docker compose up -d --build
```
- เซิร์ฟเวอร์จะรันที่พอร์ต `8080` พร้อมสร้างฐานข้อมูลไว้ที่ `./data/gym.db`
- เข้าใช้งานผ่านมือถือในวง Tailscale: `http://<Tailscale-IP-ของเครื่อง>:8080`

### วิธีที่ 2: รัน Tailscale Serve (ได้ HTTPS + รองรับ PWA ติดตั้งลงหน้าจอมือถือ)
```bash
./serve.sh tailscale
```
ตรวจสอบโดเมน HTTPS ส่วนตัวของคุณด้วย:
```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status
```
👉 เข้าใช้งานผ่าน `https://<ชื่อเครื่อง>.<tailnet-name>.ts.net` และกด **"Add to Home Screen"** บนมือถือได้ทันที

### วิธีที่ 3: รันแบบ Native (ไม่ต้องใช้ Docker)
```bash
./serve.sh native
# หรือ
npm run build && node server/server.js
```

---

## 🎯 สรุป "ท่าหลัก" ประจำวัน (Compound Lifts)

1. **วันจันทร์ (ขา + ก้น):**
   - `[MAIN]` Seated Leg Press Machine (ต้นขาและสะโพก)
   - `[MAIN]` Smith Machine Hip Thrust (ก้นมัดใหญ่)
2. **วันอังคาร (อก + หลังแขน):**
   - `[MAIN]` Chest Press Machine (อกกลาง)
   - `[MAIN]` Incline Dumbbell / Smith Press (อกบน)
3. **วันพุธ (หลัง + หน้าแขน):**
   - `[MAIN]` Seated Row Machine (ความหนาหลัง)
   - `[MAIN]` Lat Pulldown Machine (ความกว้างปีก V-Shape)
4. **วันพฤหัสบดี (ไหล่ + หน้าท้อง):**
   - `[MAIN]` Shoulder Press Machine (หัวไหล่รวม)

---

## 📂 โครงสร้างโปรเจกต์ใหม่

```text
gym/
├── server/
│   ├── db.js                 # SQLite schema & repository
│   ├── server.js             # Express REST API + Static dist server
│   └── test-api.js           # Automated backend test suite
├── src/
│   ├── components/           # HeaderBar, DayTabs, ExerciseCard, BonusCard, RestTimer, HistoryView, TodoView, RestDayView
│   ├── composables/          # useWorkoutStore, useTimer, useExcelExport
│   ├── data/                 # workouts.js, defaultTodos.js
│   ├── App.vue               # Main layout
│   ├── main.js
│   └── style.css             # Tailwind CSS + Precision athletic theme
├── public/                   # PWA icons & manifest.json
├── data/
│   └── gym.db                # SQLite database (persisted via Docker volume)
├── Dockerfile                # Multi-stage build (Vite build -> Node.js + SQLite)
├── docker-compose.yml        # Container orchestration
└── serve.sh                  # Launch script (docker / tailscale / native / dev)
```
