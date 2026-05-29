import PropTypes from 'prop-types'

/**
 * Horizontal divider with centered label text.
 * @param {{ label?: string }} props
 */
const Divider = ({ label = 'or' }) => {
  return (
    <div className="flex items-center gap-2 my-1">
      <hr className="flex-1 border-t border-border-default" />
      <span className="text-[10px] text-tertiary whitespace-nowrap">{label}</span>
      <hr className="flex-1 border-t border-border-default" />
    </div>
  )
}

Divider.propTypes = {
  label: PropTypes.string,
}

export default Divider
