import PropTypes from 'prop-types'
import { TbArrowLeft, TbArrowRight, TbShield, TbUsers, TbAccessible, TbLoader, TbClock, TbCircleFilled } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

const BottomBar = ({ backPath = '/signup', continuePath, onContinue, continueLabel = 'Save & Continue', continueDisabled = false, statusMessage, centerMessage, centerDotColor = 'text-success' }) => {
  const navigate = useNavigate()

  return (
    <footer className="bg-white border-t border-gray-200 flex items-center justify-between px-3 sm:px-5 shrink-0 z-10" style={{ height: 52 }}>
      <div className="hidden sm:flex items-center gap-3 md:gap-4">
        <span className="flex items-center gap-1 text-[11px] text-tertiary">
          <TbShield style={{ fontSize: 13 }} /> AES-256
        </span>
        <span className="text-tertiary text-[11px]">·</span>
        <span className="flex items-center gap-1 text-[11px] text-tertiary">
          <TbUsers style={{ fontSize: 13 }} /> SOC 2 Type II
        </span>
        <span className="text-tertiary text-[11px]">·</span>
        <span className="flex items-center gap-1 text-[11px] text-tertiary">
          <TbAccessible style={{ fontSize: 13 }} /> WCAG 2.1
        </span>
      </div>

      <span className="hidden md:flex text-[12px] items-center gap-1.5">
        {centerMessage ? (
          <>
            <TbCircleFilled className={centerDotColor} style={{ fontSize: 8 }} />
            <span className="text-gray-700 font-medium">{centerMessage}</span>
          </>
        ) : (
          <span className="text-secondary">Auto-saved 4s ago</span>
        )}
      </span>

      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-[14px] text-secondary border border-gray-200 rounded-lg px-3 sm:px-4 py-2 hover:bg-gray-50 transition-colors duration-150 font-medium"
        >
          <TbArrowLeft style={{ fontSize: 15 }} />
          Back
        </button>

        {statusMessage ? (
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-warning bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <TbClock style={{ fontSize: 14 }} />
            <span>{statusMessage}</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={continueDisabled}
            onClick={() => { if (continueDisabled) return; onContinue ? onContinue() : continuePath && navigate(continuePath) }}
            className={`flex items-center gap-1.5 text-[14px] rounded-lg px-4 sm:px-5 py-2 font-medium transition-colors duration-150 ${
              continueDisabled
                ? 'bg-gray-100 text-tertiary cursor-not-allowed'
                : 'bg-navy text-white hover:bg-opacity-90'
            }`}
          >
            {continueDisabled
              ? <TbLoader className="animate-spin" style={{ fontSize: 15 }} />
              : null}
            {continueLabel}
            {!continueDisabled && <TbArrowRight style={{ fontSize: 15 }} />}
          </button>
        )}
      </div>
    </footer>
  )
}

BottomBar.propTypes = {
  backPath:         PropTypes.string,
  continuePath:     PropTypes.string,
  onContinue:       PropTypes.func,
  continueLabel:    PropTypes.string,
  continueDisabled: PropTypes.bool,
  statusMessage:    PropTypes.string,
  centerMessage:    PropTypes.string,
  centerDotColor:   PropTypes.string,
}

export default BottomBar
