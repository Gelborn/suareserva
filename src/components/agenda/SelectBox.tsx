// src/components/agenda/SelectBox.tsx
import React from "react";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronsUpDown, Check } from "lucide-react";

export type Option<T = string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

type Props<T> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
};

export function SelectBox<T extends string | number | null | undefined>({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Selecionar",
  ...rest
}: Props<T>) {
  const selected = options.find((o) => o.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        {/* Button */}
        <Listbox.Button
          className="relative w-full cursor-pointer rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 py-2 pl-3 pr-9 text-left text-sm text-gray-900 dark:text-gray-100"
          {...rest}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.icon ? (
              <span className="shrink-0">{selected.icon}</span>
            ) : null}
            <span className="truncate">
              {selected ? selected.label : placeholder}
            </span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </span>
        </Listbox.Button>

        {/* Options */}
        <Transition
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-[170] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg focus:outline-none">
            {options.map((opt) => (
              <Listbox.Option
                key={(opt.value as any)?.toString?.() ?? String(opt.label)}
                value={opt.value}
                className={({ active }) =>
                  `cursor-pointer select-none px-3 py-2 text-sm flex items-center justify-between ${
                    active ? "bg-gray-100 dark:bg-gray-800" : ""
                  } text-gray-900 dark:text-gray-100`
                }
              >
                {({ selected }) => (
                  <>
                    <span className="flex items-center gap-2 truncate">
                      {opt.icon ? (
                        <span className="shrink-0">{opt.icon}</span>
                      ) : null}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {selected && <Check className="h-4 w-4" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
