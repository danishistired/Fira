Python analysis service (Phase 1)

Endpoints:
- POST /analyze - multipart form file field `file`, returns JSON with permissions and a simple permission-based score

To run locally (requires Docker):

```bash
docker compose up --build
```

The service listens on port 5000.
