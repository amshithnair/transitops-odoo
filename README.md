# TransitOps Fleet Operations Platform

TransitOps is a lean, core fleet operations platform built to manage vehicles, drivers, trips, maintenance logs, fuel, and expenses.

## Database Information for Contributors

* **Production Database:** PostgreSQL is configured as the default database for production showcase runs (via Docker Compose, utilizing the `db` service).
* **Local Testing / Development Database:** For local testing when Docker is not running or available, the backend supports a fallback to **SQLite**. To switch the database, configure or override the `DATABASE_URL` environment variable:
  ```bash
  # Example local development command (starts server on SQLite):
  set DATABASE_URL=sqlite:///./transitops.db && uvicorn app.main:app --port 8000
  ```
