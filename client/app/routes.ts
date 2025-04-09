import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/signin.tsx"), 
  route("signup", "routes/signup.tsx"), 
  route("todo", "routes/tasks.tsx"),
  route("history", "routes/history.tsx")
] satisfies RouteConfig;