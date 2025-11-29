import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function JsonSectionRenderer({ title, data }: any) {
  if (!data) return null;

  const [open, setOpen] = useState(false);

  const renderValue = (value: any) => {
    if (Array.isArray(value)) {
      return (
        <ul className="ml-4 list-disc">
          {value.map((item, idx) => (
            <li key={idx}>
              {typeof item === "object" ? renderValue(item) : item?.toString()}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object") {
      return (
        <div className="ml-4 border-l border-slate-300 pl-4">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="my-1">
              <span className="font-semibold text-slate-900">{k}: </span>
              {typeof v === "object" ? renderValue(v) : <span>{v?.toString()}</span>}
            </div>
          ))}
        </div>
      );
    }

    return <span>{value?.toString()}</span>;
  };

  return (
    <div className="border rounded-xl p-5 bg-white shadow-sm mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>

      {open && <div className="mt-4">{renderValue(data)}</div>}
    </div>
  );
}
