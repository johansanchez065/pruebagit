import { Link } from 'react-router-dom';

export function BigButton({ as = 'button', variant = 'primary', to, children, ...rest }) {
  const className = `big-btn big-btn--${variant}`;
  if (as === 'link' && to) {
    return (
      <Link to={to} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type={rest.type || 'button'} className={className} {...rest}>
      {children}
    </button>
  );
}
