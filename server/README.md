# MotoCare Node.js & Express Backend API

Dedicated REST API Server para sa **MotoCare Workshop Management System**. 
Binuo gamit ang **Node.js**, **Express**, **TypeScript**, at direktang konektado sa **Supabase PostgreSQL**.

---

## 🚀 Paano Patakbuhin (How to Run)

### Opsyon 1: Mula sa Root Directory (`motocare-app`)
```bash
npm run server
```

### Opsyon 2: Loob ng `server` directory
```bash
cd server
npm run dev
```

Ang server ay tatakbo sa: **`http://localhost:5000`**

---

## 📡 API Endpoints

### 1. Public Endpoints
* `GET /api/health` - Server health check
* `GET /api/tickets/track/:ticketCode` - Live tracking ng ticket reference nang hindi kailangang mag-login

### 2. Customer Endpoints (Nangangailangan ng `Authorization: Bearer <token>`)
* `GET /api/tickets/my-tickets` - Kunin ang active at completed tickets ng rider
* `POST /api/tickets/book` - Mag-book ng service bay (may collision-free unique ticket code generator)
* `GET /api/motorcycles` - Listahan ng motor sa garahe ng rider
* `POST /api/motorcycles` - Mag-rehistro ng bagong motor (may duplicate plate checking)
* `DELETE /api/motorcycles/:id` - Magtanggal ng motor sa garahe
* `GET /api/messages` - Kunin ang chat messages sa helpdesk
* `POST /api/messages` - Magpadala ng mensahe sa mekaniko / advisor
* `GET /api/profile` - Kunin ang account profile
* `PUT /api/profile` - I-update ang full name at contact number

### 3. Admin Endpoints (Nangangailangan ng `ADMIN` o `SUPER_ADMIN` Role)
* `GET /api/admin/tickets` - Kunin ang buong pila ng workshop tickets kasama ang detalye ng motor
* `PATCH /api/admin/tickets/:ticketId/status` - Baguhin ang status (`IN_PROGRESS`, `READY_FOR_PICKUP`, `COMPLETED`), stage (1-5), service bay, at lead mechanic
* `GET /api/admin/metrics` - Workshop summary counts (ongoing, ready, completed)

---

## ⚙️ Environment Variables (`server/.env`)

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
