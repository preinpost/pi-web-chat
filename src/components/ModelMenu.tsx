import { Menu } from "@base-ui-components/react/menu";
import type { UIModel } from "../../shared/protocol";
import { useModels } from "../lib/api";
import { chatClient } from "../lib/chat";

export function ModelMenu({ current }: { current: UIModel | null }) {
  const { data: models } = useModels();

  return (
    <Menu.Root>
      <Menu.Trigger className="max-w-[50vw] truncate rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-600 sm:max-w-xs">
        {current ? (current.name ?? current.id) : "모델 선택"}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 py-1 shadow-2xl outline-none">
            {(models ?? []).map((m) => {
              const active = current && m.provider === current.provider && m.id === current.id;
              return (
                <Menu.Item
                  key={`${m.provider}/${m.id}`}
                  onClick={() => chatClient.send({ type: "set_model", provider: m.provider, id: m.id })}
                  className={`flex cursor-pointer flex-col px-3 py-2 text-sm outline-none data-[highlighted]:bg-neutral-800 ${
                    active ? "text-indigo-400" : "text-neutral-200"
                  }`}
                >
                  <span className="truncate">{m.name ?? m.id}</span>
                  <span className="text-xs text-neutral-500">{m.provider}</span>
                </Menu.Item>
              );
            })}
            {models && models.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500">사용 가능한 모델 없음</div>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
