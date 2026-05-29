import PropTypes from 'prop-types'

const variantClasses = {
  primary: 'bg-navy text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-white text-navy border border-border-default hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
  outlined: 'bg-transparent text-blue-action border border-blue-action hover:bg-blue-action hover:text-white disabled:opacity-50 disabled:cursor-not-allowed',
}

/**
 * Reusable button component.
 * @param {{ variant?: 'primary'|'secondary'|'outlined', isLoading?: boolean, children: React.ReactNode, className?: string }} props
 */
const Button = ({ variant = 'primary', isLoading = false, children, className = '', ...rest }) => {
  return (
    <button
      className={`
        flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150
        ${variantClasses[variant]}
        ${className}
      `}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading && (
        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'outlined']),
  isLoading: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
}

export default Button
