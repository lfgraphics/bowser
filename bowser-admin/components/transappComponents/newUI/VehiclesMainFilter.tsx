interface FilterItem {
  icon: string;
  count: number;
  label: string;
  filterKey?: string; // Add filterKey to identify which filter was clicked
}

interface VehiclesMainFilterProps {
  icon: string;
  filters: FilterItem[];
  selectedFilter?: string;
  onFilterClick?: (filterKey: string) => void;
  mainFilterKey: string;
}

export default function VehiclesMainFilter({
  icon,
  filters = [],
  selectedFilter,
  onFilterClick,
  mainFilterKey
}: VehiclesMainFilterProps) {
  return (
    <div className="flex w-[320px] h-[186px] flex-row gap-2 bg-black rounded-lg pr-2 overflow-clip">
      <div
        className={`mainIcon w-[170px] h-[186px] flex items-center justify-center bg-card rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${selectedFilter === mainFilterKey ? 'border-2 border-primary' : ''}`}
        onClick={() => onFilterClick?.(mainFilterKey)}
      >
        <img src={icon} alt="Category Icon" />
      </div>
      <div className="stats flex flex-col gap-5 justify-center items-center main -mt-4">
        {filters.map(({ icon, count, label, filterKey }, index) => (
          <div
            key={filterKey || index}
            className={`flex flex-col h-[38px] w-[120px] cursor-pointer transition-all duration-200 hover:scale-105 ${selectedFilter === filterKey ? 'bg-accent/20 rounded-md' : ''
              }`}
            onClick={() => filterKey && onFilterClick?.(filterKey)}
          >
            <div className="grid grid-cols-2 items-center ml-2">
              <div className="icon w-[24px] h-[24px]">
                <img src={icon} alt="Vehicle Status" />
              </div>
              <div className={`text font-black text-[24px] ${selectedFilter === filterKey ? 'text-accent-foreground' : ''
                }`}>
                {count || 0}
              </div>
            </div>
            <div className={`label w-full bg-card text-card-foreground text-center text-[12px] ${selectedFilter === filterKey ? 'bg-accent text-accent-foreground' : ''
              }`}>
              {label || 'No Label'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}