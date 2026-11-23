import { History } from "../../components/History";
import { Chat } from "./Chat";

export default function GUI() {
  return (
    <div className="flex min-h-0 w-screen flex-row overflow-x-hidden">
      <aside className="no-scrollbar border-vsc-input-border 4xl:flex hidden min-h-0 w-72 overflow-y-auto border-0 border-r border-solid">
        <History />
      </aside>
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col">
        <Chat />
      </main>
    </div>
  );
}
