import { redirect } from "next/navigation";

const DEFAULT_BOARD_ID = "f011ed3b-19f7-4d05-a1c9-70417520d9cf";

export default function KanbanPage() {
  redirect(`/kanban/${DEFAULT_BOARD_ID}`);
}
