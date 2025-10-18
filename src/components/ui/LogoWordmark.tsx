// src/components/LogoWordmark.tsx
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  className?: string;      // wrapper
  imgClassName?: string;   // controla o tamanho do <img> via Tailwind
  alt?: string;
};

const LogoWordmark: React.FC<Props> = ({
  className = "",
  // h-20 = igual ao Header; mude para h-28/h-32 para "aumentar bastante"
  imgClassName = "h-20 w-auto",
  alt = "SuaReserva",
}) => {
  const { theme } = useTheme();
  const src = theme === "dark" ? "/logo-white.png" : "/logo.png";

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`block select-none shrink-0 ${imgClassName}`}
        draggable={false}
        decoding="async"
      />
    </div>
  );
};

export default LogoWordmark;
