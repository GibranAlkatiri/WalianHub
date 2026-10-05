import { onRequestGet as __api_auth_js_onRequestGet } from "/home/gley/Gley/KKT/WalianHub/functions/api/auth.js"
import { onRequestPost as __api_auth_js_onRequestPost } from "/home/gley/Gley/KKT/WalianHub/functions/api/auth.js"

export const routes = [
    {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_js_onRequestGet],
    },
  {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_js_onRequestPost],
    },
  ]