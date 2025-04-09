import type { Route } from ".react-router/types/app/+types/root";
import Login from "../pages/login";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rehla todo" },
    { name: "description", content: "TODO APP" },
  ];
}

export default function LoginRoute() {
  return (<Login />);
}