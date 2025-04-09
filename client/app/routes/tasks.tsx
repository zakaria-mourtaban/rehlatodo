import type { Route } from ".react-router/types/app/+types/root";
import Tasks from "../pages/tasks";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rehla todo" },
    { name: "description", content: "TODO APP" },
  ];
}

export default function TasksRoute() {
  return (<Tasks />);
}