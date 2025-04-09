import type { Route } from ".react-router/types/app/+types/root";
import Signup from "../pages/signup";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rehla todo" },
    { name: "description", content: "TODO APP" },
  ];
}

export default function SignupRoute() {
  return (<Signup />);
}