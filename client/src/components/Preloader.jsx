import { useEffect } from 'react';
import logo from '../assets/Priority Logo.png';

export default function Preloader({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="preloader">
      <div className="preloader-inner">
        <img src={logo} alt="Priority" className="preloader-logo" />
        <span className="preloader-line" />
      </div>
    </div>
  );
}
