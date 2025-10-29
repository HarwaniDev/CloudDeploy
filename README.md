## CloudDeploy

Modern, containerized continuous deployment platform that builds projects from GitHub, streams live logs, and serves static assets from Google Cloud Storage.

- **Isolated container builds**: Repositories are cloned and built inside short‑lived, sandboxed containers.
- **Seamless onboarding via GitHub OAuth**: Secure authentication and repository import into the deployment workflow.
- **Real‑time log streaming**: Build and deploy logs stream live via Redis with durable database persistence.
- **Cloud‑native artifact storage**: Built assets are uploaded to and served from Google Cloud Storage (GCS).

---

### Build Server

The Build Server is a containerized execution environment responsible for cloning repositories, running builds, and shipping artifacts.

- **Containerized build system**: Each build runs in an isolated container, preventing cross‑build interference and improving security.
- **Artifacts to GCS**: Uploads output assets (e.g., `dist/`, `build/`) to a Google Cloud Storage bucket for static serving and CDN distribution.
- **Real‑time logs**: Streams stdout/stderr to Redis for immediate consumption by the Web UI and persists logs to the database after completion.

---

### Web (UI)

The Web app provides a clean, responsive UI for managing projects and watching deployments in real time.

- **Dashboards**: View projects, deployments, build history, and artifact links.
- **Live logs**: Subscribe to live build/deploy logs backed by Redis.
- **Auth‑aware UX**: GitHub OAuth login

---

## Flows

### Authentication (GitHub OAuth)
1. User clicks “Sign in with GitHub”.
2. GitHub redirects back with an auth code; the Request Server exchanges it for tokens.
3. The user session is established. Repos can then be imported and connected to projects.

### Deployments
1. A manual trigger creates a deployment request.
2. Build Server spins up an isolated container, clones the repo, runs build steps, streams logs to Redis.
3. On success, artifacts are uploaded to GCS; metadata and logs are persisted to the DB.
4. UI shows real‑time logs and final artifact URLs.