import React from 'react';
import Dropdown from '@/components/Dropdown';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
}

const YearSelector: React.FC<YearSelectorProps> = ({ years, selectedYear, onSelect }) => {
  const options = years.map((year) => ({
    label: year.toString(),
    value: year,
  }));

  return (
    <Dropdown
      options={options}
      value={selectedYear}
      onChange={onSelect}
      className="w-32"
    />
  );
};

export default YearSelector;
