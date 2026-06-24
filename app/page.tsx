import { Chat } from "@/components/chat";

// The whole app is a single chat screen. `Chat` is a client component because
// it streams a live conversation; this page stays a thin server component.
export default function Home() {
  return <Chat />;
}
