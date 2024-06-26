import { CSSProperties } from 'react';
import { intComma } from '@/utils/utils';

const divStyle: CSSProperties = {
  fontWeight: '700',
};

interface IStatProperties {
  value: string | number;
  description: string;
  className?: string;
  citySize?: number;
  onClick?: () => void;
}

const Stat = ({ value, description, className = 'w-100', citySize, onClick }: IStatProperties) => (
  <div className={`${className}`} onClick={onClick}>
    <span className={`f${citySize || 2} fw9 i`} style={divStyle}>
      {intComma(value.toString())}
    </span>
    <span className="f4 fw6 i">{description}</span>
  </div>
);

export default Stat;
