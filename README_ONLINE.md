# Restaurant POS — Online Deployment

This version is prepared to run both locally and on a cloud host.

## Local Windows/Mac

```bash
python server.py
```

Then open `http://localhost:8000`.

## Online deployment

The server reads the hosting provider's `PORT` environment variable and binds to all interfaces. A persistent `DATA_DIR` can be supplied so `data.json` survives restarts.

### Render

1. Create a GitHub repository and upload this project.
2. In Render, create a **Web Service** from that repository.
3. Use build command: leave blank.
4. Use start command: `python3 server.py`.
5. Set `DATA_DIR=/var/data`.
6. Attach a persistent disk mounted at `/var/data` (1 GB is enough for this JSON-based prototype).
7. Deploy.
8. Render will provide an HTTPS URL such as `https://restaurant-pos-xxxx.onrender.com`.

Do not use the old `192.168.x.x:8000` address for the online service.

## Important

This prototype uses a JSON file as its database. The persistent disk is required if you want orders and table state to survive server restarts/redeploys. For a larger restaurant or multiple branches, migrate the data layer to PostgreSQL before production use.

## Health check

`/health` returns JSON `{ "status": "ok" }` and can be used as the service health endpoint.
