/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Control-plane base URL; defaults to http://localhost:8080 when unset.
  readonly VITE_API_BASE?: string
}
