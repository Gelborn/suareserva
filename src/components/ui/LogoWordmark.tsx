import React from "react";

type Props = {
  className?: string;
  showOnlineTag?: boolean;
};

const LogoWordmark: React.FC<Props> = ({ className = "", showOnlineTag = true }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex flex-col leading-none">
        <h1
          className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight"
          aria-label="SuaReserva online"
        >
          SuaReserva{" "}
          {showOnlineTag && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium align-middle">
              | online
            </span>
          )}
        </h1>
      </div>
    </div>
  );
};

export default LogoWordmark;
