// src/components/agenda/SelectBox.tsx
import React, { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronsUpDown, Check } from "lucide-react";

export type Option<V extends string = string> = {
  value: V;
  label: string;
  icon?: React.ReactNode;
};

type Props<V extends string = string> = {
  value: V;
  onChange: (v: V) => void;
  options: Option<V>[];
  "aria-label"?: string;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
};

export function SelectBox<V extends string = string>({
  value,
  onChange,
  options,
  className = "",
  buttonClassName = "",
  placeholder,
  ...rest
}: Props<V>) {
  const current = options.find((o) => o.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <Listbox.Button
          className={`relative w-full cursor-pointer rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 py-2 pl-3 pr-9 text-left text-sm text-gray-900 dark:text-gray-100 ${buttonClassName}`}
          {...rest}
        >
          <span className="flex items-center gap-2">
            {current?.icon}
            {current?.label ?? placeholder ?? "Selecionar"}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </span>
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg focus:outline-none">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value}
                value={opt.value}
                className={({ active }) =>
                  `cursor-pointer select-none px-3 py-2 text-sm flex items-center justify-between ${
                    active ? "bg-gray-100 dark:bg-gray-800" : ""
                  } text-gray-900 dark:text-gray-100`
                }
              >
                {({ selected }) => (
                  <>
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
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
