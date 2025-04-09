import type { Route } from ".react-router/types/app/+types/root";
import History from "../pages/history";
export function meta({}: Route.MetaArgs) {
  return [
	{ title: "Rehla todo" },
	{ name: "description", content: "TODO APP" },
  ];
}

export default function HistoryRoute() {
  return (<History />);
}