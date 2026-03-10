## Personal Diet Recommendation System

Welcome! 👋  
This project is a full‑stack **Personal Diet Recommendation System** built with:

- **Backend**: Django REST API (with JWT auth, MySQL, ML-based recommendations)
- **Frontend**: React + Vite SPA
- **Database**: MySQL
- **Containerization**: Docker & Docker Compose

The goal is to help users get personalized diet recommendations, track meals, and visualize insights in a simple, friendly UI.

---

### 1. Project structure

- **`Django_Backend/`** – Django project (`diet_recommendation_backend`) with apps like `account`, `api`, and `planner`.
- **`React_Frontend/`** – React + Vite frontend.
- **`Data/`** – (Ignored by Git) local folder where you can place datasets.
- **`docker-compose.yml`** – Runs backend, frontend, and MySQL together.

---

### 2. Dataset

The main dataset used for training / recommendation logic is stored externally to keep the repo light.

- **Download link**:  
  `https://drive.google.com/file/d/1n8UCXLUebvmkXUeAoBIUmeJm9OvKijLy/view?usp=drive_link`

After downloading:

1. **Unzip** the downloaded file.
2. Place the extracted dataset **inside the `Personal_diet_recommendation_system` project folder** (this repository’s root).
3. Optionally, you can organize it further (for example, create a `Data/` folder here and move the dataset into `Data/`).
4. Make sure any code that reads the dataset points to the correct path inside the project folder (for example `Data/your_dataset.csv`).

> Note: Any data folders (like `Data/`) are intentionally **ignored in `.gitignore`**, so your local datasets are never pushed to GitHub.

---

### 3. Running with Docker (recommended)

You can run the **entire application (backend + frontend + MySQL)** using Docker Compose.

#### Prerequisites

- Docker installed
- Docker Compose (or `docker compose` plugin)

#### Start everything

From the project root:

```bash
docker compose up -d --build
```

This will:

- Build and start the **backend** (Django) on `http://localhost:8000`
- Build and start the **frontend** (React + Vite dev server) on `http://localhost:5173`
- Start a **MySQL 8.0** database with the `pdrs_db` database

To see running containers:

```bash
docker compose ps
```

To view logs (for debugging):

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs mysql
```

To stop everything:

```bash
docker compose down
```

---

### 4. Backend – local development (without Docker)

If you prefer running Django directly on your machine:

#### 4.1. Create and activate virtual environment

```bash
cd Django_Backend
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
```

#### 4.2. Install dependencies

```bash
pip install -r requirements.txt
```

#### 4.3. Configure database

By default, `diet_recommendation_backend/settings.py` uses:

- `DB_NAME = "pdrs_db"`
- `DB_USER = "root"`
- `DB_PASSWORD = "Mysql123"`
- `DB_HOST = "127.0.0.1"`
- `DB_PORT = "3306"`

You can override these using environment variables:

```bash
export DB_NAME=pdrs_db
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_HOST=127.0.0.1
export DB_PORT=3306
```

#### 4.4. Apply migrations and run server

```bash
python manage.py migrate
python manage.py runserver
```

The backend will be available at `http://127.0.0.1:8000/`.

---

### 5. Frontend – local development (without Docker)

```bash
cd React_Frontend
npm install
npm run dev
```

Then open the URL printed in the terminal (by default `http://localhost:5173`).

Make sure the backend is running (via Docker or `runserver`) so the frontend can talk to the API.

---

### 6. Environment variables & secrets

To keep things safe and clean:

- **Do not** commit any `.env` files or credentials.
- Configure secrets using:
  - Docker Compose env vars, or
  - Local environment variables, or
  - A local `.env` file that is ignored by Git.

The repo’s `.gitignore` is already set up to avoid committing:

- Virtual environments
- `node_modules`
- Databases (`*.sqlite3`, `db.sqlite3`)
- Local data (`Data/`)
- `.env` and similar secret files

---

### 7. Contributing / customizing

Feel free to:

- Adjust the recommendation logic using your own datasets in `Data/`
- Extend the Django API for more endpoints
- Improve the React UI/UX

If you fork this project or use it as a learning reference, have fun experimenting and breaking things—then fixing them back. 🙂

---

### 8. Contact

If you run into any issues or have ideas to improve the app, you can open an issue on GitHub or leave comments in your fork.  
Happy coding and stay healthy! 🥗💻
