# CampMate ⛺

A camping trip planner for Home Assistant. Turn a rough idea into a complete trip plan in minutes.

**Features:** day-by-day itinerary · smart packing list · meal planner · budget estimator · trip brief (shareable/printable) · contextual reminders and warnings

---

## Running in Home Assistant

### Option A — HA Add-on (recommended)

1. In HA, go to **Settings → Add-ons → Add-on Store**
2. Click the three-dot menu (⋮) → **Repositories**
3. Add: `https://github.com/14cassowary/CampMateHA`
4. Find **CampMate** in the store and click **Install**
5. Start the add-on — it appears in your sidebar as **CampMate**

Data is stored in `/data` inside the add-on (backed up with HA snapshots).

### Option B — Docker Compose (standalone)

```bash
git clone https://github.com/14cassowary/CampMateHA
cd CampMateHA
docker compose up -d
```

Open `http://your-ha-ip:3000`

To add it to the HA sidebar:
1. Go to **Settings → Dashboards → Resources** (or use the YAML below)
2. Or add a panel via `configuration.yaml`:

```yaml
panel_iframe:
  campmate:
    title: CampMate
    icon: mdi:tent
    url: http://localhost:3000
```

### Option C — Pre-built image from GHCR

```bash
docker run -d \
  --name campmate \
  --restart unless-stopped \
  -p 3000:3000 \
  -v campmate_data:/data \
  ghcr.io/14cassowary/campmate:main
```

---

## Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Data is stored in `./data/campmate.json`.

## Building Docker image manually

```bash
docker build -t campmate .
docker run -p 3000:3000 -v campmate_data:/data campmate
```

---

## How it works

Fill in a 5-step wizard (destination, dates, group size, camping style, activities) and CampMate generates:

| Output | What you get |
|--------|-------------|
| Itinerary | Day-by-day plan with activities |
| Packing list | ~60–100 items categorised by type, sized for your group |
| Meal plan | Breakfast, lunch, dinner, snacks for every day |
| Budget | Itemised estimate with editable actuals |
| Reminders | Context-aware warnings (fire bans, 4WD recovery, fishing licences, etc.) |
| Trip brief | Printable/shareable one-page summary |

All content is generated locally — no cloud, no API keys needed.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, standalone output)
- [Tailwind CSS](https://tailwindcss.com/)
- JSON file database (stored in `/data`)
- Docker multi-stage build, multi-arch (amd64 + arm64 + armv7)
