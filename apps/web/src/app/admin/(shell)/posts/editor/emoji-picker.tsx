'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

const CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: 'Mặt cười',
    emojis:
      '😀 😃 😄 😁 😆 🥹 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳'.split(
        ' ',
      ),
  },
  {
    name: 'Cảm xúc',
    emojis:
      '😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 🤥 😶 😐 😑 😬'.split(
        ' ',
      ),
  },
  {
    name: 'Tay',
    emojis:
      '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪'.split(
        ' ',
      ),
  },
  {
    name: 'Tim & Hot',
    emojis:
      '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉'.split(
        ' ',
      ),
  },
  {
    name: 'Vật & Tiền',
    emojis:
      '💵 💴 💶 💷 💰 💸 💳 🧾 💎 ⚖️ 🛒 🛍 🎁 🏷 🎉 🎊 🎈 🎂 🍾 🥂 🍻 ☕ 🍵 🍔 🍟 🍕 🍣 🍜 🍝 🍤 🍰 🎂 🍩'.split(
        ' ',
      ),
  },
  {
    name: 'Mũi tên & Dấu',
    emojis:
      '✅ ❌ ⭕ ❗ ❓ ❕ ❔ ‼️ ⁉️ ⚠️ 🚫 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🔥 💥 ⭐ 🌟 ✨ ⚡ ☀️ 🌈 ☁️ 🌧 ⛈ 🌨 ❄️ 🌪 🌊'.split(
        ' ',
      ),
  },
];

interface Props {
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ onPick }: Props) {
  const [tab, setTab] = useState(0);
  const cat = CATEGORIES[tab]!;
  return (
    <div className="w-72">
      <div className="flex gap-1 border-b border-border p-1">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setTab(i)}
            className={cn(
              'flex-1 rounded-sm px-1 py-1 text-[10px] font-medium transition-colors',
              i === tab ? 'bg-primary text-on-primary' : 'text-ink hover:bg-muted',
            )}
          >
            {c.emojis[0]}
          </button>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-9 gap-0.5 overflow-y-auto p-2">
        {cat.emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-base hover:bg-muted no-tap-highlight"
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
